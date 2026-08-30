import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { CompanionContext, COMPANION_EVENTS } from '../context/CompanionContext';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  Flame, Clock, Target, Sparkles, TrendingUp, TrendingDown, Activity, 
  BrainCircuit, ArrowRight, RefreshCw, Zap, Layers, BookOpen
} from 'lucide-react';
// Phase 2: Flashcard pending count
import { getPendingCount } from '../api/flashcards';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';
import ParallaxLayer from '../components/ui/ParallaxLayer';
import MasteryOverview from '../components/dashboard/MasteryOverview';
import AnimatedCounter from '../components/ui/AnimatedCounter';

// Animated Typewriter component for AI insights
const TypewriterText = ({ text }) => {
  const [displayed, setDisplayed] = useState('');
  
  useEffect(() => {
    if (!text) {
      setDisplayed('');
      return;
    }
    
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.substring(0, i));
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, 30);
    
    return () => clearInterval(interval);
  }, [text]);

  return <span className="leading-relaxed">{displayed}</span>;
};

// Main Dashboard Component
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [pendingCards, setPendingCards] = useState(null); // Phase 2: SRS
  const { triggerFeedback } = useContext(CompanionContext);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setChartReady(true), 200);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Fetch dashboard data and pending flashcard count concurrently
      const [dashResult, fcResult] = await Promise.allSettled([
        api.get('/dashboard'),
        getPendingCount()
      ]);

      if (dashResult.status === 'fulfilled') {
        const res = dashResult.value;
        setData(res.data);
        updateUser({ streak: res.data.stats.streak }); // Sync sidebar
        triggerFeedback({ 
          type: COMPANION_EVENTS.DASHBOARD_LOAD, 
          data: { name: user?.name } 
        });
      } else {
        const err = dashResult.reason;
        const errMsg = err?.response?.data?.error || err?.message || "";
        if (errMsg.includes('AI_CREDIT_LIMIT') || errMsg.includes('AI_RATE_LIMIT')) {
          toast.error("AI features are temporarily unavailable. Please try again in a moment.");
        }
        if (err?.response?.status !== 401) {
          console.error('Failed to load dashboard data', err);
        }
        setError("Unable to load dashboard data. Please check your connection and try again.");
      }

      if (fcResult.status === 'fulfilled') {
        setPendingCards(fcResult.value.data?.count ?? 0);
      } else {
        setPendingCards(0);
      }
    } catch (err) {
      setError("Unable to load dashboard data. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getLevelTitle = (lvl) => {
    if (lvl < 5) return 'Novice';
    if (lvl < 10) return 'Scholar';
    if (lvl < 20) return 'Adept';
    return 'Master';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // FIX 13: Explicit error state rendering with Retry button (do not show skeleton on error)
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface/50 border border-white/10 rounded-2xl text-center space-y-4 max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
          <RefreshCw size={24} />
        </div>
        <h3 className="text-xl font-bold text-white">Failed to Load Dashboard</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{error}</p>
        <button
          onClick={fetchDashboard}
          disabled={refreshing}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Retry
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-surface rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-surface rounded-2xl animate-pulse"></div>
          <div className="h-40 bg-surface rounded-2xl animate-pulse"></div>
          <div className="h-40 bg-surface rounded-2xl animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-surface rounded-2xl animate-pulse"></div>
          <div className="h-80 bg-surface rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  const { stats, dailyActivity, topics, insight } = data;
  const currentLevelXP = stats.xp % 1000;
  const progressPercent = (currentLevelXP / 1000) * 100;

  return (
    <motion.div 
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header Area */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
             Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mt-1 flex items-center gap-2">
             You are tracking <strong className="text-white">live analytics</strong> for your session.
          </p>
        </div>
        <PremiumButton className="w-full sm:w-auto">
          <button 
            onClick={fetchDashboard}
            disabled={refreshing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-surface hover:bg-white/5 border border-white/10 px-4 py-2 sm:py-2.5 rounded-xl transition-all text-sm font-medium"
          >
            <RefreshCw size={16} className={`${refreshing ? 'animate-spin text-primary' : 'text-gray-400'}`} /> 
            Refresh Data
          </button>
        </PremiumButton>
      </div>

      {/* Top Stats Grid */}
      <ParallaxLayer depth={0.03}>
        <ScrollRevealGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Streak Card */}
        <div className="glass-next-gen dynamic-lighting flex flex-col justify-between group active:border-orange-500/30 md:hover:border-orange-500/30 transition-colors relative overflow-hidden rounded-2xl p-4 md:p-6">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-active:bg-orange-500/20 md:group-hover:bg-orange-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-400 text-sm font-medium">Active Streak</h3>
              <div className="mt-2 text-3xl md:text-4xl font-black text-white flex items-end gap-2">
                <AnimatedCounter end={stats.streak} duration={1500} /> <span className="text-base md:text-lg font-medium text-gray-500 mb-1">days</span>
              </div>
            </div>
            <div className="p-2.5 md:p-3 bg-orange-500/10 rounded-xl">
               <Flame size={20} className="md:w-6 md:h-6 text-orange-500 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
            </div>
          </div>
          <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden mt-2">
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${Math.min(stats.streak * 10, 100)}%` }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full"
            ></motion.div>
          </div>
          <p className="text-[10px] md:text-xs text-orange-400/80 mt-3 flex items-center gap-1"><Zap size={14}/> Maintaining daily momentum</p>
        </div>

        {/* Level Card */}
        <div className="glass-next-gen dynamic-lighting flex flex-col justify-between group active:border-primary/30 md:hover:border-primary/30 transition-colors relative overflow-hidden rounded-2xl p-4 md:p-6">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-active:bg-primary/20 md:group-hover:bg-primary/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-400 text-sm font-medium">Rank Progress</h3>
              <div className="flex items-end gap-3 mt-2">
                <span className="text-3xl md:text-4xl font-black neon-text">Lv. <AnimatedCounter end={stats.level} duration={1000} /></span>
              </div>
            </div>
            <div className="p-2.5 md:p-3 bg-primary/10 rounded-xl">
               <Target size={20} className="md:w-6 md:h-6 text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
            </div>
          </div>
          <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden mt-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="bg-gradient-to-r from-primary to-accent h-full rounded-full"
            ></motion.div>
          </div>
          <div className="flex justify-between items-center text-[10px] md:text-xs mt-3">
             <span className="text-primary font-medium">{getLevelTitle(stats.level)}</span>
             <span className="text-gray-500">{1000 - currentLevelXP} XP to go</span>
          </div>
        </div>

        {/* Focus Hours Card */}
        <div className="glass-next-gen dynamic-lighting flex flex-col justify-between group active:border-blue-500/30 md:hover:border-blue-500/30 transition-colors relative overflow-hidden rounded-2xl p-4 md:p-6 md:col-span-2 lg:col-span-1">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-active:bg-blue-500/20 md:group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-400 text-sm font-medium">Deep Work Time</h3>
              <div className="mt-2 text-3xl md:text-4xl font-black text-white flex items-end gap-2">
                {stats.focusHours > 0 && stats.focusHours < 1 ? (
                  <>
                    <AnimatedCounter end={Math.round(stats.focusHours * 60)} duration={2000} /> <span className="text-base md:text-lg font-medium text-gray-500 mb-1">min</span>
                  </>
                ) : (
                  <>
                    <AnimatedCounter end={Number((stats.focusHours || 0).toFixed(1))} duration={2000} /> <span className="text-base md:text-lg font-medium text-gray-500 mb-1">hrs</span>
                  </>
                )}
              </div>
            </div>
            <div className="p-2.5 md:p-3 bg-blue-500/10 rounded-xl">
               <Clock size={20} className="md:w-6 md:h-6 text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] md:text-sm text-gray-400">
             <Activity size={16} className="text-emerald-400" /> Lifetime focus metrics
          </div>
        </div>
      </ScrollRevealGroup>
      </ParallaxLayer>

      {/* Learning Intelligence Layer */}
      <ScrollReveal delay={0.2}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-primary" /> Mastery Engine
            </h3>
            <span className="text-xs text-gray-500 bg-surface px-2 py-1 rounded-lg border border-white/5">
              Study DNA v1.0
            </span>
          </div>
          <MasteryOverview stats={data.mastery} />
        </div>
      </ScrollReveal>

      {/* Phase 2: Daily Review Widget (SRS) — additive section */}
      {pendingCards !== null && (
        <ScrollReveal delay={0.25}>
          <motion.div
            className="glass-next-gen dynamic-lighting rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-primary/10 hover:border-primary/25 transition-colors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 flex-shrink-0">
                <Layers size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen size={14} className="text-primary" /> Daily Review
                  <span className="text-[10px] font-medium text-gray-500 bg-surface px-2 py-0.5 rounded-md border border-white/5 ml-1">SRS</span>
                </h3>
                {pendingCards === 0 ? (
                  <p className="text-xs text-emerald-400 mt-0.5 font-medium">
                    ✓ All caught up — no cards due today!
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="text-primary font-black text-base">{pendingCards}</span>
                    {' '}flashcard{pendingCards !== 1 ? 's' : ''} pending review today
                  </p>
                )}
              </div>
            </div>
            <button
              id="dashboard-start-review-btn"
              onClick={() => navigate('/flashcards/study')}
              disabled={pendingCards === 0}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary/20 hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed border border-primary/30 text-primary rounded-xl text-sm font-bold transition-all"
            >
              {pendingCards === 0 ? 'No Cards Due' : 'Start Review'}
              {pendingCards > 0 && <ArrowRight size={14} />}
            </button>
          </motion.div>
        </ScrollReveal>
      )}

      {/* Main Content Area */}
      <ParallaxLayer depth={0.06}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BIG CHART AREA */}
        <ScrollReveal delay={0.3} className="lg:col-span-2 glass-next-gen dynamic-lighting p-4 sm:p-6 flex flex-col min-h-[250px] md:min-h-[350px] lg:min-h-[400px] rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                 <Activity size={18} className="text-primary"/> 7-Day Activity Pipeline
              </h3>
              <p className="text-xs md:text-sm text-gray-400">Total deep focus minutes per day</p>
            </div>
            <div className="px-2 md:px-3 py-1 bg-surface rounded-md text-[10px] md:text-xs font-medium text-gray-300 border border-white/5">
                Past Week
            </div>
          </div>
          
          <div className="w-full overflow-x-auto custom-scrollbar pb-2">
            <div className="h-[200px] sm:h-[250px] md:h-[300px] lg:h-[320px] min-w-[500px] md:min-w-0 w-full mt-2 sm:mt-4 ml-0 md:-ml-4">
              {chartReady && (
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyActivity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}m`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-white) / 0.1)', borderRadius: '8px', color: 'rgb(var(--color-white))' }}
                    itemStyle={{ color: 'rgb(var(--color-primary))', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="studyTime" 
                    name="Study Minutes"
                    stroke="var(--primary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorStudy)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            </div>
          </div>
        </ScrollReveal>

        {/* SIDEBAR WIDGETS */}
        <div className="space-y-6">
          
          {/* AI Insights Card */}
          <ScrollReveal delay={0.4} className="glass flex flex-col p-4 sm:p-6 rounded-2xl border-t-2 border-primary/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-primary text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit size={16}/> Neural Insight
              </h3>
              <Sparkles size={16} className="text-accent animate-pulse" />
            </div>
            <div className="text-base sm:text-lg font-medium text-gray-200 mt-2 min-h-[80px]">
              <TypewriterText text={insight} />
            </div>
            <PremiumButton className="w-full">
              <button 
                onClick={() => navigate('/planner', { state: { fromDashboard: true } })}
                className="w-full bg-surface hover:bg-white/5 border border-white/10 text-white rounded-xl py-3 sm:py-2.5 mt-4 transition-colors font-medium flex items-center justify-center gap-2 text-sm group-hover:border-primary/30 min-h-[44px]"
              >
                 Open Planner <ArrowRight size={14}/>
              </button>
            </PremiumButton>
          </ScrollReveal>

          {/* Weak vs Strong Card */}
          <ScrollReveal delay={0.5} className="glass-next-gen dynamic-lighting p-4 sm:p-6 rounded-2xl">
             <h3 className="text-sm font-bold text-gray-300 mb-5">Subject Performance</h3>
             
             <div className="space-y-5">
               <div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-emerald-400 flex items-center gap-2"><TrendingUp size={14}/> Strongest</span>
                    <span className="text-xs text-gray-500 bg-surface px-2 py-0.5 rounded max-w-[120px] truncate">{topics.strong}</span>
                 </div>
                 <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:'85%'}} transition={{delay: 1, duration: 1.5}} className="bg-emerald-500 h-full rounded-full"></motion.div>
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-red-400 flex items-center gap-2"><TrendingDown size={14}/> Needs Focus</span>
                    <span className="text-xs text-gray-500 bg-surface px-2 py-0.5 rounded max-w-[120px] truncate">{topics.weak}</span>
                 </div>
                 <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:'35%'}} transition={{delay: 1.2, duration: 1.5}} className="bg-red-500 h-full rounded-full"></motion.div>
                 </div>
               </div>
             </div>
          </ScrollReveal>

        </div>
        </div>
      </ParallaxLayer>

    </motion.div>
  );
};

export default Dashboard;
