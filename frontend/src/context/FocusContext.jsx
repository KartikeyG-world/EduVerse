import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import api from '../utils/api';
import { AuthContext } from './AuthContext';
import { CompanionContext, COMPANION_EVENTS } from './CompanionContext';

export const FocusContext = createContext();

const completionSound = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const FocusProvider = ({ children }) => {
  const { updateUser, isAuthenticated } = useContext(AuthContext);
  const { triggerFeedback } = useContext(CompanionContext);

  const [timerType, setTimerType] = useState('pomodoro');
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Refs for stable access inside callbacks without stale closures
  const timerTypeRef     = useRef(timerType);
  const isActiveRef      = useRef(isActive);
  const activeSessionRef = useRef(activeSessionId);
  const stopwatchTimeRef = useRef(stopwatchTime);

  useEffect(() => { timerTypeRef.current = timerType; },          [timerType]);
  useEffect(() => { isActiveRef.current = isActive; },            [isActive]);
  useEffect(() => { activeSessionRef.current = activeSessionId; }, [activeSessionId]);
  useEffect(() => { stopwatchTimeRef.current = stopwatchTime; },   [stopwatchTime]);

  // ── XP / Session Complete ─────────────────────────────────────────────────
  const handleSessionComplete = useCallback(async (secondsFocused) => {
    if (!isAuthenticated) return;
    try {
      const xpToEarn = Math.floor(secondsFocused / 30);
      
      if (xpToEarn > 0) {
        const res = await api.put('/users/add-xp', { xpToAdd: xpToEarn, focusSeconds: secondsFocused });
        updateUser({ streak: res.data.streak });
      }
      
      // Always trigger feedback so the event flow completes regardless of XP gained
      triggerFeedback({
        type: COMPANION_EVENTS.FOCUS_COMPLETE,
        data: { xp: xpToEarn, minutes: Math.round(secondsFocused / 60) },
        duration: 8000,
      });
    } catch (err) {
      console.error('Failed to log session', err);
    }
  }, [isAuthenticated, updateUser, triggerFeedback]);

  // ── Global Timer Interval ─────────────────────────────────────────────────
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (timerTypeRef.current === 'pomodoro') {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsActive(false);
              if (soundEnabled) {
                new Audio(completionSound).play().catch(() => {});
              }
              handleSessionComplete(duration * 60);
              return 0;
            }
            return prev - 1;
          });
        } else {
          setStopwatchTime((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, soundEnabled, duration, handleSessionComplete]);

  // ── Manual Controls ───────────────────────────────────────────────────────
  const toggleTimer = useCallback(() => {
    const willBeActive = !isActiveRef.current;
    setIsActive(willBeActive);
    if (willBeActive) {
      triggerFeedback({ 
        type: COMPANION_EVENTS.FOCUS_START, 
        data: { duration: timerTypeRef.current === 'pomodoro' ? duration : null } 
      });
    } else {
      triggerFeedback({ type: COMPANION_EVENTS.FOCUS_PAUSE });
    }
  }, [duration, triggerFeedback]);

  const finishStopwatch = useCallback((silent = false) => {
    const elapsed = stopwatchTimeRef.current;
    setIsActive(false);
    setStopwatchTime(0);
    setActiveSessionId(null);
    if (!silent && elapsed > 0 && isAuthenticated) {
      handleSessionComplete(elapsed);
    }
  }, [isAuthenticated, handleSessionComplete]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeout(() => {
      if (timerTypeRef.current === 'stopwatch') {
        setStopwatchTime(0);
      } else {
        setTimeLeft((dur) => dur); // trigger re‑read from duration
        setTimeLeft(duration * 60);
      }
    }, 10);
  }, [duration]);

  const adjustDuration = useCallback((amount) => {
    if (isActiveRef.current) return;
    const newDuration = Math.min(720, Math.max(1, duration + amount));
    setDuration(newDuration);
    setTimeLeft(newDuration * 60);
  }, [duration]);

  // ── Automation Methods (stable refs via useCallback) ──────────────────────
  const startStopwatchSession = useCallback((sessionId) => {
    // Don't interrupt a running Pomodoro
    if (timerTypeRef.current === 'pomodoro' && isActiveRef.current) return;
    setTimerType('stopwatch');
    setActiveSessionId(sessionId);
    setIsActive(true);
    triggerFeedback({ type: COMPANION_EVENTS.FOCUS_START, data: { module: 'Automation' } });
  }, [triggerFeedback]);

  const pauseStopwatchSession = useCallback((sessionId) => {
    if (activeSessionRef.current === sessionId && isActiveRef.current) {
      setIsActive(false);
      triggerFeedback({ type: COMPANION_EVENTS.FOCUS_PAUSE });
    }
  }, [triggerFeedback]);

  const endStopwatchSession = useCallback((sessionId) => {
    if (activeSessionRef.current === sessionId) {
      finishStopwatch();
    }
  }, [finishStopwatch]);

  // ── formatTime helper ─────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const displayTime = timerType === 'stopwatch'
    ? formatTime(stopwatchTime)
    : formatTime(timeLeft);

  return (
    <FocusContext.Provider value={{
      timerType, setTimerType,
      duration, setDuration,
      timeLeft, setTimeLeft,
      stopwatchTime, setStopwatchTime,
      isActive, setIsActive,
      soundEnabled, setSoundEnabled,
      activeSessionId,
      displayTime,
      toggleTimer, finishStopwatch, resetTimer, adjustDuration,
      startStopwatchSession, pauseStopwatchSession, endStopwatchSession,
      handleSessionComplete,
    }}>
      {children}
    </FocusContext.Provider>
  );
};
