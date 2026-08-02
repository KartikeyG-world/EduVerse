import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Award, Zap, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import ScrollReveal, { ScrollRevealGroup } from '../components/ui/ScrollReveal';
import ParallaxLayer from '../components/ui/ParallaxLayer';

const Analytics = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, focusHours: 0 });
  const [masteryStats, setMasteryStats] = useState({ weak: [], mastered: [] });
  const [activityData, setActivityData] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return; // guests see zero-state, no API call
    const fetchStats = async () => {
      try {
        const [statsRes, historyRes, weakRes, masteredRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/focus/history'),
          api.get('/mastery/weak'),
          api.get('/mastery/all')
        ]);
        
        setStats(statsRes.data);
        setMasteryStats({
          weak: weakRes.data,
          mastered: masteredRes.data.filter(t => t.masteryScore >= 80)
        });
        
        // Process real history data for the chart
        if (historyRes.data.success) {
          const sessions = historyRes.data.sessions;
          const chartData = [];
          
          for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            
            // Sum XP for this day
            const dayXP = sessions.filter(s => {
              const sessionDate = new Date(s.startTime);
              return sessionDate.toDateString() === d.toDateString();
            }).reduce((sum, s) => sum + (s.xpEarned || 0), 0);

            chartData.push({
              name: dayName,
              xp: dayXP
            });
          }
          setActivityData(chartData);
        }
      } catch (err) {
        if (err.response?.status !== 401) {
          console.error('Failed to load stats', err);
        }
      }
    };
    fetchStats();
  }, [isAuthenticated]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 glass rounded-xl text-primary">
          <BarChart3 size={24} />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Analytics & Progress</h2>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Track your learning journey and view detailed insights.</p>
        </div>
      </div>

      <ParallaxLayer depth={0.02}>
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
            </div>
          </div>
        </ScrollRevealGroup>
      </ParallaxLayer>

      <ParallaxLayer depth={0.05}>
        <ScrollReveal 
          delay={0.4}
          className="glass-next-gen dynamic-lighting mt-6 p-4 sm:p-6 rounded-2xl"
        >
          <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-2">XP Progression (Last 7 Days)</h3>
        <div className="w-full h-[250px] sm:h-[300px] md:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScrollReveal delay={0.5} className="glass-next-gen p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" /> Mastered Topics
          </h3>
          <div className="space-y-4">
            {masteryStats.mastered.length > 0 ? masteryStats.mastered.map((t, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm text-gray-200">{t.topicName}</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
                  {t.masteryScore}%
                </span>
              </div>
            )) : (
              <p className="text-gray-500 text-sm text-center py-4">No topics mastered yet. Keep going!</p>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.6} className="glass-next-gen p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400" /> Weak Areas
          </h3>
          <div className="space-y-4">
            {masteryStats.weak.length > 0 ? masteryStats.weak.map((t, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm text-gray-200">{t.topicName}</span>
                <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-lg">
                  {t.masteryScore}%
                </span>
              </div>
            )) : (
              <p className="text-gray-500 text-sm text-center py-4">Great job! No weak areas identified.</p>
            )}
          </div>
        </ScrollReveal>
      </div>

    </div>
  );
};

export default Analytics;
