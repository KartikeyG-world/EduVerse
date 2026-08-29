const express = require("express");
const router = express.Router();
const FocusSession = require("../models/FocusSession");
const User = require("../models/User");
const { protect, optionalAuth } = require("../middlewares/auth");

// Log a new focus session
router.post("/", protect, async (req, res) => {
  try {
    const { type, duration, xpEarned } = req.body;
    
    const parsedDuration = Number(duration) || 0;
    const parsedXP = Math.min(Math.max(Number(xpEarned) || 0, 0), 500);

    const session = new FocusSession({
      user: req.user.id,
      type: type || 'pomodoro',
      duration: parsedDuration,
      xpEarned: parsedXP
    });
    
    await session.save();
    
    // Atomically increment focusHours and XP, and re-calculate level
    const focusHours = parsedDuration / 3600;
    const user = await User.findById(req.user.id);
    if (user) {
      user.focusHours = (user.focusHours || 0) + focusHours;
      if (parsedXP > 0) {
        user.xp = (user.xp || 0) + parsedXP;
        user.level = Math.floor(user.xp / 1000) + 1;
      }
      await user.save();
    }

    res.status(201).json({ success: true, session });
  } catch (err) {
    console.error("[Focus Create Session Error]:", err);
    res.status(500).json({ success: false, error: "Failed to log focus session" });
  }
});

// Get user's focus history
router.get("/history", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, history: [] });
    }
    const sessions = await FocusSession.find({ user: req.user.id })
      .sort({ startTime: -1 })
      .limit(50);
    res.json({ success: true, sessions });
  } catch (err) {
    console.error("[Focus History Error]:", err);
    res.status(500).json({ success: false, error: "Failed to fetch focus history" });
  }
});

module.exports = router;
