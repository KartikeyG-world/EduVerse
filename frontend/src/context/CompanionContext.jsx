import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../components/ui/ToastProvider';

export const CompanionContext = createContext();

// ─── Event Type Definitions ──────────────────────────────────────────────────
// Centralised registry of all known event types for consistency
export const COMPANION_EVENTS = {
  // Auth
  AUTH_SUCCESS:        'AUTH_SUCCESS',
  AUTH_ERROR:          'AUTH_ERROR',
  // Dashboard
  DASHBOARD_LOAD:      'DASHBOARD_LOAD',
  // Focus Mode
  FOCUS_START:         'FOCUS_START',
  FOCUS_PAUSE:         'FOCUS_PAUSE',
  FOCUS_COMPLETE:      'FOCUS_COMPLETE',
  // Skill Hub
  CLASS_ENDED_EARLY:   'CLASS_ENDED_EARLY',
  CLASS_COMPLETE:      'CLASS_COMPLETE',
  // Quiz
  QUIZ_START:          'QUIZ_START',
  QUIZ_SKIPPED:        'QUIZ_SKIPPED',
  QUIZ_COMPLETE:       'QUIZ_COMPLETE',
  // Tutor
  QUESTION_POSTED:     'QUESTION_POSTED',
  SOLUTION_SUBMITTED:  'SOLUTION_SUBMITTED',
  SOLUTION_ACCEPTED:   'SOLUTION_ACCEPTED',
  // Generic
  ACTION_ERROR:        'ACTION_ERROR',
  // Idle (internal)
  IDLE_FOCUS_PAGE:     'IDLE_FOCUS_PAGE',
  IDLE_GENERAL:        'IDLE_GENERAL',
};

// ─── Animation Mood Mapping ──────────────────────────────────────────────────
const EVENT_MOOD_MAP = {
  AUTH_SUCCESS:       'success',
  AUTH_ERROR:         'warning',
  DASHBOARD_LOAD:     'idle',
  FOCUS_START:        'active',
  FOCUS_PAUSE:        'idle',
  FOCUS_COMPLETE:     'success',
  CLASS_ENDED_EARLY:  'warning',
  CLASS_COMPLETE:     'success',
  QUIZ_START:         'active',
  QUIZ_SKIPPED:       'idle',
  QUIZ_COMPLETE:      'success',
  QUESTION_POSTED:    'active',
  SOLUTION_SUBMITTED: 'active',
  SOLUTION_ACCEPTED:  'success',
  ACTION_ERROR:       'warning',
  IDLE_FOCUS_PAGE:    'warning',
  IDLE_GENERAL:       'idle',
};

// ─── Intelligent Message Generator ──────────────────────────────────────────
// Core intelligence. Receives event + history and returns a dynamic string.
const generateMessage = (event, history) => {
  const { type, data = {} } = event;

  // Helper: count event type occurrences in recent history
  const countRecent = (eventType, limit = 10) =>
    history.slice(-limit).filter(e => e.type === eventType).length;

  switch (type) {

    case 'AUTH_SUCCESS': {
      const name = data.name ? data.name.split(' ')[0] : 'there';
      const isReturn = history.filter(e => e.type === 'AUTH_SUCCESS').length > 1;
      return isReturn
        ? `Welcome back, ${name}! Your streak is waiting for you.`
        : `Hey ${name}! I'm your AI study companion. Let's build something great together.`;
    }

    case 'AUTH_ERROR':
      return data.message || 'Login failed. Double-check your credentials and try again.';

    case 'DASHBOARD_LOAD': {
      const name = data.name ? data.name.split(' ')[0] : 'Student';
      const hour = new Date().getHours();
      if (hour < 12) return `Good morning, ${name}! Ready for a productive study session?`;
      if (hour < 17) return `Good afternoon, ${name}! Let's keep the momentum going.`;
      return `Good evening, ${name}! Evening sessions are great for deep focus.`;
    }

    case 'FOCUS_START': {
      const prevCompletions = countRecent('FOCUS_COMPLETE');
      const prevEarlyEnds   = countRecent('FOCUS_PAUSE', 5);
      if (prevCompletions >= 2) return `You're on a roll — ${prevCompletions} sessions completed today. Keep it up!`;
      if (prevEarlyEnds >= 2)   return `Let's finish this one. You've paused a few times — you can do it!`;
      const duration = data.duration;
      return duration
        ? `${duration}-minute focus session started. I'm tracking your progress.`
        : `Stopwatch running. I'm here with you the whole way.`;
    }

    case 'FOCUS_PAUSE': {
      return `Focus paused. Take a breath — I'll be right here when you're ready.`;
    }

    case 'FOCUS_COMPLETE': {
      const xp  = data.xp  || 0;
      const min = data.minutes || 0;
      const completionsToday = countRecent('FOCUS_COMPLETE');
      if (completionsToday >= 3) return `Incredible consistency today. ${xp} XP earned. You're developing a real habit!`;
      if (min >= 45)             return `Deep work mastery — ${min} minutes completed, ${xp} XP earned. Excellent discipline.`;
      return `Session complete! ${xp} XP earned. Each session builds your foundation.`;
    }

    case 'CLASS_ENDED_EARLY': {
      const earlyEnds = countRecent('CLASS_ENDED_EARLY', 5);
      if (earlyEnds >= 2) return `You've ended a few classes early. Try watching at least 5 minutes to unlock the quiz!`;
      return `Class ended. Watch at least 1 minute to unlock your AI-generated quiz.`;
    }

    case 'CLASS_COMPLETE': {
      return `Full session completed — excellent! Your quiz is ready.`;
    }

    case 'QUIZ_START': {
      const prevSkips = countRecent('QUIZ_SKIPPED', 5);
      if (prevSkips >= 2) return `Great choice taking the quiz! This will help your retention significantly.`;
      return `Quiz time! Let's see how much you absorbed from that session.`;
    }

    case 'QUIZ_SKIPPED': {
      const skipCount = countRecent('QUIZ_SKIPPED', 10);
      if (skipCount >= 3) return `You've skipped several quizzes recently. Attempting them — even briefly — really strengthens what you learn.`;
      if (skipCount === 2) return `Try the next quiz when you can. Testing yourself doubles long-term retention.`;
      return `No worries — quizzes are optional, but they help a lot. Give it a try next time!`;
    }

    case 'QUIZ_COMPLETE': {
      const pct = data.percentage ?? 0;
      if (pct >= 90)     return `Outstanding! ${pct}% — you've truly mastered this topic. 🎯`;
      if (pct >= 70)     return `Great result — ${pct}%! Solid understanding. Review the misses to get to 100%.`;
      if (pct >= 50)     return `Good effort — ${pct}%. Re-watching challenging parts will push you higher next time.`;
      return `${pct}% this time — don't be discouraged. Every attempt builds knowledge. Try again soon!`;
    }

    case 'QUESTION_POSTED': {
      return `Your question is live! A tutor will respond shortly. Stay curious.`;
    }

    case 'SOLUTION_SUBMITTED': {
      return `Solution submitted! Great initiative — teaching others is the best way to learn.`;
    }

    case 'SOLUTION_ACCEPTED': {
      const xp = data.xp || 10;
      return `Your solution was accepted! +${xp} XP earned. You just helped another learner.`;
    }

    case 'ACTION_ERROR': {
      return data.message || `Something went wrong. I'll keep watching for you.`;
    }

    case 'IDLE_FOCUS_PAGE': {
      return `Are you still focusing? Don't lose your momentum — you've got this!`;
    }

    case 'IDLE_GENERAL': {
      const suggestions = [
        `I'm here whenever you're ready. Your goals are waiting.`,
        `No rush — but your focus streak is counting on you! 😊`,
        `Taking a break? That's perfectly fine. I'll be here.`,
      ];
      return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    default:
      return data.message || null;
  }
};

// ─── Provider ────────────────────────────────────────────────────────────────
export const CompanionProvider = ({ children }) => {
  const [mood, setMood]                 = useState('idle');
  const [message, setMessage]           = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);   // local memory — last 10 actions
  const { showToast } = useToast();
  const location = useLocation();
  const idleTimerRef    = useRef(null);
  const messageTimerRef = useRef(null);
  const moodRef         = useRef(mood);
  const locationRef     = useRef(location.pathname);

  useEffect(() => { moodRef.current = mood; },                    [mood]);
  useEffect(() => { locationRef.current = location.pathname; },   [location.pathname]);

  // ── Core: Dispatch an event object ──────────────────────────────────────
  const recentEventsRef = useRef([]);

  const triggerFeedback = useCallback((eventOrText, legacyMood = 'idle', legacyDuration = 5000) => {
    // 1. Handle Legacy Compatibility (Plain string calls)
    if (typeof eventOrText === 'string') {
      const text = eventOrText;
      clearTimeout(messageTimerRef.current);
      setMessage(text);
      setMood(legacyMood);
      
      if (legacyDuration > 0) {
        messageTimerRef.current = setTimeout(() => {
          setMessage(null);
          setMood('idle'); // Always reset to idle
        }, legacyDuration);
      }
      return;
    }

    // 2. Handle Structured Event Flow
    const event = eventOrText;
    const updated = [...recentEventsRef.current, { ...event, timestamp: Date.now() }].slice(-10);
    recentEventsRef.current = updated;
    setRecentEvents(updated);

    // Generate dynamic message
    const text = generateMessage(event, updated);
    if (!text) return;

    const resolvedMood = EVENT_MOOD_MAP[event.type] || 'idle';
    const duration     = event.duration ?? 5000; // Default to 5s if not specified

    // Clear existing resets and set new state
    clearTimeout(messageTimerRef.current);
    setMessage(text);
    setMood(resolvedMood);

    // Guaranteed reset to idle
    messageTimerRef.current = setTimeout(() => {
      setMessage(null);
      setMood('idle');
    }, duration);

    // ── Global Toast Integrations ──────────
    if (event.type === COMPANION_EVENTS.FOCUS_COMPLETE && event.data?.xp) {
      showToast(`+${event.data.xp} XP Earned`, 'xp');
    } else if (event.type === COMPANION_EVENTS.AUTH_SUCCESS) {
      showToast('Login Successful', 'success');
    } else if (event.type === COMPANION_EVENTS.AUTH_ERROR) {
      showToast(event.data?.message || 'Authentication Error', 'warning');
    } else if (event.type === COMPANION_EVENTS.SOLUTION_ACCEPTED) {
      showToast('+10 XP Accepted!', 'xp');
    } else if (event.type === COMPANION_EVENTS.FOCUS_START) {
      showToast('Focus Mode Activated', 'focus');
    }
  }, [showToast]);

  // ── Global Idle Detection ────────────────────────────────────────────────
  useEffect(() => {
    const handleActivity = () => {
      if (moodRef.current === 'warning') {
        setMessage(null);
        setMood('idle');
      }
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        const isOnFocusPage = locationRef.current === '/focus';
        triggerFeedback({
          type: isOnFocusPage ? COMPANION_EVENTS.IDLE_FOCUS_PAGE : COMPANION_EVENTS.IDLE_GENERAL,
          duration: isOnFocusPage ? 8000 : 5000,
        });
      }, 120000);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown',   handleActivity);
    window.addEventListener('scroll',    handleActivity);
    window.addEventListener('click',     handleActivity);
    handleActivity();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown',   handleActivity);
      window.removeEventListener('scroll',    handleActivity);
      window.removeEventListener('click',     handleActivity);
      clearTimeout(idleTimerRef.current);
    };
  }, [triggerFeedback]);

  // ── Clear message on route change ────────────────────────────────────────
  useEffect(() => {
    clearTimeout(messageTimerRef.current);
    setMessage(null);
    setMood('idle');
  }, [location.pathname]);

  return (
    <CompanionContext.Provider value={{ mood, setMood, message, triggerFeedback, recentEvents }}>
      {children}
    </CompanionContext.Provider>
  );
};
