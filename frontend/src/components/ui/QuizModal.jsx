import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, ArrowRight, SkipForward, Trophy, RefreshCcw, Languages } from 'lucide-react';

// ─── Static backdrop overlay ─────────────────────────────────────────────────
const Overlay = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
  >
    {children}
  </motion.div>
);

// ─── Result screen shown after submission ─────────────────────────────────────
const ResultScreen = ({ score, total, onClose }) => {
  const percentage = Math.round((score / total) * 100);
  const isGood = percentage >= 60;

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-[#0d1117] border border-white/10 rounded-3xl p-8 w-full max-w-md text-center shadow-2xl"
    >
      {/* Icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${isGood ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
        {isGood
          ? <Trophy size={36} className="text-emerald-400" />
          : <RefreshCcw size={36} className="text-red-400" />}
      </div>

      <h2 className="text-2xl font-black text-white mb-1">
        {isGood ? 'Great Work! 🎉' : 'Keep Practicing!'}
      </h2>
      <p className="text-gray-400 text-sm mb-6">Here's how you did on this quiz.</p>

      {/* Score pill */}
      <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl border mb-6 ${isGood ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <span className={`text-4xl font-black tabular-nums ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>{percentage}%</span>
        <div className="text-left">
          <p className="text-white font-bold text-sm">{score} / {total} correct</p>
          <p className="text-gray-500 text-xs">{isGood ? 'Above pass threshold' : 'Below pass threshold'}</p>
        </div>
      </div>

      {/* Bar */}
      <div className="w-full bg-white/5 rounded-full h-2 mb-8 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={`h-full rounded-full ${isGood ? 'bg-emerald-400' : 'bg-red-400'}`}
        />
      </div>

      <button
        onClick={onClose}
        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-2xl transition-all"
      >
        Back to Skills Hub
      </button>
    </motion.div>
  );
};

// ─── Main QuizModal ───────────────────────────────────────────────────────────
const QuizModal = ({ skillTitle, questions, onSubmit, onSkip, onClose }) => {
  const [answers, setAnswers]     = useState({});   // { questionIndex: selectedOptionIndex }
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult]       = useState(null); // { score, total }
  const [current, setCurrent]     = useState(0);
  const [lang, setLang]           = useState('en'); // 'en' or 'hi'

  const total = questions.length;
  const answered = Object.keys(answers).length;

  const handleSelect = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = async () => {
    if (submitted) return;
    let correct = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correct++;
    });
    setResult({ score: correct, total });
    setSubmitted(true);
    await onSubmit(correct, total);
  };

  const goNext = () => setCurrent(c => Math.min(c + 1, total - 1));
  const goPrev = () => setCurrent(c => Math.max(c - 1, 0));

  // Show result screen after submit
  if (submitted && result) {
    return (
      <Overlay>
        <ResultScreen
          score={result.score}
          total={result.total}
          onClose={onClose || onSkip}
        />
      </Overlay>
    );
  }

  const q = questions[current];

  return (
    <Overlay>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="bg-[#0d1117] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-lg">Knowledge Check</h2>
            <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[260px]">{skillTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-all border border-primary/20"
              title="Change Language"
            >
              <Languages size={14} /> {lang === 'en' ? 'हिन्दी (HI)' : 'English (EN)'}
            </button>
            <button
              onClick={onSkip}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl transition-all border border-white/5"
            >
              <SkipForward size={14} /> Skip Quiz
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            animate={{ width: `${((current + 1) / total) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Question area */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">
              Question {current + 1} of {total}
            </span>
            <span className="text-xs text-gray-500">{answered}/{total} answered</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-white font-semibold text-base leading-relaxed mb-5">
                {lang === 'hi' && q.questionHindi ? q.questionHindi : q.question}
              </p>

              <div className="space-y-2.5">
                {q.options.map((opt, oIdx) => {
                  const isSelected = answers[current] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelect(current, oIdx)}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-primary/20 border-primary/60 text-white shadow-[0_0_15px_rgba(var(--primary),0.15)]'
                          : 'bg-white/3 border-white/8 text-gray-300 hover:bg-white/8 hover:border-white/15 hover:text-white'
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg mr-3 text-xs font-black ${isSelected ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}>
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      {lang === 'hi' && q.optionsHindi?.[oIdx] ? q.optionsHindi[oIdx] : opt}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={current === 0}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-medium hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>

          {current < total - 1 ? (
            <button
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold py-2.5 rounded-xl transition-all"
            >
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={answered === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(var(--primary),0.3)]"
            >
              Submit Quiz <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </motion.div>
    </Overlay>
  );
};

export default QuizModal;
