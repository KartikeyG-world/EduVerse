const express = require("express");
const router = express.Router();
const { protect, optionalAuth } = require("../middlewares/auth");
const Activity = require("../models/Activity");
const Plan = require("../models/Plan");
const TopicMastery = require("../models/TopicMastery");
const axios = require("axios");
const { updateStreak } = require("../utils/streak");

// Re-using the robust OpenRouter proxy pattern
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const generateInsight = async (userName, stats) => {
  try {
    const prompt = `You are an encouraging AI Coach studying inside a premium learning dashboard.
The student, ${userName}, has accumulated ${stats.level} levels, a ${stats.streak} day streak, and focused for ${stats.focusHours.toFixed(1)} hours.
Write a very short, punchy, 2-sequence encouraging insight or tip for them. Keep it under 2 sentences. Use emojis.`;

    const response = await axios.post(OPENROUTER_URL, 
      {
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "system", content: prompt }]
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5000",
          "X-OpenRouter-Title": "EduVerse AI"
        }
      }
    );

    return response.data?.choices?.[0]?.message?.content || "Keep up the excellent momentum! 🔥";
  } catch (error) {
    console.error("AI Insight Generation Failed:", error.message || error);
    return "Consistent focus brings massive results! 🧠✨";
  }
};

// GET /api/dashboard
router.get("/", optionalAuth, async (req, res) => {
  try {
    let user = req.user;

    // Gracefully handle Native Guest Mode
    if (!user) {
      return res.json({
        stats: { xp: 0, level: 1, streak: 0, focusHours: 0 },
        dailyActivity: Array.from({length: 7}).map((_, i) => ({
          date: new Date(Date.now() - (6-i)*86400000).toISOString().split('T')[0],
          day: new Date(Date.now() - (6-i)*86400000).toLocaleDateString("en-US", { weekday: 'short' }),
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

    // Update daily streak on dashboard load for authenticated users
    user = await updateStreak(user);

    // 1. Calculate Last 7 Days Activity Array for the UI Recharts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const activities = await Activity.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
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

    // Create a dense array (fill missing dates with 0s)
    const dailyActivity = [];
    for (let i = 0; i <= 6; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const displayDay = d.toLocaleDateString("en-US", { weekday: 'short' });
        
        const found = activities.find(a => a._id === dateStr);
        dailyActivity.push({
            date: dateStr,
            day: displayDay,
            sessions: found ? found.sessions : 0,
            chats: found ? found.chats : 0,
            studyTime: found ? Math.round(found.studyTime / 60) : 0 // Convert to minutes
        });
    }

    // 2. Weak vs Strong Topics (Determined by TopicMastery)
    const masteryTopics = await TopicMastery.find({ userId: user._id }).lean();
    
    let strongTopic = "Keep studying!";
    let weakTopic = "Add more topics!";
    
    if (masteryTopics.length > 0) {
      const sortedByMastery = [...masteryTopics].sort((a, b) => b.masteryScore - a.masteryScore);
      strongTopic = sortedByMastery[0].topicName;
      
      const weakOnes = masteryTopics.filter(t => t.isWeakArea).sort((a, b) => a.masteryScore - b.masteryScore);
      if (weakOnes.length > 0) {
        weakTopic = weakOnes[0].topicName;
      } else if (masteryTopics.length > 1) {
        weakTopic = sortedByMastery[sortedByMastery.length - 1].topicName;
      }
    }

    // Additional mastery stats for the new UI component
    const now = new Date();
    const masteryStats = {
      totalTopics: masteryTopics.length,
      masteredCount: masteryTopics.filter(t => t.masteryScore >= 80).length,
      weakCount: masteryTopics.filter(t => t.isWeakArea).length,
      revisionDueCount: masteryTopics.filter(t => t.nextRevisionDue <= now).length,
      averageMastery: masteryTopics.length > 0 
        ? Math.round(masteryTopics.reduce((acc, t) => acc + t.masteryScore, 0) / masteryTopics.length)
        : 0
    };

    // 3. Dynamic Insight Text
    const insightText = await generateInsight(user.name, {
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
