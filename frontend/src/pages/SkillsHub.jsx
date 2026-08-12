import React, { useState, useEffect, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Search, Plus, Trophy, Target, TrendingUp, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import SkillCard from '../components/skills/SkillCard';
import AddSkillModal from '../components/skills/AddSkillModal';
import SkillDiscovery from '../components/skills/SkillDiscovery';
import PerformanceCalendar from '../components/ui/PerformanceCalendar';
import PremiumButton from '../components/ui/PremiumButton';
import { ScrollRevealGroup } from '../components/ui/ScrollReveal';

const CATEGORIES = ['All', 'Web Dev', 'Data Structures', 'AI & ML', 'Databases', 'DevOps', 'Mobile Dev', 'Custom'];

// Skeleton loader card
const SkeletonCard = () => (
  <div className="glass-card animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="w-10 h-10 bg-white/5 rounded-xl" />
      <div className="w-20 h-6 bg-white/5 rounded-lg" />
    </div>
    <div className="w-3/4 h-5 bg-white/5 rounded-lg mb-2" />
    <div className="w-1/2 h-3 bg-white/5 rounded mb-6" />
    <div className="w-full h-2 bg-white/5 rounded-full mb-6" />
    <div className="w-full h-10 bg-white/5 rounded-xl" />
  </div>
);

const SkillsHub = () => {
  const { requireAuth, isAuthenticated } = useContext(AuthContext);

  const [skills, setSkills]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch]               = useState('');
  const [showAddModal, setShowAddModal]   = useState(false);
  
  // Global Calendar State
  const [calendarSkill, setCalendarSkill] = useState(null); // { id, title }

  // ── Fetch skills from backend ──
  const fetchSkills = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/skills');
      setSkills(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('auth');
      } else {
        setError('Failed to load skills. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // ── Add skill callback ──
  const handleSkillAdded = (newSkill) => {
    setSkills((prev) => [newSkill, ...prev]);
  };

  // ── Delete skill callback ──
  const handleSkillDeleted = (deletedId) => {
    setSkills((prev) => prev.filter((s) => s._id !== deletedId));
  };

  // ── Filtered list ──
  const filteredSkills = skills.filter((s) => {
    const matchesCat = activeCategory === 'All' || s.category === activeCategory;
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ── Summary stats ──
  const completedCount  = skills.filter((s) => s.completed).length;
  const inProgressCount = skills.filter((s) => !s.completed && s.progress > 0).length;
  const avgProgress     = skills.length > 0
    ? Math.round(skills.reduce((acc, s) => acc + s.progress, 0) / skills.length)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 glass rounded-xl text-primary">
            <Code size={24} />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Skills Hub</h2>
            <p className="text-gray-400 mt-0.5 text-xs sm:text-sm">
              AI-curated learning · Real-time progress tracking.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:max-w-2xl">
          <div className="relative flex-1 w-full sm:w-auto md:min-w-[250px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="w-full bg-surface border border-white/5 rounded-full py-2.5 sm:py-2 pl-9 pr-4 text-sm focus:border-primary/50 text-white outline-none transition-colors placeholder-gray-600"
            />
          </div>
          <PremiumButton className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => requireAuth(() => setShowAddModal(true))}
              className="bg-primary hover:bg-primary/90 text-primary-content px-4 py-2.5 sm:py-2 rounded-full font-semibold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap min-h-[44px]"
            >
              <Plus size={18} />
              <span>Add Skill</span>
            </motion.button>
          </PremiumButton>
        </div>
      </div>

      {/* ── AI Skill Discovery ── */}
      {isAuthenticated && (
        <div className="relative">
          <SkillDiscovery onSkillAdded={handleSkillAdded} />
        </div>
      )}

      <AnimatePresence>
        {skills.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div className="glass-card !p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-400/10 rounded-xl">
                <Trophy size={18} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-xl font-black text-white">{completedCount}</p>
                <p className="text-xs text-gray-400">Mastered</p>
              </div>
            </div>
            <div className="glass-card !p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Target size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xl font-black text-white">{inProgressCount}</p>
                <p className="text-xs text-gray-400">In Progress</p>
              </div>
            </div>
            <div className="glass-card !p-4 flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <TrendingUp size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-xl font-black text-white">{avgProgress}%</p>
                <p className="text-xs text-gray-400">Avg. Progress</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category pills ── */}
      <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap no-scrollbar border-b border-white/5 md:pb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-2 whitespace-nowrap rounded-full transition-all text-sm font-medium border min-h-[40px]
              ${activeCategory === c
                ? 'bg-primary/20 text-white border-primary/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                : 'bg-surface text-gray-400 border-transparent hover:text-white hover:bg-white/10'
              }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}

      {/* Error: not authenticated */}
      {error === 'auth' && !loading && (
        <div className="py-16 text-center">
          <WifiOff size={40} className="text-gray-600 mx-auto mb-4" />
          <p className="text-white font-bold text-lg mb-2">Sign in to track your skills</p>
          <p className="text-gray-400 text-sm">
            Your progress is synced to your account and resumes across devices.
          </p>
        </div>
      )}

      {/* Error: network */}
      {error && error !== 'auth' && (
        <div className="py-12 text-center space-y-4">
          <WifiOff size={36} className="text-red-400 mx-auto" />
          <p className="text-white font-semibold">{error}</p>
          <button
            onClick={fetchSkills}
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Guest state */}
      {!isAuthenticated && !loading && !error && (
        <div className="py-16 text-center space-y-3">
          <Wifi size={40} className="text-gray-600 mx-auto" />
          <p className="text-white font-bold text-lg">Sign in to get started</p>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Add skills with YouTube videos and track real watch-time progress across sessions.
          </p>
          <button
            onClick={() => requireAuth(() => {})}
            className="mt-2 px-6 py-2.5 bg-primary text-primary-content rounded-xl font-semibold hover:bg-primary/80 transition-colors"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Skill grid */}
      {isAuthenticated && !error && (
        <ScrollRevealGroup stagger={0.06} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 pt-1">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : filteredSkills.length === 0
            ? (
              <div className="col-span-full py-16 text-center space-y-3">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                  <Code size={28} className="text-gray-600" />
                </div>
                {search || activeCategory !== 'All' ? (
                  <>
                    <p className="text-white font-semibold">No matching skills found</p>
                    <button
                      onClick={() => { setSearch(''); setActiveCategory('All'); }}
                      className="text-sm text-primary hover:underline"
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-white font-semibold text-lg">No skills yet</p>
                    <p className="text-gray-400 text-sm">
                      Add your first skill with a YouTube video to start tracking real progress.
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-content rounded-xl font-semibold hover:bg-primary/80 transition-colors mt-1"
                    >
                      <Plus size={16} /> Add First Skill
                    </button>
                  </>
                )}
              </div>
            )
            : filteredSkills.map((skill, idx) => (
              <SkillCard
                key={skill._id}
                skill={skill}
                index={idx}
                onDelete={handleSkillDeleted}
                onOpenCalendar={(id, title) => setCalendarSkill({ id, title })}
              />
            ))
          }
        </ScrollRevealGroup>
      )}

      {/* ── Add Skill Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <AddSkillModal
            onClose={() => setShowAddModal(false)}
            onSkillAdded={handleSkillAdded}
          />
        )}
      </AnimatePresence>

      {/* ── Global Performance Calendar Modal ── */}
      <AnimatePresence>
        {calendarSkill && (
          <PerformanceCalendar
            skillId={calendarSkill.id}
            skillTitle={calendarSkill.title}
            onClose={() => setCalendarSkill(null)}
          />
        )}
      </AnimatePresence>


    </div>
  );
};

export default SkillsHub;
