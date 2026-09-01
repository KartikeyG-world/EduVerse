const axios = require("axios");
const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');
const User = require('../models/User');
const { protect, optionalAuth, invalidateUserCache } = require('../middlewares/auth');
const { createNotification } = require('../utils/notification');
const QuizAttempt = require('../models/QuizAttempt');
const { updateTopicMastery } = require('../utils/mastery');
const { fetchPlaylistDetails, getPlaylistCount } = require('../integrations/youtubeService');

// In-memory sync throttling map: skillId -> timestamp of last check
const syncThrottleMap = new Map();
const SYNC_THROTTLE_MS = 60 * 1000; // 60s throttle between checks

/**
 * Non-destructively re-syncs playlist videos with YouTube.
 * Preserves all existing watch progress, completion status, and custom order.
 */
const syncPlaylistVideos = async (skill) => {
  if (!skill || skill.type !== 'playlist' || !skill.playlistData?.playlistId) {
    return { skill, updated: false };
  }

  const playlistId = skill.playlistData.playlistId;
  const fetched = await fetchPlaylistDetails(playlistId);
  if (!fetched || !fetched.videos || fetched.videos.length === 0) {
    return { skill, updated: false };
  }

  const existingVideos = skill.playlistData.videos || [];
  const existingMap = new Map(existingVideos.map(v => [v.videoId, v]));
  const existingCompleted = new Set(skill.completedVideos || []);

  let addedCount = 0;
  const mergedVideos = fetched.videos.map(item => {
    if (existingMap.has(item.videoId)) {
      const existing = existingMap.get(item.videoId);
      return {
        title: item.title || existing.title,
        videoId: item.videoId,
        duration: item.duration || existing.duration || '',
        durationSecs: item.durationSecs || existing.durationSecs || 0,
        thumbnail: item.thumbnail || existing.thumbnail || null,
        isCompleted: Boolean(existing.isCompleted || existingCompleted.has(item.videoId)),
        lastWatchedTimestamp: existing.lastWatchedTimestamp || 0,
      };
    } else {
      addedCount++;
      return {
        title: item.title,
        videoId: item.videoId,
        duration: item.duration || '',
        durationSecs: item.durationSecs || 0,
        thumbnail: item.thumbnail || null,
        isCompleted: false,
        lastWatchedTimestamp: 0,
      };
    }
  });

  // Only update if video count or composition changed
  if (addedCount > 0 || mergedVideos.length !== existingVideos.length) {
    skill.playlistData.videos = mergedVideos;
    skill.videos = mergedVideos.map(v => v.videoId);
    skill.playlistData.totalVideos = mergedVideos.length;
    skill.markModified('playlistData');
    await skill.save();
    return { skill, updated: true, addedCount, totalVideos: mergedVideos.length };
  }

  return { skill, updated: false, totalVideos: mergedVideos.length };
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
// @desc    Get a specific skill with progress (auto-syncs if playlist count changed)
router.get('/:id', protect, async (req, res) => {
  try {
    let skill = await Skill.findOne({ _id: req.params.id, userId: req.user.id });

    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Lightweight Auto-Sync for playlists (throttled to max 1 check per 60s per skill)
    if (skill.type === 'playlist' && skill.playlistData?.playlistId) {
      const skillIdStr = skill._id.toString();
      const lastChecked = syncThrottleMap.get(skillIdStr) || 0;
      const now = Date.now();

      if (now - lastChecked > SYNC_THROTTLE_MS) {
        syncThrottleMap.set(skillIdStr, now);
        try {
          const currentCount = await getPlaylistCount(skill.playlistData.playlistId);
          const storedCount = skill.playlistData.videos?.length || 0;

          if (currentCount && currentCount !== storedCount) {
            const syncResult = await syncPlaylistVideos(skill);
            if (syncResult.updated) {
              skill = syncResult.skill;
            }
          }
        } catch (syncErr) {
          console.warn('[Skills:AutoSync Error]:', syncErr.message);
        }
      }
    }

    res.json(skill);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/skills/:id/sync
// @desc    Explicitly re-sync playlist with source YouTube playlist
router.post('/:id/sync', protect, async (req, res) => {
  try {
    const skill = await Skill.findOne({ _id: req.params.id, userId: req.user.id });

    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    if (skill.type !== 'playlist' || !skill.playlistData?.playlistId) {
      return res.status(400).json({ message: 'Skill is not a playlist or missing playlist ID' });
    }

    const result = await syncPlaylistVideos(skill);
    res.json({
      success: true,
      updated: result.updated,
      addedCount: result.addedCount || 0,
      totalVideos: result.totalVideos || skill.playlistData?.videos?.length || 0,
      skill: result.skill,
    });
  } catch (err) {
    console.error('[Skills:ManualSync Error]:', err.message);
    res.status(500).json({ success: false, message: 'Failed to sync playlist' });
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

    // Lock updates for single-video skills after completion (high-water mark — never go backward)
    if (skill.type !== 'playlist' && skill.completed) {
      return res.json(skill);
    }

    // Track pre-save state to detect newly-completed skills for XP reward
    const wasCompleted = skill.completed;
    let prevVideoIndex = undefined;

    if (skill.type === 'playlist') {
      const targetVid = videoId || completedVideoId;

      if (skill.playlistData) {
        prevVideoIndex = skill.playlistData.currentVideoIndex;
        // Monotonic Resume Pointer: only advance forward
        if (currentVideoIndex !== undefined) {
          skill.playlistData.currentVideoIndex = Math.max(skill.playlistData.currentVideoIndex || 0, currentVideoIndex);
        }
        // Timestamp at playlist level
        if (lastWatchedTimestamp !== undefined) {
          if (lastWatchedTimestamp === 0 && (isCompleted || completedVideoId)) {
            skill.playlistData.lastWatchedTimestamp = 0;
          } else if (lastWatchedTimestamp > (skill.playlistData.lastWatchedTimestamp || 0)) {
            skill.playlistData.lastWatchedTimestamp = lastWatchedTimestamp;
          }
        }
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
            // Monotonic completion: Never unmark a completed video unless explicit false is provided
            if (shouldComplete === true) {
              vidItem.isCompleted = true;
            } else if (shouldComplete === false) {
              vidItem.isCompleted = false;
            }

            // Monotonic timestamp: never decrease stored timestamp during replay unless resetting to 0 on finish
            if (lastWatchedTimestamp !== undefined) {
              if (lastWatchedTimestamp === 0 && shouldComplete === true) {
                vidItem.lastWatchedTimestamp = 0;
              } else if (lastWatchedTimestamp > (vidItem.lastWatchedTimestamp || 0)) {
                vidItem.lastWatchedTimestamp = lastWatchedTimestamp;
              }
            }
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
        { returnDocument: 'after' }
      );
      if (updatedUser) {
        const newLevel = Math.floor(updatedUser.xp / 1000) + 1;
        if (updatedUser.level !== newLevel) {
          await User.findByIdAndUpdate(req.user.id, { $set: { level: newLevel } });
        }
        invalidateUserCache(updatedUser._id);
      }

      await createNotification(
        req.user.id,
        'XP',
        `🎉 You mastered "${skill.title}" and earned ${xpReward} XP!`
      );
    }

    // Server-side safety net reconciler for watch-range quiz generation
    const { reconcilePlaylistProgress } = require('../jobs/quizGenerationJob');
    reconcilePlaylistProgress(req.user.id, skill, { ...req.body, prevVideoIndex }).catch((e) => {
      console.warn('[Skills:ProgressReconcile Error]:', e.message);
    });

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
      difficulty: skill.difficulty || 'medium',
      sourceType: 'quiz'
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
    })
      .sort({ date: -1 })
      .lean();

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

router.syncPlaylistVideos = syncPlaylistVideos;
router.syncThrottleMap = syncThrottleMap;
router.SYNC_THROTTLE_MS = SYNC_THROTTLE_MS;

module.exports = router;
