import React, { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CompanionContext } from '../../context/CompanionContext';
import { useInteraction } from '../../context/InteractionContext';
import { Sparkles, Bot, AlertTriangle, CheckCircle2 } from 'lucide-react';

const CompanionOrb = () => {
  const { mood, message } = useContext(CompanionContext);
  const [showOrb, setShowOrb] = useState(true);

  const { triggerGlobalRipple } = useInteraction();

  // High-Energy Physics Variants
  const orbVariants = {
    idle: {
      scale: [1, 1.05, 1],
      y: [0, -6, 0],
      boxShadow: [
        "0px 0px 25px rgba(59, 130, 246, 0.5)",
        "0px 8px 35px rgba(59, 130, 246, 0.7)",
        "0px 0px 25px rgba(59, 130, 246, 0.5)"
      ],
      borderColor: "rgba(59, 130, 246, 0.5)",
      transition: { 
        duration: 4, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }
    },
    active: {
      scale: [1, 1.12, 1],
      y: [0, -12, 0],
      boxShadow: [
        "0px 0px 30px rgba(6, 182, 212, 0.7)",
        "0px 15px 50px rgba(6, 182, 212, 0.9)",
        "0px 0px 30px rgba(6, 182, 212, 0.7)"
      ],
      borderColor: "rgba(6, 182, 212, 1)",
      transition: { 
        duration: 2, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }
    },
    warning: {
      x: [-4, 4, -4, 4, 0],
      scale: 1.08,
      boxShadow: "0px 0px 45px rgba(239, 68, 68, 0.8)",
      borderColor: "rgba(239, 68, 68, 1)",
      transition: { duration: 0.5, ease: "easeInOut" }
    },
    success: {
      scale: [1, 1.3, 1],
      boxShadow: [
        "0px 0px 40px rgba(34, 197, 94, 0.8)",
        "0px 0px 80px rgba(34, 197, 94, 1)",
        "0px 0px 40px rgba(34, 197, 94, 0.8)"
      ],
      borderColor: "rgba(34, 197, 94, 1)",
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const getIcon = () => {
    switch(mood) {
        case 'active': return <Sparkles size={24} className="text-cyan-400" />;
        case 'warning': return <AlertTriangle size={24} className="text-red-400" />;
        case 'success': return <CheckCircle2 size={24} className="text-green-400" />;
        default: return <Bot size={24} className="text-blue-400 opacity-80" />;
    }
  };

  const getBgClass = () => {
      switch(mood) {
          case 'active': return 'bg-cyan-900/40';
          case 'warning': return 'bg-red-900/40';
          case 'success': return 'bg-green-900/40';
          default: return 'bg-blue-900/30';
      }
  };

  return (
    <AnimatePresence>
      {showOrb && (
        <motion.div 
          className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end gap-3 pointer-events-none"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5 }}
        >
          {/* Active Message Bubble */}
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1, y: -15, filter: "blur(4px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-surface/90 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl rounded-br-none shadow-2xl max-w-[250px] pointer-events-auto"
              >
                <p className="text-sm text-gray-200 font-medium leading-relaxed">
                  {message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Orb */}
          <motion.div
            variants={orbVariants}
            animate={mood}
            transition={{ ease: "easeInOut", duration: 0.5 }}
            whileTap={{ scale: 0.8 }}
            className={`w-14 h-14 rounded-full flex items-center justify-center border-2 backdrop-blur-md pointer-events-auto cursor-pointer hover:!scale-125 transition-transform ${getBgClass()}`}
            onClick={(e) => {
                triggerGlobalRipple(e.clientX, e.clientY);
                // Future expansion: expanding mini panel on click
            }}
          >
            {getIcon()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CompanionOrb;
