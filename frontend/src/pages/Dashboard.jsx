import React, { useState, useEffect, useContext } from 'react';
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
  BrainCircuit, ArrowRight, RefreshCw, Zap
} from 'lucide-react';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import PremiumButton from '../components/ui/PremiumButton';
import ParallaxLayer from '../components/ui/ParallaxLayer';

// Animated Counter Component replacing previous custom hook to obey rules
const AnimatedCounter = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Fallback for decimals
        if(end % 1 !== 0) setCount(end);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <>{end % 1 !== 0 ? count.toFixed(1) : count}</>;
};

// Animated Typewriter component for AI insights
const TypewriterText = ({ text }) => {
  const [displayed, setDisplayed] = useState('');
  
  useEffect(() => {
    let i = 0;
    setDisplayed('');
    if (!text) return;
    
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(interval);
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
  const [refreshing, setRefreshing] = useState(false);
  const { triggerFeedback } = useContext(CompanionContext);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/dashboard');
      setData(res.data);
      updateUser({ streak: res.data.stats.streak }); // Sync sidebar
      triggerFeedback({ 
        type: COMPANION_EVENTS.DASHBOARD_LOAD, 
        data: { name: user?.name } 
      });
    } catch (err) {
      console.error('Failed to load dashboard data', err);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
             Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
          </h2>
          <p className="text-gray-400 mt-1 flex items-center gap-2">
             You are tracking <strong className="text-white">live analytics</strong> for your session.
          </p>
        </div>
        <PremiumButton>
          <button 
            onClick={fetchDashboard}
            disabled={refreshing}
            className="flex items-center gap-2 bg-surface hover:bg-white/5 border border-white/10 px-4 py-2 rounded-xl transition-all text-sm font-medium"
          >
            <RefreshCw size={16} className={`${refreshing ? 'animate-spin text-primary' : 'text-gray-400'}`} /> 
            Refresh Data
          </button>
        </PremiumButton>
      </div>

      {/* Top Stats Grid */}
      <ParallaxLayer depth={0.03}>
        <ScrollRevealGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Streak Card */}
        <div className="glass-next-gen dynamic-lighting flex flex-col justify-between group hover:border-orange-500/30 transition-colors relative overflow-hidden rounded-2xl p-6">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-400 text-sm font-medium">Active Streak</h3>
              <div className="mt-2 text-4xl font-black text-white flex items-end gap-2">
                <AnimatedCounter end={stats.streak} duration={1500} /> <span className="text-lg font-medium text-gray-500 mb-1">days</span>
              </div>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl">
               <Flame size={24} className="text-orange-500 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
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
          <p className="text-xs text-orange-400/80 mt-3 flex items-center gap-1"><Zap size={14}/> Maintaining daily momentum</p>
        </div>

        {/* Level Card */}
        <div className="glass-next-gen dynamic-lighting flex flex-col justify-between group hover:border-primary/30 transition-colors relative overflow-hidden rounded-2xl p-6">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-400 text-sm font-medium">Rank Progress</h3>
              <div className="flex items-end gap-3 mt-2">
                <span className="text-4xl font-black neon-text">Lv. <AnimatedCounter end={stats.level} duration={1000} /></span>
              </div>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
               <Target size={24} className="text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
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
          <div className="flex justify-between items-center text-xs mt-3">
             <span className="text-primary font-medium">{getLevelTitle(stats.level)}</span>
             <span className="text-gray-500">{1000 - currentLevelXP} XP to go</span>
          </div>
        </div>

        {/* Focus Hours Card */}
        <div className="glass-next-gen dynamic-lighting flex flex-col justify-between group hover:border-blue-500/30 transition-colors relative overflow-hidden rounded-2xl p-6">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-400 text-sm font-medium">Deep Work Time</h3>
              <div className="mt-2 text-4xl font-black text-white flex items-end gap-2">
                <AnimatedCounter end={stats.focusHours} duration={2000} /> <span className="text-lg font-medium text-gray-500 mb-1">hrs</span>
              </div>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
               <Clock size={24} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
             <Activity size={16} className="text-emerald-400" /> Lifetime focus metrics
          </div>
        </div>
      </ScrollRevealGroup>
      </ParallaxLayer>

      {/* Main Content Area */}
      <ParallaxLayer depth={0.06}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BIG CHART AREA */}
        <ScrollReveal delay={0.3} className="lg:col-span-2 glass-next-gen dynamic-lighting p-6 flex flex-col min-h-[400px] rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Activity size={18} className="text-primary"/> 7-Day Activity Pipeline
              </h3>
              <p className="text-sm text-gray-400">Total deep focus minutes per day</p>
            </div>
            <div className="px-3 py-1 bg-surface rounded-md text-xs font-medium text-gray-300 border border-white/5">
                Past Week
            </div>
          </div>
          
          <div className="w-full h-[300px] md:h-[350px] lg:h-[400px] mt-4 -ml-4">
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
                  contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
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
          </div>
        </ScrollReveal>

        {/* SIDEBAR WIDGETS */}
        <div className="space-y-6">
          
          {/* AI Insights Card */}
          <ScrollReveal delay={0.4} className="glass flex flex-col p-6 rounded-2xl border-t-2 border-primary/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-primary text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit size={16}/> Neural Insight
              </h3>
              <Sparkles size={16} className="text-accent animate-pulse" />
            </div>
            <div className="text-lg font-medium text-gray-200 mt-2 min-h-[80px]">
              <TypewriterText text={insight} />
            </div>
            <PremiumButton className="w-full">
              <button 
                onClick={() => navigate('/planner', { state: { fromDashboard: true } })}
                className="w-full bg-surface hover:bg-white/5 border border-white/10 text-white rounded-xl py-2.5 mt-4 transition-colors font-medium flex items-center justify-center gap-2 text-sm group-hover:border-primary/30"
              >
                 Open Planner <ArrowRight size={14}/>
              </button>
            </PremiumButton>
          </ScrollReveal>

          {/* Weak vs Strong Card */}
          <ScrollReveal delay={0.5} className="glass-next-gen dynamic-lighting p-6 rounded-2xl">
             <h3 className="text-sm font-bold text-gray-300 mb-5">Subject Performance</h3>
             
             <div className="space-y-5">
               <div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-emerald-400 flex items-center gap-2"><TrendingUp size={14}/> Strongest</span>
                    <span className="text-xs text-gray-500 bg-surface px-2 py-0.5 rounded">{topics.strong}</span>
                 </div>
                 <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:'85%'}} transition={{delay: 1, duration: 1.5}} className="bg-emerald-500 h-full rounded-full"></motion.div>
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-red-400 flex items-center gap-2"><TrendingDown size={14}/> Needs Focus</span>
                    <span className="text-xs text-gray-500 bg-surface px-2 py-0.5 rounded">{topics.weak}</span>
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
