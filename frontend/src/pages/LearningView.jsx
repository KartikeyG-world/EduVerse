import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, Trophy, Zap, AlertCircle,
  CheckCircle, BookOpen, ChevronRight, Brain, Timer, Square, Play,
  List,
} from 'lucide-react';
import api from '../utils/api';
import QuizModal from '../components/ui/QuizModal';
import { FocusContext } from '../context/FocusContext';
import { CompanionContext, COMPANION_EVENTS } from '../context/CompanionContext';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';

// ─── Helpers ────────────────────────────────────────────────────────────────

const extractYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^\&\n?#]+)/
  );
  return match ? match[1] : null;
};

const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
};

// Circular SVG progress ring
const ProgressRing = ({ progress, size = 96, stroke = 7 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const isComplete = progress >= 95;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
      />
      {/* Progress */}
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={isComplete ? '#f59e0b' : 'url(#progressGrad)'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// ─── YouTube IFrame API Loader ───────────────────────────────────────────────
let ytApiReady = false;
let ytApiCallbacks = [];

const loadYouTubeAPI = () => {
  return new Promise((resolve) => {
    if (ytApiReady && window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    ytApiCallbacks.push(resolve);
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
};

// Called by YouTube API when ready
window.onYouTubeIframeAPIReady = () => {
  ytApiReady = true;
  ytApiCallbacks.forEach((cb) => cb(window.YT));
  ytApiCallbacks = [];
};

// ─── Main Component ──────────────────────────────────────────────────────────

const LearningView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [skill, setSkill]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [progress, setProgress]         = useState(0);
  const [watchedSecs, setWatchedSecs]   = useState(0);
  const [totalSecs, setTotalSecs]       = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [lastSaved, setLastSaved]       = useState(null);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [showQueue, setShowQueue]       = useState(true);
  const [isSaving, setIsSaving]         = useState(false);

  // Quiz state
  const [showQuiz, setShowQuiz]           = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizLoading, setQuizLoading]     = useState(false);
  // For playlists, quiz is always available on Finish/Back.
  // For single videos, require at least 60 s watched.
  const hasWatchedEnough = skill?.type === 'playlist' ? true : watchedSecs > 60;

  // Focus Context
  const {
    startStopwatchSession,
    pauseStopwatchSession,
    endStopwatchSession,
    activeSessionId,
    stopwatchTime
  } = useContext(FocusContext);
  const sessionId = `skill-${id}`;
  const isThisSessionActive = activeSessionId === sessionId;

  const { triggerFeedback } = useContext(CompanionContext);
  const { isAuthenticated } = useContext(AuthContext);

  const playerRef          = useRef(null);   // YT.Player instance
  const containerRef       = useRef(null);   // div for player mount
  const intervalRef        = useRef(null);   // 10s save interval
  const inactivityTimerRef = useRef(null);
  const progressRef        = useRef({ watchedSecs: 0, totalSecs: 0, completed: false });

  // ── Smart Inactivity System ──
  const [isInactive, setIsInactive] = useState(false);
  useEffect(() => {
    const resetInactivity = () => {
      setIsInactive(false);
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => setIsInactive(true), 120000); // 2 min
    };
    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown',   resetInactivity);
    resetInactivity();
    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keydown',   resetInactivity);
      clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  // Sync Focus Mode Timer with video/activity state
  useEffect(() => {
    if (isPlaying) {
      startStopwatchSession(sessionId);
    } else {
      if (isInactive) {
        pauseStopwatchSession(sessionId);
      } else {
        startStopwatchSession(sessionId);
      }
    }
  }, [isPlaying, isInactive, sessionId, startStopwatchSession, pauseStopwatchSession]);

  // Handle final cleanup for focus session on unmount
  useEffect(() => {
    return () => {
      endStopwatchSession(sessionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load skill from API ──
  useEffect(() => {
    const fetchSkill = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        setError('Please sign in to access this learning session.');
        return;
      }
      try {
        const res = await api.get(`/skills/${id}`);
        setSkill(res.data);
        setProgress(res.data.progress || 0);

        if (res.data.type === 'playlist') {
          // Priority 1: Resume from exact saved index
          const savedIndex = res.data.playlistData?.currentVideoIndex || 0;
          let targetVideoId = res.data.videos?.[savedIndex];

          // Priority 2: Fall back to first uncompleted video
          if (!targetVideoId || res.data.completedVideos?.includes(targetVideoId)) {
            targetVideoId = res.data.videos?.find(vId => !res.data.completedVideos?.includes(vId));
          }

          setActiveVideoId(targetVideoId || res.data.videos?.[0] || extractYouTubeId(res.data.videoUrl));
        } else {
          setActiveVideoId(extractYouTubeId(res.data.videoUrl));
          setWatchedSecs(res.data.watchedDuration || 0);
          setTotalSecs(res.data.totalDuration || 0);
          progressRef.current.watchedSecs = res.data.watchedDuration || 0;
          progressRef.current.totalSecs   = res.data.totalDuration || 0;
        }

        progressRef.current.completed = res.data.completed || false;
      } catch (err) {
        setError('Could not load this skill. It may have been deleted.');
      } finally {
        setLoading(false);
      }
    };
    fetchSkill();
  }, [id, isAuthenticated]);

  // ── Switch to a specific video in a playlist ──
  const moveToVideo = (vId) => {
    setActiveVideoId(vId);
    setWatchedSecs(0);
    setProgress(0);
    setIsPlaying(false);
    setShowQuiz(false);
    // Clear previous quiz so the new lesson generates a fresh set
    setQuizQuestions([]);
    // Reset progress tracking for the new video
    progressRef.current.watchedSecs = 0;
    progressRef.current.totalSecs = 0;
    progressRef.current.completed = false;
  };

  // ── Advance to the next playlist video (or navigate away if last) ──
  // Uses a callback ref pattern to avoid stale-closure bugs with activeVideoId
  const moveToNextVideo = useCallback(() => {
    if (!skill || !skill.videos) return;
    setActiveVideoId((currentVid) => {
      const currentIndex = skill.videos.indexOf(currentVid);
      if (currentIndex !== -1 && currentIndex < skill.videos.length - 1) {
        const nextVid = skill.videos[currentIndex + 1];
        // Reset state for the next video
        setWatchedSecs(0);
        setProgress(0);
        setIsPlaying(false);
        setShowQuiz(false);
        setQuizQuestions([]);
        progressRef.current.watchedSecs = 0;
        progressRef.current.totalSecs = 0;
        progressRef.current.completed = false;
        return nextVid;
      }
      // Last video — navigate away. We can't call navigate() inside setState,
      // so we schedule it after the current render cycle.
      setTimeout(() => navigate('/skills'), 0);
      return currentVid; // keep current until navigation fires
    });
  }, [skill, navigate]);

  // ── Generate quiz questions from AI ──
  const generateQuiz = useCallback(async () => {
    // Guard: don't start a second generation while one is in flight
    if (!skill || quizLoading) return;
    // If questions already loaded for this video, reuse them (don't regenerate)
    if (quizQuestions.length > 0) return;

    setQuizLoading(true);
    try {
      const currentLesson = skill.type === 'playlist'
        ? skill.playlistData?.videos?.find(v => v.videoId === activeVideoId)
        : null;
      const topicTitle = currentLesson?.title
        ? `${currentLesson.title} (${skill.title})`
        : skill.title;

      const prompt = `Generate exactly 5 multiple-choice quiz questions about the topic: "${topicTitle}" (category: ${skill.category}).
IMPORTANT: The primary language MUST be English, but provide a Hindi translation for each field.

Return ONLY a valid JSON array with this exact structure, no extra text:
[
  {
    "question": "Question text in English?",
    "questionHindi": "प्रश्न पाठ हिंदी में?",
    "options": ["Option A English", "Option B English", "Option C English", "Option D English"],
    "optionsHindi": ["विकल्प ए हिंदी", "विकल्प बी हिंदी", "विकल्प सी हिंदी", "विकल्प डी हिंदी"],
    "correctIndex": 0
  }
]

Make each question test real conceptual understanding. correctIndex is 0-based.`;

      const res = await api.post('/ai/chat', { message: prompt, history: [], isSystemMessage: true });
      const raw = res.data.reply;

      // Extract JSON robustly — match a JSON array anywhere in the response
      const jsonMatch = raw.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in AI response');
      const parsed = JSON.parse(jsonMatch[0]);

      if (Array.isArray(parsed) && parsed.length > 0) {
        setQuizQuestions(parsed);
      }
    } catch (err) {
      console.warn('Quiz generation failed:', err.message);
      // On failure, reset so the user isn't left stuck on a loading spinner
      setQuizQuestions([]);
    } finally {
      setQuizLoading(false);
      triggerFeedback({ type: COMPANION_EVENTS.QUIZ_START });
    }
  }, [skill, quizLoading, quizQuestions.length, triggerFeedback, activeVideoId]);

  // ── Save quiz attempt to backend ──
  const saveQuizAttempt = async (score, total) => {
    try {
      await api.post(`/skills/${id}/quiz`, { score, totalQuestions: total });
    } catch (err) {
      console.warn('Failed to save quiz attempt:', err.message);
    }
  };

  // ── Unified post-quiz navigation ──
  // BUG 4 FIX: Both playlist and single-video modes ALWAYS navigate to /skills
  // after the quiz closes (submit or skip). The mid-playlist auto-play-next is
  // a separate auto-play mechanic triggered when a video ENDS naturally, NOT
  // when the user actively leaves via Finish/Back.
  const handlePostQuizNav = useCallback(() => {
    setShowQuiz(false);
    setQuizQuestions([]);
    navigate('/skills');
  }, [navigate]);

  // ── Handle "Finish" / End Class button ──
  const handleEndClass = () => {
    // 1. Pause video
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    }

    // 2. Stop focus stopwatch
    endStopwatchSession(sessionId);

    // 3. Save current progress
    //    For playlist: do NOT mark the video as complete just because the user
    //    clicked Finish. Only mark complete when the video actually ends.
    if (playerRef.current && !progressRef.current.completed) {
      const currentTime = playerRef.current.getCurrentTime?.() || 0;
      if (skill.type !== 'playlist') {
        if (currentTime > progressRef.current.watchedSecs) {
          progressRef.current.watchedSecs = currentTime;
          setWatchedSecs(currentTime);
        }
        saveProgress(progressRef.current.watchedSecs, progressRef.current.totalSecs);
      } else {
        // Playlist: Save exact timestamp before ending class
        const currentIndex = skill.videos?.indexOf(activeVideoId) || 0;
        saveProgress(null, null, {
          videoId: activeVideoId,
          currentVideoIndex: currentIndex,
          lastWatchedTimestamp: Math.floor(currentTime)
        });
      }
    }

    // 4. Offer quiz, or navigate away if they haven't watched enough
    if (hasWatchedEnough && !showQuiz) {
      generateQuiz();
      setShowQuiz(true);
    } else {
      triggerFeedback({
        type: COMPANION_EVENTS.CLASS_ENDED_EARLY,
        data: { module: 'SkillHub' }
      });
      navigate('/skills');
    }
  };

  // ── Handle back arrow navigation ──
  const handleBack = () => {
    endStopwatchSession(sessionId);

    if (hasWatchedEnough && !showQuiz) {
      generateQuiz();
      setShowQuiz(true);
    } else {
      navigate('/skills');
    }
  };

  // ── Save progress to backend ──
  const saveProgress = useCallback(async (watched, total, videoCompletionInfo = null) => {
    if (!isAuthenticated) return;

    let body = {};
    if (skill?.type === 'playlist') {
      if (typeof videoCompletionInfo === 'object' && videoCompletionInfo !== null) {
        if (videoCompletionInfo.videoId) body.videoId = videoCompletionInfo.videoId;
        if (videoCompletionInfo.isCompleted !== undefined) body.isCompleted = videoCompletionInfo.isCompleted;
        if (videoCompletionInfo.lastWatchedTimestamp !== undefined) body.lastWatchedTimestamp = videoCompletionInfo.lastWatchedTimestamp;
        if (videoCompletionInfo.currentVideoIndex !== undefined) body.currentVideoIndex = videoCompletionInfo.currentVideoIndex;
      } else if (typeof videoCompletionInfo === 'string') {
        body.completedVideoId = videoCompletionInfo;
        body.isCompleted = true;
        body.lastWatchedTimestamp = 0;
      } else {
        return;
      }
    } else {
      if (progressRef.current.completed) return;
      const effectiveWatched = watched ?? progressRef.current.watchedSecs;
      const effectiveTotal   = total   ?? progressRef.current.totalSecs;
      if (effectiveTotal === 0 && !videoCompletionInfo) return;
      body = {
        watchedDuration: Math.floor(effectiveWatched),
        totalDuration:   Math.floor(effectiveTotal),
      };
    }

    try {
      setIsSaving(true);
      const res = await api.put(`/skills/${id}/progress`, body);
      const newProgress = res.data.progress;
      setProgress(newProgress);
      setLastSaved(new Date());

      if (res.data.type === 'playlist') {
        setSkill(res.data);
      }

      if (res.data.completed && !progressRef.current.completed) {
        progressRef.current.completed = true;
        setShowComplete(true);
        setSkill((prev) => ({ ...prev, completed: true, progress: 100 }));
      }
    } catch (err) {
      console.warn('Progress save failed', err);
    } finally {
      setIsSaving(false);
    }
  }, [id, isAuthenticated, skill?.type]);

  // ── Toggle individual video completion from the sidebar ──
  const toggleVideoCompletion = (e, videoId, currentDoneStatus) => {
    e.stopPropagation();
    saveProgress(null, null, { videoId, isCompleted: !currentDoneStatus });
  };

  // ── Initialize YouTube Player ──
  // BUG 2 FIX: activeVideoId is in the dependency array so the player is fully
  // destroyed and recreated each time the user switches to a different lesson.
  useEffect(() => {
    if (!skill || !activeVideoId) return;

    let player;

    loadYouTubeAPI().then((YT) => {
      if (!containerRef.current) return;

      // Destroy any previous player instance before creating a new one
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
      }

      player = new YT.Player(containerRef.current, {
        videoId: activeVideoId,
        width:  '100%',
        height: '100%',
        playerVars: {
          autoplay:       0,
          modestbranding: 1,
          rel:            0,
          disablekb:      0,
          controls:       1,
          fs:             1,
          color:          'white',
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;

            if (skill.type !== 'playlist') {
              const dur = event.target.getDuration();
              if (dur > 0) {
                setTotalSecs(dur);
                progressRef.current.totalSecs = dur;
              }
              // Resume from last watched position (if > 10s to avoid micro-seeks)
              const resumeAt = progressRef.current.watchedSecs;
              if (resumeAt > 10) {
                event.target.seekTo(resumeAt, true);
              }
            } else {
              // Playlist: start from last watched position
              const currentVidItem = skill.playlistData?.videos?.find(v => v.videoId === activeVideoId);
              const resumeAt = currentVidItem?.lastWatchedTimestamp || 0;
              if (resumeAt > 10) {
                event.target.seekTo(resumeAt, true);
              }
            }
          },

          onStateChange: (event) => {
            const YTState = window.YT;
            if (!YTState) return;

            if (event.data === YTState.PlayerState.PLAYING) {
              setIsPlaying(true);

              if (skill.type !== 'playlist') {
                const dur = event.target.getDuration();
                if (dur > 0 && progressRef.current.totalSecs === 0) {
                  setTotalSecs(dur);
                  progressRef.current.totalSecs = dur;
                }
              }

              // Periodic save every 10 seconds
              clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (!playerRef.current || progressRef.current.completed) return;

                const currentTime = playerRef.current.getCurrentTime();

                if (skill.type !== 'playlist') {
                  const duration = playerRef.current.getDuration();

                  if (currentTime > progressRef.current.watchedSecs) {
                    progressRef.current.watchedSecs = currentTime;
                    setWatchedSecs(currentTime);
                  }
                  if (duration > 0) {
                    progressRef.current.totalSecs = duration;
                    setTotalSecs(duration);
                  }

                  const localPct = Math.min(
                    100,
                    Math.round((progressRef.current.watchedSecs / progressRef.current.totalSecs) * 100)
                  );
                  setProgress(localPct);
                  saveProgress(progressRef.current.watchedSecs, progressRef.current.totalSecs);
                } else {
                  const currentIndex = skill.videos?.indexOf(activeVideoId) || 0;
                  saveProgress(null, null, {
                    videoId: activeVideoId,
                    currentVideoIndex: currentIndex,
                    lastWatchedTimestamp: Math.floor(currentTime)
                  });
                }
              }, 10000);

            } else if (event.data === YTState.PlayerState.PAUSED) {
              setIsPlaying(false);
              clearInterval(intervalRef.current);

              if (!progressRef.current.completed) {
                const currentTime = playerRef.current?.getCurrentTime() || 0;
                
                if (skill.type !== 'playlist') {
                  const duration = playerRef.current?.getDuration() || 0;
                  if (currentTime > progressRef.current.watchedSecs) {
                    progressRef.current.watchedSecs = currentTime;
                    setWatchedSecs(currentTime);
                  }
                  if (duration > 0) {
                    progressRef.current.totalSecs = duration;
                    setTotalSecs(duration);
                  }
                  saveProgress(progressRef.current.watchedSecs, progressRef.current.totalSecs);
                } else {
                  const currentIndex = skill.videos?.indexOf(activeVideoId) || 0;
                  saveProgress(null, null, {
                    videoId: activeVideoId,
                    currentVideoIndex: currentIndex,
                    lastWatchedTimestamp: Math.floor(currentTime)
                  });
                }
              }

            } else if (event.data === YTState.PlayerState.ENDED) {
              setIsPlaying(false);
              clearInterval(intervalRef.current);

              if (skill.type === 'playlist') {
                // Mark this video as complete on natural end and reset timestamp
                const currentIndex = skill.videos?.indexOf(activeVideoId) || 0;
                saveProgress(null, null, {
                  videoId: activeVideoId,
                  currentVideoIndex: currentIndex,
                  isCompleted: true,
                  lastWatchedTimestamp: 0
                });

                // Auto-play next — but only on natural end, not on Finish/Back
                setActiveVideoId((currentVid) => {
                  const currentIndex = skill.videos.indexOf(currentVid);
                  const isLast = currentIndex === skill.videos.length - 1;

                  if (!isLast) {
                    const nextVid = skill.videos[currentIndex + 1];
                    setTimeout(() => {
                      setWatchedSecs(0);
                      setProgress(0);
                      setIsPlaying(false);
                      setShowQuiz(false);
                      setQuizQuestions([]);
                      progressRef.current.watchedSecs = 0;
                      progressRef.current.totalSecs = 0;
                      progressRef.current.completed = false;
                    }, 0);
                    return nextVid;
                  }
                  // Last video — fall through to show quiz below
                  return currentVid;
                });

                // Only show end-of-course quiz when it's the last video
                setActiveVideoId((currentVid) => {
                  const currentIndex = skill.videos.indexOf(currentVid);
                  if (currentIndex === skill.videos.length - 1) {
                    // End of playlist — offer quiz
                    generateQuiz();
                    setShowQuiz(true);
                  }
                  return currentVid; // no change
                });
                return; // Return here — auto-play handles navigation
              } else {
                // Single video ended
                const duration = playerRef.current?.getDuration() || progressRef.current.totalSecs;
                progressRef.current.watchedSecs = duration;
                setWatchedSecs(duration);
                setProgress(100);
                saveProgress(duration, duration);
              }

              // Single video: auto-trigger quiz on end
              generateQuiz();
              setShowQuiz(true);
            }
          },
        },
      });
    });

    return () => {
      // Save progress and clean up on unmount or on activeVideoId change
      clearInterval(intervalRef.current);
      if (playerRef.current && !progressRef.current.completed) {
        try {
          const currentTime = playerRef.current.getCurrentTime?.() || 0;
          if (skill?.type !== 'playlist') {
            if (currentTime > progressRef.current.watchedSecs) {
              progressRef.current.watchedSecs = currentTime;
            }
            saveProgress(progressRef.current.watchedSecs, progressRef.current.totalSecs);
          } else {
            const currentIndex = skill.videos?.indexOf(activeVideoId) || 0;
            saveProgress(null, null, {
              videoId: activeVideoId,
              currentVideoIndex: currentIndex,
              lastWatchedTimestamp: Math.floor(currentTime)
            });
          }
        } catch (_) {}
      }
      try { player?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  // activeVideoId in deps triggers full player re-init on video switch
  // Omitted skill and saveProgress to prevent remounts during periodic saves
  }, [activeVideoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading learning session...</p>
        </div>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <p className="text-white font-bold text-xl">{error || 'Skill not found'}</p>
          <p className="text-gray-400 text-sm">
            {!isAuthenticated
              ? 'You must be logged in to view your learning sessions and track progress.'
              : "We couldn't find the requested skill or you don't have permission to view it."}
          </p>
          <div className="flex flex-col gap-3 pt-4">
            {!isAuthenticated ? (
              <button
                onClick={() => navigate('/login')}
                className="w-full px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
              >
                Sign In to Continue
              </button>
            ) : (
              <button
                onClick={() => navigate('/skills')}
                className="w-full px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
              >
                Back to Skills Hub
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-white/5 text-gray-400 rounded-xl font-medium hover:text-white hover:bg-white/10 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isComplete = skill.completed || progress >= 95;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-3 flex items-center gap-4">
        <PremiumButton>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            Skills Hub
          </button>
        </PremiumButton>

        <ChevronRight size={14} className="text-gray-600" />

        <span className="text-white font-semibold text-sm truncate max-w-xs">{skill.title}</span>

        <div className="ml-auto flex items-center gap-4">
          {/* Save indicator */}
          <AnimatePresence>
            {isSaving && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-gray-500 flex items-center gap-1.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Saving...
              </motion.span>
            )}
            {!isSaving && lastSaved && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-gray-500"
              >
                ✓ Saved
              </motion.span>
            )}
          </AnimatePresence>

          {/* Mini progress bar */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <span className="text-xs font-bold text-accent tabular-nums">{Math.round(progress)}%</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex flex-col lg:flex-row gap-0 flex-1">

        {/* Video panel */}
        <div className="flex-1 bg-black relative flex flex-col">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            {/* YouTube IFrame mounts here */}
            <div
              ref={containerRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>

          {/* Video progress bar below video */}
          <div className="px-6 py-3 bg-black/60 border-t border-white/5">
            {skill.type === 'playlist' ? (
              <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                <span className="tabular-nums">
                  Playing item {(skill.videos?.indexOf(activeVideoId) || 0) + 1} of {skill.videos?.length || 0}
                </span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden shadow-inner hidden md:block">
                  <motion.div
                    className={`h-full rounded-full ${isComplete ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-gradient-to-r from-primary via-accent to-secondary'}`}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="tabular-nums font-medium">{formatTime(watchedSecs)}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    className={`h-full rounded-full ${isComplete ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-gradient-to-r from-primary via-accent to-secondary'}`}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <span className="tabular-nums font-medium">{formatTime(totalSecs)}</span>
              </div>
            )}
          </div>

          {/* Playlist Navigation Bar */}
          {skill.type === 'playlist' && (
            <div className="px-6 py-4 bg-surface/30 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                >
                  <List size={16} /> {showQueue ? 'Hide Queue' : 'Show Queue'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <PremiumButton>
                  <button
                    onClick={moveToNextVideo}
                    className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold flex items-center gap-2 border border-white/10 transition-all"
                  >
                    Skip Video <ChevronRight size={16} />
                  </button>
                </PremiumButton>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar panel */}
        <ScrollReveal
          delay={0.1}
          x={20}
          className="w-full lg:w-80 xl:w-96 bg-surface/20 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col backdrop-blur-sm"
        >
          <div className="p-6 flex flex-col gap-6 flex-1">

            {/* Progress ring + stats */}
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <ProgressRing progress={progress} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className={`text-lg font-black tabular-nums ${isComplete ? 'text-yellow-400' : 'text-white'}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-base leading-tight mb-1 truncate">{skill.title}</h2>
                <span className="text-xs text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md inline-block">
                  {skill.category}
                </span>

                {isComplete && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-2 flex items-center gap-1.5 text-yellow-400 text-xs font-bold"
                  >
                    <Trophy size={13} /> Skill Mastered
                  </motion.div>
                )}
              </div>
            </div>

            {/* Time stats */}
            {skill.type === 'playlist' ? (
              <ScrollRevealGroup stagger={0.1} className="grid grid-cols-2 gap-3">
                <div className="glass-card-hover py-3 text-center group">
                  <CheckCircle size={16} className="text-primary mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-white font-bold text-sm">{skill.completedVideos?.length || 0}</p>
                  <p className="text-gray-500 text-xs">Completed</p>
                </div>
                <div className="glass-card-hover py-3 text-center group">
                  <Play size={16} className="text-accent mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-white font-bold text-sm">{skill.videos?.length || 0}</p>
                  <p className="text-gray-500 text-xs">Total Videos</p>
                </div>
              </ScrollRevealGroup>
            ) : (
              <ScrollRevealGroup stagger={0.1} className="grid grid-cols-2 gap-3">
                <div className="glass-card-hover py-3 text-center group">
                  <Clock size={16} className="text-primary mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-white font-bold text-sm">{formatTime(watchedSecs)}</p>
                  <p className="text-gray-500 text-xs">Watched</p>
                </div>
                <div className="glass-card-hover py-3 text-center group">
                  <BookOpen size={16} className="text-accent mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-white font-bold text-sm">{formatTime(totalSecs > 0 ? totalSecs - watchedSecs : 0)}</p>
                  <p className="text-gray-500 text-xs">Remaining</p>
                </div>
              </ScrollRevealGroup>
            )}

            {/* Status card */}
            <div className={`glass-card-hover overflow-hidden relative ${isComplete
              ? 'border-yellow-400/30'
              : isThisSessionActive
              ? 'border-accent/30 shadow-[0_0_30px_rgba(var(--accent),0.1)]'
              : 'border-white/5'}`}
            >
              <div className="flex items-center gap-2 relative z-10">
                {isComplete ? (
                  <><CheckCircle size={16} className="text-yellow-400 flex-shrink-0" /><span className="text-yellow-400 font-bold text-sm">Skill Mastered — +500 XP!</span></>
                ) : isThisSessionActive ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0" />
                    <span className="text-accent font-black text-sm tracking-widest tabular-nums flex-1">
                      {formatTime(stopwatchTime)}
                    </span>
                    <PremiumButton>
                      <button
                        onClick={handleEndClass}
                        className="px-2.5 py-1 text-xs bg-red-500/20 text-red-100 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center gap-1 border border-red-500/30"
                      >
                        <Square size={10} fill="currentColor" /> Finish
                      </button>
                    </PremiumButton>
                  </>
                ) : !isPlaying && isInactive ? (
                  <><Timer size={16} className="text-gray-400 flex-shrink-0" /><span className="text-gray-400 text-sm">Timer paused (Inactive)</span></>
                ) : (
                  <><Zap size={16} className="text-gray-400 flex-shrink-0" /><span className="text-gray-400 text-sm">Play to track XP</span></>
                )}
              </div>
              {!isComplete && progress > 0 && (
                <p className="text-gray-500 text-[10px] mt-3 uppercase tracking-tighter opacity-70">
                  Autosave Active • Level Up Imminent
                </p>
              )}
            </div>

            {/* Tracking protocol info (single-video only) */}
            {skill.type !== 'playlist' && !isComplete && (
              <div className="bg-surface/30 border border-white/5 rounded-xl p-4 space-y-2 mt-auto">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Protocol</p>
                <ul className="space-y-1.5 text-[11px] text-gray-500 font-medium">
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-primary" /> Saves every 10s via secure node</li>
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-accent" /> Multi-point resumption synced</li>
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> 95% threshold for XP reward</li>
                </ul>
              </div>
            )}

            {/* Playlist Sidebar Queue */}
            {skill.type === 'playlist' && showQueue && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Course Structure</p>
                  <span className="text-[10px] text-primary font-bold">
                    {skill.playlistData?.videos
                      ? skill.playlistData.videos.filter(v => v.isCompleted).length
                      : (skill.completedVideos?.length || 0)
                    }/{skill.playlistData?.videos?.length || skill.videos?.length || 0} Done
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {(skill.playlistData?.videos || skill.videos?.map(vid => ({
                    videoId: vid,
                    title: 'Lesson',
                    isCompleted: skill.completedVideos?.includes(vid),
                  })))?.map((item, idx) => {
                    const vid      = item.videoId || item;
                    const vTitle   = item.title || `Lesson ${idx + 1}`;
                    const isVidActive = vid === activeVideoId;
                    const isVidDone   = item.isCompleted || skill.completedVideos?.includes(vid);
                    const vThumb   = item.thumbnail || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
                    const vDuration = item.duration;

                    return (
                      <div
                        key={`${vid}-${idx}`}
                        onClick={() => moveToVideo(vid)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 group cursor-pointer
                          ${isVidActive
                            ? 'bg-primary/10 border-primary/40 text-white shadow-lg shadow-primary/10'
                            : 'bg-white/[0.03] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 border border-white/10">
                          <img
                            src={vThumb}
                            alt={vTitle}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          {isVidActive && (
                            <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                              <Play size={14} className="fill-white text-white ml-0.5" />
                            </div>
                          )}
                        </div>

                        {/* Title & duration */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${isVidActive ? 'text-primary font-bold' : 'text-gray-200'}`}>
                            {idx + 1}. {vTitle}
                          </p>
                          {vDuration && (
                            <p className="text-[10px] text-gray-500 font-medium">{vDuration}</p>
                          )}
                        </div>

                        {/* Completion toggle */}
                        <button
                          onClick={(e) => toggleVideoCompletion(e, vid, isVidDone)}
                          className={`p-1.5 rounded-lg border transition-all flex-shrink-0 ${
                            isVidDone
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10 hover:text-white'
                          }`}
                          title={isVidDone ? 'Mark as incomplete' : 'Mark as completed'}
                        >
                          <CheckCircle size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>

      {/* ── Quiz Modal ── */}
      {/* BUG 4 FIX: ALL post-quiz navigation (onSkip, onClose after submit) calls
          handlePostQuizNav which ALWAYS navigates to /skills — identical for both
          playlist and single-video mode. Mid-playlist auto-advance only happens on
          natural video end (in onStateChange.ENDED), not here. */}
      <AnimatePresence>
        {showQuiz && (
          quizLoading ? (
            // Loading state while generating questions
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Brain size={28} className="text-primary animate-pulse" />
                </div>
                <p className="text-white font-bold">Generating your quiz...</p>
                <p className="text-gray-500 text-sm">AI is crafting questions based on this lesson</p>
              </div>
            </motion.div>
          ) : quizQuestions.length > 0 ? (
            <QuizModal
              skillTitle={skill?.title || ''}
              questions={quizQuestions}
              onSkip={() => {
                triggerFeedback({ type: COMPANION_EVENTS.QUIZ_SKIPPED, data: { module: 'SkillHub' } });
                handlePostQuizNav();
              }}
              onSubmit={async (score, total) => {
                await saveQuizAttempt(score, total);
                triggerFeedback({
                  type: COMPANION_EVENTS.QUIZ_COMPLETE,
                  data: { percentage: Math.round((score / total) * 100) }
                });
                // ResultScreen inside QuizModal handles the display;
                // navigation fires when the user clicks "Back to Skills Hub" (onClose)
              }}
              onClose={handlePostQuizNav}
            />
          ) : (
            // AI failed to generate questions — close quiz and navigate away
            // Use a useEffect-style pattern to avoid navigate() during render
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onAnimationComplete={() => {
                setShowQuiz(false);
                navigate('/skills');
              }}
            />
          )
        )}
      </AnimatePresence>

      {/* ── Completion Toast ── */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4"
          >
            <div className="bg-[#0f1a10] border border-yellow-400/30 rounded-2xl p-5 shadow-[0_0_60px_rgba(251,191,36,0.25)] flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-400/20 flex items-center justify-center flex-shrink-0 text-2xl">
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-yellow-400 font-black text-lg">Skill Mastered!</p>
                <p className="text-gray-300 text-sm mt-0.5">
                  You completed <strong>"{skill.title}"</strong> and earned <strong className="text-yellow-400">+500 XP</strong>!
                </p>
              </div>
              <button
                onClick={() => setShowComplete(false)}
                className="text-gray-500 hover:text-white transition-colors text-xs mt-0.5"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearningView;
