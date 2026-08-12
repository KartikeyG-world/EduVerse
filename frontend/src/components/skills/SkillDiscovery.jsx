import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Sparkles, X, Plus, Loader2, BookOpen,
  ListVideo, PlayCircle, AlertCircle, ChevronRight
} from 'lucide-react';
import api from '../../utils/api';

// ─── View Count Formatter ──────────────────────────────────────────────────────
const formatViews = (views) => {
  if (views == null) return '0 views';
  if (views >= 1000000) return (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M views';
  if (views >= 1000) return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K views';
  return views + ' views';
};

// ─── Single result card ───────────────────────────────────────────────────────
const ResultCard = ({ result, onAdd, adding }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 transition-all group"
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden bg-white/5">
        {result.thumbnail ? (
          <img
            src={result.thumbnail}
            alt={result.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlayCircle size={20} className="text-gray-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="text-white text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {result.title}
          </p>
          <p className="text-gray-500 text-xs mt-0.5 truncate">{result.channel}</p>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/20">
            {formatViews(result.views)}
          </span>
        </div>
      </div>

      {/* Add button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onAdd(result)}
        disabled={adding === result.id}
        className="flex-shrink-0 self-center w-8 h-8 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary border border-primary/20 hover:border-primary/50 flex items-center justify-center transition-all disabled:opacity-50"
        title="Add to Skill Hub"
      >
        {adding === result.id
          ? <Loader2 size={13} className="animate-spin" />
          : <Plus size={14} />
        }
      </motion.button>
    </motion.div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const SkillDiscovery = ({ onSkillAdded }) => {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [adding, setAdding]         = useState(null);  // result.id being added
  const [addedIds, setAddedIds]     = useState(new Set());
  const [isOpen, setIsOpen]         = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef(null);
  const inputRef    = useRef(null);
  const panelRef    = useRef(null);

  // ── Debounced search ──
  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 3) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const res = await api.get(`/skills/search?q=${encodeURIComponent(q.trim())}`);
      setResults(res.data.results || []);
      setIsOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed. Try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Debounce useEffect ──
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      doSearch(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  // ── Close panel on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Add a discovered result to Skill Hub ──
  const handleAdd = async (result) => {
    if (addedIds.has(result.id) || adding) return;
    setAdding(result.id);
    try {
      const category = 'Custom';
      const res = await api.post('/skills', {
        title:        result.title,
        category,
        videoUrl:     result.url,
        source:       'search',
        difficulty:   result.difficulty,
        channelName:  result.channel,
        thumbnailUrl: result.thumbnail,
      });
      setAddedIds((prev) => new Set([...prev, result.id]));
      onSkillAdded(res.data);
    } catch (err) {
      console.error('Failed to add skill from discovery:', err.message);
    } finally {
      setAdding(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      doSearch(query);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
    setError('');
    inputRef.current?.focus();
  };

  return (
    <div ref={panelRef} className="relative w-full">
      {/* ── Search Input ── */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {loading
            ? <Loader2 size={15} className="text-primary animate-spin" />
            : <Sparkles size={15} className="text-primary" />
          }
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder='Discover: e.g. "learn React", "DSA for beginners"…'
          className="w-full bg-surface/60 border border-white/8 hover:border-primary/30 focus:border-primary/50 rounded-2xl py-3 pl-10 pr-10 text-sm text-white outline-none transition-all placeholder-gray-600"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Results Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.18 }}
            className="absolute top-[calc(100%+8px)] left-0 right-0 z-[500] bg-surface border border-white/10 rounded-2xl shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Search size={13} className="text-primary" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Search Results</span>
              </div>
              <span className="text-[10px] text-gray-600 font-medium">
                {results.length} results · Click <Plus size={9} className="inline" /> to add
              </span>
            </div>

            {/* Content */}
            <div className="p-3 max-h-[420px] overflow-y-auto space-y-2 custom-scrollbar">
              {error ? (
                <div className="flex items-center gap-2 text-red-400 text-sm py-4 justify-center">
                  <AlertCircle size={16} /> {error}
                </div>
              ) : results.length === 0 && hasSearched && !loading ? (
                <div className="text-center py-8 space-y-2">
                  <BookOpen size={28} className="text-gray-600 mx-auto" />
                  <p className="text-gray-400 text-sm font-medium">No results found</p>
                  <p className="text-gray-600 text-xs">Try a different topic or search term</p>
                </div>
              ) : (
                <AnimatePresence>
                  {results.map((r, i) => (
                    <ResultCard
                      key={r.id || i}
                      result={r}
                      onAdd={addedIds.has(r.id) ? () => {} : handleAdd}
                      adding={adding}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer hint */}
            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 flex items-center gap-1.5">
                <ChevronRight size={11} className="text-gray-600" />
                <span className="text-[10px] text-gray-600">
                  Search results from YouTube powered by secure tracking
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SkillDiscovery;
