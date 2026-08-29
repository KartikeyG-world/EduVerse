const express = require("express");
const router = express.Router();
const Plan = require("../models/Plan");
const { protect, optionalAuth } = require("../middlewares/auth");
const axios = require("axios");
const { fetchResourcesForTopic } = require("../utils/resources");
const Activity = require("../models/Activity");
const ChatMessage = require("../models/ChatMessage");

const { generateAICompletion, parseJSONSafely } = require("../services/aiGateway");

const openRouterCall = (messages, maxTokens = null) => generateAICompletion({ messages, maxTokens });


// AI Study Planner
router.post("/planner", protect, async (req, res) => {
  try {
    const { subject, durationDays, goal } = req.body;

    // Step 1: Generate structured plan from AI
    const messages = [
      {
        role: "system",
        content: "You are an expert tutor and curriculum designer. Create detailed, progressive study roadmaps in pure valid JSON. Topics must progress from beginner to advanced."
      },
      {
        role: "user",
        content: `Create a study roadmap for "${subject}" over ${durationDays} days with the goal: "${goal}".
Each day must cover a specific subtopic with concrete tasks and a realistic time estimate.
Respond ONLY with valid JSON in this exact structure:
{
  "roadmap": [
    {
      "day": 1,
      "topic": "Specific Subtopic Name",
      "timeEstimate": "2 hours",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    }
  ]
}`
      }
    ];

    const contentText = await openRouterCall(messages);
    const parsedContent = parseJSONSafely(contentText);

    if (!parsedContent.roadmap || !Array.isArray(parsedContent.roadmap)) {
      throw new Error("AI returned invalid roadmap structure");
    }

    // Step 2: Fetch YouTube + article resources for all days in parallel (cap live YT API calls to first 5 days)
    const enrichedRoadmap = await Promise.all(
      parsedContent.roadmap.map(async (day, idx) => {
        try {
          const fetchFullVideos = idx < 5;
          const resources = await fetchResourcesForTopic(day.topic, subject, fetchFullVideos);
          return { ...day, resources };
        } catch (err) {
          console.warn(`Resource fetch failed for Day ${day.day}:`, err.message);
          return { ...day, resources: { youtube: [], articles: [] } };
        }
      })
    );

    // Step 3: Save enriched plan to DB
    const newPlan = new Plan({
      userId: req.user._id,
      subject,
      durationDays,
      goal,
      roadmap: enrichedRoadmap
    });
    const savedPlan = await newPlan.save();
    
    // Log AI usage
    await Activity.create({ userId: req.user._id, type: 'planner', duration: 0 });

    res.json(savedPlan);
  } catch (err) {
    console.error("[AI Planner Error]:", err);
    res.status(500).json({ error: "Failed to generate study plan", message: "Failed to generate study plan. Please try again." });
  }
});

// Get user's saved study plans
router.get("/planner", optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.json([]);
    const plans = await Plan.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(plans);
  } catch (err) {
    console.error("[AI Get Plans Error]:", err);
    res.status(500).json({ error: "Failed to fetch study plans" });
  }
});

// Delete user's saved study plan
router.delete("/planner/:id", protect, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    if (plan.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await plan.deleteOne();
    res.status(200).json({ message: "Plan deleted successfully" });
  } catch (err) {
    console.error("[AI Delete Plan Error]:", err);
    res.status(500).json({ error: "Failed to delete plan" });
  }
});

// AI Smart Notes Summarizer
router.post("/summarize", protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return res.status(400).json({ error: "Content is too short to summarize" });
    }

    const messages = [
      {
        role: "system",
        content: "You are an intelligent summarization assistant. Format responses cleanly, emphasizing key points and generating a simple quiz."
      },
      {
        role: "user",
        content: `Summarize the following educational notes into key bullet points and generate 3 quick quiz questions based on it.\n\nNotes:\n${content}`
      }
    ];

    const summaryText = await openRouterCall(messages);
    
    // Log Activity
    await Activity.create({ userId: req.user._id, type: 'notes', duration: 0 });

    res.json({ summary: summaryText });
  } catch (err) {
    console.error("[AI Summarizer Error]:", err);
    res.status(500).json({ error: "Failed to summarize notes", message: "Failed to summarize notes. Please try again." });
  }
});

// AI Chatbot
router.post("/chat", protect, async (req, res) => {
  try {
    const { message, history, isSystemMessage } = req.body;

    if (!isSystemMessage && (!message || typeof message !== 'string' || message.trim().length === 0)) {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }

    // Save user message
    if (!isSystemMessage) {
      await ChatMessage.create({
        user: req.user.id,
        role: "user",
        content: message
      });
    }

    const messages = [
      {
        role: "system",
        content: `You are an AI tutor for EduVerse AI, a premium educational platform. The user's name is ${req.user?.name || 'Student'}. Be helpful, concise, and encourage learning.`
      }
    ];

    if (history && history.length > 0) {
      history.forEach(h => {
        messages.push({
          role: h.role === "user" ? "user" : "assistant",
          content: h.content
        });
      });
    }

    messages.push({ role: "user", content: message });

    const maxTokens = req.body.max_tokens || (isSystemMessage ? 2500 : 1500);
    const replyText = await openRouterCall(messages, maxTokens);
    
    // Save assistant reply
    if (!isSystemMessage) {
      await ChatMessage.create({
        user: req.user.id,
        role: "assistant",
        content: replyText
      });

      // Log Activity
      await Activity.create({ userId: req.user._id, type: 'chat', duration: 0 });
    }

    res.json({ reply: replyText });
  } catch (err) {
    console.error("[AI Chatbot Error]:", err);
    res.status(500).json({ error: "Failed to get chatbot response", message: "Failed to get chatbot response. Please try again." });
  }
});

// GET Chat History
router.get("/chat/history", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, history: [] });
    }
    const messages = await ChatMessage.find({ user: req.user.id })
      .sort({ timestamp: 1 })
      .limit(100);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch chat history" });
  }
});

module.exports = router;
