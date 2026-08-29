const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');
const { protect } = require('../middlewares/auth');

const { fetchPlaylistDetails } = require('../integrations/youtubeService');

// @route   POST /api/skillhub/add-source
// @desc    Add a source to Skill Hub (from AI Discovery / search results)
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

    let type = sourceType === 'documentation' ? 'documentation' : (sourceType === 'playlist' ? 'playlist' : 'video');
    let playlistData = null;
    let videos = [];

    // Detect playlist URL
    const playlistIdMatch = sourceUrl.match(/[&?]list=([^&#]+)/) || sourceUrl.match(/\/playlist\?list=([^&#]+)/);
    const playlistId = playlistIdMatch ? playlistIdMatch[1] : null;

    if (playlistId) {
      const fetched = await fetchPlaylistDetails(playlistId);
      if (fetched && fetched.videos.length > 0) {
        type = 'playlist';
        playlistData = fetched;
        videos = fetched.videos.map(v => v.videoId);
      }
    }

    // Create new Skill document
    const newSkill = new Skill({
      userId: req.user.id,
      title: sourceTitle,
      category: 'AI Recommended',
      videoUrl: sourceUrl,
      type,
      videos,
      ...(playlistData && { playlistData }),
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

