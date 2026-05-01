const express = require('express');
const router = express.Router();
const yts = require('yt-search');
const axios = require('axios');
const { protect } = require('../middlewares/auth');

// Simple in-memory cache — expires after 10 minutes
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.data;
};
const setCache = (key, data) => cache.set(key, { data, ts: Date.now() });

// @route  GET /api/discover?q=...
// @desc   Search YouTube + AI-filter for best learning resources
router.get('/', protect, async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.status(400).json({ message: 'Query too short.' });
  }

  const cacheKey = query.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    // ── Step 1: Fetch YouTube results ────────────────────────────────────────
    const [videoResults, playlistResults] = await Promise.all([
      yts(query),
      yts({ query, type: 'p' }),
    ]);

    // Map videos
    const rawVideos = (videoResults.videos || []).slice(0, 12).map((v) => ({
      id: v.videoId,
      title: v.title,
      channel: v.author?.name || v.channel || 'Unknown',
      type: 'video',
      url: `https://www.youtube.com/watch?v=${v.videoId}`,
      thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
      views: v.views,
      duration: v.duration?.timestamp || '',
    }));

    // Map playlists
    const rawPlaylists = (playlistResults.playlists || []).slice(0, 6).map((p) => ({
      id: p.listId,
      title: p.title,
      channel: p.channel?.name || p.author || 'Unknown',
      type: 'playlist',
      url: `https://www.youtube.com/playlist?list=${p.listId}`,
      thumbnail: p.thumbnail?.url || p.thumbnail || '',
      videoCount: p.videoCount || null,
    }));

    const combined = [...rawVideos, ...rawPlaylists];

    if (combined.length === 0) {
      return res.json({ results: [] });
    }

    // ── Step 2: AI Filter + Rank ─────────────────────────────────────────────
    const summaryList = combined.map((r, i) =>
      `${i + 1}. [${r.type.toUpperCase()}] "${r.title}" by ${r.channel}${r.videoCount ? ` (${r.videoCount} videos)` : ''}`
    ).join('\n');

    const prompt = `You are an expert educational content curator.

Given these YouTube search results for the query: "${query}"

${summaryList}

Your task:
1. Select the BEST 5-7 results that are genuinely educational and structured for learning.
2. Remove clickbait, entertainment-only, shorts, or unrelated content.
3. For each selected item, assign a difficulty: "beginner", "intermediate", or "advanced".
4. Prefer playlists and full courses over isolated videos when available.

Respond ONLY with a valid JSON array, no extra text:
[
  { "index": 1, "difficulty": "beginner" },
  { "index": 3, "difficulty": "intermediate" }
]`;

    let aiFiltered = [];
    try {
      const aiRes = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemini-flash-1.5',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 512,
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const rawReply = aiRes.data.choices?.[0]?.message?.content || '';
      const jsonMatch = rawReply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          aiFiltered = parsed;
        }
      }
    } catch (aiErr) {
      console.warn('AI filtering failed, falling back to raw results:', aiErr.message);
    }

    // ── Step 3: Build final result set ───────────────────────────────────────
    let finalResults;

    if (aiFiltered.length > 0) {
      finalResults = aiFiltered
        .filter((entry) => entry.index >= 1 && entry.index <= combined.length)
        .map((entry) => ({
          ...combined[entry.index - 1],
          difficulty: entry.difficulty || 'beginner',
        }));
    } else {
      // Fallback: return first 7 with 'beginner' tag
      finalResults = combined.slice(0, 7).map((r) => ({ ...r, difficulty: 'beginner' }));
    }

    const output = { results: finalResults };
    setCache(cacheKey, output);
    res.json(output);

  } catch (err) {
    console.error('Discover route error:', err.message);
    res.status(500).json({ message: 'Search failed. Please try again.' });
  }
});

module.exports = router;
