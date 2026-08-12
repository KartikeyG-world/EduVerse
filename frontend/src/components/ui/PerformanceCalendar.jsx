import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CalendarDays, ChevronLeft, ChevronRight, TrendingUp, Minus, TrendingDown, Clock, Info, CheckCircle2 
} from 'lucide-react';
import api from '../../utils/api';
import { 
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isToday 
} from 'date-fns';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getScoreStyle = (pct) => {
  if (pct >= 80) return { bg: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30', text: 'text-emerald-400', progress: 'bg-emerald-400' };
  if (pct >= 50) return { bg: 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/30',  text: 'text-yellow-400',  progress: 'bg-yellow-400' };
  return { bg: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30', text: 'text-red-400', progress: 'bg-red-400' };
};

const getTrendIcon = (pct) => {
  if (pct >= 80) return <TrendingUp size={14} className="text-emerald-400" />;
  if (pct >= 50) return <Minus size={14} className="text-yellow-400" />;
  return <TrendingDown size={14} className="text-red-400" />;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PerformanceCalendar = ({ skillId, skillTitle, onClose }) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const res = await api.get(`/skills/${skillId}/quiz`);
        // Expected sort: newest first
        setAttempts(res.data);
      } catch (err) {
        console.error('Failed to load quiz history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, [skillId]);

  // ─── Data Aggregation ───────────────────────────────────────────────────────

  // Map of date string 'yyyy-MM-dd' -> array of attempts
  const attemptsByDay = useMemo(() => {
    return attempts.reduce((acc, attempt) => {
      const dayStr = format(parseISO(attempt.date), 'yyyy-MM-dd');
      if (!acc[dayStr]) acc[dayStr] = [];
      acc[dayStr].push(attempt);
      return acc;
    }, {});
  }, [attempts]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayAttempts = attemptsByDay[selectedDateStr] || [];

  // Summary stats for the whole skill
  const overallAvg = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
    : 0;
  const overallBest = attempts.length ? Math.max(...attempts.map(a => a.percentage)) : 0;

  // ─── Calendar Grid Logic ────────────────────────────────────────────────────

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(monthStart);
  const startDate  = startOfWeek(monthStart);
  const endDate    = endOfWeek(monthEnd);

  const daysInGrid = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Handlers
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  // Close handler explicitly stops propagation
  const handleOuterClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleOuterClick}
      className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-surface border border-white/10 rounded-3xl w-full max-w-5xl shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row"
      >
        
        {/* ── Left Pane: Calendar Grid ── */}
        <div className="flex-1 p-6 md:p-8 md:border-r border-white/5 flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/15 rounded-2xl border border-primary/20">
                <CalendarDays size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="text-white font-black text-2xl truncate max-w-[250px] md:max-w-xs">{skillTitle}</h2>
                <p className="text-gray-400 text-sm mt-0.5">Performance Calendar</p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden p-2 text-gray-500 bg-white/5 rounded-xl"><X size={20}/></button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6 px-1">
            <h3 className="text-white font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-xl transition-colors border border-white/5">
                <ChevronLeft size={18} className="text-gray-300" />
              </button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-xl transition-colors border border-white/5">
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-7 mb-3">
              {weekDays.map(day => (
                <div key={day} className="text-center font-bold text-gray-500 text-xs tracking-wider uppercase">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-3">
              {daysInGrid.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = isSameDay(day, selectedDate);
                const dayAttempts = attemptsByDay[dayStr] || [];
                
                let cellClass = "rounded-2xl border flex flex-col items-center justify-center p-2 h-16 transition-all cursor-pointer relative overflow-hidden ";
                let scoreDisplay = null;
                
                if (!isCurrentMonth) {
                  cellClass += "opacity-30 pointer-events-none border-transparent bg-white/3";
                } else if (dayAttempts.length > 0) {
                  const avg = Math.round(dayAttempts.reduce((sum, a) => sum + a.percentage, 0) / dayAttempts.length);
                  const style = getScoreStyle(avg);
                  cellClass += `${style.bg} hover:scale-105 `;
                  if (isSelected) cellClass += "ring-2 ring-white/30 ";
                  
                  scoreDisplay = (
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] font-black tabular-nums mt-1 ${style.text}`}>{avg}%</span>
                      {dayAttempts.length > 1 && (
                        <span className="text-[8px] text-white/50">{dayAttempts.length} atmpts</span>
                      )}
                    </div>
                  );
                } else {
                  cellClass += "bg-white/5 border-white/5 hover:bg-white/10 ";
                  if (isSelected) cellClass += "ring-2 ring-white/10 ";
                }

                return (
                  <motion.div
                    key={dayStr}
                    whileHover="hover"
                    onClick={() => setSelectedDate(day)}
                    className={cellClass}
                  >
                    {isToday(day) && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />}
                    <span className={`text-sm font-bold ${dayAttempts.length > 0 ? 'text-white' : 'text-gray-400'}`}>
                      {format(day, 'd')}
                    </span>
                    {scoreDisplay}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Aggregate Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{attempts.length}</p>
              <p className="text-xs text-gray-500 font-medium">Total Quizzes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{overallAvg}%</p>
              <p className="text-xs text-gray-500 font-medium">Average Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-accent">{overallBest}%</p>
              <p className="text-xs text-gray-500 font-medium">Best Score</p>
            </div>
          </div>
        </div>

        {/* ── Right Pane: Drill-Down Details ── */}
        <div className="w-full md:w-[380px] bg-white/5 flex flex-col relative h-[400px] md:h-auto">
          {/* Close for desktop */}
          <button onClick={onClose} className="hidden md:flex absolute top-6 right-6 p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            <X size={20} />
          </button>

          <div className="p-6 md:p-8 flex-1 flex flex-col overflow-y-auto no-scrollbar">
            <h3 className="text-white font-bold text-xl mb-1">
              {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            
            {selectedDayAttempts.length > 0 ? (
              <p className="text-sm text-primary font-semibold mb-6 flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                {selectedDayAttempts.length} {selectedDayAttempts.length === 1 ? 'Attempt' : 'Attempts'}
              </p>
            ) : (
              <p className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
                <Info size={16} /> No activity on this day.
              </p>
            )}

            <div className="flex-1 flex flex-col gap-3">
              {loading ? (
                 <div className="m-auto opacity-50"><X size={0} className="animate-spin" /></div>
              ) : selectedDayAttempts.length === 0 ? (
                <div className="m-auto text-center opacity-30 mt-12 pb-12">
                  <div className="w-16 h-16 rounded-full border border-white border-dashed mx-auto mb-4 flex items-center justify-center">
                    <CalendarDays size={24} />
                  </div>
                  <p>Daily focus determines<br/>long-term results.</p>
                </div>
              ) : (
                selectedDayAttempts.map((attempt, i) => {
                  const style = getScoreStyle(attempt.percentage);
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={attempt._id}
                      className="bg-black/30 border border-white/5 p-4 rounded-2xl relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-bl-3xl flex items-center justify-center pl-2 pb-2">
                        <span className="text-xs font-black text-gray-500 uppercase">#{selectedDayAttempts.length - i}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                        <Clock size={12} /> {format(parseISO(attempt.date), 'h:mm a')}
                      </div>

                      <div className="flex items-end justify-between mb-4">
                        <div className="text-sm font-semibold text-white">
                          <span className={style.text}>{attempt.score}</span> / {attempt.totalQuestions} Correct
                        </div>
                        <div className="flex items-center gap-1.5">
                          {getTrendIcon(attempt.percentage)}
                          <span className={`text-2xl font-black leading-none ${style.text}`}>{attempt.percentage}%</span>
                        </div>
                      </div>

                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${style.progress}`} style={{ width: `${attempt.percentage}%` }} />
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};

export default PerformanceCalendar;
