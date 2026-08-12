import React, { useContext, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Clock, FileText, Code,
  BarChart3, MessageSquare, CreditCard, GraduationCap,
  LogOut, User, Flame, X, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';

const NAV_LINKS = [
  { name: 'Dashboard',      path: '/',        icon: <LayoutDashboard size={18} /> },
  { name: 'Study Planner',  path: '/planner', icon: <BookOpen size={18} /> },
  { name: 'Focus Mode',     path: '/focus',   icon: <Clock size={18} /> },
  { name: 'Smart Notes',    path: '/notes',   icon: <FileText size={18} /> },
  // Phase 2: SRS
  { name: 'Flashcards',     path: '/flashcards/study', icon: <Layers size={18} /> },
  { name: 'Skills Hub',     path: '/skills',  icon: <Code size={18} /> },
  { name: 'Tutor Network',  path: '/tutor',   icon: <GraduationCap size={18} /> },
  { name: 'Analytics',      path: '/analytics', icon: <BarChart3 size={18} /> },
  { name: 'Expense Tracker',path: '/expenses', icon: <CreditCard size={18} /> },
  { name: 'AI Chatbot',     path: '/chat',    icon: <MessageSquare size={18} /> },
  { name: 'Profile',        path: '/profile', icon: <User size={18} /> },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, isGuest, logout, setShowAuthModal } = useContext(AuthContext);

  // Auto close sidebar on desktop breakpoint to reset state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isOpen) {
        onClose();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, onClose]);

  const sidebarContent = (
    <motion.div
      initial={{ x: -256, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -256, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-64 flex-shrink-0 h-full border-r border-white/[0.06] flex flex-col pt-6 z-50 fixed lg:static top-0 left-0 bottom-0 bg-background/90 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="px-6 mb-8 flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-xl md:text-2xl font-black neon-text tracking-wider"
          >
            EduVerse AI
          </motion.h1>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 tracking-widest uppercase font-semibold">
            Premium Learning
          </p>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose} 
          className="lg:hidden p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {NAV_LINKS.map((link, i) => (
          <motion.div
            key={link.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <NavLink
              to={link.path}
              end={link.path === '/'}
              onClick={onClose} // Auto-close on mobile
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden group text-sm font-bold ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 active:text-white active:bg-white/[0.04] md:hover:text-white md:hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-gradient-to-r from-primary/25 to-accent/10 border border-primary/25 rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    />
                  )}

                  {/* Hover shimmer */}
                  <span className="absolute inset-0 opacity-0 active:opacity-100 md:group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/[0.03] to-transparent rounded-xl pointer-events-none" />

                  {/* Icon */}
                  <span className={`relative z-10 transition-transform duration-200 group-active:-translate-y-0.5 md:group-hover:-translate-y-0.5 ${isActive ? 'text-primary' : ''}`}>
                    {link.icon}
                  </span>

                  {/* Label */}
                  <span className="relative z-10 truncate">{link.name}</span>

                  {/* Active right indicator */}
                  {isActive && (
                    <motion.span
                      layoutId="active-nav-dot"
                      className="ml-auto relative z-10 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"
                    />
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Theme Engine */}
      <div className="px-4 mt-2">
        <ThemeSwitcher />
      </div>

      {/* Bottom user card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-4 mt-auto border-t border-white/[0.05]"
      >
        {isGuest ? (
          <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.07] text-center">
            <User size={28} className="mx-auto mb-2 text-gray-500" />
            <p className="text-sm font-bold text-white mb-3">Exploring as Guest</p>
            <div className="grid grid-cols-1 gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onClose();
                  setShowAuthModal(true);
                }}
                className="w-full text-xs font-bold btn-primary py-3 lg:py-2 min-h-[44px]"
              >
                Create Account
              </motion.button>
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/login';
                }}
                className="w-full text-xs font-bold text-gray-400 hover:text-white transition-colors py-2"
              >
                Sign In to Existing
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.07] relative group overflow-hidden">
            {/* Subtle hover glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <p className="text-xs text-gray-500 mb-0.5 truncate">Signed in as</p>
            <NavLink to="/profile" onClick={onClose} className="block group/link">
              <p className="text-sm font-bold text-white truncate mb-3 group-hover/link:text-primary transition-colors" title={user?.name}>
                {user?.name?.split(' ')[0] || 'Student'}
              </p>
            </NavLink>

            <div className="flex items-center justify-between">
              {/* Streak */}
              <div className="flex items-center gap-1.5 text-orange-400">
                <Flame size={14} className="flex-shrink-0" />
                <span className="text-sm font-bold">{user?.streak || 0}</span>
                <span className="text-xs text-gray-500 truncate">streak</span>
              </div>

              {/* Logout */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="text-red-400 hover:text-red-300 p-2 lg:p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center min-h-[36px] min-w-[36px] lg:min-h-0 lg:min-w-0"
                title="Logout"
              >
                <LogOut size={15} />
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Render sidebar always on desktop (lg:), and conditionally on mobile */}
      <div className="hidden lg:block lg:fixed lg:top-0 lg:left-0 lg:bottom-0 lg:z-20">
        {sidebarContent}
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden">
            {sidebarContent}
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
