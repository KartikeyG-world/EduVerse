const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');
const { protect } = require('../middlewares/auth');

// @route   POST /api/skillhub/add-source
// @desc    Add a source to Skill Hub
router.post('/add-source', protect, async (req, res) => {
  try {
    const { sourceUrl, sourceTitle, sourceType, thumbnailUrl, sourceMetadata } = req.body;

    if (!sourceUrl || !sourceTitle) {
      return res.status(400).json({ message: 'sourceUrl and sourceTitle are required' });
    }

    // Check for duplicate
    const existingSkill = await Skill.findOne({ userId: req.user.id, videoUrl: sourceUrl });
    if (existingSkill) {
      return res.status(409).json({ message: 'Source already added' });
    }

    // Create new Skill document
    const newSkill = new Skill({
      userId: req.user.id,
      title: sourceTitle,
      category: 'AI Recommended', // Categorize appropriately
      videoUrl: sourceUrl,
      type: sourceType === 'documentation' ? 'documentation' : (sourceType === 'playlist' ? 'playlist' : 'video'),
      thumbnailUrl: thumbnailUrl || null,
      channelName: sourceMetadata?.channel || null,
      source: 'search'
    });

    const savedSkill = await newSkill.save();
    res.status(201).json(savedSkill);
  } catch (err) {
    console.error('Error adding source to skill hub:', err);
    res.status(500).json({ message: 'Server error adding source' });
  }
});

module.exports = router;
