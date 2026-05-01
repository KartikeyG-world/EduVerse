import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Clock, FileText, Code,
  BarChart3, MessageSquare, CreditCard, GraduationCap,
  LogOut, User, Flame, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../context/AuthContext';

const NAV_LINKS = [
  { name: 'Dashboard',      path: '/',        icon: <LayoutDashboard size={18} /> },
  { name: 'Study Planner',  path: '/planner', icon: <BookOpen size={18} /> },
  { name: 'Focus Mode',     path: '/focus',   icon: <Clock size={18} /> },
  { name: 'Smart Notes',    path: '/notes',   icon: <FileText size={18} /> },
  { name: 'Skills Hub',     path: '/skills',  icon: <Code size={18} /> },
  { name: 'Tutor Network',  path: '/tutor',   icon: <GraduationCap size={18} /> },
  { name: 'Analytics',      path: '/analytics', icon: <BarChart3 size={18} /> },
  { name: 'Expense Tracker',path: '/expenses', icon: <CreditCard size={18} /> },
  { name: 'AI Chatbot',     path: '/chat',    icon: <MessageSquare size={18} /> },
];

const Sidebar = () => {
  const { user, isGuest, logout, setShowAuthModal } = useContext(AuthContext);

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-64 flex-shrink-0 h-full border-r border-white/[0.06] flex flex-col pt-6 z-20 relative"
      style={{ background: 'rgba(6,10,26,0.85)', backdropFilter: 'blur(20px)' }}
    >
      {/* Logo */}
      <div className="px-6 mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-black neon-text tracking-wider"
        >
          EduVerse AI
        </motion.h1>
        <p className="text-xs text-gray-500 mt-1 tracking-widest uppercase font-semibold">
          Premium Learning
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
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
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden group text-sm font-medium ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
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
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/[0.03] to-transparent rounded-xl pointer-events-none" />

                  {/* Icon */}
                  <span className={`relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5 ${isActive ? 'text-primary' : ''}`}>
                    {link.icon}
                  </span>

                  {/* Label */}
                  <span className="relative z-10">{link.name}</span>

                  {/* Active right indicator */}
                  {isActive && (
                    <motion.span
                      layoutId="active-nav-dot"
                      className="ml-auto relative z-10 w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

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
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAuthModal(true)}
              className="w-full text-xs font-bold btn-primary py-2"
            >
              Create Account
            </motion.button>
          </div>
        ) : (
          <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.07] relative group">
            {/* Subtle hover glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <p className="text-xs text-gray-500 mb-0.5 truncate">Signed in as</p>
            <p className="text-sm font-bold text-white truncate mb-3">
              {user?.name?.split(' ')[0] || 'Student'}
            </p>

            <div className="flex items-center justify-between">
              {/* Streak */}
              <div className="flex items-center gap-1.5 text-orange-400">
                <Flame size={14} />
                <span className="text-sm font-bold">{user?.streak || 0}</span>
                <span className="text-xs text-gray-500">day streak</span>
              </div>

              {/* Logout */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                onClick={logout}
                className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
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
};

export default Sidebar;
