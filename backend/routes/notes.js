const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const { protect, optionalAuth } = require("../middlewares/auth");

// Get all notes for a user
router.get("/", optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.json([]);
    const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new note
router.post("/", protect, async (req, res) => {
  try {
    const { title, content, summary } = req.body;
    const note = new Note({
      userId: req.user.id,
      title,
      content,
      summary,
    });
    const savedNote = await note.save();
    res.status(201).json(savedNote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a note
router.delete("/:id", protect, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

module.exports = router;
