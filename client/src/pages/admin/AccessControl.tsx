// ============================================
// ACCESS CONTROL - ELITE STAFF COMMAND CENTER
// Sophisticated Glassmorphic UI with Premium UX
// ============================================

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  Users,
  Shield,
  ShieldCheck,
  Crown,
  UserCog,
  UserX,
  AlertTriangle,
  Receipt,
  Key,
  Search,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Building2,
  Mail,
  Phone,
  Clock,
  Banknote,
  Edit3,
  X,
  Check,
  Lock,
  Fingerprint,
  Copy,
  Sparkles,
  Zap,
  ChevronRight,
  User,
  Calendar,
  AtSign,
  Hash,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';

// ===== TYPE DEFINITIONS =====
interface Branch {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'ADMIN' | 'MANAGER';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  branch: Branch | null;
  branchId?: string | null;
  todaySalesCount: number;
  todaySalesVolume: number;
  activeReversalRequests: number;
}

// ===== ROLE CONFIGURATION =====
const ROLE_CONFIG = {
  OWNER: {
    label: 'Owner',
    icon: Crown,
    color: 'amber',
    gradient: 'from-amber-500 to-yellow-500',
    bgGlow: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    hex: '#f59e0b',
  },
  ADMIN: {
    label: 'Administrator',
    icon: ShieldCheck,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-500/20',
    borderColor: 'border-violet-500/30',
    textColor: 'text-violet-400',
    hex: '#8b5cf6',
  },
  MANAGER: {
    label: 'Branch Manager',
    icon: UserCog,
    color: 'emerald',
    gradient: 'from-emerald-500 to-green-500',
    bgGlow: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    hex: '#10b981',
  },
};

// ===== UTILITY FUNCTIONS =====
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatLastLogin = (dateStr: string | null) => {
  if (!dateStr) return 'Never logged in';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 5) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// ===== PASSWORD STRENGTH INDICATOR =====
const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
};

const PasswordStrengthBar = ({ password }: { password: string }) => {
  const strength = getPasswordStrength(password);
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-400', 'bg-emerald-500'];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: strength >= i ? 1 : 0.3 }}
            className={`h-1.5 flex-1 rounded-full origin-left transition-colors ${
              strength >= i ? colors[strength - 1] : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className={`text-xs font-medium ${strength >= 4 ? 'text-emerald-400' : strength >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
          {labels[Math.max(0, strength - 1)] || 'Too Short'}
        </p>
      )}
    </div>
  );
};

// ===== SLIDE TO SUSPEND COMPONENT =====
interface SlideToSuspendProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function SlideToSuspend({ isActive, onToggle, disabled }: SlideToSuspendProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const trackWidth = 160;
  const thumbWidth = 48;
  const maxDrag = trackWidth - thumbWidth - 8;

  const background = useTransform(
    x,
    [0, maxDrag],
    isActive
      ? ['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.3)']
      : ['rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 0.3)']
  );

  const handleDragEnd = () => {
    const currentX = x.get();
    if (currentX > maxDrag * 0.7) {
      animate(x, maxDrag, { type: 'spring', stiffness: 300, damping: 30 });
      setTimeout(() => {
        onToggle();
        animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }, 200);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
  };

  return (
    <motion.div
      ref={constraintsRef}
      style={{ background }}
      className={`
        relative w-40 h-11 rounded-full border overflow-hidden
        ${isActive ? 'border-red-500/30' : 'border-green-500/30'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`text-[10px] font-bold tracking-wide uppercase ${isActive ? 'text-red-400/60' : 'text-green-400/60'}`}>
          {isActive ? 'Slide to Suspend' : 'Slide to Activate'}
        </span>
      </div>

      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileDrag={{ scale: 1.05 }}
        className={`
          absolute left-1 top-1 w-9 h-9 rounded-full
          flex items-center justify-center cursor-grab active:cursor-grabbing
          ${isActive
            ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30'
            : 'bg-gradient-to-br from-red-500 to-rose-500 shadow-lg shadow-red-500/30'
          }
        `}
      >
        {isActive ? (
          <CheckCircle className="w-4 h-4 text-white" />
        ) : (
          <XCircle className="w-4 h-4 text-white" />
        )}
      </motion.div>
    </motion.div>
  );
}

// ===== RESET PASSWORD MODAL (Compact Layout) =====
interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

function ResetPasswordModal({ isOpen, onClose, user, onSuccess }: ResetPasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
    setGeneratedPassword(password);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Password copied to clipboard');
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!currentPassword) {
      toast.error('Please enter your current password for verification');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/admin/users/${user.id}/password`, { currentPassword, newPassword });
      toast.success(`Password updated for ${user.name}`, {
        description: generatedPassword ? 'Make sure to share the new password securely' : undefined,
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowPassword(false);
    setShowConfirm(false);
    setGeneratedPassword(null);
    onClose();
  };

  if (!isOpen || !user) return null;

  const roleConfig = ROLE_CONFIG[user.role];
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isValid = currentPassword.length > 0 && newPassword.length >= 6 && passwordsMatch;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
            rounded-2xl border border-slate-700/50 shadow-2xl"
        >
          {/* Compact Header */}
          <div className="relative p-4 border-b border-slate-700/50 bg-slate-800/30">
            <div className="relative flex items-center gap-3">
              <div className={`p-2 rounded-lg ${roleConfig.bgGlow} border ${roleConfig.borderColor}`}>
                <Key className={`w-5 h-5 ${roleConfig.textColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">Reset Password</h2>
                <p className="text-xs text-slate-400 truncate">
                  For <span className={`font-semibold ${roleConfig.textColor}`}>{user.name}</span> ({user.email})
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Compact Content - Vertical Stack */}
          <div className="p-4 space-y-3">
            {/* Current Password (Admin Verification) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Your Password (Verification)</label>
              <div className="relative">
                <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50
                    text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50
                    font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/50"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="bg-slate-800 px-2 text-slate-500">New Password</span>
              </div>
            </div>

            {/* Generate Password Button - Smaller */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={generatePassword}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30
                text-amber-400 font-medium text-sm hover:from-amber-500/20 hover:to-yellow-500/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Secure Password
            </motion.button>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setGeneratedPassword(null);
                  }}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-16 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50
                    text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50
                    font-mono text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {generatedPassword && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newPassword)}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <PasswordStrengthBar password={newPassword} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-800/50 border
                    text-white placeholder-slate-500 focus:outline-none font-mono text-sm
                    ${confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-emerald-500/50 focus:border-emerald-500'
                        : 'border-red-500/50 focus:border-red-500'
                      : 'border-slate-700/50 focus:border-amber-500/50'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-1 text-[11px] font-medium ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {passwordsMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </motion.div>
              )}
            </div>
          </div>

          {/* Compact Footer */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: isValid ? 1.02 : 1 }}
              whileTap={{ scale: isValid ? 0.98 : 1 }}
              disabled={!isValid || loading}
              onClick={handleSubmit}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all
                ${isValid
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              {loading ? 'Updating...' : 'Update Password'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ===== USER DETAILS MODAL =====
interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  branches: Branch[];
  onUserUpdated: (updatedUser: User) => void;
  onResetPassword: (user: User) => void;
}

function UserDetailsModal({ isOpen, onClose, user, branches, onUserUpdated, onResetPassword }: UserDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [fieldLoading, setFieldLoading] = useState(false);
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'MANAGER' as 'OWNER' | 'ADMIN' | 'MANAGER',
    branchId: '',
  });

  // Sync local user state with prop
  useEffect(() => {
    if (user) {
      setLocalUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        branchId: user.branchId || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!localUser) return;

    setLoading(true);
    try {
      const response = await api.put(`/admin/users/${localUser.id}`, formData);
      const updatedUserData = response.data.data;

      // Create the full updated user object merging existing data with response
      const updatedUser: User = {
        ...localUser,
        name: updatedUserData.name,
        email: updatedUserData.email,
        phone: updatedUserData.phone,
        role: updatedUserData.role,
        branch: updatedUserData.branch,
        branchId: updatedUserData.branch?.id || null,
        isActive: updatedUserData.isActive,
      };

      // Update local state immediately
      setLocalUser(updatedUser);

      // Notify parent to update users array
      onUserUpdated(updatedUser);

      toast.success('User updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Inline field editing
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async (field: string) => {
    if (!localUser) return;

    // Validation
    if (field === 'email' && !editValue.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (field === 'name' && editValue.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }

    setFieldLoading(true);
    try {
      const response = await api.put(`/admin/users/${localUser.id}`, { [field]: editValue });
      const updatedUserData = response.data.data;

      // Create the full updated user object
      const updatedUser: User = {
        ...localUser,
        [field]: editValue,
        // Also update from response in case server transforms the value
        name: updatedUserData.name ?? localUser.name,
        email: updatedUserData.email ?? localUser.email,
        phone: updatedUserData.phone ?? localUser.phone,
        branch: updatedUserData.branch ?? localUser.branch,
      };

      // Update local state immediately for instant feedback
      setLocalUser(updatedUser);
      setFormData(prev => ({ ...prev, [field]: editValue }));

      // Notify parent to update users array
      onUserUpdated(updatedUser);

      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`);
      setEditingField(null);
      setEditValue('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to update ${field}`);
    } finally {
      setFieldLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setEditingField(null);
    setEditValue('');
    onClose();
  };

  if (!isOpen || !localUser) return null;

  // Use localUser for rendering to get instant updates
  const displayUser = localUser;
  const roleConfig = ROLE_CONFIG[displayUser.role];
  const RoleIcon = roleConfig.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
            rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden"
        >
          {/* Header with Avatar */}
          <div className="relative p-6 border-b border-slate-700/50">
            {/* Background Gradient */}
            <div
              className="absolute inset-0 opacity-30"
              style={{ background: `linear-gradient(135deg, ${roleConfig.hex}20 0%, transparent 50%)` }}
            />

            <div className="relative flex items-start gap-5">
              {/* Large Avatar */}
              <div className="relative">
                <div className={`w-20 h-20 rounded-2xl ${roleConfig.bgGlow} border-2 ${roleConfig.borderColor} flex items-center justify-center`}>
                  <span className={`text-2xl font-black ${roleConfig.textColor}`}>
                    {displayUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                {/* Role Badge */}
                <div className={`absolute -bottom-2 -right-2 p-2 rounded-xl bg-gradient-to-br ${roleConfig.gradient} shadow-lg`}>
                  <RoleIcon className="w-4 h-4 text-white" />
                </div>
                {/* Status Indicator */}
                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${displayUser.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  {displayUser.isActive ? (
                    <Check className="w-3 h-3 text-white m-0.5" />
                  ) : (
                    <X className="w-3 h-3 text-white m-0.5" />
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  {editingField === 'name' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="text-xl font-bold px-2 py-1 rounded-lg bg-slate-700 border border-slate-600
                          text-white focus:outline-none focus:border-amber-500/50"
                        autoFocus
                      />
                      <button
                        onClick={() => saveField('name')}
                        disabled={fieldLoading}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      >
                        {fieldLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-white">{displayUser.name}</h2>
                      {!isEditing && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => startEditing('name', displayUser.name)}
                          className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Edit name"
                        >
                          <Edit3 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${roleConfig.bgGlow} ${roleConfig.textColor} border ${roleConfig.borderColor}`}>
                    {roleConfig.label}
                  </span>
                  {displayUser.branch && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Building2 className="w-3.5 h-3.5" />
                      {displayUser.branch.name}
                    </span>
                  )}
                  <span className={`flex items-center gap-1.5 ${displayUser.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${displayUser.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {displayUser.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50
                          text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">Email Address</label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50
                          text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Optional"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50
                          text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['MANAGER', 'ADMIN', 'OWNER'] as const).map((role) => {
                        const config = ROLE_CONFIG[role];
                        const Icon = config.icon;
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setFormData({ ...formData, role })}
                            className={`p-2 rounded-xl border text-center transition-all
                              ${formData.role === role
                                ? `${config.bgGlow} ${config.borderColor} ${config.textColor}`
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                              }`}
                          >
                            <Icon className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-xs font-bold">{config.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Branch (only for managers) */}
                {formData.role === 'MANAGER' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">Assigned Branch</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <select
                        value={formData.branchId}
                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50
                          text-white focus:outline-none focus:border-amber-500/50 appearance-none"
                      >
                        <option value="">Select Branch...</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* View Mode */
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Contact Information</h3>

                  <div className="space-y-3">
                    {/* Email - Editable */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 group">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Mail className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">Email</p>
                        {editingField === 'email' ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="email"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm rounded-lg bg-slate-700 border border-slate-600
                                text-white focus:outline-none focus:border-amber-500/50"
                              autoFocus
                            />
                            <button
                              onClick={() => saveField('email')}
                              disabled={fieldLoading}
                              className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            >
                              {fieldLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-white truncate">{displayUser.email}</p>
                        )}
                      </div>
                      {editingField !== 'email' && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => startEditing('email', displayUser.email)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 text-slate-400 hover:text-amber-400 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>

                    {/* Phone - Editable */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 group">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Phone className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">Phone</p>
                        {editingField === 'phone' ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="tel"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Enter phone number"
                              className="flex-1 px-2 py-1 text-sm rounded-lg bg-slate-700 border border-slate-600
                                text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                              autoFocus
                            />
                            <button
                              onClick={() => saveField('phone')}
                              disabled={fieldLoading}
                              className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            >
                              {fieldLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-white">{displayUser.phone || 'Not provided'}</p>
                        )}
                      </div>
                      {editingField !== 'phone' && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => startEditing('phone', displayUser.phone || '')}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 text-slate-400 hover:text-amber-400 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>

                    {/* Last Login - Read Only */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <Clock className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Last Login</p>
                        <p className="text-sm font-medium text-white">{formatLastLogin(displayUser.lastLoginAt)}</p>
                      </div>
                    </div>

                    {/* Member Since - Read Only */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Calendar className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Member Since</p>
                        <p className="text-sm font-medium text-white">{formatDate(displayUser.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Performance */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Today's Performance</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-slate-400">Sales</span>
                      </div>
                      <p className="text-2xl font-black text-white">{displayUser.todaySalesCount}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Banknote className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-slate-400">Volume</span>
                      </div>
                      <p className="text-xl font-bold text-white">{formatCurrency(displayUser.todaySalesVolume)}</p>
                    </div>
                  </div>

                  {displayUser.activeReversalRequests > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-amber-300">Risk Alert</p>
                          <p className="text-xs text-amber-400/70">
                            {displayUser.activeReversalRequests} pending reversal request{displayUser.activeReversalRequests > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="pt-4 border-t border-slate-700/30">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          handleClose();
                          onResetPassword(displayUser);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                          bg-slate-800/80 border border-slate-700/50 text-slate-300
                          hover:bg-slate-700/80 hover:text-white transition-all text-sm font-medium"
                      >
                        <Key className="w-4 h-4" />
                        Reset Password
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold
                    bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {loading ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Hash className="w-3.5 h-3.5" />
                  <span className="font-mono">{displayUser.id.slice(0, 8)}...</span>
                </div>
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ===== ENHANCED USER DOSSIER CARD =====
interface DossierCardProps {
  user: User;
  onStatusToggle: (userId: string, newStatus: boolean) => void;
  onResetPassword: (user: User) => void;
  onViewDetails: (user: User) => void;
  currentUserId: string;
}

function DossierCard({ user, onStatusToggle, onResetPassword, onViewDetails, currentUserId }: DossierCardProps) {
  const roleConfig = ROLE_CONFIG[user.role];
  const RoleIcon = roleConfig.icon;
  const isCurrentUser = user.id === currentUserId;
  const hasRiskFlag = user.activeReversalRequests > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`
        group relative rounded-2xl overflow-hidden
        bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90
        backdrop-blur-xl border ${roleConfig.borderColor}
        shadow-xl shadow-black/20 hover:shadow-2xl
        ${!user.isActive ? 'opacity-70' : ''}
      `}
    >
      {/* Animated Border Gradient */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, ${roleConfig.hex}10 0%, transparent 40%, transparent 60%, ${roleConfig.hex}10 100%)`,
        }}
      />

      {/* Glassmorphic Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />

      {/* Risk Flag Pulse */}
      {hasRiskFlag && user.isActive && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-3 right-3 z-10"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500 rounded-full blur-md animate-pulse" />
            <div className="relative bg-amber-500/20 border border-amber-500/50 rounded-full p-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Status Badge */}
      <div className={`absolute top-3 ${hasRiskFlag ? 'right-12' : 'right-3'}`}>
        <div className={`
          flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
          ${user.isActive
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }
        `}>
          <span className={`relative flex h-1.5 w-1.5`}>
            {user.isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${user.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
          </span>
          {user.isActive ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Card Content */}
      <div className="relative p-5">
        {/* Avatar & Identity */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar with Glow */}
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className={`relative rounded-xl overflow-hidden p-0.5`}
              style={{ background: `linear-gradient(135deg, ${roleConfig.hex}40, ${roleConfig.hex}10)` }}
            >
              <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center">
                <span className={`text-xl font-black ${roleConfig.textColor}`}>
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
            </motion.div>
            {/* Role Icon Badge */}
            <div className={`
              absolute -bottom-1 -right-1 p-1.5 rounded-lg
              bg-gradient-to-br ${roleConfig.gradient}
              shadow-lg shadow-${roleConfig.color}-500/30
            `}>
              <RoleIcon className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Identity Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate mb-1">{user.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`
                text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
                bg-gradient-to-r ${roleConfig.gradient} text-white
              `}>
                {roleConfig.label}
              </span>
              {user.branch && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {user.branch.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact - Compact */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Mail className="w-3 h-3 text-slate-500" />
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Last seen: {formatLastLogin(user.lastLoginAt)}</span>
          </div>
        </div>

        {/* Performance Stats - Redesigned */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="relative p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 overflow-hidden group/stat">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Receipt className="w-3 h-3 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Sales</p>
                <p className="text-lg font-black text-white leading-none">{user.todaySalesCount}</p>
              </div>
            </div>
          </div>

          <div className="relative p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 overflow-hidden group/stat">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Banknote className="w-3 h-3 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Volume</p>
                <p className="text-sm font-bold text-white leading-none">{formatCurrency(user.todaySalesVolume)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Alert */}
        {hasRiskFlag && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-[11px] text-amber-300">
                <span className="font-bold">{user.activeReversalRequests}</span> pending reversal{user.activeReversalRequests > 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onViewDetails(user)}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl
              bg-slate-800/80 border border-slate-700/50 text-slate-300
              hover:bg-slate-700/80 hover:text-white hover:border-slate-600 transition-all text-xs font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="truncate">Details</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onResetPassword(user)}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl
              bg-slate-800/80 border border-slate-700/50 text-slate-300
              hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 transition-all text-xs font-medium"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="truncate">Reset Pass</span>
          </motion.button>
        </div>

        {/* Slide to Suspend */}
        <div className="flex justify-center">
          <SlideToSuspend
            isActive={user.isActive}
            onToggle={() => onStatusToggle(user.id, !user.isActive)}
            disabled={isCurrentUser}
          />
        </div>
        {isCurrentUser && (
          <p className="text-[10px] text-center text-slate-500 mt-2">Cannot modify your own status</p>
        )}
      </div>
    </motion.div>
  );
}

// ===== RECRUIT ONBOARDING PROTOCOL WIZARD =====
// Multi-step wizard for deploying new staff agents
interface CreateUserWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branches: Branch[];
}

const WIZARD_STEPS = [
  { id: 1, label: 'Identity', icon: User, description: 'Basic information' },
  { id: 2, label: 'Assignment', icon: Building2, description: 'Role & branch' },
  { id: 3, label: 'Credentials', icon: Key, description: 'Access setup' },
];

function CreateUserWizard({ isOpen, onClose, onSuccess, branches }: CreateUserWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'MANAGER' as 'OWNER' | 'ADMIN' | 'MANAGER',
    branchId: '',
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
    setGeneratedPassword(password);
    setShowPassword(true);
  };

  const copyToClipboard = () => {
    if (formData.password) {
      navigator.clipboard.writeText(formData.password);
      toast.success('Password copied to clipboard');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/admin/users', formData);
      toast.success('Agent deployed successfully', {
        description: `${formData.name} has been onboarded to the system`,
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to deploy agent');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({ name: '', email: '', phone: '', password: '', role: 'MANAGER', branchId: '' });
    setGeneratedPassword(null);
    setShowPassword(false);
    onClose();
  };

  // Step validation - reordered: 1=Identity, 2=Assignment, 3=Credentials
  const canProceed = () => {
    if (step === 1) return formData.name.trim().length >= 2 && formData.email.includes('@');
    if (step === 2) return formData.role && (formData.role !== 'MANAGER' || formData.branchId);
    if (step === 3) return formData.password.length >= 6;
    return true;
  };

  if (!isOpen) return null;

  const currentStepConfig = WIZARD_STEPS.find(s => s.id === step)!;
  const StepIcon = currentStepConfig.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
            rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden"
        >
          {/* Header with Protocol Branding */}
          <div className="relative p-5 border-b border-slate-700/50 bg-slate-800/30">
            {/* Decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-gradient-to-b from-amber-500/20 to-transparent blur-3xl pointer-events-none" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Recruit Onboarding Protocol</h2>
                  <p className="text-xs text-slate-400">Deploy new agent to the system</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="mt-5">
              {/* Progress track */}
              <div className="relative h-1 bg-slate-700 rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((step - 1) / 2) * 100}%` }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-500"
                />
              </div>

              {/* Step indicators */}
              <div className="flex justify-between">
                {WIZARD_STEPS.map((s) => {
                  const Icon = s.icon;
                  const isActive = step >= s.id;
                  const isCurrent = step === s.id;

                  return (
                    <div key={s.id} className="flex flex-col items-center">
                      <motion.div
                        animate={{
                          scale: isCurrent ? 1.1 : 1,
                          boxShadow: isCurrent ? '0 0 20px rgba(245, 158, 11, 0.3)' : 'none',
                        }}
                        className={`
                          w-9 h-9 rounded-full flex items-center justify-center mb-1.5 transition-all
                          ${isActive
                            ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-white'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                          }
                        `}
                      >
                        {isActive && s.id < step ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </motion.div>
                      <span className={`text-[10px] font-medium ${isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              {/* Step 1: Identity */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-bold text-white">Agent Identity</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Doe"
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50
                            text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="0712345678"
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50
                            text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@pram.co.ke"
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50
                            text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Assignment */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-bold text-white">Mission Assignment</h3>
                  </div>

                  {/* Branch Selection - Show first for Managers */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Deployment Station</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <select
                        value={formData.branchId}
                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50
                          text-white focus:outline-none focus:border-amber-500/50 appearance-none"
                      >
                        <option value="">Select Branch...</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formData.role === 'MANAGER' ? 'Required for Branch Managers' : 'Optional for Admins/Owners'}
                    </p>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Clearance Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['MANAGER', 'ADMIN', 'OWNER'] as const).map((role) => {
                        const config = ROLE_CONFIG[role];
                        const RoleIcon = config.icon;
                        return (
                          <motion.button
                            key={role}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFormData({ ...formData, role })}
                            className={`
                              p-3 rounded-xl border text-center transition-all
                              ${formData.role === role
                                ? `${config.bgGlow} ${config.borderColor} ${config.textColor}`
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                              }
                            `}
                          >
                            <RoleIcon className="w-5 h-5 mx-auto mb-1.5" />
                            <span className="text-xs font-bold block">{config.label.split(' ')[0]}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Role description */}
                  <div className={`p-3 rounded-lg border ${ROLE_CONFIG[formData.role].bgGlow} ${ROLE_CONFIG[formData.role].borderColor}`}>
                    <p className={`text-xs ${ROLE_CONFIG[formData.role].textColor}`}>
                      {formData.role === 'MANAGER' && 'Branch Manager: Full access to assigned branch dashboard and sales operations.'}
                      {formData.role === 'ADMIN' && 'Administrator: Access to all branches, inventory management, and user control.'}
                      {formData.role === 'OWNER' && 'Owner: Complete system access including financial reports and system settings.'}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Credentials */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-bold text-white">Access Credentials</h3>
                  </div>

                  {/* Agent Summary */}
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${ROLE_CONFIG[formData.role].bgGlow} flex items-center justify-center`}>
                        <span className={`text-sm font-black ${ROLE_CONFIG[formData.role].textColor}`}>
                          {formData.name.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{formData.name || 'Agent Name'}</p>
                        <p className="text-xs text-slate-400 truncate">{formData.email || 'email@example.com'}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${ROLE_CONFIG[formData.role].bgGlow} ${ROLE_CONFIG[formData.role].textColor} border ${ROLE_CONFIG[formData.role].borderColor}`}>
                        {formData.role}
                      </div>
                    </div>
                  </div>

                  {/* Generate Password Button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={generatePassword}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                      bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30
                      text-amber-400 font-medium text-sm hover:from-amber-500/20 hover:to-yellow-500/20 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Auto-Generate Secure Password
                  </motion.button>

                  {/* Password Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Initial Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value });
                          setGeneratedPassword(null);
                        }}
                        placeholder="Min 6 characters"
                        className="w-full pl-10 pr-20 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50
                          text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-mono text-sm"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {generatedPassword && (
                          <button
                            type="button"
                            onClick={copyToClipboard}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Copy password"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <PasswordStrengthBar password={formData.password} />
                  </div>

                  {generatedPassword && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <p className="text-xs text-emerald-300">
                          Secure password generated. Remember to share it securely with the new agent.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
            <button
              onClick={step > 1 ? () => setStep(step - 1) : handleClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors text-sm font-medium"
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Step {step} of 3</span>
              <motion.button
                whileHover={{ scale: canProceed() ? 1.02 : 1 }}
                whileTap={{ scale: canProceed() ? 0.98 : 1 }}
                disabled={!canProceed() || loading}
                onClick={step < 3 ? () => setStep(step + 1) : handleSubmit}
                className={`
                  flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all
                  ${canProceed()
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : step < 3 ? (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Deploy Agent
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ===== MAIN ACCESS CONTROL PAGE =====
export default function AccessControl() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?.id || '';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/branches'),
      ]);
      setUsers(usersRes.data.data);
      setBranches(branchesRes.data.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusToggle = async (userId: string, newStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: newStatus });
      toast.success(`User ${newStatus ? 'activated' : 'suspended'} successfully`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  // Handler to update user in both selectedUser and users array
  // This fixes both the "instant state reflection" and "disappearing cards" bugs
  const handleUserUpdated = (updatedUser: User) => {
    // Update selectedUser immediately for instant modal reflection
    setSelectedUser(updatedUser);

    // Merge updated user into the users array (instead of replacing the whole list)
    setUsers(prevUsers =>
      prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && user.isActive) ||
      (statusFilter === 'SUSPENDED' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const groupedUsers = {
    OWNER: filteredUsers.filter((u) => u.role === 'OWNER'),
    ADMIN: filteredUsers.filter((u) => u.role === 'ADMIN'),
    MANAGER: filteredUsers.filter((u) => u.role === 'MANAGER'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            Access Control
          </h1>
          <p className="text-slate-400 mt-1">Manage user access and monitor operational intelligence</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateWizard(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold
            bg-gradient-to-r from-amber-500 to-yellow-500 text-white
            shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
        >
          <Plus className="w-5 h-5" />
          Draft Recruit
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50
              text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50
            text-white focus:outline-none focus:border-amber-500/50"
        >
          <option value="ALL">All Roles</option>
          <option value="OWNER">Owner</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50
            text-white focus:outline-none focus:border-amber-500/50"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        <motion.button
          whileHover={{ scale: 1.05, rotate: 180 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchData}
          className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-400">Total Users</span>
          </div>
          <p className="text-2xl font-black text-white">{users.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-400">Active</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">{users.filter((u) => u.isActive).length}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <UserX className="w-4 h-4 text-red-400" />
            <span className="text-sm text-slate-400">Suspended</span>
          </div>
          <p className="text-2xl font-black text-red-400">{users.filter((u) => !u.isActive).length}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-400">Risk Flags</span>
          </div>
          <p className="text-2xl font-black text-amber-400">
            {users.filter((u) => u.activeReversalRequests > 0).length}
          </p>
        </div>
      </div>

      {/* User Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No users found matching your filters</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedUsers).map(([role, roleUsers]) => {
            if (roleUsers.length === 0) return null;
            const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
            return (
              <div key={role}>
                <h2 className={`text-lg font-bold ${config.textColor} mb-4 flex items-center gap-2`}>
                  <config.icon className="w-5 h-5" />
                  {config.label}s ({roleUsers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {roleUsers.map((user) => (
                      <DossierCard
                        key={user.id}
                        user={user}
                        onStatusToggle={handleStatusToggle}
                        onResetPassword={handleResetPassword}
                        onViewDetails={handleViewDetails}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateUserWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onSuccess={fetchData}
        branches={branches}
      />

      <ResetPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={fetchData}
      />

      <UserDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        branches={branches}
        onUserUpdated={handleUserUpdated}
        onResetPassword={handleResetPassword}
      />
    </div>
  );
}
