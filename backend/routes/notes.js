const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const { protect, optionalAuth } = require("../middlewares/auth");

// ROUTE 1 — GET /api/notes
// Fetch notes belonging to req.user.id
router.get("/", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, notes: [] });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    let query = Note.find({ user: req.user.id }).sort({ lastEditedAt: -1 }).limit(limit);

    if (req.query.select === 'summary' || req.query.summary === 'true') {
      query = query.select('title isPinned tags lastEditedAt updatedAt createdAt');
    }

    const notes = await query.lean();
    res.json({ success: true, notes });
  } catch (err) {
    console.error("[Notes GET All Error]:", err);
    res.status(500).json({ success: false, error: "Failed to fetch notes" });
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
    console.error("[Notes Create Error]:", err);
    res.status(500).json({ success: false, error: "Failed to create note" });
  }
});

// ROUTE 3 — PUT /api/notes/:id
// Update an existing note atomically
router.put("/:id", protect, async (req, res) => {
  try {
    const { title, content, summary, tags, isPinned } = req.body;

    const updateData = {
      lastEditedAt: Date.now()
    };
    if (title !== undefined) updateData.title = title.trim() || "Untitled Note";
    if (content !== undefined) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (tags !== undefined) updateData.tags = tags;
    if (isPinned !== undefined) updateData.isPinned = isPinned;

    const updatedNote = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }

    res.json({ success: true, note: updatedNote });

    // Hook into Mastery Engine
    if (updatedNote.title && updatedNote.title !== "Untitled Note") {
      const { updateTopicMastery } = require('../utils/mastery');
      const category = (updatedNote.tags && updatedNote.tags.length > 0) ? updatedNote.tags[0] : "Notes";
      await updateTopicMastery(req.user.id, updatedNote.title, category, {
        isCorrect: true,
        notes: updatedNote.summary || "Studied notes"
      });
    }
  } catch (err) {
    console.error("[Notes Update Error]:", err);
    res.status(500).json({ success: false, error: "Failed to update note" });
  }
});

// ROUTE 4 — DELETE /api/notes/:id
// Delete an existing note atomically
router.delete("/:id", protect, async (req, res) => {
  try {
    const deleted = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }

    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    console.error("[Notes Delete Error]:", err);
    res.status(500).json({ success: false, error: "Failed to delete note" });
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
    console.error("[Notes GET by ID Error]:", err);
    res.status(500).json({ success: false, error: "Failed to fetch note" });
  }
});

module.exports = router;
