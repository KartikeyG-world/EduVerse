import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, Target, Book, ChevronRight, History, Clock, RefreshCcw, Play, ExternalLink, FileText, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';
import SourcePreviewModal from '../components/SourcePreviewModal';

const StudyPlanner = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('planner'); // planner or routine
  const [subject, setSubject] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const { requireAuth, isAuthenticated } = useContext(AuthContext);

  // Source Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState(null);

  const handleSourceClick = (e, sourceUrl, sourceTitle) => {
    e.preventDefault();
    setPreviewSource({ url: sourceUrl, title: sourceTitle });
    setIsPreviewOpen(true);
  };

  // Daily Routine State
  const defaultRoutine = Array.from({ length: 16 }, (_, i) => ({
    time: `${(i + 6 > 12 ? i + 6 - 12 : i + 6).toString().padStart(2, '0')}:00 ${i + 6 >= 12 ? 'PM' : 'AM'}`,
    task: '',
    status: 'pending' // pending, completed
  }));
  const [routine, setRoutine] = useState(() => {
    const saved = localStorage.getItem('eduverse_daily_routine');
    return saved ? JSON.parse(saved) : defaultRoutine;
  });

  useEffect(() => {
    if (!isAuthenticated) return; // Guests see an empty plan history — no API call
    fetchSavedPlans();
    fetchBackendRoutine();
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('eduverse_daily_routine', JSON.stringify(routine));
  }, [routine]);

  const fetchBackendRoutine = async () => {
    try {
      const res = await api.get('/users/routine');
      if (res.data?.success && Array.isArray(res.data.routine) && res.data.routine.length > 0) {
        setRoutine(res.data.routine);
        localStorage.setItem('eduverse_daily_routine', JSON.stringify(res.data.routine));
      } else {
        // Backend is empty — check if local storage has existing items to migrate up
        const localSaved = localStorage.getItem('eduverse_daily_routine');
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          const hasCustomTasks = parsed.some(slot => slot.task && slot.task.trim().length > 0);
          if (hasCustomTasks) {
            await api.put('/users/routine', { routine: parsed });
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync backend routine:', err);
    }
  };

  const syncRoutineToBackend = async (newRoutine) => {
    if (!isAuthenticated) return;
    try {
      await api.put('/users/routine', { routine: newRoutine });
    } catch (err) {
      console.error('Failed to persist routine to server:', err);
    }
  };

  // Handle auto-focus from Dashboard
  useEffect(() => {
    if (location.state?.fromDashboard) {
        setActiveTab('routine');
    }
  }, [location]);

  const fetchSavedPlans = async () => {
    try {
      const res = await api.get('/ai/planner');
      setSavedPlans(res.data);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Failed to load past plans');
      }
    }
  };

  const handleDeletePlan = (e, planId) => {
    e.stopPropagation();
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-white">Delete this study plan?</span>
        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded-lg bg-surface/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setDeletingId(planId);
              try {
                await api.delete(`/ai/planner/${planId}`);
                setSavedPlans(prev => {
                  const updated = prev.filter(p => p._id !== planId);
                  return updated;
                });
                setPlan(currentPlan => {
                  // If the plan being deleted is currently displayed, clear main view
                  const deletedObj = savedPlans.find(p => p._id === planId);
                  if (deletedObj && currentPlan === deletedObj.roadmap) {
                    return null;
                  }
                  return currentPlan;
                });
                toast.success("Study plan deleted");
              } catch (err) {
                console.error("Failed to delete plan:", err);
                toast.error("Failed to delete plan");
              } finally {
                setDeletingId(null);
              }
            }}
            className="px-2.5 py-1 text-xs bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      style: {
        background: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff',
      }
    });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    requireAuth(async () => {
        setLoading(true);
        try {
          const res = await api.post('/ai/planner', {
            subject,
            durationDays,
            goal
          });
          setPlan(res.data.roadmap);
          fetchSavedPlans();
        } catch (err) {
          const backendMsg = err.response?.data?.message || err.response?.data?.error || err.message || "";
          if (backendMsg.includes('AI_CREDIT_LIMIT') || backendMsg.includes('AI_RATE_LIMIT')) {
            toast.error("AI features are temporarily unavailable. Please try again in a moment.");
          } else {
            toast.error("Failed to generate plan. Please try again.");
          }
          console.error(err);
        } finally {
          setLoading(false);
        }
    });
  };

  const updateRoutineTask = (index, value) => {
    const newRoutine = [...routine];
    newRoutine[index].task = value;
    setRoutine(newRoutine);
    syncRoutineToBackend(newRoutine);
  };

  const toggleRoutineStatus = (index) => {
    const newRoutine = [...routine];
    newRoutine[index].status = newRoutine[index].status === 'pending' ? 'completed' : 'pending';
    setRoutine(newRoutine);
    syncRoutineToBackend(newRoutine);
  };

  const resetRoutine = () => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-white">Reset entire daily routine?</span>
        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded-lg bg-surface/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              setRoutine(defaultRoutine);
              syncRoutineToBackend(defaultRoutine);
              toast.success("Routine reset to default");
            }}
            className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      style: {
        background: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff',
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 glass rounded-xl text-primary">
            {activeTab === 'planner' ? <Sparkles size={24} /> : <Clock size={24} />}
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">{activeTab === 'planner' ? 'AI Study Planner' : 'Daily Routine Grid'}</h2>
            <p className="text-sm sm:text-base text-gray-400 mt-1">{activeTab === 'planner' ? 'Generate and track personalized roadmaps.' : 'Time-block your day completely in this excel-style sheet.'}</p>
          </div>
        </div>
        
        <div className="flex bg-surface/50 rounded-full p-1 border border-white/5 w-full md:w-auto overflow-x-auto scrollbar-hide">
          <PremiumButton className="flex-1 md:flex-none">
            <button 
              onClick={() => setActiveTab('planner')}
              className={`w-full px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'planner' ? 'bg-primary text-primary-content shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              AI Roadmap
            </button>
          </PremiumButton>
          <PremiumButton className="flex-1 md:flex-none">
            <button 
              onClick={() => setActiveTab('routine')}
              className={`w-full px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'routine' ? 'bg-accent text-accent-content shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Daily Grid
            </button>
          </PremiumButton>
        </div>
      </div>

      {activeTab === 'planner' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <ScrollReveal 
              delay={0.1}
              className="glass-card-hover self-start w-full"
            >
              <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                <Target size={20} className="text-accent" /> New Plan
              </h3>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-sm text-gray-400 mb-1">Subject</label>
                    <div className="relative">
                      <Book className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Data Structures"
                        className="w-full bg-surface/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-primary/50 transition-colors"
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Duration (Days)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="number" 
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value))}
                        min="1"
                        max="90"
                        className="w-full bg-surface/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-primary/50 transition-colors"
                        required 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Specific Goal</label>
                    <textarea 
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="e.g. Intervew prep"
                      className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary/50 transition-colors h-10 md:h-20 resize-none"
                      required 
                    />
                  </div>
                </div>

                <PremiumButton className="w-full mt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full md:w-auto lg:w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-content font-medium rounded-xl py-3 md:py-2.5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {loading ? <><Sparkles size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate</>}
                  </button>
                </PremiumButton>
              </form>
            </ScrollReveal>

            {/* History Selection */}
            <ScrollReveal 
              delay={0.2}
              className="glass-card-hover w-full flex-1 overflow-y-auto max-h-[300px]"
            >
               <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2 text-gray-300">
                <History size={18}/> Saved Plans
              </h3>
              {savedPlans.length === 0 ? (
                <p className="text-sm text-gray-500">No saved plans yet.</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {savedPlans.map(p => (
                      <motion.div
                        key={p._id}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="relative group"
                      >
                        <button 
                          onClick={() => setPlan(p.roadmap)}
                          className="w-full text-left p-3 rounded-lg border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all flex justify-between items-center min-h-[44px]"
                        >
                          <div>
                            <p className="font-medium text-sm text-white truncate max-w-[120px]">{p.subject}</p>
                            <p className="text-xs text-secondary">{p.durationDays} Days</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-500 group-hover:opacity-0 transition-all flex-shrink-0" />
                        </button>
                        <button
                          onClick={(e) => handleDeletePlan(e, p._id)}
                          disabled={deletingId === p._id}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg p-2 disabled:opacity-50"
                        >
                          {deletingId === p._id ? <RefreshCcw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollReveal>
          </div>

          <ScrollReveal 
            delay={0.3}
            className="lg:col-span-3 space-y-4"
          >
            {plan ? (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4 text-primary">Your Learning Path</h3>
                <ScrollRevealGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plan.map((day, idx) => (
                    <div 
                      key={idx} 
                      className="glass-card-hover p-4 md:p-6 rounded-2xl border-l-4 border-l-primary flex flex-col h-full"
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full">
                            Day {day.day}
                          </span>
                          {day.timeEstimate && (
                            <span className="flex items-center gap-1 bg-white/5 text-gray-400 text-xs px-2.5 py-1 rounded-full border border-white/10">
                              <Clock size={10} />
                              {day.timeEstimate}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-base text-white break-words w-full sm:w-auto">{day.topic}</h4>
                      </div>

                      {/* Tasks */}
                      <ul className="space-y-1.5 mt-2 mb-4 flex-1">
                        {day.tasks.map((task, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-3 text-gray-300 text-sm md:text-base">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                            <span className="flex-1">{task}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Resources */}
                      {(day.resources?.youtube?.length > 0 || day.resources?.articles?.length > 0) && (
                        <div className="mt-auto pt-3 border-t border-white/5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resources</p>
                          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                            {/* YouTube links */}
                            {(day.resources?.youtube || []).map((vid, vIdx) => (
                              <button
                                key={`yt-${vIdx}`}
                                onClick={(e) => handleSourceClick(e, vid.url, vid.title)}
                                title={vid.title}
                                className="flex items-center justify-center sm:justify-start gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-medium px-3 py-2.5 sm:py-1.5 rounded-lg transition-all w-full sm:w-auto sm:max-w-[220px] group min-h-[44px] sm:min-h-0"
                              >
                                <Play size={12} className="flex-shrink-0" />
                                <span className="truncate">{vid.title}</span>
                                <ExternalLink size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                              </button>
                            ))}

                            {/* Article links */}
                            {(day.resources?.articles || []).map((art, aIdx) => (
                              <button
                                key={`art-${aIdx}`}
                                onClick={(e) => handleSourceClick(e, art.url, art.title)}
                                title={art.title}
                                className="flex items-center justify-center sm:justify-start gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 text-xs font-medium px-3 py-2.5 sm:py-1.5 rounded-lg transition-all w-full sm:w-auto sm:max-w-[220px] group min-h-[44px] sm:min-h-0"
                              >
                                <FileText size={12} className="flex-shrink-0" />
                                <span className="truncate">{art.title}</span>
                                <ExternalLink size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollRevealGroup>
              </div>
            ) : (
              <div className="h-full min-h-[400px] glass-card-hover flex flex-col items-center justify-center text-center p-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Book size={32} className="text-gray-500" />
                </div>
                <p className="text-gray-400 max-w-xs text-sm md:text-base">Fill out the details on the left or select a previous plan to track your learning journey.</p>
              </div>
            )}
          </ScrollReveal>
        </div>
      ) : (
        <ScrollReveal 
          delay={0.1}
          className="glass-card-hover overflow-x-auto"
        >
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-semibold text-white">Today's Schedule block</h3>
             <button 
               onClick={resetRoutine}
               className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
             >
                <RefreshCcw size={16} /> Reset Daily
             </button>
          </div>
          
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="pb-3 pl-4 w-32 font-medium">Time</th>
                <th className="pb-3 font-medium">Task Entry</th>
                <th className="pb-3 w-32 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {routine.map((slot, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="py-2 pl-4">
                    <span className="text-sm font-bold text-accent px-3 py-1 bg-surface rounded-md border border-white/10 shadow-sm">{slot.time}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <input 
                      type="text" 
                      value={slot.task}
                      onChange={(e) => updateRoutineTask(idx, e.target.value)}
                      placeholder="Type your task for this hour..."
                      className={`w-full bg-transparent border border-transparent focus:border-white/20 hover:border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-600 focus:outline-none transition-all ${slot.status === 'completed' ? 'line-through text-gray-500' : ''}`}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <button 
                      onClick={() => toggleRoutineStatus(idx)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-colors border ${slot.status === 'completed' ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-white/10 text-gray-400 hover:border-primary/50 hover:text-primary'}`}
                    >
                       ✓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollReveal>
      )}

      {/* Source Preview Modal */}
      <SourcePreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        source={previewSource} 
      />

    </div>
  );
};

export default StudyPlanner;
