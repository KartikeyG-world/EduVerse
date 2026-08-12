const express = require("express");
const router = express.Router();
const ChatSession = require("../models/ChatSession");
const { protect } = require("../middlewares/auth");
const axios = require("axios");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const openRouterCall = async (messages) => {
  try {
    const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 1500;
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
      throw new Error("Invalid response format from OpenRouter");
    }

    return data.choices[0].message.content;
  } catch (error) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.error?.message || error.message;

    if (status === 402) throw new Error('AI_CREDIT_LIMIT: AI unavailable. Try again shortly.');
    if (status === 429) throw new Error('AI_RATE_LIMIT: Too many requests. Wait and retry.');
    throw new Error(msg);
  }
};

// Create a new empty chat session
router.post("/sessions", protect, async (req, res) => {
  try {
    const session = await ChatSession.create({
      userId: req.user._id,
      title: "New Chat",
      messages: [{ role: "assistant", content: "Hi there! I am your EduVerse AI tutor. How can I help you study today?" }]
    });
    res.json(session);
  } catch (err) {
    console.error("CREATE SESSION ERROR:", err);
    res.status(500).json({ error: "Failed to create session", message: err.message });
  }
});

// Fetch all chat sessions (sidebar list)
router.get("/sessions", protect, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id })
      .select("_id title createdAt updatedAt")
      .sort({ updatedAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Fetch one full chat session
router.get("/sessions/:sessionId", protect, async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// Send a message inside an existing session
router.post("/sessions/:sessionId/message", protect, async (req, res) => {
  try {
    const { message } = req.body;
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const messagesPayload = [
      {
        role: "system",
        content: `You are an AI tutor for EduVerse AI, a premium educational platform. The user's name is ${req.user?.name || 'Student'}. Be helpful, concise, and encourage learning.`
      }
    ];

    session.messages.forEach(h => {
      messagesPayload.push({
        role: h.role === "user" ? "user" : "assistant",
        content: h.content
      });
    });

    messagesPayload.push({ role: "user", content: message });

    const replyText = await openRouterCall(messagesPayload);

    session.messages.push({ role: "user", content: message });
    session.messages.push({ role: "assistant", content: replyText });

    // Update title if it's the first real user message
    if (session.title === "New Chat" && session.messages.filter(m => m.role === 'user').length === 1) {
      session.title = message.length > 40 ? message.substring(0, 40) + "..." : message;
    }

    await session.save();

    res.json({ reply: replyText, session });
  } catch (err) {
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Rename session
router.patch("/sessions/:sessionId/rename", protect, async (req, res) => {
  try {
    const { title } = req.body;
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    session.title = title || "Untitled";
    await session.save();
    res.json({ message: "Renamed successfully", session });
  } catch (err) {
    res.status(500).json({ error: "Failed to rename session" });
  }
});

// Delete session
router.delete("/sessions/:sessionId", protect, async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await session.deleteOne();
    res.json({ message: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete session" });
  }
});

module.exports = router;
