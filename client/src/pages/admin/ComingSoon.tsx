// ============================================
// COMING SOON PAGE
// For Admin Routes Under Development
// ============================================

import { useLocation, useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ComingSoon() {
  const location = useLocation();
  const navigate = useNavigate();
  const intendedPath = (location.state as { intendedPath?: string })?.intendedPath;

  // Extract feature name from path
  const getFeatureName = (path?: string) => {
    if (!path) return 'This Feature';
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const featureName = getFeatureName(intendedPath);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        {/* Main Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl flex items-center justify-center">
              <Construction className="w-10 h-10 text-amber-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black text-white text-center mb-3">
            Coming Soon
          </h1>

          {/* Feature Name */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-zinc-500 text-center mb-1">
              Requested Feature:
            </p>
            <p className="text-xl font-bold text-amber-400 text-center">
              {featureName}
            </p>
          </div>

          {/* Message */}
          <p className="text-zinc-400 text-center mb-8 leading-relaxed">
            This feature is currently under development and will be available soon.
            We're working hard to bring you the best admin experience.
          </p>

          {/* Path Info (if available) */}
          {intendedPath && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 mb-8">
              <p className="text-xs text-zinc-600 mb-1">Intended Route:</p>
              <code className="text-sm text-zinc-400 font-mono">{intendedPath}</code>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                bg-zinc-800 border border-zinc-700 text-zinc-300
                hover:bg-zinc-700 hover:border-zinc-600 hover:text-white
                transition-all font-semibold text-sm
              "
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>

            <button
              onClick={() => navigate('/admin/command-center')}
              className="
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                bg-amber-500/10 border border-amber-500/20 text-amber-400
                hover:bg-amber-500/20 hover:border-amber-500/30 hover:text-amber-300
                transition-all font-semibold text-sm
              "
            >
              <Home className="w-4 h-4" />
              Command Center
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-600 text-center">
              Need this feature urgently? Contact your system administrator.
            </p>
          </div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.03, 0.05, 0.03],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.02, 0.04, 0.02],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500 rounded-full blur-3xl"
          />
        </div>
      </motion.div>
    </div>
  );
}
