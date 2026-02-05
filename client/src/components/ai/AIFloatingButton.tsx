import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIFloatingButtonProps {
  onClick: () => void;
  userRole: 'MANAGER' | 'ADMIN' | 'OWNER';
  isOpen: boolean;
}

/**
 * Professional Josea AI Button
 * Sophisticated "J" branding with subtle glow
 * Tooltip appears after delay to avoid distraction
 */
export default function AIFloatingButton({ onClick, userRole, isOpen }: AIFloatingButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Show tooltip after 3 seconds if not interacted
  useEffect(() => {
    if (!hasInteracted && !isOpen) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [hasInteracted, isOpen]);

  // Hide tooltip after 5 seconds
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  const handleClick = () => {
    setHasInteracted(true);
    setShowTooltip(false);
    onClick();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000]">
      {/* Professional Tooltip */}
      <AnimatePresence>
        {showTooltip && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-0 mb-3 whitespace-nowrap"
          >
            <div className="bg-slate-950 border border-purple-500/30 rounded-lg px-4 py-2.5 shadow-xl">
              <p className="text-white text-sm font-medium">
                Talk with Josea AI
              </p>
              <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-slate-950 border-r border-b border-purple-500/30"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sophisticated "J" Icon Button */}
      <motion.button
        onClick={handleClick}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative w-16 h-16 rounded-2xl shadow-2xl transition-all duration-300 group overflow-hidden ${
          isOpen
            ? 'bg-purple-600 shadow-purple-500/50'
            : 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 hover:from-slate-800 hover:via-slate-800 hover:to-slate-700'
        }`}
        aria-label={isOpen ? 'Close Josea AI' : 'Open Josea AI'}
      >
        {/* Subtle Glow Effect */}
        <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

        {/* Professional "J" Letter */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <span className={`font-serif text-3xl font-bold tracking-tight transition-colors duration-300 ${
            isOpen ? 'text-white' : 'text-purple-400 group-hover:text-purple-300'
          }`}>
            J
          </span>
        </div>

        {/* Subtle Border Glow */}
        <div className={`absolute inset-0 rounded-2xl border transition-all duration-300 ${
          isOpen
            ? 'border-purple-400/50'
            : 'border-slate-700/50 group-hover:border-purple-500/30'
        }`}></div>

        {/* Role Badge */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-950 border border-slate-700 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-[9px] font-bold text-slate-400">
            {userRole === 'MANAGER' ? 'M' : 'A'}
          </span>
        </div>

        {/* Active Indicator */}
        {isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-1 right-1 w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
          ></motion.div>
        )}
      </motion.button>
    </div>
  );
}
