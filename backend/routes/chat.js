const express = require("express");
const router = express.Router();
const ChatSession = require("../models/ChatSession");
const { protect } = require("../middlewares/auth");
const { generateAICompletion } = require("../services/aiGateway");

const openRouterCall = (messages) => generateAICompletion({ messages, maxTokens: 1500 });

const ChatMessage = require("../models/ChatMessage");

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
    console.error("[Chat Create Session Error]:", err);
    res.status(500).json({ error: "Failed to create session", message: "Failed to create session. Please try again." });
  }
});

// Fetch all chat sessions (sidebar list) with automatic legacy ChatMessage migration
router.get("/sessions", protect, async (req, res) => {
  try {
    let sessions = await ChatSession.find({ userId: req.user._id })
      .select("_id title createdAt updatedAt")
      .sort({ updatedAt: -1 });

    // Non-destructive backward compatibility: migrate legacy ChatMessage records if no sessions exist
    if (sessions.length === 0) {
      const legacyMessages = await ChatMessage.find({ user: req.user._id }).sort({ timestamp: 1 }).lean();
      if (legacyMessages && legacyMessages.length > 0) {
        const migratedSession = await ChatSession.create({
          userId: req.user._id,
          title: "Previous Chat History",
          messages: legacyMessages.map(m => ({
            role: m.role || "user",
            content: m.content || "",
            timestamp: m.timestamp || m.createdAt || new Date()
          }))
        });
        sessions = [migratedSession];
      }
    }

    res.json(sessions);
  } catch (err) {
    console.error("[Chat Fetch Sessions Error]:", err);
    res.status(500).json({ error: "Failed to fetch sessions", message: "Failed to fetch sessions. Please try again." });
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
    console.error("[Chat Fetch Session Error]:", err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// Send a message inside an existing session
router.post("/sessions/:sessionId/message", protect, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }
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

    // FIX 7: Slice only the last 10 messages to avoid LLM context overflow
    const recentHistory = session.messages.slice(-10);
    recentHistory.forEach(h => {
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
    console.error("[Chat Process Message Error]:", err);
    res.status(500).json({ error: "Failed to process message", message: "Failed to process message. Please try again." });
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
    const reqUserId = req.user.id || req.user._id?.toString();
    if (session.userId.toString() !== reqUserId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await session.deleteOne();
    res.json({ message: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete session" });
  }
});

module.exports = router;
