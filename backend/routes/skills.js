const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middlewares/auth');
const { createNotification } = require('../utils/notification');
const QuizAttempt = require('../models/QuizAttempt');
const { updateTopicMastery } = require('../utils/mastery');
const ytpl = require('ytpl');
const axios = require('axios');

// Helper to fetch playlist details via ytpl with YouTube API v3 fallback (full pagination)
const fetchPlaylistDetails = async (playlistId) => {
  // ── Primary: ytpl (limit: Infinity fetches all pages automatically) ──
  try {
    const playlist = await ytpl(playlistId, { limit: Infinity });
    if (playlist && playlist.items && playlist.items.length > 0) {
      console.log(`[Playlist] ytpl fetched ${playlist.items.length} videos for playlist ${playlistId}`);
      return {
        playlistId,
        totalVideos: playlist.items.length,
        title: playlist.title || null,
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
    console.warn('[Playlist] ytpl fetch failed, trying YouTube Data API v3 fallback:', err.message);
  }

  // ── Fallback: YouTube Data API v3 with full nextPageToken pagination ──
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const allItems = [];
      let nextPageToken = null;

      // Paginate through ALL pages until nextPageToken is null (last page)
      do {
        const params = {
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: 50,
          key: apiKey,
        };
        if (nextPageToken) params.pageToken = nextPageToken;

        const res = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', { params });
        const pageItems = res.data.items || [];
        allItems.push(...pageItems);
        nextPageToken = res.data.nextPageToken || null;

        console.log(`[Playlist] YT API page fetched: ${pageItems.length} items, nextPageToken: ${nextPageToken || 'none'}`);
      } while (nextPageToken);

      if (allItems.length > 0) {
        console.log(`[Playlist] YT API total fetched: ${allItems.length} videos for playlist ${playlistId}`);
        return {
          playlistId,
          totalVideos: allItems.length,
          videos: allItems
            .filter(item => item.snippet?.resourceId?.videoId) // skip deleted/private
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
      console.warn('[Playlist] YouTube Data API fallback failed:', apiErr.response?.data || apiErr.message);
    }
  }

  return null;
};

// @route   POST /api/skills
// @desc    Add a new skill with video/playlist tracking
router.post('/', protect, async (req, res) => {
  try {
    const { title, category, videoUrl, source, difficulty, channelName, thumbnailUrl } = req.body;

    if (!title || !category || !videoUrl) {
      return res.status(400).json({ message: 'Please provide title, category and videoUrl' });
    }

    let type = 'video';
    let videos = [];
    let playlistData = null;

    // Detect Playlist URL (contains list= parameter or /playlist?)
    const playlistIdMatch = videoUrl.match(/[&?]list=([^&#]+)/) || videoUrl.match(/\/playlist\?list=([^&#]+)/);
    const playlistId = playlistIdMatch ? playlistIdMatch[1] : null;

    if (playlistId) {
      const fetchedPlaylist = await fetchPlaylistDetails(playlistId);
      if (fetchedPlaylist && fetchedPlaylist.videos.length > 0) {
        type = 'playlist';
        playlistData = fetchedPlaylist;
        videos = fetchedPlaylist.videos.map(v => v.videoId);
      }
    }

    const newSkill = new Skill({
      userId: req.user.id,
      title,
      category,
      videoUrl,
      type,
      videos,
      ...(playlistData && { playlistData }),
      ...(source       && { source }),
      ...(difficulty   && { difficulty }),
      ...(channelName  && { channelName }),
      ...(thumbnailUrl && { thumbnailUrl }),
    });

    const skill = await newSkill.save();
    res.status(201).json(skill);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
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
router.get('/', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, skills: [] });
    }
    const skills = await Skill.find({ userId: req.user.id }).sort({ lastWatched: -1, createdAt: -1 });
    res.json(skills);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   PUT /api/skills/:id/progress
// @desc    Update watched duration and recompute progress via pre-save hook
router.put('/:id/progress', protect, async (req, res) => {
  try {
    const { watchedDuration, totalDuration, videoId, isCompleted, completedVideoId, currentVideoIndex, lastWatchedTimestamp } = req.body;
    const skill = await Skill.findOne({ _id: req.params.id, userId: req.user.id });

    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Lock updates after completion (high-water mark — never go backward)
    if (skill.completed) {
      return res.json(skill);
    }

    // Track pre-save state to detect newly-completed skills for XP reward
    const wasCompleted = false; // Always false here — we returned above if already completed

    if (skill.type === 'playlist') {
      const targetVid = videoId || completedVideoId;

      if (skill.playlistData) {
        if (currentVideoIndex !== undefined) skill.playlistData.currentVideoIndex = currentVideoIndex;
        if (lastWatchedTimestamp !== undefined) skill.playlistData.lastWatchedTimestamp = lastWatchedTimestamp;
        skill.markModified('playlistData');
      }

      if (targetVid) {
        let shouldComplete = null;
        if (isCompleted !== undefined) {
          shouldComplete = Boolean(isCompleted);
        } else if (completedVideoId) {
          shouldComplete = true;
        }

        if (skill.playlistData && skill.playlistData.videos) {
          const vidItem = skill.playlistData.videos.find(v => v.videoId === targetVid);
          if (vidItem) {
            if (shouldComplete !== null) vidItem.isCompleted = shouldComplete;
            if (lastWatchedTimestamp !== undefined) vidItem.lastWatchedTimestamp = lastWatchedTimestamp;
          }
          skill.markModified('playlistData');
        }

        if (shouldComplete === true) {
          if (!skill.completedVideos.includes(targetVid)) {
            skill.completedVideos.push(targetVid);
          }
        } else if (shouldComplete === false) {
          skill.completedVideos = skill.completedVideos.filter(v => v !== targetVid);
        }
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
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $inc: { xp: xpReward } },
        { new: true }
      );
      if (updatedUser) {
        const newLevel = Math.floor(updatedUser.xp / 1000) + 1;
        if (updatedUser.level !== newLevel) {
          await User.findByIdAndUpdate(req.user.id, { $set: { level: newLevel } });
        }
      }

      await createNotification(
        req.user.id,
        'XP',
        `🎉 You mastered "${skill.title}" and earned ${xpReward} XP!`
      );
    }

    res.json(skill);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
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

    // Hook into Mastery Engine — track per-topic mastery scores
    await updateTopicMastery(req.user.id, skill.title, skill.category, {
      isCorrect: percentage >= 70,
      confidence: percentage,
      difficulty: skill.difficulty || 'medium'
    });

    res.status(201).json(attempt);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
