import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, Target, Book, ChevronRight, History, Clock, RefreshCcw } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';

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
            <h2 className="text-3xl font-bold">{activeTab === 'planner' ? 'AI Study Planner' : 'Daily Routine Grid'}</h2>
            <p className="text-gray-400 mt-1">{activeTab === 'planner' ? 'Generate and track personalized roadmaps.' : 'Time-block your day completely in this excel-style sheet.'}</p>
          </div>
        </div>
        
        <div className="flex bg-surface/50 rounded-full p-1 border border-white/5">
          <PremiumButton>
            <button 
              onClick={() => setActiveTab('planner')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'planner' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              AI Roadmap
            </button>
          </PremiumButton>
          <PremiumButton>
            <button 
              onClick={() => setActiveTab('routine')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'routine' ? 'bg-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
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
                    className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary/50 transition-colors h-20 resize-none"
                    required 
                  />
                </div>

                <PremiumButton className="w-full">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium rounded-xl py-2.5 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
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
               <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-300">
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
                      className="w-full text-left p-3 rounded-lg border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-medium text-sm text-white truncate max-w-[120px]">{p.subject}</p>
                        <p className="text-xs text-secondary">{p.durationDays} Days</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-500 group-hover:text-primary transition-colors" />
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
                            <span className="flex-1">{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </ScrollRevealGroup>
              </div>
            ) : (
              <div className="h-full min-h-[400px] glass-card-hover flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Book size={32} className="text-gray-500" />
                </div>
                <p className="text-gray-400 max-w-xs">Fill out the details on the left or select a previous plan to track your learning journey.</p>
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
    </div>
  );
};

export default StudyPlanner;
