import React, { useState, useEffect, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit, ChevronLeft, RotateCcw, CheckCircle2,
  XCircle, Minus, Zap, Sparkles, Trophy, BookOpen,
  AlertTriangle, RefreshCw, Layers
} from 'lucide-react';
import { getFlashcards, reviewFlashcard } from '../api/flashcards';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal from '../components/ui/ScrollReveal';

/* ── Rating config ──────────────────────────────────────────────────────── */
const RATINGS = [
  {
    value: 0,
    label: 'Forgot',
    desc: 'Completely blank',
    icon: <XCircle size={18} />,
    color: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/40 hover:border-red-400',
    text: 'text-red-400',
    ring: 'focus:ring-red-500/40',
  },
  {
    value: 1,
    label: 'Hard',
    desc: 'With difficulty',
    icon: <Minus size={18} />,
    color: 'from-orange-500/20 to-orange-600/10',
    border: 'border-orange-500/40 hover:border-orange-400',
    text: 'text-orange-400',
    ring: 'focus:ring-orange-500/40',
  },
  {
    value: 2,
    label: 'Good',
    desc: 'Recalled correctly',
    icon: <CheckCircle2 size={18} />,
    color: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/40 hover:border-emerald-400',
    text: 'text-emerald-400',
    ring: 'focus:ring-emerald-500/40',
  },
  {
    value: 3,
    label: 'Easy',
    desc: 'Instant recall',
    icon: <Zap size={18} />,
    color: 'from-primary/20 to-accent/10',
    border: 'border-primary/40 hover:border-primary',
    text: 'text-primary',
    ring: 'focus:ring-primary/40',
  },
];

/* ── FlipCard Component ─────────────────────────────────────────────────── */
const FlipCard = ({ front, back, isFlipped, onFlip }) => (
  <div
    className="flashcard-scene w-full cursor-pointer select-none"
    style={{ perspective: '1200px', height: '260px' }}
    onClick={onFlip}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onFlip()}
    aria-label={isFlipped ? 'Card showing answer' : 'Click to reveal answer'}
  >
    <motion.div
      className="flashcard-card relative w-full h-full"
      style={{ transformStyle: 'preserve-3d' }}
      animate={{ rotateY: isFlipped ? 180 : 0 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* FRONT */}
      <div
        className="flashcard-face flashcard-front absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8 text-center glass-next-gen border border-white/10"
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-widest">
          <Layers size={12} /> Question
        </div>
        <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed">{front}</p>
        <p className="text-xs text-gray-500 mt-6 flex items-center gap-1">
          <RotateCcw size={12} /> Click to reveal answer
        </p>
      </div>

      {/* BACK */}
      <div
        className="flashcard-face flashcard-back absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20"
        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      >
        <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-widest">
          <Sparkles size={12} /> Answer
        </div>
        <p className="text-base sm:text-lg text-gray-200 leading-relaxed">{back}</p>
      </div>
    </motion.div>
  </div>
);

/* ── Empty / Done screens ────────────────────────────────────────────────── */
const EmptyState = ({ onBack }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
    <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
      <Trophy size={40} className="text-emerald-400" />
    </div>
    <div>
      <h2 className="text-2xl font-bold text-white">You're all caught up!</h2>
      <p className="text-gray-400 mt-2 max-w-sm">
        No flashcards are due for review right now. Come back later or generate more from your notes.
      </p>
    </div>
    <button
      onClick={onBack}
      className="flex items-center gap-2 px-6 py-3 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl font-semibold transition-all"
    >
      <ChevronLeft size={18} /> Back to Notes
    </button>
  </div>
);

const SessionComplete = ({ stats, onRestart, onBack }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4"
  >
    <div className="relative">
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
        <Trophy size={48} className="text-primary" />
      </div>
      <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
        ✓
      </div>
    </div>
    <div>
      <h2 className="text-3xl font-black text-white">Session Complete!</h2>
      <p className="text-gray-400 mt-2">Your mastery scores have been updated.</p>
    </div>

    <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
      {[
        { label: 'Reviewed', value: stats.total, color: 'text-white' },
        { label: 'Correct', value: stats.correct, color: 'text-emerald-400' },
        { label: 'Forgot', value: stats.forgot, color: 'text-red-400' },
      ].map((s) => (
        <div key={s.label} className="glass rounded-2xl p-4">
          <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
          <div className="text-xs text-gray-500 mt-1">{s.label}</div>
        </div>
      ))}
    </div>

    <div className="flex gap-3">
      <button
        onClick={onRestart}
        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all text-sm"
      >
        <RefreshCw size={16} /> Review Again
      </button>
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl font-semibold transition-all text-sm"
      >
        <ChevronLeft size={16} /> Back to Notes
      </button>
    </div>
  </motion.div>
);

/* ── Main Component ─────────────────────────────────────────────────────── */
const FlashcardStudy = () => {
  const navigate = useNavigate();
  const { requireAuth } = useContext(AuthContext);

  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [stats, setStats] = useState({ total: 0, correct: 0, forgot: 0 });
  const [error, setError] = useState(null);

  const loadDueCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFlashcards(true); // due=true
      setCards(res.data.flashcards || []);
      setCurrentIdx(0);
      setIsFlipped(false);
      setSessionDone(false);
      setStats({ total: 0, correct: 0, forgot: 0 });
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Could not load flashcards. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    requireAuth(loadDueCards);
  }, []);

  const handleFlip = () => setIsFlipped((f) => !f);

  const handleRate = async (rating) => {
    if (submitting || !isFlipped) return;

    const card = cards[currentIdx];
    setSubmitting(true);

    try {
      await reviewFlashcard(card._id, rating);

      const isCorrect = rating >= 2;
      setStats((prev) => ({
        total: prev.total + 1,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        forgot: rating === 0 ? prev.forgot + 1 : prev.forgot,
      }));

      // Advance to next card
      if (currentIdx + 1 >= cards.length) {
        setSessionDone(true);
      } else {
        setIsFlipped(false);
        // Small delay so the flip animation completes before card changes
        setTimeout(() => setCurrentIdx((i) => i + 1), 200);
      }
    } catch (err) {
      console.error('Review failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const current = cards[currentIdx];
  const progress = cards.length > 0 ? ((currentIdx) / cards.length) * 100 : 0;

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="flashcard-study-page max-w-2xl mx-auto space-y-6 px-2 sm:px-0">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ChevronLeft size={18} /> Back to Notes
        </button>
        <div className="flex items-center gap-2 text-primary font-bold">
          <BrainCircuit size={20} />
          <span className="hidden sm:inline">Flashcard Study</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="h-2 bg-white/5 rounded-full animate-pulse" />
          <div className="h-[260px] bg-surface rounded-2xl animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <AlertTriangle size={40} className="text-amber-400" />
          <p className="text-gray-400">{error}</p>
          <button
            onClick={loadDueCards}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary/20 text-primary border border-primary/30 rounded-xl font-semibold"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {/* Empty — no cards due */}
      {!loading && !error && cards.length === 0 && (
        <EmptyState onBack={() => navigate('/notes')} />
      )}

      {/* Session Done */}
      {!loading && !error && sessionDone && (
        <SessionComplete
          stats={stats}
          onRestart={loadDueCards}
          onBack={() => navigate('/notes')}
        />
      )}

      {/* Active Study Session */}
      {!loading && !error && cards.length > 0 && !sessionDone && current && (
        <ScrollReveal>
          <div className="space-y-5">

            {/* Progress bar + counter */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <BookOpen size={12} /> {currentIdx + 1} of {cards.length}
                </span>
                <span className="font-medium">
                  Topic: <span className="text-primary">{current.topicName}</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* Flip Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current._id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
              >
                <FlipCard
                  front={current.front}
                  back={current.back}
                  isFlipped={isFlipped}
                  onFlip={handleFlip}
                />
              </motion.div>
            </AnimatePresence>

            {/* Instruction or Rating buttons */}
            <AnimatePresence mode="wait">
              {!isFlipped ? (
                <motion.p
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-gray-500 text-sm"
                >
                  Flip the card to reveal the answer, then rate your recall.
                </motion.p>
              ) : (
                <motion.div
                  key="ratings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <p className="text-center text-xs text-gray-500 font-bold uppercase tracking-widest">
                    How well did you recall this?
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {RATINGS.map((r) => (
                      <button
                        key={r.value}
                        id={`flashcard-rate-${r.label.toLowerCase()}`}
                        onClick={() => handleRate(r.value)}
                        disabled={submitting}
                        className={`
                          flashcard-rating-btn relative flex flex-col items-center gap-1.5 
                          p-4 rounded-xl border bg-gradient-to-br ${r.color} ${r.border}
                          transition-all duration-200 focus:outline-none focus:ring-2 ${r.ring}
                          disabled:opacity-50 disabled:cursor-not-allowed
                          hover:scale-[1.03] active:scale-95
                        `}
                      >
                        <span className={r.text}>{r.icon}</span>
                        <span className={`font-bold text-sm ${r.text}`}>{r.label}</span>
                        <span className="text-[10px] text-gray-500">{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Session mini-stats */}
            <div className="flex justify-center gap-6 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-400" /> {stats.correct} correct
              </span>
              <span className="flex items-center gap-1">
                <XCircle size={12} className="text-red-400" /> {stats.forgot} forgot
              </span>
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
};

export default FlashcardStudy;
