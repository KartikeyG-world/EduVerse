const express = require("express");
const router = express.Router();
const FocusSession = require("../models/FocusSession");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { createNotification } = require("../utils/notification");
const { protect, optionalAuth, invalidateUserCache } = require("../middlewares/auth");

// Log a new focus session (sole source of truth for focus session XP and focus hours)
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
      invalidateUserCache(user._id);

      // Log Activity for Charts
      if (parsedDuration > 0) {
        await Activity.create({
          userId: user._id,
          type: 'study',
          duration: parsedDuration
        });
        await createNotification(user._id, 'FOCUS', `Amazing work! You completed ${(parsedDuration/60).toFixed(1)} minutes of deep focus session.`);
      }

      if (parsedXP > 0) {
        await createNotification(user._id, 'XP', `You earned ${parsedXP} XP for your focus session! Keep climbing towards Level ${user.level + 1}.`);
      }
    }

    res.status(201).json({
      success: true,
      session,
      user: user ? {
        xp: user.xp,
        level: user.level,
        focusHours: user.focusHours,
        streak: user.streak || 0
      } : null
    });
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
