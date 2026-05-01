import React from 'react';
import { motion } from 'framer-motion';

/**
 * ScrollReveal — wraps children, animates them in when they enter the viewport.
 *
 * Props:
 *   delay   — stagger delay (seconds)
 *   y       — how far below to start (default 24px)
 *   once    — only animate once (default true)
 */
const ScrollReveal = ({
  children,
  delay = 0,
  y = 24,
  once = true,
  className = '',
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once, margin: '-60px' }}
    transition={{
      duration: 0.5,
      delay,
      ease: [0.22, 1, 0.36, 1],
    }}
    className={className}
  >
    {children}
  </motion.div>
);

/**
 * ScrollRevealGroup — staggers all direct children with whileInView.
 * Wraps each child automatically; children must be an array.
 */
export const ScrollRevealGroup = ({
  children,
  stagger = 0.08,
  y = 20,
  once = true,
  className = '',
}) => {
  const arr = React.Children.toArray(children);
  return (
    <div className={className}>
      {arr.map((child, i) => (
        <ScrollReveal key={i} delay={i * stagger} y={y} once={once}>
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
};

export default ScrollReveal;
