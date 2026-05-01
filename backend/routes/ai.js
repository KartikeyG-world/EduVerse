const express = require("express");
const router = express.Router();
const Plan = require("../models/Plan");
const { protect, optionalAuth } = require("../middlewares/auth");
const axios = require("axios");

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

    const messages = [
      {
        role: "system",
        content: "You are an expert tutor. Create study roadmaps in pure valid JSON."
      },
      {
        role: "user",
        content: `Create a study roadmap for ${subject} over ${durationDays} days with the goal of: ${goal}. Format it clearly with daily tasks. Respond ONLY with valid JSON with this exact structure: { "roadmap": [ { "day": 1, "topic": "...", "tasks": ["..."] } ] }`
      }
    ];

    const contentText = await openRouterCall(messages);
    const parsedContent = parseJSONSafely(contentText);

    const newPlan = new Plan({
      userId: req.user._id,
      subject,
      durationDays,
      goal,
      roadmap: parsedContent.roadmap
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
    
    // Log Activity
    const Activity = require("../models/Activity");
    await Activity.create({ userId: req.user._id, type: 'chat', duration: 0 });

    res.json({ reply: replyText });
  } catch (err) {
    console.error("AI Chatbot error:", err);
    res.status(500).json({ error: "Failed to get chatbot response" });
  }
});

module.exports = router;
