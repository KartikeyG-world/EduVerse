import React, { useContext, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CompanionOrb from '../ui/CompanionOrb';
import CursorGlow from '../ui/CursorGlow';
import ParticleBackground from '../ui/ParticleBackground';

const pageVariants = {
  initial: { opacity: 0, scale: 0.96, y: 20, filter: 'blur(10px)' },
  animate: {
    opacity: 1, scale: 1, y: 0, filter: 'blur(0px)',
    transition: { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1
    },
  },
  exit: {
    opacity: 0, scale: 0.98, y: -10, filter: 'blur(5px)',
    transition: { duration: 0.25, ease: 'easeIn' },
  },
};

const Layout = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-dashboard top-0 left-0 w-full relative">
      {/* Global cursor glow — rendered below everything */}
      <CursorGlow />

      {/* Ambient particles behind content */}
      <ParticleBackground mode="ambient" />

      {/* Sidebar */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main content column */}
      <div className="flex flex-col flex-1 w-full overflow-hidden relative z-10 lg:ml-64">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* Scrollable page area with animated route transitions */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 text-white relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* AI Companion Orb — always on top */}
      <CompanionOrb />
    </div>
  );
};

export default Layout;
