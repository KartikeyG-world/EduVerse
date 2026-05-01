import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageTransition — wraps every page with a smooth fade + upward slide.
 * Use by wrapping the root element of each page (or via the Layout Outlet).
 */
const pageVariants = {
  initial: {
    opacity: 0,
    y: 18,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1], // custom easeOutExpo
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(3px)',
    transition: {
      duration: 0.22,
      ease: 'easeIn',
    },
  },
};

const PageTransition = ({ children, className = '' }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    className={`w-full h-full ${className}`}
  >
    {children}
  </motion.div>
);

export default PageTransition;
