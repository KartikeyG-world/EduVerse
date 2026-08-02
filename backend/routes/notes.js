const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const { protect, optionalAuth } = require("../middlewares/auth");

// ROUTE 1 — GET /api/notes
// Fetch ALL notes belonging to req.user.id
router.get("/", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, notes: [] });
    }
    const notes = await Note.find({ user: req.user.id }).sort({ lastEditedAt: -1 });
    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ROUTE 2 — POST /api/notes
// Create a new blank note
router.post("/", protect, async (req, res) => {
  try {
    const note = new Note({
      user: req.user.id,
      title: "Untitled Note",
      content: "",
      summary: ""
    });
    const savedNote = await note.save();
    res.status(201).json({ success: true, note: savedNote });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ROUTE 3 — PUT /api/notes/:id
// Update an existing note
router.put("/:id", protect, async (req, res) => {
  try {
    const { title, content, summary, tags, isPinned } = req.body;
    
    // Security check: Find by ID and verify ownership
    let note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }

    const updateData = {
      title: (title && title.trim()) ? title : (note.title || "Untitled Note"),
      content: content ?? note.content,
      summary: summary ?? note.summary,
      tags: tags ?? note.tags,
      isPinned: isPinned ?? note.isPinned,
      lastEditedAt: Date.now()
    };

    const updatedNote = await Note.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ success: true, note: updatedNote });

    // Hook into Mastery Engine
    if (updatedNote.title && updatedNote.title !== "Untitled Note") {
      const { updateTopicMastery } = require('../utils/mastery');
      // Use tags[0] as category if available, else "Notes"
      const category = (updatedNote.tags && updatedNote.tags.length > 0) ? updatedNote.tags[0] : "Notes";
      await updateTopicMastery(req.user.id, updatedNote.title, category, {
        isCorrect: true, // Saving notes is a positive study action
        notes: updatedNote.summary || "Studied notes"
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ROUTE 4 — DELETE /api/notes/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ROUTE 5 — GET /api/notes/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
