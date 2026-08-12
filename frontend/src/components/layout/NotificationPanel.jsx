import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock, X, Info, Zap, Target, LogIn } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationPanel = ({ notifications, onClose, onMarkRead }) => {
  
  const getIcon = (type) => {
    switch (type) {
      case 'LOGIN': return <LogIn size={14} className="text-blue-400" />;
      case 'FOCUS': return <Target size={14} className="text-primary" />;
      case 'XP': return <Zap size={14} className="text-accent" />;
      case 'SYSTEM': return <Info size={14} className="text-gray-400" />;
      default: return <Bell size={14} className="text-gray-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute right-0 mt-3 w-80 md:w-96 bg-surface border border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-surface/30">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-primary" />
          <h3 className="font-bold text-white tracking-wide">Notifications</h3>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onMarkRead}
            className="text-xs font-semibold text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <Check size={14} /> Clear All
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto no-scrollbar py-2">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <div className="w-16 h-16 bg-surface/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Bell size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm font-medium">All caught up! No alerts found.</p>
            </motion.div>
          ) : (
            notifications.map((notif, idx) => (
              <motion.div
                key={notif._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors relative group ${!notif.read ? 'bg-primary/5' : ''}`}
              >
                {!notif.read && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                )}
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${!notif.read ? 'bg-primary/10 border-primary/20' : 'bg-surface border-white/5'}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${!notif.read ? 'text-white font-semibold' : 'text-gray-400'}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3 bg-surface/10 text-center border-t border-white/5">
        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">System Authenticated Insights</p>
      </div>
    </motion.div>
  );
};

export default NotificationPanel;
