import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Mail, AlertCircle, Shield, ChevronRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../api/axios';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, setUser, setBranch, setDrawerOpen, isAuthenticated, userRole } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    if (isAuthenticated) {
      if (userRole === 'ADMIN' || userRole === 'OWNER') {
        navigate('/admin/command-center', { replace: true });
      } else {
        navigate('/pos', { replace: true });
      }
    }
  }, [isAuthenticated, userRole, navigate]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Backend API Call
      const response = await api.auth.login(email, password);
      const { token, user } = response.data;

      // 2. Audio & Visual Feedback (User Gesture Required)
      const loginSuccessSound = new Audio('/sounds/login-success.mp3');
      loginSuccessSound.volume = 0.3;
      loginSuccessSound.play().catch((error) => {
        // Silently handle autoplay restrictions - browser may block without user gesture
        console.debug('Audio autoplay blocked:', error);
      });

      toast.success('Access Granted: System Ready', {
        description: `Welcome back, ${user.name}`,
        duration: 3000,
      });

      // 3. Global State Hydration (Zustand)
      setAuth(token);
      setUser(user.name, user.role, user.id);

      // 4. Conditional Branch Management Logic
      if (user.branchId && user.branch) {
        setBranch(user.branch.name, user.branchId);
      }

      // 5. UI State - Close Drawer for Full-Screen POS Focus Mode
      setDrawerOpen(false);

      // 6. Role-Based Secure Redirect
      if (user.role === 'ADMIN' || user.role === 'OWNER') {
        // Admin/Owner: Redirect to Command Center
        navigate('/admin/command-center');
      } else if (user.role === 'MANAGER') {
        // Manager: Redirect to Full Screen POS (Sales Engine Priority)
        navigate('/pos');
      } else {
        // Fallback: Default to POS for sales-first workflow
        navigate('/pos');
      }
    } catch (err: any) {
      // Professional Error Handling Mapping
      setError(
        err.response?.data?.message || 
        'System access denied. Please check your credentials and network connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#0a0a0c] flex items-center justify-center p-6 relative overflow-hidden" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Structural Background - Executive Atmosphere */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02]"
             style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[420px] flex flex-col h-full max-h-[680px] justify-between"
      >
        {/* Security Header - Top Position */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.25em]">
            Authorized Access Only
          </span>
        </motion.div>

        {/* The Card - Minimalist Glass with Scanner Effect */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl px-10 py-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">

          {/* Animated Scanner Effect */}
          <motion.div
            className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 blur-sm"
            animate={{
              top: ['0%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <motion.div
            className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-300 to-transparent"
            animate={{
              top: ['0%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          <div className="relative z-10">
            {/* BRANDING */}
            <div className="text-center mb-7">
              <h1 className="text-[2.5rem] font-black text-white tracking-tighter uppercase italic leading-none">
                PRAM <span className="text-purple-500">AUTO</span>
              </h1>
              <h2 className="text-xl font-black text-slate-300 tracking-tighter uppercase italic mt-1">
                SPARES
              </h2>
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.4em] mt-2">
                Business Management System
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <p className="text-[10px] font-semibold text-red-200 uppercase tracking-wide leading-relaxed">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                {/* EMAIL FIELD */}
                <div className="space-y-2">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.15em] ml-0.5">Email Identifier</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-500 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      required
                      placeholder="Enter your email address"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                      disabled={loading}
                      style={{ fontFamily: 'inherit' }}
                    />
                    {emailValid && <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                  </div>
                </div>

                {/* PASSWORD FIELD */}
                <div className="space-y-2">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.15em] ml-0.5">Secure Passkey</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-500 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-11 py-3 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                      disabled={loading}
                      style={{ fontFamily: 'inherit' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-bold py-3.5 rounded-lg text-[11px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50 mt-5 shadow-xl"
                style={{ fontFamily: 'inherit' }}
              >
                {loading ? 'Authenticating...' : 'Sign In To Terminal'}
                {!loading && <ChevronRight size={14} className="opacity-50" />}
              </button>
            </form>
          </div>
        </div>

        {/* Enhanced Powered By Section - Bottom Position */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-4"
        >
          <div className="inline-flex flex-col items-center bg-gradient-to-br from-purple-900/15 to-indigo-900/15 border border-purple-500/20 rounded-xl px-5 py-2.5 backdrop-blur-xl shadow-lg relative overflow-hidden">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent" />

            <p className="text-[7px] font-semibold text-slate-500 uppercase tracking-[0.25em] mb-0.5 relative z-10">
              Powered by
            </p>
            <p className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-400 uppercase tracking-wide relative z-10">
              JOSEA <span className="text-slate-400 font-semibold">SOFTWARE SOLUTIONS</span>
            </p>

            {/* Minimal corner accents */}
            <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-purple-500/30" />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-purple-500/30" />
            <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-purple-500/30" />
            <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-purple-500/30" />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}