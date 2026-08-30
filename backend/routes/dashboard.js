const express = require("express");
const router = express.Router();
const { protect, optionalAuth } = require("../middlewares/auth");
const Activity = require("../models/Activity");
const Plan = require("../models/Plan");
const TopicMastery = require("../models/TopicMastery");
const axios = require("axios");
const { updateStreak, validateIanaTimezone, getRecentDaysArray } = require("../utils/streak");
const { isRevisionDue } = require("../utils/mastery");

// Re-using the robust OpenRouter proxy pattern
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Bounded in-memory insight cache: userId -> { insight, timestamp, level }
const insightCache = new Map();
const INSIGHT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const generateInsight = async (userName, stats) => {
  try {
    const prompt = `You are an encouraging AI Coach studying inside a premium learning dashboard.
The student, ${userName}, has accumulated ${stats.level} levels, a ${stats.streak} day streak, and focused for ${stats.focusHours.toFixed(1)} hours.
Write a very short, punchy, 2-sequence encouraging insight or tip for them. Keep it under 2 sentences. Use emojis.`;

    const MAX_TOKENS = Math.min(parseInt(process.env.AI_MAX_TOKENS) || 1000, 1000);
    const response = await axios.post(OPENROUTER_URL, 
      {
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "system", content: prompt }],
        max_tokens: MAX_TOKENS
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.FRONTEND_URL || "https://edu-verse-psi.vercel.app",
          "X-OpenRouter-Title": "EduVerse AI"
        },
        timeout: 4000
      }
    );

    return response.data?.choices?.[0]?.message?.content || "Keep up the excellent momentum! 🔥";
  } catch (error) {
    console.error("AI Insight Generation Failed:", error.message || error);
    return "Consistent focus brings massive results! 🧠✨";
  }
};

const getCachedOrGenerateInsight = async (userId, userName, stats) => {
  const cached = insightCache.get(userId.toString());
  if (cached && (Date.now() - cached.timestamp < INSIGHT_TTL_MS) && cached.level === stats.level) {
    return cached.insight;
  }
  const insight = await generateInsight(userName, stats);
  if (insightCache.size > 2000) {
    const firstKey = insightCache.keys().next().value;
    insightCache.delete(firstKey);
  }
  insightCache.set(userId.toString(), {
    insight,
    timestamp: Date.now(),
    level: stats.level
  });
  return insight;
};

// GET /api/dashboard
router.get("/", optionalAuth, async (req, res) => {
  try {
    let user = req.user;
    const userTimezone = validateIanaTimezone(req.headers['x-timezone']);

    // Gracefully handle Native Guest Mode
    if (!user) {
      const guestDays = getRecentDaysArray(7, userTimezone);
      return res.json({
        stats: { xp: 0, level: 1, streak: 0, focusHours: 0 },
        dailyActivity: guestDays.map(d => ({
          date: d.date,
          day: d.day,
          sessions: 0, chats: 0, studyTime: 0
        })),
        topics: { strong: "System Metrics", weak: "Requires Login" },
        mastery: {
          totalTopics: 0,
          masteredCount: 0,
          weakCount: 0,
          revisionDueCount: 0,
          averageMastery: 0
        },
        insight: "Preview Mode: Register natively to unlock structural analytical tracking arrays and start ranking up! 🧠✨"
      });
    }

    // Update daily streak on dashboard load for authenticated users (timezone-aware)
    user = await updateStreak(user, userTimezone);

    // 1. Calculate Last 7 Days Activity Array for the UI Recharts in user's IANA timezone
    const localDays = getRecentDaysArray(7, userTimezone);
    const queryCutoff = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8-day UTC buffer for safe match

    const activities = await Activity.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: queryCutoff }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$createdAt",
              timezone: userTimezone
            } 
          },
          sessions: { 
            $sum: { $cond: [{ $eq: ["$type", "study"] }, 1, 0] } 
          },
          chats: { 
            $sum: { $cond: [{ $eq: ["$type", "chat"] }, 1, 0] } 
          },
          studyTime: { 
            $sum: { $cond: [{ $eq: ["$type", "study"] }, "$duration", 0] } 
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Create a dense array aligned to the user's local 7 calendar days
    const dailyActivity = localDays.map(d => {
      const found = activities.find(a => a._id === d.date);
      return {
        date: d.date,
        day: d.day,
        sessions: found ? found.sessions : 0,
        chats: found ? found.chats : 0,
        studyTime: found ? Math.round(found.studyTime / 60) : 0 // Convert to minutes
      };
    });

    // 2. Weak vs Strong Topics (Determined by TopicMastery)
    const masteryTopics = await TopicMastery.find({ userId: user._id }).lean();
    
    let strongTopic = "Keep studying!";
    let weakTopic = "Add more topics!";
    
    if (masteryTopics.length > 0) {
      const sortedByMastery = [...masteryTopics].sort((a, b) => (b.masteryScore || 0) - (a.masteryScore || 0));
      strongTopic = sortedByMastery[0].topicName;
      
      const weakOnes = masteryTopics.filter(t => t.isWeakArea).sort((a, b) => (a.masteryScore || 0) - (b.masteryScore || 0));
      if (weakOnes.length > 0) {
        weakTopic = weakOnes[0].topicName;
      } else if (masteryTopics.length > 1) {
        weakTopic = sortedByMastery[sortedByMastery.length - 1].topicName;
      }
    }

    // Additional mastery stats for UI component using single source of truth helper
    const now = new Date();
    const masteryStats = {
      totalTopics: masteryTopics.length,
      masteredCount: masteryTopics.filter(t => (t.masteryScore || 0) >= 80).length,
      weakCount: masteryTopics.filter(t => t.isWeakArea).length,
      revisionDueCount: masteryTopics.filter(t => isRevisionDue(t, now)).length,
      averageMastery: masteryTopics.length > 0 
        ? Math.round(masteryTopics.reduce((acc, t) => acc + (t.masteryScore || 0), 0) / masteryTopics.length)
        : 0
    };

    // 3. Dynamic Insight Text (Cached)
    const insightText = await getCachedOrGenerateInsight(user._id, user.name, {
        level: user.level || 1,
        streak: user.streak || 0,
        focusHours: user.focusHours || 0
    });

    res.json({
      stats: {
        xp: user.xp || 0,
        level: user.level || 1,
        streak: user.streak || 0,
        focusHours: user.focusHours || 0,
      },
      dailyActivity,
      topics: {
        strong: strongTopic,
        weak: weakTopic
      },
      mastery: masteryStats,
      insight: insightText
    });

  } catch (err) {
    console.error("Dashboard API Error:", err);
    res.status(500).json({ error: "Failed to load dashboard analytics" });
  }
});

module.exports = router;
