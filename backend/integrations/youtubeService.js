const axios = require('axios');

/**
 * Parses ISO 8601 duration (e.g., PT1H23M45S, PT15M33S, PT45S) into total seconds.
 */
const parseISO8601Duration = (isoDuration) => {
  if (!isoDuration || typeof isoDuration !== 'string') return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Converts seconds into HH:MM:SS or MM:SS format.
 */
const formatSeconds = (totalSec) => {
  const sec = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Parses creator-defined chapters from YouTube video description.
 * Supports patterns: "00:00 Intro", "01:23:45 Chapter Name", "1:23 - Concept", etc.
 */
const parseChaptersFromDescription = (description, totalDurationSec = 0) => {
  if (!description || typeof description !== 'string') return [];
  const lines = description.split(/\r?\n/);
  const chapterRegex = /(?:^|\s)(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\s*[-–—:]?\s*(.+)$/;

  const rawChapters = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(chapterRegex);
    if (match) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      const startSec = hours * 3600 + minutes * 60 + seconds;
      const title = (match[4] || '').trim();
      if (title) {
        rawChapters.push({ startSec, title });
      }
    }
  }

  if (rawChapters.length === 0) return [];

  // Sort chronologically and deduplicate timestamps
  rawChapters.sort((a, b) => a.startSec - b.startSec);
  const chapters = [];
  for (let i = 0; i < rawChapters.length; i++) {
    const current = rawChapters[i];
    const next = rawChapters[i + 1];
    const endSec = next ? next.startSec : Math.max(current.startSec, totalDurationSec || current.startSec + 300);
    chapters.push({
      title: current.title,
      startSec: current.startSec,
      endSec,
    });
  }

  return chapters;
};

/**
 * Maps a watched range [watchedStartSec, watchedEndSec] to overlapping chapters.
 */
const getOverlappingChapters = (chapters, watchedStartSec, watchedEndSec) => {
  if (!chapters || chapters.length === 0) return [];
  return chapters.filter(
    (ch) => Math.max(ch.startSec, watchedStartSec) < Math.min(ch.endSec, watchedEndSec)
  );
};

/**
 * Attempts to retrieve video captions/transcript for watched range.
 * Best-effort graceful degradation.
 */
const getCaptionsForWatchRange = async (videoId, watchedStartSec, watchedEndSec) => {
  // NOTE: External caption scraping libraries or unofficial APIs can be brittle or blocked by YouTube.
  // We keep this integration as a clean, non-blocking try/catch stub that gracefully returns null.
  try {
    return null;
  } catch (_) {
    return null;
  }
};

/**
 * Resolves context for a video's watched range using the 3-layer priority:
 * 1. YouTube Chapters (via videos.list official snippet)
 * 2. Captions / Transcript for watched range
 * 3. Title + Description excerpt (<=300 chars) + Range Hint
 */
const getVideoWatchContext = async (videoId, watchedStartSec, watchedEndSec, fallbackData = {}) => {
  const startSec = Math.max(0, Math.floor(watchedStartSec || 0));
  const endSec = Math.max(startSec, Math.floor(watchedEndSec || 0));
  const rangeStr = `${formatSeconds(startSec)} to ${formatSeconds(endSec)}`;

  let videoTitle = fallbackData.videoTitle || 'Educational Video';
  let videoDesc = fallbackData.videoDesc || '';
  let durationSec = fallbackData.videoDurationSec || 0;

  const apiKey = process.env.YOUTUBE_API_KEY;

  // Layer 0: Fetch official YouTube snippet & duration if apiKey is available
  if (apiKey && videoId) {
    try {
      const ytRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet,contentDetails',
          id: videoId,
          key: apiKey,
        },
        timeout: 6000,
      });

      const item = ytRes.data?.items?.[0];
      if (item) {
        if (item.snippet?.title) videoTitle = item.snippet.title;
        if (item.snippet?.description) videoDesc = item.snippet.description;
        if (item.contentDetails?.duration) {
          durationSec = parseISO8601Duration(item.contentDetails.duration);
        }
      }
    } catch (err) {
      console.warn(`[YouTubeService] YouTube API fetch failed for ${videoId}:`, err.message);
    }
  }

  const totalDurationStr = durationSec > 0 ? ` of ${formatSeconds(durationSec)} total` : '';

  // Priority 1: YouTube Chapters
  const allChapters = parseChaptersFromDescription(videoDesc, durationSec);
  const overlapping = getOverlappingChapters(allChapters, startSec, endSec);

  if (overlapping.length > 0) {
    const chaptersList = overlapping.map((c) => `- ${c.title} (${formatSeconds(c.startSec)} - ${formatSeconds(c.endSec)})`).join('\n');
    return {
      contextType: 'chapters',
      videoTitle,
      videoDesc,
      durationSec,
      topicsSummary: `Watched Chapters (${rangeStr}${totalDurationStr}):\n${chaptersList}`,
      overlappingChapters: overlapping,
    };
  }

  // Priority 2: Captions / Transcript
  const captions = await getCaptionsForWatchRange(videoId, startSec, endSec);
  if (captions && captions.trim().length > 0) {
    return {
      contextType: 'captions',
      videoTitle,
      videoDesc,
      durationSec,
      topicsSummary: `Watched Transcript Segment (${rangeStr}${totalDurationStr}):\n${captions.slice(0, 1000)}`,
      overlappingChapters: [],
    };
  }

  // Priority 3: Title + Description excerpt (<=300 chars) + Range Hint
  const cleanDesc = (videoDesc || '').replace(/\s+/g, ' ').trim();
  const descExcerpt = cleanDesc.slice(0, 300);
  const rangeHint = `Viewer watched from ${rangeStr}${totalDurationStr}.`;

  const fallbackSummary = descExcerpt
    ? `Topic: ${videoTitle}\nScope: ${rangeHint}\nContext Excerpt: ${descExcerpt}`
    : `Topic: ${videoTitle}\nScope: ${rangeHint}`;

  return {
    contextType: 'excerpt',
    videoTitle,
    videoDesc,
    durationSec,
    topicsSummary: fallbackSummary,
    overlappingChapters: [],
  };
};

/**
 * Fetches playlist details using ytpl with YouTube API v3 fallback
 */
const fetchPlaylistDetails = async (playlistId) => {
  const ytpl = require('ytpl');
  // ── Primary: ytpl (limit: Infinity fetches all pages automatically) ──
  try {
    const playlist = await ytpl(playlistId, { limit: Infinity });
    if (playlist && playlist.items && playlist.items.length > 0) {
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
      console.warn('[Playlist] YouTube Data API fallback failed:', apiErr.response?.data || apiErr.message);
    }
  }

  return null;
};

/**
 * Lightweight check to get current video count for a playlist (1 YouTube API quota unit).
 */
const getPlaylistCount = async (playlistId) => {
  if (!playlistId) return null;

  // 1. YouTube Data API v3 playlists.list (1 quota unit)
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
        params: {
          part: 'contentDetails',
          id: playlistId,
          key: apiKey,
        },
        timeout: 5000,
      });
      const itemCount = res.data?.items?.[0]?.contentDetails?.itemCount;
      if (typeof itemCount === 'number') {
        return itemCount;
      }
    } catch (err) {
      console.warn('[Playlist] YouTube Data API getPlaylistCount failed:', err.response?.data || err.message);
    }
  }

  // 2. Fallback: ytpl with limit: 1
  try {
    const ytpl = require('ytpl');
    const playlist = await ytpl(playlistId, { limit: 1 });
    if (playlist) {
      return playlist.estimatedItemCount || playlist.items?.length || null;
    }
  } catch (err) {
    console.warn('[Playlist] ytpl getPlaylistCount failed:', err.message);
  }

  return null;
};

module.exports = {
  parseISO8601Duration,
  formatSeconds,
  parseChaptersFromDescription,
  getOverlappingChapters,
  getVideoWatchContext,
  fetchPlaylistDetails,
  getPlaylistCount,
};
