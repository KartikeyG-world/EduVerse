import React, { useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, Clock, Timer, Zap, Target, BrainCircuit } from 'lucide-react';
import { FocusContext } from '../context/FocusContext';
import ParticleBackground from '../components/ui/ParticleBackground';
import PremiumButton from '../components/ui/PremiumButton';

const MOTIVATIONS = [
  "Deep work is your superpower. 🚀",
  "Distractions are the enemy of greatness. 🛡️",
  "Focus on the process, not the outcome. 🧠",
  "One task at a time. You've got this. 💪",
  "Small steps every day. 🌱",
  "Clarity comes from action. ✨",
  "Master your attention, master your life. 🎯"
];

const FocusMode = () => {
  const {
    timerType, setTimerType,
    duration,
    timeLeft, setTimeLeft,
    stopwatchTime, setStopwatchTime,
    isActive, setIsActive,
    soundEnabled, setSoundEnabled,
    toggleTimer, finishStopwatch, resetTimer, adjustDuration, displayTime,
    activeSessionId
  } = useContext(FocusContext);

  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setQuoteIdx(prev => (prev + 1) % MOTIVATIONS.length);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const isLearningSession = activeSessionId !== null && timerType === 'stopwatch';
  const progress = timerType === 'pomodoro'
    ? 1 - timeLeft / (duration * 60)
    : 0;
  const circumference = 2 * Math.PI * 185;
  const estimatedXp = timerType === 'pomodoro' ? Math.floor(duration * 2) : Math.floor(stopwatchTime / 30);

  return (
    <div className="h-full flex flex-col items-center relative overflow-hidden bg-focus-mode rounded-3xl min-h-[calc(100vh-140px)] py-8 md:py-12">

      {/* Depth rings behind the clock */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-16 md:mt-20">
        <div className="w-[550px] h-[550px] rounded-full border border-white/[0.03] animate-pulse" />
        <div className="absolute w-[680px] h-[680px] rounded-full border border-white/[0.02]" />
      </div>

      {/* Focus particle background */}
      <ParticleBackground mode={isActive ? 'focus' : 'ambient'} />

      {/* Active glow bloom behind clock */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none mt-16 md:mt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <div className="w-[440px] h-[440px] rounded-full bg-primary/10 blur-[80px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section (Productivity Hub) */}
      <div className="absolute top-6 left-6 md:left-10 z-10 hidden sm:flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BrainCircuit className="text-primary" size={20} /> Focus Hub
        </h2>
        <p className="text-xs text-gray-400">Deep work environment</p>
      </div>

      {/* Header controls */}
      <div className="absolute top-5 right-5 flex gap-3 z-10">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 glass rounded-full text-xs font-bold text-accent mr-2">
          <Zap size={14} className="animate-pulse" /> +{estimatedXp} XP {timerType === 'pomodoro' ? 'Est.' : 'Earned'}
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center glass rounded-full transition-all duration-300 ${soundEnabled ? 'text-primary border-primary/30 glow-primary' : 'text-gray-500'}`}
          title="Toggle sound"
        >
          <Volume2 size={18} />
        </button>
      </div>

      {/* Mode toggle */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 sm:mt-0 mb-6 md:mb-10 flex flex-wrap justify-center bg-white/[0.04] rounded-2xl md:rounded-full p-1.5 border border-white/[0.07] relative z-10 max-w-[90vw]"
      >
        {[
          { key: 'pomodoro', icon: <Timer size={14} />, label: 'Pomodoro' },
          { key: 'stopwatch', icon: <Clock size={14} />, label: 'Stopwatch' },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            disabled={isLearningSession}
            onClick={() => {
              if (isLearningSession) return;
              setTimerType(key);
              setIsActive(false);
              if (key === 'pomodoro') setTimeLeft(duration * 60);
              else setStopwatchTime(0);
            }}
            className={`px-4 sm:px-6 py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 flex gap-2 items-center flex-1 justify-center min-w-[120px]
              ${isLearningSession ? 'opacity-40 cursor-not-allowed' : ''}
              ${timerType === key
                ? 'bg-gradient-to-r from-primary to-accent text-primary-content shadow-lg'
                : 'text-gray-400 active:text-white md:hover:text-white'
              }`}
          >
            {icon} {label}
          </button>
        ))}
      </motion.div>

      {/* Motivational Quote (Active Mode) */}
      <div className="h-12 w-full max-w-md px-4 flex items-center justify-center relative z-10 mb-4 sm:mb-8">
        <AnimatePresence mode="wait">
          {isActive ? (
            <motion.p
              key={`quote-${quoteIdx}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.5 }}
              className="text-sm md:text-base font-medium text-primary text-center bg-primary/10 px-6 py-2 rounded-full border border-primary/20 shadow-lg shadow-primary/5"
            >
              {MOTIVATIONS[quoteIdx]}
            </motion.p>
          ) : (
            <motion.p
              key="standby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-gray-500 font-medium tracking-wide flex items-center gap-2"
            >
              <Target size={16} /> Ready to focus?
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Main clock ring */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 26 }}
        className="relative z-10"
      >
        <div className={`relative w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 ${isActive ? 'pulse-ring' : ''}`}>
          {/* Outer decorative ring */}
          <div className="absolute inset-0 rounded-full border border-white/[0.06]" />

          {/* SVG progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl" viewBox="0 0 400 400">
            {/* Background track */}
            <circle
              cx="200" cy="200" r="185"
              className="fill-none stroke-white/5"
              strokeWidth="8"
            />
            {/* Progress fill */}
            <motion.circle
              cx="200" cy="200" r="185"
              fill="none"
              stroke="url(#progressGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(99,102,241,1)" />
                <stop offset="100%" stopColor="rgba(6,182,212,1)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Glass face */}
          <div className="absolute inset-3 sm:inset-4 rounded-full bg-white/[0.03] backdrop-blur-md border border-white/[0.08] flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-2 text-center">
            {/* Session label */}
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-400 font-bold mb-2 sm:mb-4 truncate w-full px-4">
              {timerType === 'pomodoro' ? 'Focus Session' : isLearningSession ? 'Learning Tracker' : 'Open Stopwatch'}
            </span>

            {/* Time display */}
            <motion.span
              key={displayTime}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-mono tracking-tighter text-white drop-shadow-lg tabular-nums"
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {displayTime}
            </motion.span>

            {/* Status dot */}
            <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-5 bg-black/20 px-3 py-1 rounded-full border border-white/5">
              <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${isActive ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-gray-500'}`} />
              <span className="text-[10px] sm:text-xs text-gray-300 font-semibold uppercase tracking-wider">
                {isActive ? 'In Progress' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Preset Durations (Pomodoro only, when paused) */}
      <div className="h-16 flex items-center justify-center z-10 mt-6 sm:mt-8 w-full">
        <AnimatePresence>
          {timerType === 'pomodoro' && !isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 sm:gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10"
            >
              {[15, 25, 50, 90].map(mins => (
                <button
                  key={mins}
                  onClick={() => adjustDuration(mins - duration)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${duration === mins ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-400 active:bg-white/10 md:hover:bg-white/10 border border-transparent'}`}
                >
                  {mins}m
                </button>
              ))}
              <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
              <button onClick={() => adjustDuration(-5)} className="w-8 h-8 flex items-center justify-center text-gray-400 active:text-white md:hover:text-white active:bg-white/10 md:hover:bg-white/10 rounded-lg transition-colors font-bold hidden sm:flex">-</button>
              <button onClick={() => adjustDuration(5)} className="w-8 h-8 flex items-center justify-center text-gray-400 active:text-white md:hover:text-white active:bg-white/10 md:hover:bg-white/10 rounded-lg transition-colors font-bold hidden sm:flex">+</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-2 md:mt-4 flex items-center justify-center gap-4 sm:gap-6 z-10 flex-wrap"
      >
        {/* Reset */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: -12 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetTimer}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full glass flex items-center justify-center text-gray-400 active:text-white md:hover:text-white active:bg-white/10 md:hover:bg-white/10 transition-colors shadow-lg"
          aria-label="Reset Timer"
        >
          <RotateCcw size={20} className="sm:w-6 sm:h-6 w-5 h-5" />
        </motion.button>

        {/* Play/Pause — magnetic primary CTA */}
        <PremiumButton>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={toggleTimer}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-2xl shadow-primary/40 active:shadow-primary/60 md:hover:shadow-primary/60 transition-shadow relative border border-white/10"
            aria-label={isActive ? "Pause Timer" : "Start Timer"}
          >
            {/* Ripple glow on active */}
            {isActive && (
              <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
            )}
            <AnimatePresence mode="wait">
              {isActive
                ? <motion.span key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-white" /></motion.span>
                : <motion.span key="play"  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Play  className="w-6 h-6 sm:w-8 sm:h-8 fill-white ml-1" /></motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </PremiumButton>

        {/* End (stopwatch) or Spacer */}
        <AnimatePresence mode="wait">
          {timerType === 'stopwatch' && isActive ? (
            <motion.button
              key="end"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={finishStopwatch}
              className="btn-danger px-4 sm:px-6 h-12 sm:h-14 text-sm sm:text-base font-bold shadow-lg shadow-red-500/20"
            >
              End Session
            </motion.button>
          ) : (
            <motion.div key="spacer" className="w-12 h-12 sm:w-14 sm:h-14 hidden sm:block" />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default FocusMode;
