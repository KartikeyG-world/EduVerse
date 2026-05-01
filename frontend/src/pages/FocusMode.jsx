import React, { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, Clock, Timer } from 'lucide-react';
import { FocusContext } from '../context/FocusContext';
import ParticleBackground from '../components/ui/ParticleBackground';
import PremiumButton from '../components/ui/PremiumButton';

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

  const isLearningSession = activeSessionId !== null && timerType === 'stopwatch';
  const progress = timerType === 'pomodoro'
    ? 1 - timeLeft / (duration * 60)
    : 0;
  const circumference = 2 * Math.PI * 185;

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden bg-focus-mode rounded-3xl min-h-[calc(100vh-140px)]">

      {/* Depth rings behind the clock */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[550px] h-[550px] rounded-full border border-white/[0.03] animate-pulse" />
        <div className="absolute w-[680px] h-[680px] rounded-full border border-white/[0.02]" />
      </div>

      {/* Focus particle background */}
      <ParticleBackground mode={isActive ? 'focus' : 'ambient'} />

      {/* Active glow bloom behind clock */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <div className="w-[440px] h-[440px] rounded-full bg-primary/10 blur-[80px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header controls */}
      <div className="absolute top-5 right-5 flex gap-3 z-10">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2.5 glass rounded-full transition-all duration-300 ${soundEnabled ? 'text-primary border-primary/30 glow-primary' : 'text-gray-500'}`}
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
        className="mb-8 flex bg-white/[0.04] rounded-full p-1.5 border border-white/[0.07] relative z-10"
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
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex gap-2 items-center
              ${isLearningSession ? 'opacity-40 cursor-not-allowed' : ''}
              ${timerType === key
                ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            {icon} {label}
          </button>
        ))}
      </motion.div>

      {/* Duration adjuster (Pomodoro only) */}
      <AnimatePresence>
        {timerType === 'pomodoro' && !isActive && (
          <motion.div
            key="duration-adjust"
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-8 flex items-center gap-5 glass px-8 py-4 rounded-2xl z-10"
          >
            <button
              onClick={() => adjustDuration(-5)}
              className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-primary/20 text-gray-400 hover:text-primary transition-all border border-white/10 text-lg font-bold"
            >−</button>
            <div className="flex flex-col items-center min-w-[80px]">
              <span className="text-3xl font-bold text-white leading-none tabular-nums">{duration}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-0.5">Minutes</span>
            </div>
            <button
              onClick={() => adjustDuration(10)}
              className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-primary/20 text-gray-400 hover:text-primary transition-all border border-white/10 text-lg font-bold"
            >+</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main clock ring */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 26 }}
        className="relative z-10"
      >
        <div className={`relative w-[400px] h-[400px] ${isActive ? 'pulse-ring' : ''}`}>
          {/* Outer decorative ring */}
          <div className="absolute inset-0 rounded-full border border-white/[0.06]" />

          {/* SVG progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 400 400">
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
          <div className="absolute inset-4 rounded-full bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] flex flex-col items-center justify-center shadow-2xl">
            {/* Session label */}
            <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold mb-3">
              {timerType === 'pomodoro' ? 'Focus Mode' : isLearningSession ? 'Learning Session' : 'Open Ended'}
            </span>

            {/* Time display */}
            <motion.span
              key={displayTime}
              className="text-7xl font-bold font-mono tracking-tighter neon-text tabular-nums"
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {displayTime}
            </motion.span>

            {/* Status dot */}
            <div className="flex items-center gap-2 mt-4">
              <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-xs text-gray-500 font-medium">
                {isActive ? 'Running' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-12 flex items-center gap-6 z-10"
      >
        {/* Reset */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: -12 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetTimer}
          className="w-14 h-14 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw size={22} />
        </motion.button>

        {/* Play/Pause — magnetic primary CTA */}
        <PremiumButton>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={toggleTimer}
            className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-shadow relative"
          >
            {/* Ripple glow on active */}
            {isActive && (
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            )}
            <AnimatePresence mode="wait">
              {isActive
                ? <motion.span key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Pause size={30} className="fill-white" /></motion.span>
                : <motion.span key="play"  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Play  size={30} className="fill-white ml-1" /></motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </PremiumButton>

        {/* End (stopwatch) */}
        <AnimatePresence>
          {timerType === 'stopwatch' && isActive && (
            <motion.button
              key="end"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={finishStopwatch}
              className="btn-danger px-6 h-14"
            >
              End Session
            </motion.button>
          )}
          {(timerType !== 'stopwatch' || !isActive) && (
            <motion.div key="spacer" className="w-14 h-14" />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default FocusMode;
