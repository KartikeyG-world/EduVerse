import React, { useState, useEffect } from 'react';

/**
 * AnimatedCounter component for smooth easing number animations
 * @param {number} end - Target value to count up to
 * @param {number} duration - Animation duration in ms (default: 2000)
 */
const AnimatedCounter = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrameId = null;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Handle floating point decimals
        if (end % 1 !== 0) setCount(end);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [end, duration]);

  return <>{end % 1 !== 0 ? count.toFixed(1) : count}</>;
};

export default AnimatedCounter;
