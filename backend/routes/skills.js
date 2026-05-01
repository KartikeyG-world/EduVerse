const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');
const { protect } = require('../middlewares/auth');
const { createNotification } = require('../utils/notification');
const QuizAttempt = require('../models/QuizAttempt');
const ytpl = require('ytpl');
const axios = require('axios');

// @route   POST /api/skills
// @desc    Add a new skill with video tracking
router.post('/', protect, async (req, res) => {
  try {
    const { title, category, videoUrl, source, difficulty, channelName, thumbnailUrl } = req.body;

    if (!title || !category || !videoUrl) {
      return res.status(400).json({ message: 'Please provide title, category and videoUrl' });
    }

    let type = 'video';
    let videos = [];

    // Playlist Detection — ONLY for explicit playlist URLs (no v= param present)
    // URLs like youtube.com/watch?v=xyz&list=abc are treated as single videos
    const hasVideoParam = /[?&]v=/.test(videoUrl);
    const isExplicitPlaylist = !hasVideoParam && (videoUrl.includes('/playlist?') || videoUrl.includes('list='));

    if (isExplicitPlaylist) {
      try {
        const playlistIdMatch = videoUrl.match(/[&?]list=([^&#]+)/);
        const playlistId = playlistIdMatch ? playlistIdMatch[1] : null;

        if (playlistId) {
          const playlist = await ytpl(playlistId, { limit: Infinity });
          if (playlist && playlist.items && playlist.items.length > 0) {
            type = 'playlist';
            videos = playlist.items.map(item => item.id);
          }
        }
      } catch (ytplErr) {
        console.warn('Playlist fetch failed, falling back to video mode:', ytplErr.message);
      }
    }

    const newSkill = new Skill({
      userId: req.user.id,
      title,
      category,
      videoUrl,
      type,
      videos,
      ...(source       && { source }),
      ...(difficulty   && { difficulty }),
      ...(channelName  && { channelName }),
      ...(thumbnailUrl && { thumbnailUrl }),
    });

    const skill = await newSkill.save();
    res.status(201).json(skill);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/skills/search
// @desc    YouTube Data API v3 Search - Top 10 most viewed videos
router.get('/search', protect, async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.status(400).json({ message: 'Query too short.' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: 'YouTube API key is missing. Please configure your environment.' });
  }

  try {
    // Step 1: Search for top relevance videos
    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'id,snippet',
        q: query,
        maxResults: 20,
        type: 'video',
        key: apiKey,
      }
    });

    const items = searchRes.data.items || [];
    if (items.length === 0) {
      return res.json({ results: [] });
    }

    const videoIds = items.map(item => item.id.videoId).join(',');

    // Step 2: Fetch detailed statistics for those videos
    const statsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: videoIds,
        key: apiKey,
      }
    });

    const videosData = statsRes.data.items || [];

    // Map and sort by views descending
    const results = videosData.map(v => ({
      id: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.default?.url,
      channel: v.snippet.channelTitle,
      views: parseInt(v.statistics.viewCount, 10) || 0,
      type: 'video',
      url: `https://www.youtube.com/watch?v=${v.id}`
    }));

    results.sort((a, b) => b.views - a.views);

    res.json({ results: results.slice(0, 10) });

  } catch (err) {
    console.error('YouTube API Search error:', err.response?.data || err.message);
    res.status(500).json({ message: 'Unable to fetch results. Please try again.' });
  }
});

// @route   GET /api/skills
// @desc    Get all skills for the authenticated user (sorted by lastWatched, then newest first)
router.get('/', protect, async (req, res) => {
  try {
    const skills = await Skill.find({ userId: req.user.id }).sort({ lastWatched: -1, createdAt: -1 });
    res.json(skills);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/skills/:id
// @desc    Get a specific skill with progress
router.get('/:id', protect, async (req, res) => {
  try {
    const skill = await Skill.findOne({ _id: req.params.id, userId: req.user.id });

    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    res.json(skill);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/skills/:id/progress
// @desc    Update watched duration and recompute progress via pre-save hook
router.put('/:id/progress', protect, async (req, res) => {
  try {
    const { watchedDuration, totalDuration, completedVideoId } = req.body;
    const skill = await Skill.findOne({ _id: req.params.id, userId: req.user.id });

    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Never allow progress to go backward (high-water mark)
    if (skill.completed) {
      return res.json(skill); // Lock updates after completion
    }

    const wasCompleted = skill.completed;

    if (skill.type === 'playlist' && completedVideoId) {
      if (!skill.completedVideos.includes(completedVideoId)) {
        skill.completedVideos.push(completedVideoId);
      }
    }

    // Only update totalDuration if provided and valid  
    if (totalDuration && totalDuration > 0) {
      skill.totalDuration = totalDuration;
    }

    // Only advance watchedDuration (never allow backward scrubbing to reduce progress)
    if (watchedDuration !== undefined && watchedDuration > skill.watchedDuration) {
      skill.watchedDuration = watchedDuration;
    }

    skill.lastWatched = Date.now();

    // pre-save hook auto-computes progress and sets completed
    await skill.save();

    // Trigger XP reward and notification if newly completed
    if (!wasCompleted && skill.completed) {
      const xpReward = 500;
      req.user.xp = (req.user.xp || 0) + xpReward;
      req.user.level = Math.floor(req.user.xp / 1000) + 1;
      await req.user.save();

      await createNotification(
        req.user.id,
        'XP',
        `🎉 You mastered "${skill.title}" and earned ${xpReward} XP!`
      );
    }

    res.json(skill);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/skills/:id/quiz
// @desc    Save a quiz attempt result for a specific skill
router.post('/:id/quiz', protect, async (req, res) => {
  try {
    const { score, totalQuestions } = req.body;

    if (score === undefined || !totalQuestions || totalQuestions === 0) {
      return res.status(400).json({ message: 'score and totalQuestions are required' });
    }

    // Verify the skill belongs to this user
    const skill = await Skill.findOne({ _id: req.params.id, userId: req.user.id });
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    const percentage = Math.round((score / totalQuestions) * 100);

    const attempt = new QuizAttempt({
      userId: req.user.id,
      skillId: req.params.id,
      score,
      totalQuestions,
      percentage,
    });

    await attempt.save();

    res.status(201).json(attempt);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/skills/:id/quiz
// @desc    Get all quiz attempts for a skill (for performance calendar)
router.get('/:id/quiz', protect, async (req, res) => {
  try {
    const skill = await Skill.findOne({ _id: req.params.id, userId: req.user.id });
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    const attempts = await QuizAttempt.find({
      skillId: req.params.id,
      userId: req.user.id,
    }).sort({ date: -1 });

    res.json(attempts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/skills/:id
// @desc    Delete a skill
router.delete('/:id', protect, async (req, res) => {
  try {
    const skill = await Skill.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    res.json({ message: 'Skill removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
