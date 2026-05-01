import React from 'react';
import { motion, useTransform } from 'framer-motion';
import { useInteraction } from '../../context/InteractionContext';

/**
 * ParallaxLayer — shifts children based on global mouse position.
 * depth: 0 (no movement) to 1 (full movement). Higher depth = slower/further back.
 */
const ParallaxLayer = ({ children, depth = 0.05, className = '', style = {} }) => {
  const { smoothX, smoothY } = useInteraction();

  // Calculate offsets. Center of screen is (innerWidth/2, innerHeight/2)
  // We want to move in the opposite direction of the mouse slightly
  const x = useTransform(smoothX, (val) => (val - window.innerWidth / 2) * depth);
  const y = useTransform(smoothY, (val) => (val - window.innerHeight / 2) * depth);

  // For 3D Tilt Effect
  const rotateX = useTransform(smoothY, (val) => (window.innerHeight / 2 - val) * (depth * 0.5));
  const rotateY = useTransform(smoothX, (val) => (val - window.innerWidth / 2) * (depth * 0.5));

  return (
    <motion.div
      style={{
        x,
        y,
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        ...style,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ParallaxLayer;
