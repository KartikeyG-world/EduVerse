import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, GraduationCap, CheckCircle2, Send, MessageSquarePlus, Activity, User, Book, Hash, Trophy, Target } from 'lucide-react';
import api from '../utils/api';
import { CompanionContext, COMPANION_EVENTS } from '../context/CompanionContext';
import { AuthContext } from '../context/AuthContext';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';
import ParallaxLayer from '../components/ui/ParallaxLayer';

const SUBJECTS = ['Maths', 'Physics', 'Chemistry', 'Programming', 'Other'];

// Animated Counter Component
const AnimatedCounter = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if(end % 1 !== 0) setCount(end);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <>{end % 1 !== 0 ? count.toFixed(1) : count}</>;
};

export default function Tutor() {
  const [role, setRole] = useState('student');
  const { triggerFeedback } = useContext(CompanionContext);
  const { user, updateUser, requireAuth, isAuthenticated } = useContext(AuthContext);

  const [stats, setStats] = useState({ totalPosted: 0, totalSolved: 0, totalPoints: 0 });

  // States: Student
  const [studentSubject, setStudentSubject] = useState('Maths');
  const [studentQuestion, setStudentQuestion] = useState('');
  const [myProblems, setMyProblems] = useState([]);
  
  // States: Teacher
  const [teacherSubject, setTeacherSubject] = useState('Maths');
  const [teacherProblems, setTeacherProblems] = useState([]);
  const [solveModalOpen, setSolveModalOpen] = useState(false);
  const [activeProblem, setActiveProblem] = useState(null);
  const [solutionText, setSolutionText] = useState('');

  // Fetch logic
  useEffect(() => {
     if (!isAuthenticated) return;
     fetchStats();
     if (role === 'student') {
        fetchMyProblems();
     } else {
        fetchTeacherProblems();
     }
  }, [role, teacherSubject, isAuthenticated]);

  const fetchStats = async () => {
     try {
         const res = await api.get('/tutor/stats');
         setStats(res.data);
     } catch (err) {
         if (err.response?.status !== 401) {
            console.error("Failed to load stats", err);
         }
     }
  };

  const fetchMyProblems = async () => {
    try {
      const res = await api.get('/tutor/my-problems');
      setMyProblems(res.data);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error(err);
        triggerFeedback({ type: COMPANION_EVENTS.ACTION_ERROR, data: { message: "Failed to load your problems" } });
      }
    }
  };

  const fetchTeacherProblems = async () => {
    try {
      const res = await api.get(`/tutor/problems?subject=${teacherSubject}`);
      setTeacherProblems(res.data);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error(err);
        triggerFeedback({ type: COMPANION_EVENTS.ACTION_ERROR, data: { message: "Failed to load server problems" } });
      }
    }
  };

  // Student Actions
  const handlePostProblem = async (e) => {
    e.preventDefault();
    requireAuth(async () => {
        if (!studentQuestion.trim()) return;
        try {
          await api.post('/tutor/problem', { subject: studentSubject, questionText: studentQuestion });
          setStudentQuestion('');
          triggerFeedback({ type: COMPANION_EVENTS.QUESTION_POSTED });
          fetchMyProblems();
          fetchStats();
        } catch(err) {
          triggerFeedback({ type: COMPANION_EVENTS.ACTION_ERROR, data: { message: "Error posting question" } });
        }
    });
  };

  const handleAcceptSolution = async (problemId, solutionId) => {
    requireAuth(async () => {
        try {
          await api.post('/tutor/accept', { problemId, solutionId });
          // Sync local user stats 
          try {
            const uRes = await api.get('/auth/me'); 
            updateUser({ xp: uRes.data.xp, level: uRes.data.level });
          } catch (e) {} 
    
          triggerFeedback({ type: COMPANION_EVENTS.SOLUTION_ACCEPTED, data: { xp: 10 } });
          fetchMyProblems();
          fetchStats();
        } catch(err) {
          triggerFeedback({ type: COMPANION_EVENTS.ACTION_ERROR, data: { message: "Error accepting solution" } });
        }
    });
  };

  // Teacher Actions
  const handleOpenSolve = (p) => {
      requireAuth(() => {
          setActiveProblem(p);
          setSolutionText('');
          setSolveModalOpen(true);
      });
  };

  const handleSubmitSolution = async (e) => {
      e.preventDefault();
      requireAuth(async () => {
          if (!solutionText.trim()) return;
    
          try {
              await api.post('/tutor/solution', { problemId: activeProblem._id, solutionText });
              triggerFeedback({ type: COMPANION_EVENTS.SOLUTION_SUBMITTED });
              setSolveModalOpen(false);
              setActiveProblem(null);
              fetchTeacherProblems(); 
              fetchStats();
          } catch (err) {
              triggerFeedback({ type: COMPANION_EVENTS.ACTION_ERROR, data: { message: "Error submitting solution" } });
          }
      });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 relative">
      
      {/* Header and Dual Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
             <GraduationCap size={32} className="text-primary"/> Global Tutor Network
          </h1>
          <p className="text-gray-400 mt-1">Connect natively with peers to solve complex bounds</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface p-1.5 rounded-full border border-white/5 relative shadow-inner">
          {['student', 'teacher'].map((tab) => (
            <PremiumButton key={tab} strength={0.2}>
              <button
                onClick={() => setRole(tab)}
                className={`relative px-6 py-2 rounded-full text-sm font-semibold uppercase tracking-wider z-10 transition-colors ${role === tab ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              >
                 {role === tab && (
                   <motion.div
                     layoutId="tutorTab"
                     className={`absolute inset-0 rounded-full shadow-lg ${role === 'student' ? 'bg-primary' : 'bg-accent'}`}
                     transition={{ type: "spring", stiffness: 300, damping: 25 }}
                     style={{ zIndex: -1 }}
                   />
                 )}
                 <span className="flex items-center gap-2">
                     {tab === 'student' ? <BookOpen size={16}/> : <CheckCircle2 size={16}/>} {tab}
                 </span>
              </button>
            </PremiumButton>
          ))}
        </div>
      </div>

      {/* STUDENT MODE */}
      {role === 'student' && (
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            
            {/* Analytics Header - Student */}
            <ParallaxLayer depth={0.03}>
                <ScrollRevealGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-next-gen dynamic-lighting flex items-center justify-between group hover:border-primary/30 transition-colors p-6 rounded-2xl">
                    <div>
                        <h3 className="text-gray-400 text-sm font-medium">Lifetime Questions</h3>
                        <div className="mt-2 text-4xl font-black text-white flex items-end gap-2">
                            <AnimatedCounter end={stats.totalPosted} duration={1500} /> <span className="text-lg font-medium text-gray-500 mb-1">posted</span>
                        </div>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                        <Hash size={24} className="text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
                    </div>
                    </div>
                </ScrollRevealGroup>
            </ParallaxLayer>

            {/* Ask Form */}
            <ParallaxLayer depth={0.05}>
                <ScrollReveal delay={0.2} className="glass-next-gen dynamic-lighting p-6 border-l-4 border-l-primary relative overflow-hidden rounded-2xl">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                   <MessageSquarePlus size={20} className="text-primary" /> Request Assistance
                </h3>
                <form onSubmit={handlePostProblem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Subject</label>
                        <select 
                           value={studentSubject} 
                           onChange={(e) => setStudentSubject(e.target.value)}
                           className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary transition-all"
                        >
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-3 relative flex items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Your Question</label>
                            <input 
                               type="text" 
                               value={studentQuestion} 
                               onChange={(e) => setStudentQuestion(e.target.value)}
                               placeholder="I'm struggling with deriving the quadratic formula natively..." 
                               className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-primary transition-all"
                            />
                        </div>
                        <PremiumButton>
                            <button type="submit" disabled={!studentQuestion.trim()} className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white rounded-xl py-3 px-6 pb-[3px] h-[50px] font-bold transition-all shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)]">
                                Publish
                            </button>
                        </PremiumButton>
                    </div>
                </form>
            </ScrollReveal>
            </ParallaxLayer>

            {/* My Questions Thread */}
            <div>
                 <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Activity size={20}/> My Active Threads
                 </h2>
                 
                  <ScrollRevealGroup stagger={0.08} className="grid grid-cols-1 gap-4">
                      {!isAuthenticated ? (
                          <div className="glass p-12 text-center space-y-4 rounded-2xl border border-white/5 border-dashed">
                              <GraduationCap size={48} className="mx-auto text-gray-600 mb-2" />
                              <h3 className="text-xl font-bold text-white">Join the Network</h3>
                              <p className="text-gray-400 max-w-md mx-auto text-sm">
                                  Sign in to post your academic queries or earn XP by solving problems for peers in the Global Tutor Network.
                              </p>
                              <button 
                                onClick={() => requireAuth(() => {})}
                                className="mt-4 px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-all"
                              >
                                Sign In / Register
                              </button>
                          </div>
                      ) : myProblems.length === 0 ? (
                          <div className="glass p-8 text-center text-gray-400 rounded-xl border border-white/5 border-dashed">
                              No queries requested structurally yet!
                          </div>
                      ) : myProblems.map(prob => (
                         <div key={prob._id} className="glass p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <span className="text-xs bg-surface px-2 py-0.5 rounded text-primary border border-primary/20">{prob.subject}</span>
                                     <p className="mt-2 text-white font-medium text-lg">{prob.questionText}</p>
                                 </div>
                                 {prob.status === 'solved' ? (
                                     <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-lg border border-green-500/30 flex items-center gap-1"><CheckCircle2 size={12}/> SOLVED</span>
                                 ) : (
                                     <span className="px-3 py-1 bg-surface text-gray-400 text-xs font-bold rounded-lg border border-white/10 flex items-center gap-1"><Activity size={12}/> {prob.solutions?.length} SOLUTIONS</span>
                                 )}
                             </div>

                             {/* Solutions List */}
                             {prob.solutions?.length > 0 && (
                                 <div className="mt-3 pl-4 border-l-2 border-white/10 space-y-4">
                                     {prob.solutions.map(sol => (
                                         <div key={sol._id} className={`bg-background/40 p-4 rounded-xl border ${prob.acceptedSolution === sol._id ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-white/5'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <User size={14}/> <strong>{sol.teacherId?.name || "Teacher"}</strong> <span className="bg-surface px-1.5 rounded text-xs">Lv.{sol.teacherId?.level || 1}</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-200">{sol.solutionText}</p>
                                            
                                            {/* Accept Button Logic */}
                                            {prob.status === 'unsolved' && (
                                                <button 
                                                   onClick={() => handleAcceptSolution(prob._id, sol._id)}
                                                   className="mt-3 text-xs font-bold bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg transition-colors border border-green-500/20 shadow-sm"
                                                >
                                                    Accept Answer (+10 XP to Teacher)
                                                </button>
                                            )}
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     ))}
                 </ScrollRevealGroup>
            </div>

         </motion.div>
      )}

      {/* TEACHER MODE */}
      {role === 'teacher' && (
         <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
             
             {/* Analytics Header - Teacher */}
             <ParallaxLayer depth={0.03}>
                 <ScrollRevealGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="glass-next-gen dynamic-lighting flex items-center justify-between group hover:border-accent/30 transition-colors p-6 rounded-2xl">
                     <div>
                         <h3 className="text-gray-400 text-sm font-medium">Total Rewards</h3>
                         <div className="mt-2 text-4xl font-black text-white flex items-end gap-2">
                             <AnimatedCounter end={stats.totalPoints} duration={2000} /> <span className="text-lg font-medium text-gray-500 mb-1">pts</span>
                         </div>
                     </div>
                     <div className="p-3 bg-accent/10 rounded-xl group-hover:bg-accent/20 transition-colors">
                         <Trophy size={24} className="text-accent drop-shadow-[0_0_15px_rgba(var(--accent),0.8)]" />
                     </div>
                     </div>
                     
                     <div className="glass-next-gen dynamic-lighting flex items-center justify-between group hover:border-emerald-500/30 transition-colors p-6 rounded-2xl">
                         <div>
                         <h3 className="text-gray-400 text-sm font-medium">Accepted Solutions</h3>
                         <div className="mt-2 text-4xl font-black text-white flex items-end gap-2">
                             <AnimatedCounter end={stats.totalSolved} duration={2000} /> <span className="text-lg font-medium text-gray-500 mb-1">solved</span>
                         </div>
                     </div>
                     <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                         <Target size={24} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                     </div>
                     </div>
                 </ScrollRevealGroup>
             </ParallaxLayer>

             <ParallaxLayer depth={0.04}>
                 <div className="flex justify-between items-center bg-accent/10 p-4 rounded-2xl border border-accent/20">
                 <p className="text-accent text-sm font-medium">Earn XP dynamically by solving structural threads published by native network students.</p>
                 <PremiumButton>
                    <select 
                        value={teacherSubject} 
                        onChange={(e) => setTeacherSubject(e.target.value)}
                        className="bg-surface border border-white/10 rounded-xl p-2 px-4- text-sm text-white outline-none focus:border-accent"
                    >
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </PremiumButton>
             </div>

             <ScrollRevealGroup stagger={0.08} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {teacherProblems.length === 0 ? (
                     <div className="col-span-1 md:col-span-2 glass p-10 text-center text-gray-400 rounded-xl border border-white/5 border-dashed">
                        No active unsolved problems detected securely inside <strong className="text-accent">{teacherSubject}</strong>. Check back soon.
                     </div>
                 ) : teacherProblems.map(prob => (
                     <div key={prob._id} className="glass-next-gen dynamic-lighting p-6 border-t-2 border-t-accent hover:shadow-[0_0_30px_rgba(var(--accent),0.1)] transition-all flex flex-col justify-between h-full rounded-2xl">
                         <div>
                            <div className="flex justify-between mb-3">
                                <span className="text-xs bg-surface px-2 py-0.5 rounded text-accent border border-accent/20 flex items-center gap-1"><Book size={10}/> {prob.subject}</span>
                                <span className="text-xs text-gray-500 font-medium">{new Date(prob.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-6 leading-relaxed">{prob.questionText}</h3>
                         </div>
                         
                         <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs text-gray-400 flex items-center gap-1"><User size={12}/> Post by: {prob.userId?.name || "Student"}</span>
                            <PremiumButton>
                                <button 
                                    onClick={() => handleOpenSolve(prob)}
                                    className="bg-accent/10 hover:bg-accent hover:text-white text-accent px-4 py-2 rounded-xl text-sm font-bold transition-all border border-accent/30"
                                >
                                    Solve Problem
                                </button>
                            </PremiumButton>
                         </div>
                     </div>
                 ))}
             </ScrollRevealGroup>
             </ParallaxLayer>

             {/* SOLVE MODAL NATIVE OVERLAY */}
             <AnimatePresence>
                 {solveModalOpen && activeProblem && (
                     <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                     >
                         <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#0f172a] border border-white/10 shadow-2xl rounded-2xl p-6 w-full max-w-xl"
                         >
                             <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Send size={20} className="text-accent"/> Distribute Solution</h3>
                             <p className="text-sm border-l-2 border-accent/50 pl-3 py-1 bg-surface text-gray-300 italic mb-4 rounded-r-md">"{activeProblem.questionText}"</p>
                             
                             <form onSubmit={handleSubmitSolution} className="mt-4">
                                 <textarea 
                                    value={solutionText}
                                    onChange={(e) => setSolutionText(e.target.value)}
                                    placeholder="Write your step-by-step solution here..."
                                    className="w-full h-32 bg-background border border-white/10 rounded-xl p-3 text-white outline-none focus:border-accent transition-all resize-none"
                                 ></textarea>
                                 <div className="flex justify-end gap-3 mt-6">
                                     <button type="button" onClick={() => setSolveModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                                     <button type="submit" disabled={!solutionText.trim()} className="px-5 py-2 text-sm font-bold bg-accent hover:bg-accent/80 text-white rounded-xl disabled:opacity-50 transition-all">Submit Answer</button>
                                 </div>
                             </form>
                         </motion.div>
                     </motion.div>
                 )}
             </AnimatePresence>

         </motion.div>
      )}

    </div>
  );
}
