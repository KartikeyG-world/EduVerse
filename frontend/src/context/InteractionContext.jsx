import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

export const InteractionContext = createContext();

export const InteractionProvider = ({ children }) => {
  // ── Global Mouse Tracking (Raw) ───────────────────────────────────────────
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // ── Smooth Springs for Parallax/Lighting ──────────────────────────────────
  // Fast responsiveness for lighting, slower for parallax
  const springConfig = { stiffness: 150, damping: 30, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // ── Trigger Global Effects ────────────────────────────────────────────────
  const [ripple, setRipple] = useState(null); // { x, y, timestamp }
  const [clickImpact, setClickImpact] = useState(null);

  const triggerGlobalRipple = useCallback((x, y) => {
    setRipple({ x, y, timestamp: Date.now() });
  }, []);

  const triggerClickImpact = useCallback((x, y) => {
    setClickImpact({ x, y, timestamp: Date.now() });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleClick = (e) => {
      triggerClickImpact(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click',     handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click',     handleClick);
    };
  }, [mouseX, mouseY, triggerClickImpact]);

  return (
    <InteractionContext.Provider value={{
      mouseX, mouseY,
      smoothX, smoothY,
      ripple, triggerGlobalRipple,
      clickImpact, triggerClickImpact
    }}>
      {children}
    </InteractionContext.Provider>
  );
};

export const useInteraction = () => {
  const context = useContext(InteractionContext);
  if (!context) throw new Error('useInteraction must be used within InteractionProvider');
  return context;
};
