const axios = require('axios');

// ─── In-memory cache (TTL: 24 hours) ──────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCache = (key, value) => {
  cache.set(key, { value, timestamp: Date.now() });
};

// ─── YouTube Data API v3 ───────────────────────────────────────────────────────
const fetchYouTubeVideos = async (query, maxResults = 2) => {
  const cacheKey = `yt:${query}:${maxResults}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    // Graceful fallback: return a YouTube search link
    const fallback = [{
      title: `Search: ${query}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    }];
    setCache(cacheKey, fallback);
    return fallback;
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        videoDefinition: 'high',
        relevanceLanguage: 'en',
        maxResults,
        key: apiKey
      },
      timeout: 5000
    });

    const videos = (response.data.items || []).map((item) => ({
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    setCache(cacheKey, videos);
    return videos;
  } catch (err) {
    console.warn(`[YouTube API] Failed for query "${query}":`, err.message);
    // Fallback to YouTube search URL on error
    const fallback = [{
      title: `YouTube: ${query}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    }];
    setCache(cacheKey, fallback);
    return fallback;
  }
};

// ─── Wikipedia REST API (free, no key required) ────────────────────────────────
const fetchWikipediaArticle = async (query) => {
  const cacheKey = `wiki:${query}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Wikipedia search endpoint
    const searchRes = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        list: 'search',
        srsearch: query,
        srlimit: 1,
        format: 'json'
      },
      headers: {
        'User-Agent': 'EduVerse/1.0 (https://github.com/EduVerse; eduversetgw@gmail.com) axios'
      },
      timeout: 5000
    });

    const results = searchRes.data?.query?.search || [];
    if (results.length === 0) {
      return null;
    }

    const title = results[0].title;
    const article = {
      title: `Wikipedia: ${title}`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
    };

    setCache(cacheKey, article);
    return article;
  } catch (err) {
    console.warn(`[Wikipedia API] Failed for query "${query}":`, err.message);
    return null;
  }
};

// ─── Trusted Fallback Articles by Domain ──────────────────────────────────────
const TRUSTED_SOURCES = {
  'javascript': { title: 'MDN: JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' },
  'html': { title: 'MDN: HTML Basics', url: 'https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/HTML_basics' },
  'css': { title: 'MDN: CSS First Steps', url: 'https://developer.mozilla.org/en-US/docs/Learn/CSS/First_steps' },
  'react': { title: 'React Official Docs', url: 'https://react.dev/learn' },
  'python': { title: 'Python Official Tutorial', url: 'https://docs.python.org/3/tutorial/' },
  'data structures': { title: 'GeeksForGeeks: DSA', url: 'https://www.geeksforgeeks.org/data-structures/' },
  'algorithms': { title: 'GeeksForGeeks: Algorithms', url: 'https://www.geeksforgeeks.org/fundamentals-of-algorithms/' },
  'machine learning': { title: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course' },
  'sql': { title: 'W3Schools SQL Tutorial', url: 'https://www.w3schools.com/sql/' },
  'java': { title: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/' },
  'c++': { title: 'CPlusPlus.com Reference', url: 'https://cplusplus.com/doc/tutorial/' },
  'node': { title: 'Node.js Official Docs', url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs' },
};

const getTrustedArticle = (topic) => {
  const topicLower = (topic || '').toLowerCase();
  for (const [key, source] of Object.entries(TRUSTED_SOURCES)) {
    if (topicLower.includes(key)) return source;
  }
  return null;
};

// ─── Main Resource Fetcher ─────────────────────────────────────────────────────
/**
 * Fetches 2 YouTube videos + 1-2 trusted articles for a given topic.
 * Runs all API calls in parallel for speed.
 * @param {string} topic - The study topic (e.g. "Arrays and Linked Lists")
 * @param {string} subject - The parent subject (e.g. "Java DSA") for context
 */
const fetchResourcesForTopic = async (topic, subject = '') => {
  const searchQuery = `${subject} ${topic} tutorial`.trim();

  const [youtubeVideos, wikiArticle] = await Promise.all([
    fetchYouTubeVideos(searchQuery, 2),
    fetchWikipediaArticle(topic)
  ]);

  const articles = [];
  const trusted = getTrustedArticle(`${subject} ${topic}`);
  if (trusted) articles.push(trusted);
  if (wikiArticle) articles.push(wikiArticle);

  // Ensure at least one article
  if (articles.length === 0) {
    articles.push({
      title: `GeeksForGeeks: ${topic}`,
      url: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(topic)}`
    });
  }

  return {
    youtube: youtubeVideos,
    articles: articles.slice(0, 2) // max 2 articles
  };
};

module.exports = { fetchResourcesForTopic };
