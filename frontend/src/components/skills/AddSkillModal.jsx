import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Tag, Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../utils/api';

// Safe YouTube video ID extractor — video ID always takes priority over list param
const extractVideoId = (url) => {
  if (!url) return null;
  try {
    // Format: youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];

    // Format: youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];

    // Format: youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    return null;
  } catch (_) {
    return null;
  }
};

const CATEGORIES = ['Web Dev', 'Data Structures', 'AI & ML', 'Databases', 'DevOps', 'Mobile Dev', 'Custom'];

const AddSkillModal = ({ onClose, onSkillAdded }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Web Dev');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const videoId = extractVideoId(videoUrl);
  const isValidUrl = videoUrl.trim().length > 0 && videoId !== null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidUrl) {
      setError('Please enter a valid YouTube video URL.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/skills', { title, category, videoUrl });
      onSkillAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add skill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-[#0b1120] border border-white/10 shadow-2xl rounded-3xl w-full max-w-xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors z-10"
        >
          <X size={18} />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-7">
            <h2 className="text-2xl font-black text-white mb-1">Add New Skill</h2>
            <p className="text-gray-400 text-sm">Paste a YouTube video link to start tracking your real learning progress.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Skill Name */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Skill Name
                </label>
                <div className="relative">
                  <BookOpen size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. React 19 Server Components"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-primary/60 transition-colors text-sm placeholder-gray-600"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-primary/60 transition-colors text-sm appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#0b1120]">{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* YouTube URL */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                YouTube Video URL
              </label>
              <div className="relative">
                <Video size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400" />
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(e) => { setVideoUrl(e.target.value); setError(''); }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={`w-full bg-white/5 border rounded-xl py-3 pl-10 pr-10 text-white outline-none transition-colors text-sm placeholder-gray-600 ${
                    videoUrl.length > 0
                      ? isValidUrl ? 'border-accent/60 focus:border-accent' : 'border-red-500/50 focus:border-red-500'
                      : 'border-white/10 focus:border-primary/60'
                  }`}
                />
                {videoUrl.trim().length > 0 && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {isValidUrl
                      ? <CheckCircle size={16} className="text-accent" />
                      : <AlertCircle size={16} className="text-red-400" />
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Video Thumbnail Preview */}
            {isValidUrl && videoId && (
              <div className="rounded-xl overflow-hidden border border-white/10 mt-2">
                <div className="relative">
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                    alt="Video thumbnail"
                    className="w-full aspect-video object-cover block"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-3 text-xs text-white/60 font-medium">
                    Video preview
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle size={13} /> {error}
              </p>
            )}

            {/* Submit */}
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !isValidUrl}
              className="w-full bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 font-bold shadow-[0_0_20px_rgba(99,102,241,0.2)] mt-1 flex justify-center items-center gap-2 transition-all"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Adding Skill...</>
              ) : (
                <>Start Tracking</>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddSkillModal;
