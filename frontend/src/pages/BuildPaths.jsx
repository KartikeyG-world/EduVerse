import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hammer, Sparkles, CheckCircle2, Clock, ExternalLink,
  Video, BookOpen, Send, Users, ChevronRight, Award,
  Layers, Code2, ArrowLeft, RefreshCw, AlertCircle, HelpCircle,
  Trash2, Plus, X, Lock, Unlock, ListOrdered
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import PremiumButton from '../components/ui/PremiumButton';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import SourcePreviewModal from '../components/SourcePreviewModal';

const POPULAR_SUGGESTIONS = [
  'College Management System',
  'Personal Finance Tracker',
  'Real-Time Chat & Video App',
  'ERP & Inventory Management',
  'E-Commerce Microservices Platform'
];

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'Zero to minimal experience in this domain' },
  { id: 'intermediate', label: 'Some Experience', desc: 'Familiar with basics, ready to build architecture' },
  { id: 'advanced', label: 'Intermediate / Advanced', desc: 'Comfortable with full-stack concepts & APIs' }
];

const PLATFORMS = [
  { id: 'web', label: 'Web Application' },
  { id: 'mobile', label: 'Mobile App' },
  { id: 'desktop', label: 'Desktop App' },
  { id: 'fullstack', label: 'Full-Stack / Any' }
];

export default function BuildPaths() {
  const { user, isAuthenticated, requireAuth, updateUser } = useContext(AuthContext);

  // Top-level View States
  const [activeProgress, setActiveProgress] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [viewingModuleIndex, setViewingModuleIndex] = useState(null); // null = Roadmap Grid, number = Full-Width Detail
  const [myProgressList, setMyProgressList] = useState([]);
  const [popularTemplates, setPopularTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [peerReviewing, setPeerReviewing] = useState(false);

  // Modal States
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [progressToDelete, setProgressToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Source Preview Modal State (Video interactions from Study Planner)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState(null);

  // Step-by-Step Guide States (Issue 4)
  const [showStepByStepGuide, setShowStepByStepGuide] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [stepGuides, setStepGuides] = useState({}); // { [moduleIndex]: string[] }

  // Intake Form States
  const [projectIdea, setProjectIdea] = useState('');
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [techStackInput, setTechStackInput] = useState('');
  const [letAiRecommendStack, setLetAiRecommendStack] = useState(false);
  const [platform, setPlatform] = useState('web');

  // Task Submission State
  const [submissionType, setSubmissionType] = useState('code'); // 'code' | 'text' | 'repo_url'
  const [submissionContent, setSubmissionContent] = useState('');
  const [aiFeedback, setAiFeedback] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [isAuthenticated]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch popular templates
      const tRes = await api.get('/build-paths/templates');
      if (tRes.data?.success) {
        setPopularTemplates(tRes.data.templates || []);
      }

      // 2. Fetch authenticated user's progress
      if (isAuthenticated) {
        const pRes = await api.get('/build-paths/progress');
        if (pRes.data?.success && Array.isArray(pRes.data.progressList)) {
          setMyProgressList(pRes.data.progressList);
          // NOTE: Never auto-open a project on mount. Neutral landing/grid view is preserved.
        }
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.featureDisabled) {
        console.warn('Build Path feature flag is off');
      } else {
        console.error('Failed to load build path data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!projectIdea.trim()) {
      toast.error('Please describe what you want to build');
      return;
    }

    requireAuth(async () => {
      setGenerating(true);
      try {
        const payload = {
          projectIdea: projectIdea.trim(),
          skillLevel,
          techStack: letAiRecommendStack ? [] : techStackInput.split(',').map((s) => s.trim()).filter(Boolean),
          platform
        };

        const res = await api.post('/build-paths/generate', payload);
        if (res.data?.success) {
          const { template, progress, isReused } = res.data;

          // Prepend new progress to user's list in state without full page reload
          setMyProgressList((prev) => {
            const exists = prev.some((p) => p._id === progress._id);
            if (exists) {
              return prev.map((p) => (p._id === progress._id ? progress : p));
            }
            return [progress, ...prev];
          });

          // Reset intake form & close popup automatically
          setIsIntakeModalOpen(false);
          setProjectIdea('');
          setTechStackInput('');
          setLetAiRecommendStack(false);

          if (isReused) {
            toast.success('Matched existing verified template! Added to your build paths.', { icon: '⚡' });
          } else {
            toast.success('Generated new project-to-skill build path!', { icon: '🚀' });
          }

          // Fetch fresh list in background to keep full linkage
          const pRes = await api.get('/build-paths/progress');
          if (pRes.data?.success && Array.isArray(pRes.data.progressList)) {
            setMyProgressList(pRes.data.progressList);
          }
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to generate build path';
        toast.error(msg);
      } finally {
        setGenerating(false);
      }
    });
  };

  const handleOpenTemplate = async (templateId) => {
    requireAuth(async () => {
      setLoading(true);
      try {
        const t = popularTemplates.find((item) => item._id === templateId);
        if (t) {
          const res = await api.post('/build-paths/generate', {
            projectIdea: t.projectIdea,
            skillLevel: t.skillLevel || 'beginner',
            techStack: t.techStack || [],
            platform: t.platform || 'web'
          });

          if (res.data?.success) {
            setActiveTemplate(res.data.template);
            setActiveProgress(res.data.progress);
            setViewingModuleIndex(null); // Open roadmap grid first
            toast.success(`Enrolled in "${res.data.template.projectIdea}"!`);

            // Refresh list
            const pRes = await api.get('/build-paths/progress');
            if (pRes.data?.success) setMyProgressList(pRes.data.progressList);
          }
        }
      } catch (err) {
        toast.error('Failed to open template');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleOpenExistingProgress = (prog) => {
    setActiveProgress(prog);
    setActiveTemplate(prog.templateId);
    setViewingModuleIndex(null); // Open roadmap grid first (Issue 3)
    setAiFeedback(null);
    setSubmissionContent('');
    setShowStepByStepGuide(false);
  };

  const handleDeleteProgress = async () => {
    if (!progressToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/build-paths/progress/${progressToDelete._id}`);
      if (res.data?.success) {
        toast.success('Build path removed from your workspace');
        setMyProgressList((prev) => prev.filter((p) => p._id !== progressToDelete._id));
        if (activeProgress?._id === progressToDelete._id) {
          setActiveProgress(null);
          setActiveTemplate(null);
          setViewingModuleIndex(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete build path');
    } finally {
      setIsDeleting(false);
      setProgressToDelete(null);
    }
  };

  const handleVideoClick = (e, vid) => {
    e.preventDefault();
    setPreviewSource({
      url: vid.url,
      title: vid.title,
      domain: vid.channel,
      thumbnailUrl: vid.thumbnail || `https://img.youtube.com/vi/${vid.videoId}/hqdefault.jpg`
    });
    setIsPreviewOpen(true);
  };

  // completedIndices: set of module indices that are in completedModules.
  // Direct membership check, not XP-value-dependent (Issue 4 fix: robust against zero-XP edge cases).
  const completedIndices = new Set(
    (activeProgress?.completedModules || []).map((m) => m.moduleIndex)
  );

  const isModuleUnlocked = (idx) => {
    if (idx === 0) return true;
    return completedIndices.has(idx - 1);
  };

  const handleSelectModuleCard = (modIdx) => {
    if (!isModuleUnlocked(modIdx)) {
      toast.error(`Milestone #${modIdx + 1} is locked. Please complete Milestone #${modIdx} first.`, {
        icon: '🔒'
      });
      return;
    }
    setViewingModuleIndex(modIdx);
    setAiFeedback(null);
    setSubmissionContent('');
    setShowStepByStepGuide(false);
  };

  // Step-by-Step Guide toggle and fetch handler (Issue 4)
  const handleToggleGuide = async () => {
    if (showStepByStepGuide) {
      setShowStepByStepGuide(false);
      return;
    }

    if (viewingModuleIndex === null) return;
    const modIdx = viewingModuleIndex;

    // Check memory cache
    if (stepGuides[modIdx]?.length > 0) {
      setShowStepByStepGuide(true);
      return;
    }

    // Check if current module already has pre-generated guide on template
    const currentMod = activeTemplate?.modules?.find((m) => m.moduleIndex === modIdx);
    if (Array.isArray(currentMod?.stepByStepGuide) && currentMod.stepByStepGuide.length > 0) {
      setStepGuides((prev) => ({ ...prev, [modIdx]: currentMod.stepByStepGuide }));
      setShowStepByStepGuide(true);
      return;
    }

    // Otherwise fetch or generate on-demand from backend
    setGuideLoading(true);
    try {
      const res = await api.get(`/build-paths/templates/${activeTemplate._id}/modules/${modIdx}/guide`);
      if (res.data?.success && Array.isArray(res.data.stepByStepGuide)) {
        setStepGuides((prev) => ({ ...prev, [modIdx]: res.data.stepByStepGuide }));
        setShowStepByStepGuide(true);
      }
    } catch (err) {
      toast.error('Failed to load step-by-step guide');
    } finally {
      setGuideLoading(false);
    }
  };

  const handleGetAiFeedback = async () => {
    if (!submissionContent.trim()) {
      toast.error('Please enter your code or solution before requesting AI review');
      return;
    }

    requireAuth(async () => {
      setSubmitting(true);
      try {
        const res = await api.post(
          `/build-paths/progress/${activeProgress._id}/modules/${viewingModuleIndex}/submit`,
          {
            submissionType,
            content: submissionContent.trim(),
            requestAiFeedback: true
          }
        );

        if (res.data?.success) {
          setAiFeedback(res.data.aiFeedback);
          setActiveProgress(res.data.progress);
          toast.success('AI Review generated! Check suggestions below.');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to get AI feedback');
      } finally {
        setSubmitting(false);
      }
    });
  };

  const handleCompleteModule = async () => {
    requireAuth(async () => {
      try {
        const res = await api.post(
          `/build-paths/progress/${activeProgress._id}/modules/${viewingModuleIndex}/complete`
        );

        if (res.data?.success) {
          const { alreadyCompleted, xpAwarded, userStats, progress } = res.data;
          setActiveProgress(progress);

          if (alreadyCompleted) {
            toast('Milestone was already marked complete.', { icon: 'ℹ️' });
          } else {
            toast.success(`🎉 Milestone Complete! +${xpAwarded} XP awarded!`, { duration: 4000 });
            if (userStats) {
              updateUser({ xp: userStats.xp, level: userStats.level });
            }
          }

          // Return user back to the milestone roadmap grid with unlocked next milestone!
          setViewingModuleIndex(null);
          setAiFeedback(null);
          setSubmissionContent('');
          setShowStepByStepGuide(false);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to mark complete');
      }
    });
  };

  const handleRequestPeerReview = async () => {
    requireAuth(async () => {
      setPeerReviewing(true);
      try {
        const res = await api.post(
          `/build-paths/progress/${activeProgress._id}/modules/${viewingModuleIndex}/peer-review`,
          { customNote: submissionContent }
        );

        if (res.data?.success) {
          toast.success('Posted to Peer Tutor Network! Tutors will review your deliverable.', { icon: '🚀' });
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to request peer review');
      } finally {
        setPeerReviewing(false);
      }
    });
  };

  const currentModule = activeTemplate?.modules?.find((m) => m.moduleIndex === viewingModuleIndex);
  const totalModulesCount = activeTemplate?.modules?.length || 1;
  const progressPercent = Math.round((completedIndices.size / totalModulesCount) * 100);

  // Reusable Intake Form Content
  const renderIntakeFormContent = (isModal = false) => (
    <form onSubmit={handleGenerate} className="space-y-6">
      {/* Project Input */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Project Goal / Idea
        </label>
        <input
          type="text"
          value={projectIdea}
          onChange={(e) => setProjectIdea(e.target.value)}
          placeholder="e.g. College Management System, Real-Time Chat App, Personal Finance Tracker..."
          className="w-full bg-surface/80 border border-white/10 rounded-2xl p-4 text-white text-base outline-none focus:border-primary transition-all shadow-inner"
        />

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-gray-500 flex items-center gap-1">Popular ideas:</span>
          {POPULAR_SUGGESTIONS.map((sug) => (
            <button
              type="button"
              key={sug}
              onClick={() => setProjectIdea(sug)}
              className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/5 transition-all cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Clarifying Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
        {/* Skill Level */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
            Your Skill Level
          </label>
          <div className="space-y-2">
            {SKILL_LEVELS.map((lvl) => (
              <button
                type="button"
                key={lvl.id}
                onClick={() => setSkillLevel(lvl.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  skillLevel === lvl.id
                    ? 'bg-primary/20 border-primary text-white font-bold shadow-[0_0_15px_rgba(var(--primary),0.2)]'
                    : 'bg-surface/40 border-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="font-semibold text-white">{lvl.label}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{lvl.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Tech Stack
            </label>
            <button
              type="button"
              onClick={() => setLetAiRecommendStack(!letAiRecommendStack)}
              className={`text-[11px] font-semibold underline cursor-pointer ${
                letAiRecommendStack ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {letAiRecommendStack ? '✓ AI will recommend' : 'Let AI recommend'}
            </button>
          </div>

          {!letAiRecommendStack ? (
            <input
              type="text"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              placeholder="React, Node.js, MongoDB, Express..."
              className="w-full bg-surface/80 border border-white/10 rounded-xl p-3.5 text-sm text-white outline-none focus:border-primary transition-all"
            />
          ) : (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
              <Sparkles size={16} /> AI will choose the best industry-standard stack for your level.
            </div>
          )}
          <p className="text-[11px] text-gray-500 mt-2">
            Comma separated technologies or frameworks.
          </p>
        </div>

        {/* Platform */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
            Target Platform
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((plat) => (
              <button
                type="button"
                key={plat.id}
                onClick={() => setPlatform(plat.id)}
                className={`p-3 rounded-xl border text-xs text-center transition-all cursor-pointer ${
                  platform === plat.id
                    ? 'bg-primary/20 border-primary text-white font-bold'
                    : 'bg-surface/40 border-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                {plat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Action */}
      <div className="pt-4 flex items-center justify-end gap-3">
        {isModal && (
          <button
            type="button"
            onClick={() => setIsIntakeModalOpen(false)}
            className="px-5 py-3 rounded-2xl border border-white/10 text-gray-400 hover:text-white text-sm font-semibold transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}

        <PremiumButton>
          <button
            type="submit"
            disabled={generating || !projectIdea.trim()}
            className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-black font-bold py-3.5 px-8 rounded-2xl flex items-center gap-2 text-sm shadow-[0_0_25px_rgba(var(--primary),0.4)] transition-all cursor-pointer"
          >
            {generating ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Analyzing & Structuring Milestones...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate Guided Build Path
              </>
            )}
          </button>
        </PremiumButton>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen text-white pb-20">
      {/* ── Top Header / Breadcrumbs ──────────────────────────────────── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-primary/20 text-primary rounded-lg border border-primary/30">
              <Hammer size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Project Build Paths</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            Project-to-Skill Guided Build Paths
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Master engineering through the lens of a real production project. Complete each milestone to unlock the next.
          </p>
        </div>

        {/* Global Action Links */}
        <div className="flex items-center gap-3">
          {activeTemplate && (
            <button
              onClick={() => {
                setActiveTemplate(null);
                setActiveProgress(null);
                setViewingModuleIndex(null);
              }}
              className="px-4 py-2 bg-surface/80 hover:bg-surface border border-white/10 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} /> All Projects
            </button>
          )}

          <Link
            to="/planner"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1.5 transition-all"
          >
            <BookOpen size={14} /> Need Exam Schedule? Go to Study Planner →
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── VIEW 1: LANDING & DASHBOARD (No active project open) ────────── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!activeTemplate ? (
        <div className="space-y-10">
          {/* CASE A: Returning User (Grid of Generated Cards) */}
          {myProgressList.length > 0 ? (
            <div className="space-y-6">
              {/* Header with prominent "+ New Build Path" Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Layers size={20} className="text-primary" /> My Build Paths
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Select an active project below to continue development, or launch a new guided build path.
                  </p>
                </div>

                <button
                  onClick={() => setIsIntakeModalOpen(true)}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Plus size={18} /> New Build Path
                </button>
              </div>

              {/* Grid of Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProgressList.map((prog) => {
                  const compCount = prog.completedModules?.length || 0;
                  const totalCount = prog.templateId?.modules?.length || 1;
                  const pct = Math.round((compCount / totalCount) * 100);

                  return (
                    <div
                      key={prog._id}
                      onClick={() => handleOpenExistingProgress(prog)}
                      className="glass-next-gen dynamic-lighting p-6 rounded-3xl border border-white/10 hover:border-primary/40 cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
                    >
                      <div>
                        {/* Badges & Delete */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
                              {prog.templateId?.platform || 'Web'}
                            </span>
                            <span className="text-xs bg-surface border border-white/10 px-2.5 py-0.5 rounded-full text-gray-300 capitalize">
                              {prog.templateId?.skillLevel || 'Beginner'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProgressToDelete(prog);
                            }}
                            title="Delete this build path progress"
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Title & Overview */}
                        <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors leading-snug">
                          {prog.templateId?.projectIdea}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-2 mt-1.5">
                          {prog.templateId?.overview || 'Guided engineering milestones and architecture.'}
                        </p>

                        {/* Tech Stack Pills */}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {prog.templateId?.techStack?.slice(0, 4).map((st) => (
                            <span key={st} className="text-[11px] bg-surface border border-white/5 px-2 py-0.5 rounded-md text-gray-300 font-mono">
                              {st}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Progress Bar & Footer */}
                      <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-gray-400 font-semibold">
                            <span>{compCount} of {totalCount} Milestones</span>
                            <span className="text-white">{pct}%</span>
                          </div>
                          <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-white/5">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs font-bold text-primary flex items-center gap-1">
                            <Award size={14} /> {prog.totalXpEarned || (compCount * 50)} XP
                          </div>
                          <span className="text-xs text-primary font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Continue Building <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CASE B: First-Time User (Zero Build Paths) -> Direct Intake Form */
            <ScrollReveal className="glass-next-gen dynamic-lighting p-6 md:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-4">
                  <Sparkles size={14} /> Step 1: Tell us what you want to build
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                  What project or outcome do you want to master?
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  From a College Management System to an ERP platform or a Personal Finance Tracker, we will generate an ordered sequence of hands-on milestones taking you from scratch to finished code.
                </p>
                {renderIntakeFormContent(false)}
              </div>
            </ScrollReveal>
          )}

          {/* Popular Community Templates */}
          {popularTemplates.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-accent" /> Verified Community Build Paths
                  </h3>
                  <p className="text-xs text-gray-400">
                    Pre-generated, quality-judged curriculums ready for instant zero-latency enrollment.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {popularTemplates.map((tpl) => {
                  // Issue 1: Check if current user is already enrolled in this template
                  const existingProgress = myProgressList.find(
                    (p) => (p.templateId?._id || p.templateId) === tpl._id
                  );

                  return (
                    <div
                      key={tpl._id}
                      className="glass-next-gen dynamic-lighting p-6 rounded-2xl border border-white/5 hover:border-accent/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs bg-accent/10 text-accent border border-accent/20 px-2.5 py-0.5 rounded font-semibold uppercase">
                            {tpl.skillLevel || 'Beginner'}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                            <Users size={12} /> {tpl.usageCount || 1} enrolled
                          </span>
                        </div>

                        <h4 className="text-lg font-bold text-white mb-2">{tpl.projectIdea}</h4>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-4">{tpl.overview}</p>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {tpl.techStack?.map((st) => (
                            <span
                              key={st}
                              className="text-[11px] bg-surface border border-white/10 px-2 py-0.5 rounded text-gray-300 font-mono"
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Issue 1: Replace with "Continue Building" if enrolled */}
                      {existingProgress ? (
                        <button
                          onClick={() => handleOpenExistingProgress(existingProgress)}
                          className="w-full py-2.5 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black text-xs font-bold rounded-xl border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        >
                          <CheckCircle2 size={14} /> Continue Building <ChevronRight size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenTemplate(tpl._id)}
                          className="w-full py-2.5 bg-accent/10 hover:bg-accent hover:text-black text-accent text-xs font-bold rounded-xl border border-accent/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Enroll in This Build Path <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════ */
        /* ── VIEW 2: ACTIVE BUILD PATH WORKSPACE ───────────────────────── */
        /* ══════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Project Progress Hero Banner */}
          <div className="glass-next-gen dynamic-lighting p-6 md:p-8 rounded-3xl border border-white/10 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
                    {activeTemplate.platform}
                  </span>
                  <span className="text-xs bg-surface border border-white/10 px-2.5 py-0.5 rounded-full text-gray-300 capitalize">
                    {activeTemplate.skillLevel}
                  </span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                    Sequential Locked Progression
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white">{activeTemplate.projectIdea}</h2>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {activeTemplate.techStack?.map((st) => (
                    <span key={st} className="text-xs bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg text-gray-300 font-mono">
                      {st}
                    </span>
                  ))}
                </div>
              </div>

              {/* XP & Progress Badge */}
              <div className="flex items-center gap-4 bg-surface/50 p-4 rounded-2xl border border-white/5">
                <div className="text-right">
                  <div className="text-xs text-gray-400 font-medium">Build Path XP</div>
                  <div className="text-2xl font-black text-primary flex items-center justify-end gap-1">
                    <Award size={20} /> {activeProgress?.totalXpEarned || (completedIndices.size * 50)}
                  </div>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div>
                  <div className="text-xs text-gray-400 font-medium">Completed</div>
                  <div className="text-2xl font-black text-white">
                    {completedIndices.size} / {totalModulesCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400 font-semibold">
                <span>Overall Implementation Progress</span>
                <span>{progressPercent}% Complete</span>
              </div>
              <div className="h-2.5 w-full bg-surface rounded-full overflow-hidden border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-primary via-purple-500 to-accent"
                />
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────── */}
          {/* ── SUB-VIEW A: MILESTONE CARDS GRID (Issue 3 & 5) ──────────── */}
          {/* ────────────────────────────────────────────────────────────── */}
          {viewingModuleIndex === null ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Code2 size={20} className="text-primary" /> Project Milestones
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Click an unlocked milestone to view detailed concepts, video tutorials, documentation, and submit your deliverable.
                  </p>
                </div>
              </div>

              {/* Grid of Milestone Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {activeTemplate.modules?.map((mod, idx) => {
                  const isCompleted = completedIndices.has(mod.moduleIndex);
                  const isUnlocked = isModuleUnlocked(mod.moduleIndex);
                  const isCurrentActive = isUnlocked && !isCompleted;

                  return (
                    <div
                      key={mod.moduleIndex}
                      onClick={() => handleSelectModuleCard(mod.moduleIndex)}
                      className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                        isCompleted
                          ? 'glass-next-gen border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                          : isCurrentActive
                          ? 'glass-next-gen border-primary/50 hover:border-primary shadow-[0_0_25px_rgba(var(--primary),0.15)] cursor-pointer'
                          : 'bg-surface/20 border-white/5 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        {/* Status Header Badge */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-mono font-bold text-gray-400">
                            STEP {idx + 1}
                          </span>

                          {isCompleted ? (
                            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          ) : isCurrentActive ? (
                            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-primary/20 text-primary border border-primary/40 flex items-center gap-1 animate-pulse">
                              <Unlock size={12} /> Ready to Build
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-white/5 text-gray-500 border border-white/10 flex items-center gap-1">
                              <Lock size={12} /> Locked
                            </span>
                          )}
                        </div>

                        {/* Title & Task Excerpt */}
                        <h4 className="text-base font-bold text-white mb-2 leading-snug line-clamp-2">
                          {mod.title}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                          {mod.handsOnTask?.instructions || mod.description}
                        </p>
                      </div>

                      {/* Footer Details */}
                      <div className="pt-4 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {mod.estimatedMinutes || 60}m
                          </span>
                          <span className="text-primary font-semibold">+50 XP</span>
                        </div>

                        {isCompleted ? (
                          <div className="text-xs text-emerald-400 font-bold flex items-center justify-between pt-1">
                            <span>Review Deliverable</span>
                            <ChevronRight size={14} />
                          </div>
                        ) : isUnlocked ? (
                          <div className="text-xs text-primary font-bold flex items-center justify-between pt-1">
                            <span>Start Milestone</span>
                            <ChevronRight size={14} />
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1 pt-1">
                            <Lock size={12} /> Complete Step {idx} first
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ────────────────────────────────────────────────────────────── */
            /* ── SUB-VIEW B: FULL-WIDTH SINGLE-COLUMN DETAIL (Issue 3) ──── */
            /* ────────────────────────────────────────────────────────────── */
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Back to Milestone Grid Navigation Bar */}
              <div className="flex items-center justify-between bg-surface/60 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <button
                  onClick={() => {
                    setViewingModuleIndex(null);
                    setShowStepByStepGuide(false);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} /> Back to Milestone Roadmap
                </button>

                <div className="text-xs font-semibold text-gray-400">
                  Milestone <span className="text-white font-bold">{viewingModuleIndex + 1}</span> of{' '}
                  <span className="text-white font-bold">{totalModulesCount}</span>
                </div>
              </div>

              {currentModule && (
                <div className="glass-next-gen dynamic-lighting p-6 md:p-10 rounded-3xl border border-white/10 space-y-8">
                  {/* 1. Header */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full font-bold">
                          Milestone #{viewingModuleIndex + 1}
                        </span>
                        {completedIndices.has(viewingModuleIndex) && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                        <Clock size={14} /> Estimated: {currentModule.estimatedMinutes || 60} minutes
                      </span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-white">{currentModule.title}</h3>
                  </div>

                  {/* 2. Substantial Concept Narrative */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Architectural Overview & Engineering Relevance
                    </h4>
                    <div className="bg-surface/50 p-6 rounded-2xl border border-white/5 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {currentModule.description}
                    </div>
                  </div>

                  {/* 3. Curated YouTube Tutorials */}
                  {currentModule.youtubeResources?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                        <Video size={16} className="text-red-400" /> Curated Video Tutorials (Click to add & watch in Skill Hub)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentModule.youtubeResources.map((vid, vIdx) => (
                          <button
                            key={vIdx}
                            type="button"
                            onClick={(e) => handleVideoClick(e, vid)}
                            className="w-full text-left p-4 bg-surface/50 hover:bg-surface border border-white/5 hover:border-red-500/30 rounded-2xl flex items-start gap-3.5 transition-all group cursor-pointer"
                          >
                            <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 group-hover:bg-red-500/20 transition-colors">
                              <Video size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-white truncate group-hover:text-red-300 transition-colors">
                                {vid.title}
                              </h5>
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{vid.channel}</p>
                              <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                                <span>{vid.duration}</span>
                                {vid.views > 0 && <span>• {vid.views.toLocaleString()} views</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Official Verified Documentation */}
                  {currentModule.docLink && currentModule.docLink.isVerified && (
                    <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                          <BookOpen size={22} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            {currentModule.docLink.title}
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-semibold">
                              Verified
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Official technical documentation on {currentModule.docLink.domain}
                          </p>
                        </div>
                      </div>

                      <a
                        href={currentModule.docLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white text-xs font-bold rounded-xl border border-blue-500/40 transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Open Official Docs <ExternalLink size={14} />
                      </a>
                    </div>
                  )}

                  {/* 5. Concrete Hands-On Implementation Task */}
                  {currentModule.handsOnTask && (
                    <div className="p-6 md:p-8 bg-gradient-to-br from-primary/10 via-surface/60 to-surface/40 border-2 border-primary/30 rounded-3xl space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-wider">
                          <Code2 size={18} /> Hands-On Milestone Deliverable
                        </div>
                        <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-bold uppercase">
                          Required for +50 XP
                        </span>
                      </div>

                      <h4 className="text-xl font-black text-white">{currentModule.handsOnTask.title}</h4>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {currentModule.handsOnTask.instructions}
                      </p>

                      {currentModule.handsOnTask.evaluationCriteria?.length > 0 && (
                        <div className="pt-3 border-t border-white/10">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                            Evaluation Criteria:
                          </div>
                          <ul className="space-y-2 text-xs text-gray-300">
                            {currentModule.handsOnTask.evaluationCriteria.map((crit, cIdx) => (
                              <li key={cIdx} className="flex items-start gap-2">
                                <span className="text-primary font-bold">•</span>
                                <span>{crit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 6. Issue 4: Step-by-Step Implementation Guide Toggle & View */}
                      <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={handleToggleGuide}
                            disabled={guideLoading}
                            className="px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                          >
                            {guideLoading ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" /> Structuring Implementation Steps...
                              </>
                            ) : (
                              <>
                                <ListOrdered size={16} />
                                {showStepByStepGuide ? 'Hide Step-by-Step Guide' : 'Show Step-by-Step Guide'}
                              </>
                            )}
                          </button>
                        </div>

                        {showStepByStepGuide && stepGuides[viewingModuleIndex] && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 rounded-2xl bg-surface/90 border border-primary/20 space-y-3"
                          >
                            <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles size={14} /> Actionable Step-by-Step Implementation Walkthrough:
                            </div>
                            <div className="space-y-2">
                              {stepGuides[viewingModuleIndex].map((step, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-gray-200 leading-relaxed flex items-start gap-2.5"
                                >
                                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                    {sIdx + 1}
                                  </span>
                                  <span className="flex-1">{step.replace(/^\d+[\.\)]\s*/, '')}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 7. Submission & Validation Area */}
                  <div className="pt-4 border-t border-white/5 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Submit Your Milestone Deliverable
                      </div>

                      {/* Switcher */}
                      <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => setSubmissionType('code')}
                          className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                            submissionType === 'code' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Code Snippet
                        </button>
                        <button
                          onClick={() => setSubmissionType('repo_url')}
                          className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                            submissionType === 'repo_url' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          GitHub URL
                        </button>
                        <button
                          onClick={() => setSubmissionType('text')}
                          className={`px-3 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                            submissionType === 'text' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Written Summary
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={6}
                      value={submissionContent}
                      onChange={(e) => setSubmissionContent(e.target.value)}
                      placeholder={
                        submissionType === 'code'
                          ? '// Paste your schemas, controllers, or component code here...'
                          : submissionType === 'repo_url'
                          ? 'https://github.com/username/project/commit/...'
                          : 'Explain how you satisfied the requirements and architectural decisions made...'
                      }
                      className="w-full bg-surface/80 border border-white/10 rounded-2xl p-4 text-white text-sm font-mono outline-none focus:border-primary transition-all resize-none shadow-inner"
                    />

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleGetAiFeedback}
                          disabled={submitting || !submissionContent.trim()}
                          className="px-4 py-2.5 bg-surface hover:bg-white/10 disabled:opacity-50 text-white text-xs font-bold rounded-xl border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {submitting ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} className="text-primary" />
                          )}
                          Get AI Review
                        </button>

                        <button
                          onClick={handleRequestPeerReview}
                          disabled={peerReviewing}
                          className="px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {peerReviewing ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Users size={14} />
                          )}
                          Post to Peer Tutors
                        </button>
                      </div>

                      <PremiumButton>
                        <button
                          onClick={handleCompleteModule}
                          className="px-6 py-2.5 bg-primary hover:bg-primary/80 text-black font-black text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)] flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={16} /> Mark Milestone Complete (+50 XP)
                        </button>
                      </PremiumButton>
                    </div>

                    {/* AI Feedback Card */}
                    {aiFeedback && (
                      <div className="mt-4 p-5 rounded-2xl bg-surface/90 border border-primary/30 space-y-3">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                          <Sparkles size={14} /> AI Code Review Feedback
                        </div>
                        <p className="text-xs text-gray-200 leading-relaxed">{aiFeedback.feedback}</p>

                        {aiFeedback.strengths?.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-emerald-400">Strengths:</span>
                            <ul className="text-xs text-gray-300 list-disc list-inside mt-1">
                              {aiFeedback.strengths.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiFeedback.suggestions?.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-amber-400">Actionable Suggestions:</span>
                            <ul className="text-xs text-gray-300 list-disc list-inside mt-1">
                              {aiFeedback.suggestions.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: PROPERLY CENTERED & SCROLLABLE INTAKE MODAL (Issue 2) ─ */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isIntakeModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsIntakeModalOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-3xl bg-surface border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-surface/80 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-primary/20 text-primary rounded-xl border border-primary/30">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Create New Build Path</h3>
                    <p className="text-xs text-gray-400">Design a custom milestone-based hands-on project path.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsIntakeModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Form Body with Generous Padding */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-1">
                  <Sparkles size={14} /> Milestone Curriculum Generator
                </div>
                <h4 className="text-lg font-bold text-white">
                  What project or outcome do you want to master?
                </h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Enter your project vision, target platform, and skill level. We will architect sequential milestones and curate documentation and tutorials.
                </p>

                {renderIntakeFormContent(true)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: DELETE CONFIRMATION MODAL ───────────────────────── */}
      <AnimatePresence>
        {progressToDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setProgressToDelete(null)}
          >
            <motion.div
              className="relative w-full max-w-md bg-surface border border-red-500/20 rounded-3xl p-6 shadow-2xl space-y-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mb-1">
                <Trash2 size={24} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Delete Build Path?</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Are you sure you want to remove your progress for{' '}
                  <strong className="text-white">{progressToDelete.templateId?.projectIdea}</strong>?
                  This will remove your milestone completions and submissions from your account.
                </p>
                <div className="mt-3 p-3 rounded-xl bg-surface/80 border border-white/5 text-[11px] text-gray-400">
                  ℹ️ The shared build path template will remain safe and available for other students and for you to start anew at any time.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProgressToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProgress}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete Build Path
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: SOURCE PREVIEW MODAL (Study Planner Flow) ───────── */}
      <SourcePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        source={previewSource}
      />
    </div>
  );
}
