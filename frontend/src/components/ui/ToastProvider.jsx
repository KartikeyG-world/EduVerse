import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Zap, Clock, Star, AlertTriangle, Info } from 'lucide-react';

// ─── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

// ─── Icons mapping ────────────────────────────────────────────────────────────
const ICONS = {
  xp:      <Zap size={16} className="text-yellow-400" />,
  success: <CheckCircle2 size={16} className="text-green-400" />,
  info:    <Info size={16} className="text-blue-400" />,
  warning: <AlertTriangle size={16} className="text-orange-400" />,
  focus:   <Clock size={16} className="text-cyan-400" />,
  level:   <Star size={16} className="text-purple-400" />,
};

const ACCENT_CLASSES = {
  xp:      'border-yellow-500/40 bg-yellow-500/10',
  success: 'border-green-500/40 bg-green-500/10',
  info:    'border-blue-500/40 bg-blue-500/10',
  warning: 'border-orange-500/40 bg-orange-500/10',
  focus:   'border-cyan-500/40 bg-cyan-500/10',
  level:   'border-purple-500/40 bg-purple-500/10',
};

// ─── Single Toast ─────────────────────────────────────────────────────────────
const Toast = ({ id, message, type = 'info', onDismiss }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: -24, scale: 0.92 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -16, scale: 0.88 }}
    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    onClick={() => onDismiss(id)}
    className={`
      flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl 
      shadow-2xl cursor-pointer select-none
      ${ACCENT_CLASSES[type] || ACCENT_CLASSES.info}
    `}
    style={{ minWidth: 220, maxWidth: 340 }}
  >
    <span className="flex-shrink-0">{ICONS[type] || ICONS.info}</span>
    <p className="text-sm font-semibold text-white leading-snug">{message}</p>
  </motion.div>
);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Stack — fixed top-center */}
      <div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-2 pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              {...t}
              onDismiss={dismiss}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
