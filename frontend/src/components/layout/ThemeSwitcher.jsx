import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const ThemeSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { activeTheme, switchTheme, themes } = useTheme();
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-xl transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
            <Palette size={16} />
          </div>
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
            Appearance
          </span>
        </div>
        <div className="flex gap-1">
          {themes.find(t => t.id === activeTheme)?.colors.slice(0, 3).map((color, i) => (
            <div 
              key={i} 
              className="w-2.5 h-2.5 rounded-full shadow-sm" 
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-3 w-64 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
          >
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette size={16} className="text-primary" />
                Theme Engine
              </h3>
              <p className="text-xs text-gray-400 mt-1">Select your workspace vibe</p>
            </div>
            
            <div className="p-2 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    switchTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                    activeTheme === theme.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {activeTheme === theme.id && (
                    <motion.div 
                      layoutId="activeTheme"
                      className="absolute inset-0 bg-primary/5"
                    />
                  )}
                  
                  <div className="flex items-center gap-3 relative z-10">
                    {activeTheme === theme.id ? (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-content">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-500 group-hover:border-white/50 transition-colors" />
                    )}
                    <span className={`text-sm font-medium ${activeTheme === theme.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                      {theme.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 relative z-10">
                    {theme.colors.map((color, i) => (
                      <div 
                        key={i} 
                        className="w-3 h-3 rounded-full shadow-sm ring-1 ring-black/20" 
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSwitcher;
