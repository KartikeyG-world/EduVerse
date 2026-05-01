import React, { useContext, useState, useEffect } from 'react';
import { Search, Bell, User, Clock, CheckCircle2, Zap } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../utils/api';
import NotificationPanel from './NotificationPanel';

const Topbar = () => {
  const { user, isGuest, setShowAuthModal } = useContext(AuthContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications hook
  useEffect(() => {
    if (!isGuest && user) {
        fetchNotifications();
        // Dynamic Interval Refresh (Auto-sync)
        const interval = setInterval(fetchNotifications, 60000); 
        return () => clearInterval(interval);
    }
  }, [isGuest, user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.read).length);
    } catch (err) {
      console.error('Failed to load alerts natively', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read');
      // Update local state for instant UI reflects
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark as read failed', err);
    }
  };

  const toggleNotifications = () => {
      setShowNotifications(!showNotifications);
      if (!showNotifications && unreadCount > 0) {
          // If closing or just opened with unread items, you can trigger read logic
          // markAllAsRead(); 
      }
  };

  return (
    <header className="h-20 glass border-b border-white/10 flex items-center justify-between px-8 z-[200] sticky top-0 backdrop-blur-3xl shadow-lg">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-500 group-hover:text-primary transition-colors" size={18} />
          </div>
          <input
            type="text"
            placeholder="Search notes, subjects or ask AI..."
            className="w-full bg-surface/30 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/30 focus:bg-surface/50 transition-all font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-4 relative">
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={toggleNotifications}
            className={`p-2.5 transition-all rounded-xl border ${showNotifications ? 'bg-primary/20 border-primary/40 text-white' : 'text-gray-400 border-white/5 hover:bg-white/5 hover:text-white'}`}
          >
            <Bell size={20} className={unreadCount > 0 ? 'animate-bounce-subtle' : ''}/>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary rounded-full border-2 border-[#0b1120] text-[10px] font-black text-white flex items-center justify-center px-1 shadow-[0_0_10px_rgba(var(--primary),0.5)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <NotificationPanel 
                notifications={notifications} 
                onClose={() => setShowNotifications(false)}
                onMarkRead={markAllAsRead}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-white/5 mx-2"></div>

        {/* Profile Identity Widget */}
        <button 
           onClick={() => { if (isGuest) setShowAuthModal(true); }}
           className={`flex items-center gap-3 p-1 pr-4 rounded-2xl transition-all border group ${isGuest ? 'cursor-pointer hover:bg-white/5 border-white/5 hover:border-white/10' : 'cursor-default border-white/5 bg-white/[0.02]'}`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-95 ${isGuest ? 'bg-surface/80 border border-white/10' : 'bg-gradient-to-tr from-primary to-accent relative overflow-hidden'}`}>
             {!isGuest && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
             <User size={18} className={isGuest ? 'text-gray-400' : 'text-white relative z-10'} />
          </div>
          <div className="hidden md:flex flex-col items-start min-w-[100px]">
              <span className={`text-xs font-black uppercase tracking-widest ${isGuest ? 'text-gray-500' : 'text-primary'}`}>
                {isGuest ? 'Guest Access' : 'Verified Profile'}
              </span>
              <span className={`text-sm font-bold truncate ${isGuest ? 'text-gray-500' : 'text-white'}`}>
                  {isGuest ? 'Join Network' : user?.name?.split(' ')[0] || 'Student'}
              </span>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
