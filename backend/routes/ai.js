const express = require("express");
const router = express.Router();
const Plan = require("../models/Plan");
const { protect, optionalAuth } = require("../middlewares/auth");
const axios = require("axios");
const { fetchResourcesForTopic } = require("../utils/resources");
const Activity = require("../models/Activity");
const ChatMessage = require("../models/ChatMessage");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Helper for making OpenRouter API calls
const openRouterCall = async (messages) => {
  try {
    // Defensive: cap token limits to 1500 to avoid pre-flight credit check failures (402)
    const MAX_TOKENS = Math.min(parseInt(process.env.AI_MAX_TOKENS) || 1500, 1500);
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: "openai/gpt-3.5-turbo",
        messages: messages,
        max_tokens: MAX_TOKENS
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
  } catch (error) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.error?.message 
                || error.message;

    if (status === 402) throw new Error(
      'AI_CREDIT_LIMIT: AI unavailable. Try again shortly.'
    );
    if (status === 429) throw new Error(
      'AI_RATE_LIMIT: Too many requests. Wait and retry.'
    );
    throw new Error(msg);
  }
};

// Helper to clean JSON response — gracefully handles truncated AI output
const parseJSONSafely = (text) => {
  // Step 1: Strip markdown fences
  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Step 2: Attempt a clean parse first (happy path)
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Fell through — likely a truncated response. Attempt recovery below.
  }

  // Step 3: Extract all fully-formed day objects from the truncated string.
  // Each day block ends with a closing } before the next { "day": N or the end.
  // We collect every complete { ... } object from inside the roadmap array.
  try {
    const dayObjects = [];
    // Match each complete JSON object in the array (greedy, handles nested arrays)
    const objectPattern = /\{\s*"day"\s*:\s*\d+[\s\S]*?"tasks"\s*:\s*\[[\s\S]*?\]\s*\}/g;
    let match;
    while ((match = objectPattern.exec(cleaned)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj.day && obj.topic && Array.isArray(obj.tasks)) {
          dayObjects.push(obj);
        }
      } catch (_) {
        // Skip any malformed individual object
      }
    }

    if (dayObjects.length > 0) {
      console.warn(`[parseJSONSafely] Recovered ${dayObjects.length} day(s) from truncated AI response.`);
      return { roadmap: dayObjects };
    }
  } catch (_) {
    // Recovery also failed — fall through to hard error
  }

  // Step 4: Nothing recoverable — log and throw
  console.error("Failed to parse JSON:", text);
  throw new Error("Invalid JSON structure");
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
    await Activity.create({ userId: req.user._id, type: 'planner', duration: 0 });

    res.json(savedPlan);
  } catch (err) {
    console.error("AI Planner error:", err);
    res.status(500).json({ error: "Failed to generate study plan", message: err.message });
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
    console.error("Failed to delete plan:", err);
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
    console.error("AI Summarizer error:", err);
    res.status(500).json({ error: "Failed to summarize notes", message: err.message });
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

    const replyText = await openRouterCall(messages);
    
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
    console.error("AI Chatbot error:", err);
    res.status(500).json({ error: "Failed to get chatbot response", message: err.message });
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
