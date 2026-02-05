import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Settings,
  AlertTriangle,
  X,
  Package,
  TrendingUp,
  CarFront,
  CheckCircle2,
  ChevronDown,
  Globe,
  Building2,
  Filter,
  Plus,
  Truck,
  DollarSign,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { formatKES } from '../../utils/formatter';
import axios from '../../api/axios';
import AddProductWizard from '../../components/products/AddProductWizard';
import { toast, Toaster } from 'sonner';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Distribution {
  branchId: string;
  branch: string;
  quantity: number;
  sellingPrice: number | null;
  lowStockThreshold: number | null;
  isActive?: boolean;
}

interface Product {
  id: string;
  name: string;
  partNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  globalQuantity: number;
  distribution: Distribution[];
  lowStockStatus: boolean;
  profitMargin: number;
  updatedAt: string;
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  isActive: boolean;
}

interface Supplier {
  id: string;
  name: string;
  location: string;
  branchName: string;
  isActive: boolean;
}

interface InventoryUpdate {
  branchId: string;
  quantity?: number;
  sellingPrice?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}

type ViewContext = 'GLOBAL' | 'CRITICAL' | string; // 'GLOBAL', 'CRITICAL', or branchId

// ============================================
// SOUND NOTIFICATION HELPER
// ============================================

const playNotification = (type: 'success' | 'error') => {
  try {
    const soundFile = type === 'success' ? '/sounds/info.mp3' : '/sounds/error.mp3';
    const audio = new Audio(soundFile);
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch(err => {
      console.warn('Audio playback failed:', err);
    });
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
};

// ============================================
// SAFE FORMATTER UTILITIES
// ============================================

const safeFormatKES = (value: any): string => {
  try {
    const num = Number(value);
    if (isNaN(num)) return formatKES(0);
    return formatKES(num);
  } catch {
    return formatKES(0);
  }
};

// ============================================
// CONTEXT SWITCHER (ENHANCED DROPDOWN)
// ============================================

interface ContextSwitcherProps {
  branches: Branch[];
  currentContext: ViewContext;
  onContextChange: (context: ViewContext) => void;
}

const ContextSwitcher = ({ branches, currentContext, onContextChange }: ContextSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Debug logging
  console.log('🔄 ContextSwitcher rendered with:', {
    branchesCount: branches.length,
    branches: branches,
    currentContext
  });

  const getCurrentLabel = () => {
    if (currentContext === 'GLOBAL') return 'Global Overview';
    if (currentContext === 'CRITICAL') return 'Critical Stock Only';
    const branch = branches.find(b => b.id === currentContext);
    return branch ? branch.name : 'Global Overview';
  };

  const getCurrentIcon = () => {
    if (currentContext === 'GLOBAL') return '🌍';
    if (currentContext === 'CRITICAL') return '⚠️';
    return '🏢';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl text-white font-bold hover:bg-zinc-800 transition-all flex items-center gap-3 min-w-[240px] text-sm uppercase tracking-wide"
      >
        {currentContext === 'GLOBAL' ? (
          <Globe className="w-5 h-5 text-indigo-400" />
        ) : currentContext === 'CRITICAL' ? (
          <AlertTriangle className="w-5 h-5 text-red-400" />
        ) : (
          <Building2 className="w-5 h-5 text-amber-400" />
        )}
        <span className="flex-1 text-left flex items-center gap-2">
          <span>{getCurrentIcon()}</span>
          <span>{getCurrentLabel()}</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 right-0 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-20"
            >
              {/* Global Option */}
              <button
                onClick={() => {
                  onContextChange('GLOBAL');
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                  currentContext === 'GLOBAL'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-zinc-800'
                }`}
              >
                <Globe className="w-5 h-5" />
                <span className="flex-1 text-left font-medium">🌍 Global Overview</span>
                {currentContext === 'GLOBAL' && (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Critical Stock Filter */}
              <button
                onClick={() => {
                  onContextChange('CRITICAL');
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                  currentContext === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-zinc-800'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span className="flex-1 text-left font-medium">⚠️ Critical Stock Only</span>
                {currentContext === 'CRITICAL' && (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Divider */}
              <div className="border-t border-zinc-700 my-1" />

              {/* Branch Options */}
              <div className="max-h-64 overflow-y-auto">
                {branches.length === 0 ? (
                  <div className="px-4 py-3 text-center text-zinc-500 text-sm">
                    No branches available
                  </div>
                ) : (
                  branches.filter(b => b.isActive).map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        console.log('🏢 Branch selected:', branch.name, branch.id);
                        onContextChange(branch.id);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                        currentContext === branch.id
                          ? 'bg-amber-600 text-white'
                          : 'text-gray-300 hover:bg-zinc-800'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="flex-1 text-left font-medium">🏢 {branch.name}</span>
                      {currentContext === branch.id && (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// MASTER CONTROLLER MODAL (DARK MODE REGISTRY)
// ============================================

interface MasterControllerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  branches: Branch[];
  suppliers: Supplier[];
  onSave: (productData: any, inventoryUpdates: InventoryUpdate[]) => void;
}

const MasterControllerModal = ({
  isOpen,
  onClose,
  product,
  branches,
  suppliers,
  onSave,
}: MasterControllerModalProps) => {
  const [activeTab, setActiveTab] = useState<'essentials' | 'branches'>('essentials');
  const [branchUpdates, setBranchUpdates] = useState<Record<string, InventoryUpdate>>({});

  // Initialize formData directly from product props to ensure immediate display
  const [formData, setFormData] = useState(() => {
    if (product) {
      return {
        name: product.name || '',
        partNumber: product.partNumber || '',
        vehicleMake: product.vehicleMake || '',
        vehicleModel: product.vehicleModel || '',
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        lowStockThreshold: product.lowStockThreshold || 0,
        supplierId: '',  // Will be populated if linked
        buyingPrice: '' as number | string,  // Optional buying price
      };
    }
    return {
      name: '',
      partNumber: '',
      vehicleMake: '',
      vehicleModel: '',
      costPrice: 0,
      sellingPrice: 0,
      lowStockThreshold: 0,
      supplierId: '',
      buyingPrice: '' as number | string,
    };
  });

  // Reset form and tab when product changes
  useEffect(() => {
    if (product) {
      // Reset to essentials tab when new product opens
      setActiveTab('essentials');

      // Update form data with current product values
      setFormData({
        name: product.name || '',
        partNumber: product.partNumber || '',
        vehicleMake: product.vehicleMake || '',
        vehicleModel: product.vehicleModel || '',
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        lowStockThreshold: product.lowStockThreshold || 0,
        supplierId: '',  // Optional - can be set to link with procurement
        buyingPrice: '',  // Optional buying price from supplier
      });

      // CRITICAL: Initialize branch updates with EXISTING inventory data
      // This ensures users see current overrides, not blank fields
      if (branches.length > 0) {
        const updates: Record<string, InventoryUpdate> = {};

        branches.forEach((branch) => {
          // Find existing distribution for this branch
          const existingDist = product.distribution.find((d) => d.branchId === branch.id);

          if (existingDist) {
            // Branch HAS inventory - pre-fill with current values
            updates[branch.id] = {
              branchId: branch.id,
              quantity: existingDist.quantity,
              isActive: existingDist.isActive !== undefined ? existingDist.isActive : true,
              // Only include override if it exists (not null)
              ...(existingDist.sellingPrice !== null && {
                sellingPrice: Number(existingDist.sellingPrice),
              }),
              ...(existingDist.lowStockThreshold !== null && {
                lowStockThreshold: Number(existingDist.lowStockThreshold),
              }),
            };
          } else {
            // Branch has NO inventory - initialize empty with isActive false
            updates[branch.id] = {
              branchId: branch.id,
              quantity: 0,
              isActive: false,
            };
          }
        });

        setBranchUpdates(updates);
      }
    }
  }, [product, branches]);

  const handleBranchUpdate = (branchId: string, field: string, value: string | boolean) => {
    setBranchUpdates((prev) => {
      const currentUpdate: InventoryUpdate = prev[branchId] || { branchId };

      // Handle boolean values (for isActive checkbox)
      if (typeof value === 'boolean') {
        return {
          ...prev,
          [branchId]: {
            ...currentUpdate,
            [field]: value,
          },
        };
      }

      // If empty string, remove the field (use global default)
      if (value === '' || value === null || value === undefined) {
        const { [field as keyof InventoryUpdate]: _removed, ...rest } = currentUpdate;
        return {
          ...prev,
          [branchId]: { branchId, ...rest } as InventoryUpdate,
        };
      }

      // Otherwise, set the numeric value
      return {
        ...prev,
        [branchId]: {
          ...currentUpdate,
          [field]: Number(value),
        },
      };
    });
  };

  const handleSave = () => {
    // Build inventory updates array with proper format
    // Include ALL branches to handle visibility and stock changes
    const inventoryUpdates = Object.values(branchUpdates)
      .map((update) => ({
        branchId: update.branchId,
        // Always include isActive and quantity
        isActive: update.isActive !== undefined ? update.isActive : true,
        quantity: update.quantity !== undefined ? Number(update.quantity) : 0,
        // Only include pricing overrides if explicitly set
        ...(update.sellingPrice !== undefined && {
          sellingPrice: Number(update.sellingPrice)
        }),
        ...(update.lowStockThreshold !== undefined && {
          lowStockThreshold: Number(update.lowStockThreshold)
        }),
      }));

    // Call parent save handler with product data and inventory updates
    onSave(formData, inventoryUpdates);
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Glass Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dark Modal Content */}
      <motion.div
        key={product.id} // Force re-render when product changes
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-zinc-900/50 border-b border-zinc-800 px-8 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <Settings className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">System Registry</h2>
            </div>
            <p className="text-zinc-500 text-sm font-mono">
              EDITING: <span className="text-indigo-400">{product.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors group"
          >
            <X className="w-6 h-6 text-zinc-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-zinc-800 bg-zinc-950/50 px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('essentials')}
              className={`py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'essentials'
                  ? 'border-indigo-500 text-indigo-500'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              General Information
            </button>
            <button
              onClick={() => setActiveTab('branches')}
              className={`py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'branches'
                  ? 'border-indigo-500 text-indigo-500'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Pricing Matrix
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8 overflow-y-auto flex-1 bg-zinc-950">
          {activeTab === 'essentials' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Part Number (SKU)
                  </label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, partNumber: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-indigo-400 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Vehicle Make
                  </label>
                  <div className="relative">
                    <CarFront className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        value={formData.vehicleMake}
                        onChange={(e) =>
                        setFormData({ ...formData, vehicleMake: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleModel}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleModel: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="h-px bg-zinc-900 w-full" />

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Base Cost Price
                  </label>
                  <input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: Number(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Base Selling Price
                  </label>
                  <input
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sellingPrice: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 bg-zinc-900 border border-emerald-900/50 rounded-xl text-emerald-400 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-red-500 uppercase tracking-wider">
                    Global Threshold
                  </label>
                  <input
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lowStockThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 bg-zinc-900 border border-red-900/50 rounded-xl text-red-400 font-mono font-bold focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Procurement Link Section (Optional) */}
              <div className="h-px bg-zinc-900 w-full" />

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                    Procurement Link
                  </h4>
                  <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                    Optional
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-4">
                  Link this product to a supplier to automatically populate the Procurement Catalog.
                </p>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      Supplier
                    </label>
                    <div className="relative">
                      <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <select
                        value={formData.supplierId}
                        onChange={(e) =>
                          setFormData({ ...formData, supplierId: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                      >
                        <option value="">No Supplier Linked</option>
                        {suppliers.filter(s => s.isActive).map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name} ({supplier.location})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Buying Price (KES)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="number"
                        placeholder="Wholesale price from supplier"
                        value={formData.buyingPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, buyingPrice: e.target.value })
                        }
                        disabled={!formData.supplierId}
                        className={`w-full pl-10 pr-4 py-3 bg-zinc-900 border rounded-xl font-mono placeholder-zinc-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                          !formData.supplierId
                            ? 'border-zinc-800/50 text-zinc-600 cursor-not-allowed'
                            : 'border-amber-900/50 text-amber-400'
                        }`}
                      />
                    </div>
                    {!formData.supplierId && (
                      <p className="text-[10px] text-zinc-600">Select a supplier first</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">
                    Branch Configuration
                </h3>
                <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                    Overrides Base Pricing
                </span>
              </div>

              <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/50">
                <table className="w-full text-left">
                  <thead className="bg-zinc-900 border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Visibility</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Stock Level</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Custom Price</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Alert Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {branches.filter(b => b.isActive).map((branch) => {
                      const dist = product.distribution.find((d) => d.branchId === branch.id);
                      const update = branchUpdates[branch.id] || { branchId: branch.id };

                      // Get current values (from state or existing distribution)
                      const currentPrice = update.sellingPrice ?? (dist?.sellingPrice || '');
                      const currentThreshold = update.lowStockThreshold ?? (dist?.lowStockThreshold || '');
                      const currentQuantity = update.quantity !== undefined ? update.quantity : (dist?.quantity || 0);
                      const currentIsActive = update.isActive !== undefined ? update.isActive : (dist?.isActive !== undefined ? dist.isActive : true);

                      // Check if custom values are set
                      const hasCustomPrice = update.sellingPrice !== undefined || dist?.sellingPrice !== null;
                      const hasCustomThreshold = update.lowStockThreshold !== undefined || dist?.lowStockThreshold !== null;

                      return (
                        <tr key={branch.id} className={`hover:bg-zinc-900 transition-all ${!currentIsActive ? 'opacity-50' : ''}`}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={currentIsActive}
                              onChange={(e) =>
                                handleBranchUpdate(
                                  branch.id,
                                  'isActive',
                                  e.target.checked
                                )
                              }
                              className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-zinc-300">{branch.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={currentQuantity}
                              onChange={(e) =>
                                handleBranchUpdate(
                                  branch.id,
                                  'quantity',
                                  e.target.value
                                )
                              }
                              disabled={!currentIsActive}
                              className={`w-32 px-3 py-2 bg-zinc-950 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                                !currentIsActive
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'border-zinc-700 text-white'
                              }`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <input
                                type="number"
                                placeholder={`Global: ${safeFormatKES(product.sellingPrice)}`}
                                value={currentPrice}
                                onChange={(e) =>
                                  handleBranchUpdate(
                                    branch.id,
                                    'sellingPrice',
                                    e.target.value
                                  )
                                }
                                disabled={!currentIsActive}
                                className={`w-40 px-3 py-2 bg-zinc-950 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-zinc-600 ${
                                  !currentIsActive
                                    ? 'opacity-50 cursor-not-allowed'
                                    : hasCustomPrice
                                    ? 'border-indigo-500 text-indigo-300 font-bold'
                                    : 'border-zinc-700 text-white'
                                }`}
                              />
                              {hasCustomPrice && currentIsActive && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <input
                                type="number"
                                placeholder={`Global: ${product.lowStockThreshold}`}
                                value={currentThreshold}
                                onChange={(e) =>
                                  handleBranchUpdate(
                                    branch.id,
                                    'lowStockThreshold',
                                    e.target.value
                                  )
                                }
                                disabled={!currentIsActive}
                                className={`w-28 px-3 py-2 bg-zinc-950 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder-zinc-600 ${
                                  !currentIsActive
                                    ? 'opacity-50 cursor-not-allowed'
                                    : hasCustomThreshold
                                    ? 'border-red-500 text-red-300 font-bold'
                                    : 'border-zinc-700 text-white'
                                }`}
                              />
                              {hasCustomThreshold && currentIsActive && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-8 py-6 bg-zinc-900 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-400 font-bold hover:bg-zinc-800 hover:text-white transition-colors text-sm uppercase tracking-wide"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-bold shadow-lg shadow-indigo-900/20 text-sm uppercase tracking-wide flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// MAIN GLOBAL INVENTORY PAGE
// ============================================

export default function GlobalInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewContext, setViewContext] = useState<ViewContext>('GLOBAL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = {};

      // Add search parameter
      if (searchQuery) params.search = searchQuery;

      // Add branch filter parameter (when specific branch is selected)
      if (viewContext !== 'GLOBAL' && viewContext !== 'CRITICAL') {
        params.branchId = viewContext; // Send branchId to backend
      }

      const response = await axios.get('/products/global/inventory', { params });
      setProducts(response.data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axios.get('/admin/branches');
      console.log('📍 Branches fetched:', response.data);
      setBranches(response.data.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch branches:', err);
      setBranches([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/procurement/suppliers');
      console.log('🚚 Suppliers fetched:', response.data);
      setSuppliers(response.data.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch suppliers:', err);
      setSuppliers([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchBranches();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, viewContext]); // Re-fetch when viewContext changes

  // ============================================
  // ESC KEY TO EXIT FULLSCREEN
  // ============================================
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTableFullscreen) {
        setIsTableFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isTableFullscreen]);

  const handleManageProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (productData: any, inventoryUpdates: InventoryUpdate[]) => {
    // Show loading toast
    const loadingToast = toast.loading('Updating product configuration...', {
      description: 'Please wait while we save your changes',
    });

    try {
      console.log('🚀 Sending product update:', {
        productId: selectedProduct?.id,
        productData,
        inventoryUpdates,
      });

      const response = await axios.put(`/products/${selectedProduct?.id}`, {
        ...productData,
        inventoryUpdates,
      });

      console.log('✅ Product update response:', response.data);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Play success sound
      playNotification('success');

      // Show success toast
      toast.success('Product updated successfully!', {
        description: `${productData.name} has been updated with new pricing and inventory settings.`,
        duration: 4000,
      });

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error('❌ Product update failed:', err);
      console.error('Error response:', err.response?.data);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Play error sound
      playNotification('error');

      const errorMessage = err.response?.data?.message || err.message || 'Failed to update product';

      // Show error toast
      toast.error('Update failed', {
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  // Filter products based on view context
  // Note: Branch filtering is now handled by the backend for performance
  const filteredProducts = products.filter((product) => {
    // CRITICAL filter: Client-side filter for low stock products
    if (viewContext === 'CRITICAL') {
      return product.lowStockStatus === true;
    }

    // GLOBAL & BRANCH views: Backend already filtered the data
    // No additional filtering needed
    return true;
  });

  // Get current context label for header
  const getContextLabel = () => {
    if (viewContext === 'GLOBAL') return 'Centralized Stock Control & Pricing Matrix';
    if (viewContext === 'CRITICAL') return 'Critical Stock Alert View';
    const branch = branches.find(b => b.id === viewContext);
    return branch ? `Viewing: ${branch.name}` : 'Centralized Stock Control & Pricing Matrix';
  };

  const isBranchView = viewContext !== 'GLOBAL' && viewContext !== 'CRITICAL';

  return (
    <div className="min-h-screen bg-[#09090b] py-8 px-6 font-sans">
      {/* 1. Header Section */}
      <div className="max-w-[1400px] mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
                    Global Inventory
                </h1>
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                    Enterprise
                </span>
            </div>
            <p className="text-zinc-500 font-medium flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {getContextLabel()}
            </p>
        </div>

        {/* Add Product Button */}
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 uppercase tracking-wide text-sm group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span>New Item</span>
        </button>
      </div>

      {/* 2. Command Bar (Floating) */}
      <div className="max-w-[1400px] mx-auto mb-8 sticky top-4 z-30">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-2 rounded-2xl flex flex-col md:flex-row gap-2 shadow-2xl">
            {/* Search */}
            <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                <input
                    type="text"
                    placeholder="Search by name, part number, or vehicle make..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl text-white placeholder-zinc-600 focus:bg-zinc-950 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-medium"
                />
            </div>

            {/* Context Switcher */}
            <ContextSwitcher
              branches={branches}
              currentContext={viewContext}
              onContextChange={setViewContext}
            />
        </div>
      </div>

      {/* 3. The Data Terminal (High Contrast White Card) */}
      <div className="max-w-[1400px] mx-auto">
        <div className={`bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-zinc-800 transition-all duration-300 ${
          isTableFullscreen
            ? 'fixed inset-4 z-50 max-w-none flex flex-col'
            : 'relative'
        }`}>
          {/* Fullscreen Toggle Button - Highly Visible */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setIsTableFullscreen(!isTableFullscreen)}
              className={`group flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg ${
                isTableFullscreen
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700'
              }`}
              title={isTableFullscreen ? 'Exit Fullscreen (ESC)' : 'Expand Fullscreen'}
            >
              {isTableFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          </div>

          {/* Table Content */}
          <div className={`overflow-x-auto ${isTableFullscreen ? 'flex-1' : ''}`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zinc-900 mb-4"></div>
                <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Loading Catalog...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-32">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
                <p className="text-red-600 text-lg font-bold">{error}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="bg-zinc-100 p-6 rounded-full mb-6">
                    <Package className="w-12 h-12 text-zinc-400" />
                </div>
                <p className="text-zinc-900 font-bold text-lg">No Inventory Found</p>
                <p className="text-zinc-500 text-sm mt-1">
                  {viewContext === 'CRITICAL'
                    ? 'No critical stock items - all inventory levels are healthy!'
                    : isBranchView
                    ? 'No products found for this branch'
                    : 'Adjust filters to see results'
                  }
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-zinc-400 uppercase tracking-widest">Product Identity</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-zinc-400 uppercase tracking-widest">Fitment</th>
                    {!isBranchView ? (
                      <>
                        <th className="px-6 py-5 text-left text-[11px] font-black text-zinc-400 uppercase tracking-widest">Global Stock</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black text-zinc-400 uppercase tracking-widest">Distribution</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-5 text-left text-[11px] font-black text-zinc-400 uppercase tracking-widest">Branch Stock</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black text-zinc-400 uppercase tracking-widest">Branch Price</th>
                        <th className="px-6 py-5 text-left text-[11px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                      </>
                    )}
                    <th className="px-6 py-5 text-right text-[11px] font-black text-zinc-400 uppercase tracking-widest">Cost (KES)</th>
                    <th className="px-6 py-5 text-right text-[11px] font-black text-zinc-400 uppercase tracking-widest">Price (KES)</th>
                    <th className="px-6 py-5 text-right text-[11px] font-black text-zinc-400 uppercase tracking-widest">Margin</th>
                    <th className="px-6 py-5 text-center text-[11px] font-black text-zinc-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProducts.map((product, index) => {
                    // Get branch-specific data if in branch mode
                    const branchDist = isBranchView
                      ? product.distribution.find(d => d.branchId === viewContext)
                      : null;

                    const branchStock = branchDist?.quantity || 0;
                    const branchPrice = branchDist?.sellingPrice || product.sellingPrice;
                    const branchThreshold = branchDist?.lowStockThreshold || product.lowStockThreshold;
                    const branchLowStock = branchStock <= branchThreshold;

                    return (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="group hover:bg-indigo-50/30 transition-colors"
                      >
                        {/* 1. Product Identity */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-zinc-900 text-sm group-hover:text-indigo-700 transition-colors">
                              {product.name}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded w-fit border border-zinc-200">
                              {product.partNumber || 'NO SKU'}
                            </span>
                          </div>
                        </td>

                        {/* 2. Vehicle */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700">
                                  <CarFront className="w-3 h-3 text-zinc-400" />
                                  {product.vehicleMake || 'Universal'}
                              </span>
                              <span className="text-[11px] text-zinc-500 pl-4">
                                  {product.vehicleModel || 'All Models'}
                              </span>
                          </div>
                        </td>

                        {/* Conditional Columns Based on View Context */}
                        {!isBranchView ? (
                          <>
                            {/* 3. Global Level */}
                            <td className="px-6 py-4 align-top">
                              <div className="flex flex-col items-start gap-2">
                                  {product.lowStockStatus ? (
                                      <div className="flex items-center gap-2 bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100">
                                          <AlertTriangle className="w-3 h-3" />
                                          <span className="text-xs font-bold">CRITICAL</span>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span className="text-xs font-bold">HEALTHY</span>
                                      </div>
                                  )}
                                  <span className="text-2xl font-black text-zinc-900 tracking-tight font-mono ml-1">
                                      {product.globalQuantity}
                                  </span>
                              </div>
                            </td>

                            {/* 4. Distribution (Vertical Stack) */}
                            <td className="px-6 py-4 align-top">
                              <div className="flex flex-col gap-1.5">
                                {product.distribution.map((dist, i) => (
                                  <div key={i} className="flex items-center justify-between gap-4 text-xs">
                                      <span className="font-bold text-zinc-500 uppercase tracking-wide text-[10px] w-12 truncate">
                                          {dist.branch}
                                      </span>
                                      <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-16 bg-zinc-100 rounded-full overflow-hidden">
                                              <div
                                                  className={`h-full rounded-full ${dist.quantity > 0 ? 'bg-zinc-400' : 'bg-red-200'}`}
                                                  style={{ width: `${Math.min(100, (dist.quantity / 50) * 100)}%` }}
                                              />
                                          </div>
                                          <span className={`font-mono font-bold w-6 text-right ${dist.quantity === 0 ? 'text-red-500' : 'text-zinc-700'}`}>
                                              {dist.quantity}
                                          </span>
                                      </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Branch Mode: Branch Stock */}
                            <td className="px-6 py-4 align-top">
                              <span className="text-2xl font-black text-zinc-900 tracking-tight font-mono">
                                {branchStock}
                              </span>
                            </td>

                            {/* Branch Mode: Branch Price */}
                            <td className="px-6 py-4 align-top">
                              <div className="flex flex-col gap-1">
                                <span className="font-mono font-bold text-zinc-900 text-sm">
                                  {safeFormatKES(branchPrice)}
                                </span>
                                {branchDist?.sellingPrice && (
                                  <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                                    CUSTOM
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Branch Mode: Status */}
                            <td className="px-6 py-4 align-top">
                              {branchLowStock ? (
                                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                                  <AlertTriangle className="w-3 h-3" />
                                  LOW
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  <CheckCircle2 className="w-3 h-3" />
                                  OK
                                </div>
                              )}
                            </td>
                          </>
                        )}

                        {/* 5. Cost */}
                        <td className="px-6 py-4 align-top text-right">
                          <span className="font-mono text-sm text-zinc-900">
                            {safeFormatKES(product.costPrice)}
                          </span>
                        </td>

                        {/* 6. Selling Price (Global) */}
                        <td className="px-6 py-4 align-top text-right">
                          <span className="font-mono font-bold text-zinc-900 text-sm bg-zinc-50 px-2 py-1 rounded">
                            {safeFormatKES(product.sellingPrice)}
                          </span>
                        </td>

                        {/* 7. Margin */}
                        <td className="px-6 py-4 align-top text-right">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded font-mono text-xs font-bold ${
                              product.profitMargin > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                              {product.profitMargin > 0 && <TrendingUp className="w-3 h-3" />}
                              {product.profitMargin > 0 ? '+' : ''}
                              {safeFormatKES(product.profitMargin)}
                          </div>
                        </td>

                        {/* 8. Action */}
                        <td className="px-6 py-4 align-top text-center">
                          <button
                            onClick={() => handleManageProduct(product)}
                            className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Manage Product"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Master Controller Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <MasterControllerModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            product={selectedProduct}
            branches={branches}
            suppliers={suppliers}
            onSave={handleSaveProduct}
          />
        )}
      </AnimatePresence>

      {/* Add Product Wizard */}
      <AnimatePresence>
        {isWizardOpen && (
          <AddProductWizard
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            branches={branches}
            suppliers={suppliers}
            onSuccess={() => {
              fetchProducts(); // Refresh product list
              setIsWizardOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen Backdrop */}
      {isTableFullscreen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsTableFullscreen(false)}
        />
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#fafafa',
          },
          className: 'font-sans',
        }}
      />
    </div>
  );
}
