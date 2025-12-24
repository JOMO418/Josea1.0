import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Mail, AlertCircle, Shield, ChevronRight, Eye, EyeOff, CheckCircle2, Hexagon } from 'lucide-react';
import { api } from '../api/axios';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, setUser, setBranch, setDrawerOpen } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);

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

      // 6. Secure Redirect - Direct to POS Terminal
      navigate('/pos');
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
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 relative overflow-hidden font-sans antialiased">
      
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
        className="relative z-10 w-full max-w-[480px]"
      >
        {/* Enhanced Powered By Section - Top Position */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <div className="inline-flex flex-col items-center bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-2xl px-8 py-4 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Animated glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-pulse" />
            
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1.5 relative z-10">
              System Powered by
            </p>
            <p className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-400 uppercase italic tracking-wider relative z-10">
              JOSEA <span className="text-slate-300 font-bold">SOFTWARE SOLUTIONS</span>
            </p>
            
            {/* Decorative corner accents */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-purple-500/40" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-purple-500/40" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-purple-500/40" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-purple-500/40" />
          </div>
        </motion.div>

        {/* Security Header - Below Powered By */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <Shield className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
            Authorized Access Only
          </span>
        </motion.div>

        {/* The Card - Minimalist Glass with Scanner Effect */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-[2.5rem] p-12 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          
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
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-400 rounded-2xl mb-6 shadow-inner border border-white/20">
                <Hexagon className="w-8 h-8 text-slate-900" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                PRAM <span className="text-purple-500">AUTO</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-2">
                Bussiness Management System
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-[11px] font-bold text-red-200 uppercase tracking-wider leading-relaxed">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-5">
                {/* EMAIL FIELD */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Identifier</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-500 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      required
                      placeholder="Enter your email address"
                      className="w-full pl-11 pr-4 py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                      disabled={loading}
                    />
                    {emailValid && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                  </div>
                </div>

                {/* PASSWORD FIELD */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Secure Passkey</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-500 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full pl-11 pr-12 py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-black py-4 rounded-xl text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50 mt-4 shadow-xl"
              >
                {loading ? 'Authenticating...' : 'Sign In To Terminal'}
                {!loading && <ChevronRight size={14} className="opacity-50" />}
              </button>
            </form>
          </div>
        </div>

        {/* EXECUTIVE SIGNATURE - Bottom */}
        <div className="mt-8 flex items-center justify-center border-t border-white/5 pt-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}