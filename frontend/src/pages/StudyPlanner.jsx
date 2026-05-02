import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { motion } from 'framer-motion';
<<<<<<< HEAD
import { Sparkles, Calendar, Target, Book, ChevronRight, History, Clock, RefreshCcw } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';
=======
import { Sparkles, Calendar, Target, Book, ChevronRight, History, Clock, RefreshCcw, Play, ExternalLink, FileText } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';
import SourcePreviewModal from '../components/SourcePreviewModal';
>>>>>>> phase2Code

const StudyPlanner = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('planner'); // planner or routine
  const [subject, setSubject] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const { requireAuth } = useContext(AuthContext);

<<<<<<< HEAD
=======
  // Source Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState(null);

  const handleSourceClick = (e, sourceUrl, sourceTitle) => {
    e.preventDefault();
    setPreviewSource({ url: sourceUrl, title: sourceTitle });
    setIsPreviewOpen(true);
  };

>>>>>>> phase2Code
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
    fetchSavedPlans();
  }, []);

  useEffect(() => {
    localStorage.setItem('eduverse_daily_routine', JSON.stringify(routine));
  }, [routine]);

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
      console.error('Failed to load past plans');
    }
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
          alert("Failed to generate plan. Please check your OpenAI billing quota.");
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
  };

  const toggleRoutineStatus = (index) => {
    const newRoutine = [...routine];
    newRoutine[index].status = newRoutine[index].status === 'pending' ? 'completed' : 'pending';
    setRoutine(newRoutine);
  };

  const resetRoutine = () => {
    if (window.confirm("Are you sure you want to reset your entire daily routine?")) {
      setRoutine(defaultRoutine);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 glass rounded-xl text-primary">
            {activeTab === 'planner' ? <Sparkles size={24} /> : <Clock size={24} />}
          </div>
          <div>
<<<<<<< HEAD
            <h2 className="text-3xl font-bold">{activeTab === 'planner' ? 'AI Study Planner' : 'Daily Routine Grid'}</h2>
            <p className="text-gray-400 mt-1">{activeTab === 'planner' ? 'Generate and track personalized roadmaps.' : 'Time-block your day completely in this excel-style sheet.'}</p>
          </div>
        </div>
        
        <div className="flex bg-surface/50 rounded-full p-1 border border-white/5">
          <PremiumButton>
            <button 
              onClick={() => setActiveTab('planner')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'planner' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
=======
            <h2 className="text-2xl sm:text-3xl font-bold">{activeTab === 'planner' ? 'AI Study Planner' : 'Daily Routine Grid'}</h2>
            <p className="text-sm sm:text-base text-gray-400 mt-1">{activeTab === 'planner' ? 'Generate and track personalized roadmaps.' : 'Time-block your day completely in this excel-style sheet.'}</p>
          </div>
        </div>
        
        <div className="flex bg-surface/50 rounded-full p-1 border border-white/5 w-full md:w-auto overflow-x-auto scrollbar-hide">
          <PremiumButton className="flex-1 md:flex-none">
            <button 
              onClick={() => setActiveTab('planner')}
              className={`w-full px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'planner' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
>>>>>>> phase2Code
            >
              AI Roadmap
            </button>
          </PremiumButton>
<<<<<<< HEAD
          <PremiumButton>
            <button 
              onClick={() => setActiveTab('routine')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'routine' ? 'bg-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
=======
          <PremiumButton className="flex-1 md:flex-none">
            <button 
              onClick={() => setActiveTab('routine')}
              className={`w-full px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'routine' ? 'bg-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
>>>>>>> phase2Code
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
<<<<<<< HEAD
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target size={20} className="text-accent" /> New Plan
              </h3>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
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
=======
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
>>>>>>> phase2Code
                      required 
                    />
                  </div>
                </div>

<<<<<<< HEAD
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Specific Goal</label>
                  <textarea 
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. Intervew prep"
                    className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary/50 transition-colors h-20 resize-none"
                    required 
                  />
                </div>

                <PremiumButton className="w-full">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium rounded-xl py-2.5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
=======
                <PremiumButton className="w-full mt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full md:w-auto lg:w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium rounded-xl py-3 md:py-2.5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 min-h-[44px]"
>>>>>>> phase2Code
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
<<<<<<< HEAD
               <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-300">
=======
               <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2 text-gray-300">
>>>>>>> phase2Code
                <History size={18}/> Saved Plans
              </h3>
              {savedPlans.length === 0 ? (
                <p className="text-sm text-gray-500">No saved plans yet.</p>
              ) : (
                <div className="space-y-2">
                  {savedPlans.map(p => (
                    <button 
                      key={p._id}
                      onClick={() => setPlan(p.roadmap)}
<<<<<<< HEAD
                      className="w-full text-left p-3 rounded-lg border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all flex justify-between items-center group"
=======
                      className="w-full text-left p-3 rounded-lg border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all flex justify-between items-center group min-h-[44px]"
>>>>>>> phase2Code
                    >
                      <div>
                        <p className="font-medium text-sm text-white truncate max-w-[120px]">{p.subject}</p>
                        <p className="text-xs text-secondary">{p.durationDays} Days</p>
                      </div>
<<<<<<< HEAD
                      <ChevronRight size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
=======
                      <ChevronRight size={16} className="text-gray-500 group-hover:text-primary transition-colors flex-shrink-0" />
>>>>>>> phase2Code
                    </button>
                  ))}
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
<<<<<<< HEAD
                <ScrollRevealGroup stagger={0.1} className="space-y-4">
                  {plan.map((day, idx) => (
                    <div 
                      key={idx} 
                      className="glass-card-hover p-5 rounded-2xl border-l-4 border-l-primary"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full">
                          Day {day.day}
                        </span>
                        <h4 className="font-medium text-lg text-white">{day.topic}</h4>
                      </div>
                      <ul className="space-y-2 mt-2">
                        {day.tasks.map((task, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-3 text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2"></div>
=======
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
>>>>>>> phase2Code
                            <span className="flex-1">{task}</span>
                          </li>
                        ))}
                      </ul>
<<<<<<< HEAD
=======

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
>>>>>>> phase2Code
                    </div>
                  ))}
                </ScrollRevealGroup>
              </div>
            ) : (
<<<<<<< HEAD
              <div className="h-full min-h-[400px] glass-card-hover flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Book size={32} className="text-gray-500" />
                </div>
                <p className="text-gray-400 max-w-xs">Fill out the details on the left or select a previous plan to track your learning journey.</p>
=======
              <div className="h-full min-h-[400px] glass-card-hover flex flex-col items-center justify-center text-center p-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Book size={32} className="text-gray-500" />
                </div>
                <p className="text-gray-400 max-w-xs text-sm md:text-base">Fill out the details on the left or select a previous plan to track your learning journey.</p>
>>>>>>> phase2Code
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
<<<<<<< HEAD
=======

      {/* Source Preview Modal */}
      <SourcePreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        source={previewSource} 
      />
>>>>>>> phase2Code
    </div>
  );
};

export default StudyPlanner;
