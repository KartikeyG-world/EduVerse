import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Award, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import ParallaxLayer from '../components/ui/ParallaxLayer';

const Analytics = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, focusHours: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/users/me');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    };
    fetchStats();
  }, []);

  // Mock data for the chart to represent XP gained over the last 7 days
  // In a real app, this would be computed from a TimeSeries DB or a separate Activity model
  const getActivityData = () => {
    const data = [];
    const baseXP = Math.max(0, stats.xp - 500); // simulate climbing up to current XP
    
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        xp: baseXP + (50 * (7-i)) + Math.floor(Math.random() * 50)
      });
    }
    // Ensure last data point roughly matches current XP if it's high enough, else just show the curve
    if (data.length > 0) {
      data[data.length - 1].xp = stats.xp;
    }
    return data;
  };

  const activityData = getActivityData();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 glass rounded-xl text-primary">
          <BarChart3 size={24} />
        </div>
        <div>
<<<<<<< HEAD
          <h2 className="text-3xl font-bold">Analytics & Progress</h2>
          <p className="text-gray-400 mt-1">Track your learning journey and view detailed insights.</p>
=======
          <h2 className="text-2xl sm:text-3xl font-bold">Analytics & Progress</h2>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Track your learning journey and view detailed insights.</p>
>>>>>>> phase2Code
        </div>
      </div>

      <ParallaxLayer depth={0.02}>
<<<<<<< HEAD
        <ScrollRevealGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-next-gen dynamic-lighting flex items-center gap-4 p-6 rounded-2xl">
          <div className="p-4 rounded-full bg-primary/20 text-primary"><Award size={28}/></div>
          <div>
            <p className="text-sm text-gray-400">Total XP</p>
            <p className="text-2xl font-bold">{stats.xp}</p>
          </div>
        </div>
        
        <div className="glass-next-gen dynamic-lighting flex items-center gap-4 p-6 rounded-2xl">
          <div className="p-4 rounded-full bg-accent/20 text-accent"><Zap size={28}/></div>
          <div>
            <p className="text-sm text-gray-400">Current Streak</p>
            <p className="text-2xl font-bold">{stats.streak} Days</p>
          </div>
        </div>

        <div className="glass-next-gen dynamic-lighting flex items-center gap-4 p-6 rounded-2xl">
          <div className="p-4 rounded-full bg-secondary/20 text-secondary"><BarChart3 size={28}/></div>
          <div>
            <p className="text-sm text-gray-400">Current Level</p>
            <p className="text-2xl font-bold">{stats.level}</p>
          </div>
        </div>

          <div className="glass-next-gen dynamic-lighting flex items-center gap-4 p-6 rounded-2xl">
            <div className="p-4 rounded-full bg-blue-500/20 text-blue-500"><TrendingUp size={28}/></div>
            <div>
              <p className="text-sm text-gray-400">Focus Hours</p>
              <p className="text-2xl font-bold">{stats.focusHours?.toFixed(1) || 0}h</p>
=======
        <ScrollRevealGroup stagger={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass-next-gen dynamic-lighting flex items-center gap-4 p-4 sm:p-6 rounded-2xl">
          <div className="p-3 sm:p-4 rounded-full bg-primary/20 text-primary"><Award className="w-6 h-6 sm:w-7 sm:h-7" /></div>
          <div>
            <p className="text-xs sm:text-sm text-gray-400">Total XP</p>
            <p className="text-xl sm:text-2xl font-bold">{stats.xp}</p>
          </div>
        </div>
        
        <div className="glass-next-gen dynamic-lighting flex items-center gap-4 p-4 sm:p-6 rounded-2xl">
          <div className="p-3 sm:p-4 rounded-full bg-accent/20 text-accent"><Zap className="w-6 h-6 sm:w-7 sm:h-7" /></div>
          <div>
            <p className="text-xs sm:text-sm text-gray-400">Current Streak</p>
            <p className="text-xl sm:text-2xl font-bold">{stats.streak} Days</p>
          </div>
        </div>

        <div className="glass-next-gen dynamic-lighting flex items-center gap-4 p-4 sm:p-6 rounded-2xl">
          <div className="p-3 sm:p-4 rounded-full bg-secondary/20 text-secondary"><BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" /></div>
          <div>
            <p className="text-xs sm:text-sm text-gray-400">Current Level</p>
            <p className="text-xl sm:text-2xl font-bold">{stats.level}</p>
          </div>
        </div>

          <div className="glass-next-gen dynamic-lighting flex items-center gap-4 p-4 sm:p-6 rounded-2xl">
            <div className="p-3 sm:p-4 rounded-full bg-blue-500/20 text-blue-500"><TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" /></div>
            <div>
              <p className="text-xs sm:text-sm text-gray-400">Focus Hours</p>
              <p className="text-xl sm:text-2xl font-bold">{stats.focusHours?.toFixed(1) || 0}h</p>
>>>>>>> phase2Code
            </div>
          </div>
        </ScrollRevealGroup>
      </ParallaxLayer>

      <ParallaxLayer depth={0.05}>
        <ScrollReveal 
          delay={0.4}
<<<<<<< HEAD
          className="glass-next-gen dynamic-lighting mt-6 p-6 rounded-2xl"
        >
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">XP Progression (Last 7 Days)</h3>
        <div className="w-full min-h-[400px]">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
=======
          className="glass-next-gen dynamic-lighting mt-6 p-4 sm:p-6 rounded-2xl"
        >
          <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">XP Progression (Last 7 Days)</h3>
        <div className="w-full h-[250px] sm:h-[300px] md:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
>>>>>>> phase2Code
              <defs>
                <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
<<<<<<< HEAD
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
=======
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
>>>>>>> phase2Code
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="xp" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorXp)" animationDuration={2000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        </ScrollReveal>
      </ParallaxLayer>
    </div>
  );
};

export default Analytics;
