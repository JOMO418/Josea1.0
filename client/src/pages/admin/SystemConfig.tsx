// ============================================
// SYSTEM CONFIGURATION - THE NEURAL CORE
// Premium Glassmorphic Settings Interface
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Receipt,
  Calculator,
  Package,
  Shield,
  Building2,
  Bell,
  Cpu,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  ChevronRight,
  Activity,
  Database,
  Lock,
  RefreshCw,
  Printer,
  FileText,
  Hash,
  DollarSign,
  Percent,
  Clock,
  Users,
  Mail,
  MessageSquare,
  Globe,
  Key,
  X,
} from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'sonner';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface SettingItem {
  id: string;
  key: string;
  value: any;
  label: string;
  description?: string;
  dataType: string;
  isLocked: boolean;
  updatedAt?: string;
}

interface SettingsData {
  [category: string]: SettingItem[];
}

// ============================================
// CATEGORY CONFIGURATION
// ============================================

const CATEGORY_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  gradient: string;
  description: string;
}> = {
  POS: {
    icon: Receipt,
    color: '#10b981',
    gradient: 'from-emerald-500/20 to-emerald-500/5',
    description: 'Point of Sale & Receipt Configuration',
  },
  TAX: {
    icon: Calculator,
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-amber-500/5',
    description: 'VAT, Tax Rates & Compliance',
  },
  INVENTORY: {
    icon: Package,
    color: '#3b82f6',
    gradient: 'from-blue-500/20 to-blue-500/5',
    description: 'Stock Management & Thresholds',
  },
  SECURITY: {
    icon: Shield,
    color: '#ef4444',
    gradient: 'from-red-500/20 to-red-500/5',
    description: 'Access Control & Authentication',
  },
  BUSINESS: {
    icon: Building2,
    color: '#8b5cf6',
    gradient: 'from-violet-500/20 to-violet-500/5',
    description: 'Company Information & Branding',
  },
  NOTIFICATIONS: {
    icon: Bell,
    color: '#06b6d4',
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    description: 'Alerts, Reports & Communications',
  },
};

// ============================================
// NEURAL PULSE ANIMATION
// ============================================

const NeuralPulse = ({ color }: { color: string }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute -top-1/2 -left-1/2 w-full h-full opacity-30"
      style={{
        background: `radial-gradient(circle at center, ${color}40, transparent 70%)`,
        animation: 'pulse 4s ease-in-out infinite',
      }}
    />
  </div>
);

// ============================================
// LIVE STATUS INDICATOR
// ============================================

const NeuralCoreIndicator = () => (
  <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/80 border border-zinc-700/50 rounded-full backdrop-blur-sm">
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
    </span>
    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Neural Core Active</span>
    <Cpu className="w-4 h-4 text-emerald-500" />
  </div>
);

// ============================================
// CATEGORY CARD COMPONENT
// ============================================

interface CategoryCardProps {
  category: string;
  settings: SettingItem[];
  isActive: boolean;
  onClick: () => void;
  changesCount: number;
}

const CategoryCard = ({ category, settings, isActive, onClick, changesCount }: CategoryCardProps) => {
  const config = CATEGORY_CONFIG[category] || {
    icon: Settings,
    color: '#71717a',
    gradient: 'from-zinc-500/20 to-zinc-500/5',
    description: 'System Settings',
  };
  const Icon = config.icon;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden p-5 rounded-2xl text-left transition-all duration-300 ${
        isActive
          ? 'bg-zinc-800/80 border-2 shadow-lg'
          : 'bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700/50'
      }`}
      style={{
        borderColor: isActive ? config.color : undefined,
        boxShadow: isActive ? `0 0 30px -10px ${config.color}40` : undefined,
      }}
    >
      {/* Neural Pulse Background */}
      {isActive && <NeuralPulse color={config.color} />}

      {/* Gradient Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50`}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: `${config.color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color: config.color }} />
          </div>
          {changesCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: config.color }}
            >
              {changesCount} unsaved
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-white mb-1">{category}</h3>
        <p className="text-[11px] text-zinc-500 line-clamp-1">{config.description}</p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50">
          <span className="text-[10px] text-zinc-600">{settings.length} settings</span>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90' : ''}`}
            style={{ color: isActive ? config.color : '#52525b' }}
          />
        </div>
      </div>
    </motion.button>
  );
};

// ============================================
// SETTING INPUT COMPONENT
// ============================================

interface SettingInputProps {
  setting: SettingItem;
  value: any;
  onChange: (key: string, value: any) => void;
  categoryColor: string;
}

const SettingInput = ({ setting, value, onChange, categoryColor }: SettingInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = setting.key.toLowerCase().includes('password') ||
                     setting.key.toLowerCase().includes('secret') ||
                     setting.key.toLowerCase().includes('pin');

  const getIcon = () => {
    const key = setting.key.toLowerCase();
    if (key.includes('email')) return Mail;
    if (key.includes('phone')) return MessageSquare;
    if (key.includes('receipt')) return Receipt;
    if (key.includes('vat') || key.includes('tax')) return Percent;
    if (key.includes('price') || key.includes('amount') || key.includes('threshold')) return DollarSign;
    if (key.includes('time') || key.includes('minutes') || key.includes('days')) return Clock;
    if (key.includes('password') || key.includes('pin')) return Key;
    if (key.includes('user') || key.includes('staff')) return Users;
    if (key.includes('stock') || key.includes('inventory')) return Package;
    if (key.includes('print')) return Printer;
    if (key.includes('report')) return FileText;
    if (key.includes('currency')) return Globe;
    return Hash;
  };

  const Icon = getIcon();

  // Boolean Toggle
  if (setting.dataType === 'boolean') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${categoryColor}10` }}
            >
              <Icon className="w-4 h-4" style={{ color: categoryColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white">{setting.label}</h4>
              {setting.description && (
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{setting.description}</p>
              )}
            </div>
          </div>

          {/* Premium Toggle Switch */}
          <button
            onClick={() => onChange(setting.key, !value)}
            disabled={setting.isLocked}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
              value ? 'bg-gradient-to-r shadow-lg' : 'bg-zinc-800'
            } ${setting.isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{
              background: value
                ? `linear-gradient(to right, ${categoryColor}, ${categoryColor}cc)`
                : undefined,
              boxShadow: value ? `0 0 15px ${categoryColor}40` : undefined,
            }}
          >
            <motion.div
              animate={{ x: value ? 28 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`absolute top-1 w-5 h-5 rounded-full shadow-md ${
                value ? 'bg-white' : 'bg-zinc-600'
              }`}
            />
            {value && (
              <Check
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/80"
              />
            )}
          </button>
        </div>

        {setting.isLocked && (
          <div className="absolute top-2 right-2">
            <Lock className="w-3 h-3 text-zinc-600" />
          </div>
        )}
      </motion.div>
    );
  }

  // Number Input
  if (setting.dataType === 'number') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-all"
      >
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg mt-1"
            style={{ backgroundColor: `${categoryColor}10` }}
          >
            <Icon className="w-4 h-4" style={{ color: categoryColor }} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-1">{setting.label}</h4>
            {setting.description && (
              <p className="text-xs text-zinc-500 mb-3">{setting.description}</p>
            )}
            <div className="relative">
              <input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(setting.key, e.target.value === '' ? '' : Number(e.target.value))}
                disabled={setting.isLocked}
                className={`w-full px-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 transition-all ${
                  setting.isLocked ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  '--tw-ring-color': categoryColor,
                } as any}
              />
              {setting.key.includes('rate') && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
              )}
              {(setting.key.includes('threshold') || setting.key.includes('amount')) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">KES</span>
              )}
            </div>
          </div>
        </div>

        {setting.isLocked && (
          <div className="absolute top-2 right-2">
            <Lock className="w-3 h-3 text-zinc-600" />
          </div>
        )}
      </motion.div>
    );
  }

  // String Input (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-all"
    >
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg mt-1"
          style={{ backgroundColor: `${categoryColor}10` }}
        >
          <Icon className="w-4 h-4" style={{ color: categoryColor }} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white mb-1">{setting.label}</h4>
          {setting.description && (
            <p className="text-xs text-zinc-500 mb-3">{setting.description}</p>
          )}
          <div className="relative">
            <input
              type={isPassword && !showPassword ? 'password' : 'text'}
              value={value ?? ''}
              onChange={(e) => onChange(setting.key, e.target.value)}
              disabled={setting.isLocked}
              className={`w-full px-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 transition-all ${
                setting.isLocked ? 'opacity-50 cursor-not-allowed' : ''
              } ${isPassword ? 'pr-10 font-mono' : ''}`}
              style={{
                '--tw-ring-color': categoryColor,
              } as any}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {setting.isLocked && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3 h-3 text-zinc-600" />
        </div>
      )}
    </motion.div>
  );
};

// ============================================
// RECEIPT PREVIEW COMPONENT
// ============================================

interface ReceiptPreviewProps {
  settings: Record<string, any>;
}

const ReceiptPreview = ({ settings }: ReceiptPreviewProps) => {
  const now = new Date();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl p-6 shadow-2xl max-w-[300px] mx-auto font-mono text-[11px] text-black"
    >
      {/* Header */}
      <div className="text-center border-b border-dashed border-zinc-300 pb-4 mb-4">
        {settings.show_logo_on_receipt && (
          <div className="w-12 h-12 bg-zinc-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-zinc-500" />
          </div>
        )}
        <h3 className="text-sm font-bold uppercase tracking-wider">
          {settings.receipt_header || 'PRAM AUTO SPARES'}
        </h3>
        <p className="text-zinc-600 text-[10px] mt-1">
          {settings.company_phone || '+254 700 000 000'}
        </p>
        {settings.kra_pin && (
          <p className="text-zinc-500 text-[9px]">KRA PIN: {settings.kra_pin}</p>
        )}
      </div>

      {/* Receipt Details */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span className="text-zinc-600">Receipt:</span>
          <span className="font-bold">{settings.receipt_prefix || 'RCP'}-0001</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Date:</span>
          <span>{now.toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Time:</span>
          <span>{now.toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-600">Cashier:</span>
          <span>Josea</span>
        </div>
      </div>

      <div className="border-t border-dashed border-zinc-300 pt-3 mb-3">
        <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 mb-2">
          <span>Item</span>
          <span>Total</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div>
              <p className="font-medium">Brake Pad Set</p>
              <p className="text-zinc-500 text-[9px]">2 x 1,500.00</p>
            </div>
            <span className="font-bold">3,000.00</span>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="font-medium">Oil Filter</p>
              <p className="text-zinc-500 text-[9px]">1 x 800.00</p>
            </div>
            <span className="font-bold">800.00</span>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-dashed border-zinc-300 pt-3 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>3,800.00</span>
        </div>
        {settings.vat_enabled && settings.show_vat_breakdown && (
          <div className="flex justify-between text-zinc-600">
            <span>VAT ({settings.vat_rate || 16}%):</span>
            <span>{settings.prices_include_vat ? 'Incl.' : '608.00'}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm pt-2 border-t border-zinc-200">
          <span>TOTAL:</span>
          <span>KES 3,800.00</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 pt-4 border-t border-dashed border-zinc-300">
        <p className="text-zinc-600 text-[10px]">
          {settings.receipt_footer || 'Thank you for your business!'}
        </p>
        <div className="mt-3 mx-auto w-32 h-8 bg-zinc-200 flex items-center justify-center text-[8px] text-zinc-500">
          [BARCODE]
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// LOADING SKELETON
// ============================================

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-black p-6 animate-pulse">
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-8 bg-zinc-800 rounded-lg w-48" />
          <div className="h-4 bg-zinc-800/50 rounded w-64" />
        </div>
        <div className="h-10 bg-zinc-800 rounded-full w-40" />
      </div>
      <div className="grid grid-cols-6 gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-zinc-900 rounded-2xl p-5 h-36" />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 bg-zinc-900 rounded-2xl p-6 h-[500px]" />
        <div className="col-span-4 bg-zinc-900 rounded-2xl p-6 h-[500px]" />
      </div>
    </div>
  </div>
);

// ============================================
// MAIN SYSTEM CONFIG COMPONENT
// ============================================

export default function SystemConfig() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('POS');
  const [localChanges, setLocalChanges] = useState<Record<string, any>>({});
  const [showResetModal, setShowResetModal] = useState(false);

  // Fetch all settings
  const fetchSettings = async () => {
    try {
      const response = await axios.get('/settings');
      if (response.data.success) {
        setSettings(response.data.data);

        // If no settings exist, initialize defaults
        if (response.data.totalSettings === 0) {
          await initializeDefaults();
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings', {
        description: error.response?.data?.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize default settings
  const initializeDefaults = async () => {
    try {
      const response = await axios.post('/settings/initialize');
      if (response.data.success) {
        toast.success('Settings initialized', {
          description: `Created ${response.data.created} default settings`,
        });
        await fetchSettings();
      }
    } catch (error: any) {
      console.error('Failed to initialize settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Get merged settings (original + local changes)
  const getMergedSettings = useMemo(() => {
    const merged: Record<string, any> = {};

    // Flatten all settings
    Object.values(settings).flat().forEach(setting => {
      merged[setting.key] = localChanges[setting.key] ?? setting.value;
    });

    return merged;
  }, [settings, localChanges]);

  // Handle setting change
  const handleChange = (key: string, value: any) => {
    setLocalChanges(prev => ({ ...prev, [key]: value }));
  };

  // Count changes per category
  const getChangesCount = (category: string) => {
    const categorySettings = settings[category] || [];
    return categorySettings.filter(s =>
      localChanges[s.key] !== undefined && localChanges[s.key] !== s.value
    ).length;
  };

  // Total unsaved changes
  const totalChanges = Object.keys(localChanges).filter(key => {
    const setting = Object.values(settings).flat().find(s => s.key === key);
    return setting && localChanges[key] !== setting.value;
  }).length;

  // Save changes
  const handleSave = async () => {
    if (totalChanges === 0) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading('Saving configuration...', {
      description: `Updating ${totalChanges} settings`,
    });

    try {
      const updates = Object.entries(localChanges)
        .filter(([key]) => {
          const setting = Object.values(settings).flat().find(s => s.key === key);
          return setting && localChanges[key] !== setting.value;
        })
        .map(([key, value]) => {
          return {
            category: Object.keys(settings).find(cat =>
              settings[cat].some(s => s.key === key)
            ),
            key,
            value,
          };
        });

      const response = await axios.put('/settings', { settings: updates });

      toast.dismiss(loadingToast);

      if (response.data.success) {
        toast.success('Configuration saved!', {
          description: `Updated ${response.data.updated?.length || totalChanges} settings`,
        });
        setLocalChanges({});
        await fetchSettings();
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Failed to save', {
        description: error.response?.data?.message || 'Please try again',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset changes
  const handleResetChanges = () => {
    setLocalChanges({});
    toast.info('Changes discarded');
  };

  // Reset to defaults
  const handleResetToDefaults = async () => {
    setSaving(true);
    const loadingToast = toast.loading('Resetting to defaults...');

    try {
      const response = await axios.post(`/settings/reset/${activeCategory}`);
      toast.dismiss(loadingToast);

      if (response.data.success) {
        toast.success('Reset complete', {
          description: `${activeCategory} settings restored to defaults`,
        });
        setShowResetModal(false);
        setLocalChanges({});
        await fetchSettings();
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Reset failed', {
        description: error.response?.data?.message || 'Only owners can reset settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const categoryConfig = CATEGORY_CONFIG[activeCategory] || CATEGORY_CONFIG.POS;
  const currentSettings = settings[activeCategory] || [];

  return (
    <div className="min-h-screen bg-black">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Cpu className="w-7 h-7 text-emerald-500" />
                <h1 className="text-2xl font-bold text-white">System Configuration</h1>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Neural Core
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                Central configuration hub for all system parameters
              </p>
            </div>
            <div className="flex items-center gap-3">
              {totalChanges > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">{totalChanges} unsaved</span>
                </motion.div>
              )}
              <NeuralCoreIndicator />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Category Navigation */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          {Object.keys(CATEGORY_CONFIG).map(category => (
            <CategoryCard
              key={category}
              category={category}
              settings={settings[category] || []}
              isActive={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              changesCount={getChangesCount(category)}
            />
          ))}
        </div>

        {/* Settings Panel */}
        <div className="grid grid-cols-12 gap-6">
          {/* Settings List */}
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-8"
          >
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden">
              {/* Panel Header */}
              <div
                className="px-6 py-4 border-b border-zinc-800/50"
                style={{ background: `linear-gradient(to right, ${categoryConfig.color}10, transparent)` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl"
                      style={{ backgroundColor: `${categoryConfig.color}15` }}
                    >
                      {(() => {
                        const Icon = categoryConfig.icon;
                        return <Icon className="w-5 h-5" style={{ color: categoryConfig.color }} />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{activeCategory} Settings</h2>
                      <p className="text-xs text-zinc-500">{categoryConfig.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowResetModal(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg text-zinc-400 hover:text-white text-xs font-medium transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Settings Grid */}
              <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {currentSettings.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No settings configured</p>
                    <button
                      onClick={initializeDefaults}
                      className="mt-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      Initialize Defaults
                    </button>
                  </div>
                ) : (
                  currentSettings.map((setting) => (
                    <SettingInput
                      key={setting.key}
                      setting={setting}
                      value={localChanges[setting.key] ?? setting.value}
                      onChange={handleChange}
                      categoryColor={categoryConfig.color}
                    />
                  ))
                )}
              </div>

              {/* Action Bar */}
              <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <Activity className="w-4 h-4" />
                    <span>{currentSettings.length} settings in category</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {totalChanges > 0 && (
                      <button
                        onClick={handleResetChanges}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm font-medium transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Discard
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={totalChanges === 0 || saving}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all ${
                        totalChanges > 0
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {saving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Preview Panel */}
          <div className="col-span-4">
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden sticky top-24">
              <div className="px-6 py-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Eye className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Live Preview</h3>
                    <p className="text-xs text-zinc-500">Receipt preview with your settings</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-b from-zinc-950/50 to-zinc-900/30">
                <ReceiptPreview settings={getMergedSettings} />
              </div>

              <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-950/30">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Printer className="w-4 h-4" />
                  <span>
                    {getMergedSettings.thermal_printer_width || 80}mm thermal paper
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowResetModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Reset to Defaults</h3>
                    <p className="text-sm text-zinc-500">This action cannot be undone</p>
                  </div>
                </div>

                <p className="text-zinc-400 text-sm mb-6">
                  Are you sure you want to reset all <span className="font-bold text-white">{activeCategory}</span> settings
                  to their default values? Any custom configurations will be lost.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetToDefaults}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white text-sm font-bold transition-colors"
                  >
                    {saving ? 'Resetting...' : 'Reset to Defaults'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}
