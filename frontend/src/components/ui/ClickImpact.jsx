import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInteraction } from '../../context/InteractionContext';

/**
 * ClickImpact — renders global ripple and scale-burst at click coordinates.
 */
const ClickImpact = () => {
  const { clickImpact } = useInteraction();
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    if (clickImpact) {
      const id = clickImpact.timestamp;
      setRipples((prev) => [...prev, { ...clickImpact, id }]);
      
      // Auto-cleanup after animation ends
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1000);
    }
  }, [clickImpact]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {ripples.map((r) => (
          <React.Fragment key={r.id}>
            {/* Main Expanding Wave */}
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                position: 'absolute',
                left: r.x,
                top: r.y,
                translateX: '-50%',
                translateY: '-50%',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '2px solid rgba(99, 102, 241, 0.4)',
                boxShadow: '0 0 40px rgba(99, 102, 241, 0.2)',
              }}
            />
            
            {/* Inner Particle Pulse */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: 'absolute',
                left: r.x,
                top: r.y,
                translateX: '-50%',
                translateY: '-50%',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
              }}
            />
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ClickImpact;
