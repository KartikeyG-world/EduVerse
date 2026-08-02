import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Award, AlertCircle, Calendar, TrendingUp } from 'lucide-react';

const MasteryOverview = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Mastery Score',
      value: `${stats.averageMastery}%`,
      icon: <Brain className="text-primary" size={20} />,
      label: 'Overall Progress',
      color: 'primary'
    },
    {
      title: 'Mastered',
      value: stats.masteredCount,
      icon: <Award className="text-emerald-400" size={20} />,
      label: 'Topics ≥ 80%',
      color: 'emerald'
    },
    {
      title: 'Weak Areas',
      value: stats.weakCount,
      icon: <AlertCircle className="text-red-400" size={20} />,
      label: 'Needs Attention',
      color: 'red'
    },
    {
      title: 'Revision Due',
      value: stats.revisionDueCount,
      icon: <Calendar className="text-amber-400" size={20} />,
      label: 'Topics to Review',
      color: 'amber'
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
          className="glass-next-gen p-4 rounded-2xl flex flex-col justify-between border border-white/5 hover:border-white/10 transition-colors"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{card.title}</span>
            <div className={`p-1.5 rounded-lg bg-${card.color}-500/10`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{card.value}</div>
            <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
               {card.label}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default MasteryOverview;
