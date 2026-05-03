const express = require("express");
const router = express.Router();
const Plan = require("../models/Plan");
const { protect, optionalAuth } = require("../middlewares/auth");
const axios = require("axios");
const { fetchResourcesForTopic } = require("../utils/resources");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Helper for making OpenRouter API calls
const openRouterCall = async (messages) => {
  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: "openai/gpt-3.5-turbo",
        messages: messages
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5000",
          "X-OpenRouter-Title": "EduVerse AI"
        }
      }
    );

    const data = response.data;
    if (!data?.choices?.[0]?.message?.content) {
      console.error("Malformed response from OpenRouter:", data);
      throw new Error("Invalid response format from OpenRouter");
    }

    return data.choices[0].message.content;
  } catch (err) {
    if (err.response) {
      console.error("OpenRouter API Failed:", err.response.data);
    } else {
      console.error("OpenRouter request error:", err.message);
    }
    throw new Error("OpenRouter API request failed");
  }
};

// Helper to clean JSON response
const parseJSONSafely = (text) => {
  try {
    let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Invalid JSON structure");
  }
};

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

    // Step 2: Fetch YouTube + article resources for all days in parallel
    const enrichedRoadmap = await Promise.all(
      parsedContent.roadmap.map(async (day) => {
        try {
          const resources = await fetchResourcesForTopic(day.topic, subject);
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
    const Activity = require("../models/Activity");
    await Activity.create({ userId: req.user._id, type: 'planner', duration: 0 });

    res.json(savedPlan);
  } catch (err) {
    console.error("AI Planner error:", err);
    res.status(500).json({ error: "Failed to generate study plan" });
  }
});

// Get user's saved study plans
router.get("/planner", optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.json([]);
    const plans = await Plan.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch study plans" });
  }
});

// AI Smart Notes Summarizer
router.post("/summarize", protect, async (req, res) => {
  try {
    const { content } = req.body;

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
    const Activity = require("../models/Activity");
    await Activity.create({ userId: req.user._id, type: 'notes', duration: 0 });

    res.json({ summary: summaryText });
  } catch (err) {
    console.error("AI Summarizer error:", err);
    res.status(500).json({ error: "Failed to summarize notes" });
  }
});

// AI Chatbot
router.post("/chat", protect, async (req, res) => {
  try {
    const { message, history } = req.body;
    const ChatMessage = require("../models/ChatMessage");

    // Save user message
    await ChatMessage.create({
      user: req.user.id,
      role: "user",
      content: message
    });

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

    const replyText = await openRouterCall(messages);
    
    // Save assistant reply
    await ChatMessage.create({
      user: req.user.id,
      role: "assistant",
      content: replyText
    });

    // Log Activity
    const Activity = require("../models/Activity");
    await Activity.create({ userId: req.user._id, type: 'chat', duration: 0 });

    res.json({ reply: replyText });
  } catch (err) {
    console.error("AI Chatbot error:", err);
    res.status(500).json({ error: "Failed to get chatbot response" });
  }
});

// GET Chat History
router.get("/chat/history", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, history: [] });
    }
    const ChatMessage = require("../models/ChatMessage");
    const messages = await ChatMessage.find({ user: req.user.id })
      .sort({ timestamp: 1 })
      .limit(100);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch chat history" });
  }
});

module.exports = router;
