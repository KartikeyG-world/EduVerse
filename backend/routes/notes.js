const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const { protect, optionalAuth } = require("../middlewares/auth");

// Server-side HTML sanitizer to prevent stored XSS (FIX 10)
const sanitizeNoteHtml = (dirty) => {
  if (!dirty || typeof dirty !== 'string') return '';
  return dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:');
};

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
    const { title, content, summary } = req.body || {};
    const note = new Note({
      user: req.user.id,
      title: title ? title.trim() : "Untitled Note",
      content: content ? sanitizeNoteHtml(content) : "",
      summary: summary ? sanitizeNoteHtml(summary) : ""
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
    if (content !== undefined) updateData.content = sanitizeNoteHtml(content);
    if (summary !== undefined) updateData.summary = sanitizeNoteHtml(summary);
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.map(t => typeof t === 'string' ? t.trim() : t) : tags;
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);

    const updatedNote = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }

    res.json({ success: true, note: updatedNote });
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
