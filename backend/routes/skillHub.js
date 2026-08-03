const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');
const { protect } = require('../middlewares/auth');

const ytpl = require('ytpl');
const axios = require('axios');

// ── Shared playlist fetcher with ytpl primary + YouTube API v3 paginated fallback ──
// Mirrors the same logic as in skills.js to ensure consistency.
const fetchPlaylistDetailsForHub = async (playlistId) => {
  // Primary: ytpl (limit: Infinity fetches all pages)
  try {
    const playlist = await ytpl(playlistId, { limit: Infinity });
    if (playlist && playlist.items && playlist.items.length > 0) {
      return {
        playlistId,
        totalVideos: playlist.items.length,
        videos: playlist.items.map(item => ({
          title: item.title,
          videoId: item.id,
          duration: item.duration || '',
          thumbnail: item.bestThumbnail?.url || item.thumbnail || `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
          isCompleted: false
        }))
      };
    }
  } catch (err) {
    console.warn('[SkillHub] ytpl fetch failed, trying YouTube Data API v3 fallback:', err.message);
  }

  // Fallback: YouTube Data API v3 with full nextPageToken pagination
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const allItems = [];
      let nextPageToken = null;

      do {
        const params = {
          part: 'snippet,contentDetails',
          playlistId,
          maxResults: 50,
          key: apiKey,
        };
        if (nextPageToken) params.pageToken = nextPageToken;

        const res = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', { params });
        const pageItems = res.data.items || [];
        allItems.push(...pageItems);
        nextPageToken = res.data.nextPageToken || null;
      } while (nextPageToken);

      if (allItems.length > 0) {
        return {
          playlistId,
          totalVideos: allItems.length,
          videos: allItems
            .filter(item => item.snippet?.resourceId?.videoId)
            .map(item => ({
              title: item.snippet.title,
              videoId: item.snippet.resourceId.videoId,
              duration: '',
              thumbnail:
                item.snippet.thumbnails?.high?.url ||
                item.snippet.thumbnails?.medium?.url ||
                item.snippet.thumbnails?.default?.url ||
                `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/hqdefault.jpg`,
              isCompleted: false
            }))
        };
      }
    } catch (apiErr) {
      console.warn('[SkillHub] YouTube Data API fallback failed:', apiErr.response?.data || apiErr.message);
    }
  }

  return null;
};

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
      const fetched = await fetchPlaylistDetailsForHub(playlistId);
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

