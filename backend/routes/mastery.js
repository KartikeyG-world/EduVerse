const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const TopicMastery = require('../models/TopicMastery');
const { updateTopicMastery } = require('../utils/mastery');

// @route   POST /api/mastery/track
// @desc    Manually track or update topic progress
router.post('/track', protect, async (req, res) => {
  try {
    const { topicName, category, isCorrect, confidence, difficulty, notes } = req.body;

    if (!topicName || !category) {
      return res.status(400).json({ message: 'Topic name and category are required' });
    }

    const topic = await updateTopicMastery(req.user.id, topicName, category, {
      isCorrect,
      confidence,
      difficulty,
      notes
    });

    res.json(topic);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/mastery/stats
// @desc    Get learning analytics summary
router.get('/stats', protect, async (req, res) => {
  try {
    const topics = await TopicMastery.find({ userId: req.user.id });
    
    const totalTopics = topics.length;
    const masteredTopics = topics.filter(t => t.masteryScore >= 80).length;
    const weakTopics = topics.filter(t => t.isWeakArea).length;
    
    const now = new Date();
    const revisionDue = topics.filter(t => t.nextRevisionDue <= now).length;
    
    const averageMastery = totalTopics > 0 
      ? Math.round(topics.reduce((acc, t) => acc + t.masteryScore, 0) / totalTopics)
      : 0;

    // Improvement areas (topics with high correctAttempts)
    const improvementAreas = topics
      .filter(t => t.correctAttempts > t.wrongAttempts)
      .sort((a, b) => (b.correctAttempts - b.wrongAttempts) - (a.correctAttempts - a.wrongAttempts))
      .slice(0, 3)
      .map(t => t.topicName);

    res.json({
      totalTopics,
      masteredTopics,
      weakTopics,
      revisionDue,
      averageMastery,
      improvementAreas
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/mastery/weak
// @desc    Get weak topics
router.get('/weak', protect, async (req, res) => {
  try {
    const topics = await TopicMastery.find({ userId: req.user.id, isWeakArea: true })
      .sort({ masteryScore: 1 })
      .limit(10);
    res.json(topics);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/mastery/revision
// @desc    Get topics due for revision
router.get('/revision', protect, async (req, res) => {
  try {
    const now = new Date();
    const topics = await TopicMastery.find({ 
      userId: req.user.id, 
      nextRevisionDue: { $lte: now } 
    }).sort({ nextRevisionDue: 1 });
    res.json(topics);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/mastery/mastered
// @desc    Get mastered topics
router.get('/mastered', protect, async (req, res) => {
  try {
    const topics = await TopicMastery.find({ userId: req.user.id, masteryScore: { $gte: 80 } })
      .sort({ masteryScore: -1 });
    res.json(topics);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/mastery/all
// @desc    Get all tracked topics
router.get('/all', protect, async (req, res) => {
  try {
    const topics = await TopicMastery.find({ userId: req.user.id }).sort({ lastStudiedAt: -1 });
    res.json(topics);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
