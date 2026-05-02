import React from 'react';
import { motion } from 'framer-motion';
import {
  Code, Server, AppWindow, Database, Cpu, Smartphone, Settings,
  Trash2, Play, CheckCircle, Clock, CalendarDays, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const getIcon = (category) => {
  switch (category) {
    case 'Web Dev':        return <AppWindow size={20} />;
    case 'Data Structures': return <Cpu size={20} />;
    case 'AI & ML':        return <Code size={20} />;
    case 'Databases':      return <Database size={20} />;
    case 'DevOps':         return <Server size={20} />;
    case 'Mobile Dev':     return <Smartphone size={20} />;
    default:               return <Settings size={20} />;
  }
};

const getCategoryColor = (category) => {
  switch (category) {
    case 'Web Dev':        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'Data Structures': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    case 'AI & ML':        return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
    case 'Databases':      return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    case 'DevOps':         return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
    case 'Mobile Dev':     return 'text-green-400 bg-green-400/10 border-green-400/20';
    default:               return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const DIFFICULTY_STYLES = {
  beginner:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/15  text-amber-300  border-amber-500/20',
  advanced:     'bg-red-500/15     text-red-400    border-red-500/20',
};

const SkillCard = ({ skill, index, onDelete, onOpenCalendar }) => {
  const navigate = useNavigate();
<<<<<<< HEAD
  const { _id, title, category, progress, completed, watchedDuration, totalDuration, type, videos, completedVideos, difficulty, source, channelName } = skill;
=======
  const { _id, title, category, progress, completed, watchedDuration, totalDuration, type, videos, completedVideos, difficulty, source, channelName, thumbnailUrl } = skill;
>>>>>>> phase2Code

  const progressColor = completed
    ? 'from-yellow-400 to-amber-500'
    : progress >= 70
    ? 'from-accent to-emerald-400'
    : progress >= 30
    ? 'from-primary to-blue-400'
    : 'from-gray-500 to-gray-400';

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Remove "${title}" from your skill tracker?`)) return;
    try {
      await api.delete(`/skills/${_id}`);
      onDelete(_id);
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const handleContinue = () => {
    if (!completed) navigate(`/skills/${_id}/learn`);
  };

  return (
    <div
<<<<<<< HEAD
      className={`glass-card-hover flex flex-col justify-between group relative overflow-hidden cursor-default
=======
      className={`glass-card-hover flex flex-col justify-between group relative overflow-hidden cursor-default p-4 md:p-5
>>>>>>> phase2Code
        ${completed ? 'hover:border-yellow-400/40 hover:shadow-yellow-400/10' : ''}`}
    >
      {/* Completion glow overlay */}
      {completed && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-amber-500/5 pointer-events-none rounded-2xl" />
      )}

      {/* Delete button */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDelete}
          className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
          title="Remove skill"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div>
<<<<<<< HEAD
=======
        {/* Thumbnail (if available) */}
        {thumbnailUrl && (
          <img 
            src={thumbnailUrl} 
            alt={title} 
            className="aspect-video w-full object-cover rounded-xl mb-4 border border-white/5 shadow-md"
          />
        )}

>>>>>>> phase2Code
        {/* Header row */}
        <div className="flex justify-between items-start mb-4 pr-8">
          <div className={`p-2.5 rounded-xl border ${getCategoryColor(category)} transition-all group-hover:scale-110`}>
            {getIcon(category)}
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${getCategoryColor(category)}`}>
            {category}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white leading-snug mb-0.5 group-hover:text-primary transition-colors pr-2">
          {title}
        </h3>

        {/* Channel & difficulty meta (search-sourced skills) */}
        {(channelName || difficulty) && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {source === 'search' && <Sparkles size={10} className="text-primary flex-shrink-0" />}
            {channelName && (
              <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{channelName}</span>
            )}
            {difficulty && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.beginner}`}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
            )}
          </div>
        )}

        {/* Duration info */}
        {type === 'playlist' ? (
          <div className="flex flex-col gap-1.5 mb-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 border border-accent/20 w-fit px-2 py-0.5 rounded-lg">
              <Play size={10} className="fill-accent" /> Playlist Course
            </div>
            <p className="text-[11px] text-gray-400 font-medium">
              {videos?.length || 0} Lessons • {completedVideos?.length || 0} Complete
            </p>
          </div>
        ) : totalDuration > 0 ? (
          <p className="text-[11px] text-gray-500 flex items-center gap-1 mb-4">
            <Clock size={11} />
            {watchedDuration > 0
              ? `${formatDuration(watchedDuration)} of ${formatDuration(totalDuration)} watched`
              : `${formatDuration(totalDuration)} total`
            }
          </p>
        ) : null}

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2 text-xs">
            <span className="text-gray-400 font-medium">
              {completed ? '🏆 Mastered' : 'Progress'}
            </span>
            <span className={`font-bold tabular-nums ${completed ? 'text-yellow-400' : 'text-accent'}`}>
              {Math.round(progress)}%
            </span>
          </div>

          {/* Bar track */}
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${progressColor} shadow-sm`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.06 + 0.2 }}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex gap-2">
        {completed ? (
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            <CheckCircle size={16} />
            Completed
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleContinue}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-primary/15 hover:bg-primary/25 text-white border border-primary/20 hover:border-primary/50 transition-all"
          >
            <Play size={14} className="fill-white" />
            {progress > 0 ? 'Continue Learning' : 'Start Learning'}
          </motion.button>
        )}

        {/* Calendar button — always visible */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); onOpenCalendar(_id, title); }}
          className="w-10 flex items-center justify-center bg-white/5 hover:bg-primary/15 rounded-xl border border-white/8 hover:border-primary/30 transition-all"
          title="Quiz history"
        >
          <CalendarDays size={15} className="text-gray-400 group-hover:text-primary" />
        </motion.button>
      </div>
    </div>
  );
};

export default SkillCard;
