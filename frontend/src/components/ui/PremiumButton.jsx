import React from 'react';
import { motion } from 'framer-motion';

/**
 * PremiumButton — standard micro-interaction wrapper for buttons and interactive elements.
 * Replaces aggressive magnetic effects with subtle, professional SaaS motion.
 * 
 * Hover: Slide up -3px
 * Press: Scale down to 0.97
 */
const PremiumButton = ({ children, className = '', onClick, disabled }) => {
  return (
    <motion.div
      className={`inline-flex ${className}`}
      whileHover={{ 
        y: -3,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.97,
        transition: { duration: 0.1, ease: "easeInOut" }
      }}
    >
      {React.cloneElement(children, {
        onClick: onClick || children.props.onClick,
        disabled: disabled || children.props.disabled,
        className: `${children.props.className || ''} outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-shadow`
      })}
    </motion.div>
  );
};

export default PremiumButton;
