import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Award, AlertCircle, Calendar, ArrowUpRight } from 'lucide-react';

const MasteryOverview = ({ stats }) => {
  const navigate = useNavigate();
  if (!stats) return null;

  const cards = [
    {
      title: 'Mastery Score',
      value: `${stats.averageMastery}%`,
      icon: <Brain className="text-primary" size={20} />,
      label: 'Overall Progress',
      color: 'primary',
      path: '/analytics',
      hint: 'View Analytics'
    },
    {
      title: 'Mastered',
      value: stats.masteredCount,
      icon: <Award className="text-emerald-400" size={20} />,
      label: 'Topics ≥ 80%',
      color: 'emerald',
      path: '/analytics',
      hint: 'View Mastered'
    },
    {
      title: 'Weak Areas',
      value: stats.weakCount,
      icon: <AlertCircle className="text-red-400" size={20} />,
      label: 'Needs Attention',
      color: 'red',
      path: '/analytics',
      hint: 'Focus Areas'
    },
    {
      title: 'Revision Due',
      value: stats.revisionDueCount,
      icon: <Calendar className="text-amber-400" size={20} />,
      label: 'Topics to Review',
      color: 'amber',
      path: '/flashcards/study',
      hint: 'Start Review'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => navigate(card.path)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(card.path); }}
          className="glass-next-gen p-4 rounded-2xl flex flex-col justify-between border border-white/5 hover:border-primary/30 hover:bg-white/[0.03] transition-all cursor-pointer group select-none"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-300 transition-colors">{card.title}</span>
            <div className={`p-1.5 rounded-lg bg-${card.color}-500/10 flex items-center gap-1`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-2xl font-black text-white group-hover:text-primary transition-colors">{card.value}</div>
              <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                 {card.label}
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-primary mb-1">
              {card.hint} <ArrowUpRight size={12} />
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default MasteryOverview;
