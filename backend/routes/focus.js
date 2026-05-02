const express = require("express");
const router = express.Router();
const FocusSession = require("../models/FocusSession");
const User = require("../models/User");
const { protect } = require("../middlewares/auth");

// Log a new focus session
router.post("/", protect, async (req, res) => {
  try {
    const { type, duration, xpEarned } = req.body;
    
    const session = new FocusSession({
      user: req.user.id,
      type,
      duration,
      xpEarned
    });
    
    await session.save();
    
    // Also update user's total focus hours and XP (already handled in add-xp route usually, 
    // but we can update focusHours here)
    const focusHours = duration / 3600;
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { focusHours: focusHours }
    });

    res.status(201).json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user's focus history
router.get("/history", protect, async (req, res) => {
  try {
    const sessions = await FocusSession.find({ user: req.user.id })
      .sort({ startTime: -1 })
      .limit(50);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
