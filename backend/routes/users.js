const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, optionalAuth, invalidateUserCache } = require("../middlewares/auth");
const { createNotification } = require("../utils/notification");
const Activity = require("../models/Activity");

// Fetch current user stats with unified DTO
router.get("/me", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ name: 'Guest Student', xp: 0, level: 1, streak: 0, focusHours: 0, tutorPoints: 0 });
    }
    const user = req.user;
    res.json({
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      xp: user.xp || 0,
      level: user.level || 1,
      streak: user.streak || 0,
      focusHours: user.focusHours || 0,
      tutorPoints: user.tutorPoints || 0,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Add XP and optional Focus Time (server-side validation guards)
router.put("/add-xp", protect, async (req, res) => {
  try {
    const { xpToAdd, focusSeconds } = req.body;
    
    // Server-side validation guards
    const parsedXP = Number(xpToAdd);
    const parsedFocus = focusSeconds !== undefined ? Number(focusSeconds) : 0;

    if (isNaN(parsedXP) || parsedXP <= 0 || parsedXP > 500) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid xpToAdd: must be a positive number up to 500 per session" 
      });
    }

    if (isNaN(parsedFocus) || parsedFocus < 0 || parsedFocus > 7200) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid focusSeconds: must be between 0 and 7200 seconds (2 hours max)" 
      });
    }

    // Simple level curve: 1000 XP per level
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.xp = (user.xp || 0) + parsedXP;
    user.level = Math.floor(user.xp / 1000) + 1;
    if (parsedFocus > 0) {
      user.focusHours = (user.focusHours || 0) + (parsedFocus / 3600);
    }

    await user.save();
    invalidateUserCache(user._id);
    
    // Log Activity for Charts if focus duration was recorded
    if (parsedFocus > 0) {
      await Activity.create({
        userId: user._id,
        type: 'study',
        duration: parsedFocus
      });
      await createNotification(user._id, 'FOCUS', `Amazing work! You completed ${(parsedFocus/60).toFixed(1)} minutes of deep focus session.`);
    }

    // Generate Notifications natively
    await createNotification(user._id, 'XP', `You earned ${parsedXP} XP for your efforts! Keep climbing towards Level ${user.level + 1}.`);

    res.json({
      success: true,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      focusHours: user.focusHours
    });
  } catch (err) {
    console.error("[Users:AddXP Error]:", err);
    res.status(500).json({ error: "Failed to update XP" });
  }
});

// GET /api/users/routine — Fetch synced Daily Routine grid (Item 14)
router.get("/routine", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select("dailyRoutine");
    res.json({ success: true, routine: user?.dailyRoutine || [] });
  } catch (err) {
    console.error("[Users:GetRoutine Error]:", err);
    res.status(500).json({ success: false, error: "Failed to fetch daily routine" });
  }
});

// PUT /api/users/routine — Sync Daily Routine grid (Item 14)
router.put("/routine", protect, async (req, res) => {
  try {
    const { routine } = req.body;
    if (!Array.isArray(routine)) {
      return res.status(400).json({ success: false, message: "Routine must be an array" });
    }
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.dailyRoutine = routine;
    await user.save();
    invalidateUserCache(user._id);

    res.json({ success: true, routine: user.dailyRoutine });
  } catch (err) {
    console.error("[Users:SaveRoutine Error]:", err);
    res.status(500).json({ success: false, error: "Failed to save daily routine" });
  }
});

module.exports = router;

