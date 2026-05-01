import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * CursorGlow — global soft radial glow that follows the mouse.
 * Fully GPU-driven via CSS transforms. Zero layout impact.
 */
const CursorGlow = () => {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);

  const springX = useSpring(x, { stiffness: 120, damping: 28, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 120, damping: 28, mass: 0.5 });

  useEffect(() => {
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [x, y]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <motion.div
        style={{
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
          position: 'fixed',
          borderRadius: '50%',
          width: '600px',
          height: '600px',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.07) 0%, rgba(6,182,212,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
};

export default CursorGlow;
