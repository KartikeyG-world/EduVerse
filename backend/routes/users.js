const express = require("express");
const router = express.Router();
const { protect, optionalAuth } = require("../middlewares/auth");
const { createNotification } = require("../utils/notification");

// Fetch current user stats
router.get("/me", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
        return res.json({ name: 'Guest Student', xp: 0, level: 1, streak: 0, focusHours: 0 });
    }
    // req.user is already populated by auth middleware
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Add XP and Focus Time
router.put("/add-xp", protect, async (req, res) => {
  try {
    const { xpToAdd, focusSeconds } = req.body;
    
    // Simple level curve: 1000 XP per level
    const user = req.user;
    
    user.xp += xpToAdd;
    user.level = Math.floor(user.xp / 1000) + 1;
    
    // Update streak (basic logic: assuming if they gain XP today, it increments, but we need date checking)
    // For simplicity in this demo, we'll just increment it securely via the client passing it or a generic bump
    // Better logic: store lastActive Date.
    
    if (!user.focusHours) {
        user.focusHours = 0; // In case model didn't have it initialized
    }
    user.focusHours += focusSeconds / 3600;

    await user.save();
    
    // Log Activity for Charts
    const Activity = require("../models/Activity");
    await Activity.create({
      userId: user._id,
      type: 'study',
      duration: focusSeconds
    });

    // Generate Notifications natively
    await createNotification(user._id, 'FOCUS', `Amazing work! You completed ${(focusSeconds/60).toFixed(1)} minutes of deep focus session.`);
    await createNotification(user._id, 'XP', `You earned ${xpToAdd} XP for your efforts! Keep climbing towards Level ${user.level + 1}.`);

    res.json({
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      focusHours: user.focusHours
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update XP" });
  }
});

module.exports = router;
