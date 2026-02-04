import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Package,
  Building2,
  CheckCircle2,
  AlertCircle,
  Truck,
  DollarSign,
  ChevronDown,
} from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'sonner';

// ============================================
// TYPE DEFINITIONS
// ============================================

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

interface BranchDistribution {
  branchId: string;
  branchName: string;
  enabled: boolean;
  quantity: number;
  sellingPrice: number | string;
  lowStockThreshold: number | string;
}

interface ProductFormData {
  name: string;
  partNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  category: string;
  costPrice: number | string;
  sellingPrice: number | string;
  lowStockThreshold: number | string;
  supplierId: string;
  buyingPrice: number | string;
}

interface AddProductWizardProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  suppliers?: Supplier[];
  onSuccess: () => void;
}

// ============================================
// STEPPER COMPONENT
// ============================================

interface StepperProps {
  currentStep: number;
  steps: string[];
}

const Stepper = ({ currentStep, steps }: StepperProps) => {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                index < currentStep
                  ? 'bg-emerald-600 text-white'
                  : index === currentStep
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/30'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
            </div>
            <span
              className={`mt-2 text-xs font-bold uppercase tracking-wider ${
                index <= currentStep ? 'text-white' : 'text-zinc-600'
              }`}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-1 mx-4 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-600"
                initial={{ width: '0%' }}
                animate={{ width: index < currentStep ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN WIZARD COMPONENT
// ============================================

export default function AddProductWizard({
  isOpen,
  onClose,
  branches,
  suppliers = [],
  onSuccess,
}: AddProductWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = ['Product Details', 'Base Financials', 'Distribution'];

  // Audio helper to prevent promise rejection errors
  const playAudio = (url: string) => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Silently handle audio playback failures
      });
    } catch (error) {
      // Silently handle audio creation failures
    }
  };

  // Form data state
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    partNumber: '',
    vehicleMake: '',
    vehicleModel: '',
    category: 'GENERAL',
    costPrice: '',
    sellingPrice: '',
    lowStockThreshold: 5,
    supplierId: '',
    buyingPrice: '',
  });

  // Distribution state
  const [distribution, setDistribution] = useState<BranchDistribution[]>([]);

  // Initialize distribution when branches change
  useEffect(() => {
    if (branches.length > 0 && distribution.length === 0) {
      const initialDistribution = branches
        .filter((b) => b.isActive)
        .map((branch) => ({
          branchId: branch.id,
          branchName: branch.name,
          enabled: false,
          quantity: 0,
          sellingPrice: formData.sellingPrice || '',
          lowStockThreshold: formData.lowStockThreshold || 5,
        }));
      setDistribution(initialDistribution);
    }
  }, [branches]);

  // Update distribution prices when global selling price changes
  useEffect(() => {
    if (formData.sellingPrice) {
      setDistribution((prev) =>
        prev.map((dist) => ({
          ...dist,
          sellingPrice: dist.sellingPrice === '' ? formData.sellingPrice : dist.sellingPrice,
        }))
      );
    }
  }, [formData.sellingPrice]);

  // Calculate total stock
  const totalStock = distribution
    .filter((d) => d.enabled)
    .reduce((sum, d) => sum + Number(d.quantity || 0), 0);

  // Validation
  const validateStep = () => {
    setError(null);

    if (currentStep === 0) {
      if (!formData.name.trim()) {
        setError('Product name is required');
        return false;
      }
      if (!formData.partNumber.trim()) {
        setError('Part number is required');
        return false;
      }
    }

    if (currentStep === 1) {
      if (!formData.costPrice || Number(formData.costPrice) <= 0) {
        setError('Valid cost price is required');
        return false;
      }
      if (!formData.sellingPrice || Number(formData.sellingPrice) <= 0) {
        setError('Valid selling price is required');
        return false;
      }
      if (Number(formData.sellingPrice) <= Number(formData.costPrice)) {
        setError('Selling price must be greater than cost price');
        return false;
      }
    }

    return true;
  };

  // Navigation
  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Toggle branch enable
  const toggleBranch = (branchId: string) => {
    setDistribution((prev) =>
      prev.map((dist) =>
        dist.branchId === branchId ? { ...dist, enabled: !dist.enabled } : dist
      )
    );
  };

  // Update distribution field
  const updateDistribution = (branchId: string, field: string, value: any) => {
    setDistribution((prev) =>
      prev.map((dist) =>
        dist.branchId === branchId ? { ...dist, [field]: value } : dist
      )
    );
  };

  // Submit
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Show loading toast
      toast.loading('Creating product...', { id: 'create-product' });

      // Build distribution payload
      const distributionPayload = distribution
        .filter((dist) => dist.enabled)
        .map((dist) => ({
          branchId: dist.branchId,
          quantity: Number(dist.quantity) || 0,
          sellingPrice: dist.sellingPrice !== '' ? Number(dist.sellingPrice) : null,
          lowStockThreshold: dist.lowStockThreshold !== '' ? Number(dist.lowStockThreshold) : null,
          isActive: true,
        }));

      // Build product payload
      const payload = {
        name: formData.name,
        partNumber: formData.partNumber,
        vehicleMake: formData.vehicleMake || null,
        vehicleModel: formData.vehicleModel || null,
        category: formData.category,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        lowStockThreshold: Number(formData.lowStockThreshold),
        isActive: true,
        distribution: distributionPayload,
        // Optional: Procurement link - only include if supplier is selected
        ...(formData.supplierId && {
          supplierId: formData.supplierId,
          buyingPrice: formData.buyingPrice ? Number(formData.buyingPrice) : null,
        }),
      };

      console.log('📦 Creating product with payload:', payload);

      await axios.post('/products', payload);

      // Dismiss loading toast
      toast.dismiss('create-product');

      // Play success sound
      playAudio('/sounds/success.mp3');

      // Show success toast
      toast.success('Product Created', {
        description: 'Inventory has been updated.',
      });

      // Close modal after delay to show success message
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('❌ Product creation failed:', err);

      // Dismiss loading toast
      toast.dismiss('create-product');

      // Play error sound
      playAudio('/sounds/error.mp3');

      // Show user-friendly error toast (ignore backend error message)
      toast.error('Action Failed', {
        description: "We couldn't save this product. Please try again.",
      });

      // Keep the modal OPEN so user doesn't lose their data
      setError("We couldn't save this product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-zinc-900/50 border-b border-zinc-800 px-8 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Add New Product
              </h2>
            </div>
            <p className="text-zinc-500 text-sm">
              Create a product with multi-branch distribution
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors group"
          >
            <X className="w-6 h-6 text-zinc-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-8 pt-6">
          <Stepper currentStep={currentStep} steps={steps} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 bg-zinc-950">
          <AnimatePresence mode="wait">
            {/* Step 1: Product Details */}
            {currentStep === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Brake Pad Set"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Part Number (SKU) *
                    </label>
                    <input
                      type="text"
                      value={formData.partNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, partNumber: e.target.value })
                      }
                      placeholder="e.g., BP-001"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-indigo-400 font-mono placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                      <option value="GENERAL">General</option>
                      <option value="BRAKES">Brakes</option>
                      <option value="ENGINE">Engine</option>
                      <option value="SUSPENSION">Suspension</option>
                      <option value="ELECTRICAL">Electrical</option>
                      <option value="BODY">Body</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Vehicle Make
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleMake}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicleMake: e.target.value })
                      }
                      placeholder="e.g., Toyota"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Vehicle Model
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleModel}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicleModel: e.target.value })
                      }
                      placeholder="e.g., Corolla"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Base Financials */}
            {currentStep === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Base Cost Price (KES) *
                    </label>
                    <input
                      type="number"
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: e.target.value })
                      }
                      placeholder="0"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-300 font-mono placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">
                      Global Selling Price (KES) *
                    </label>
                    <input
                      type="number"
                      value={formData.sellingPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, sellingPrice: e.target.value })
                      }
                      placeholder="0"
                      className="w-full px-4 py-3 bg-zinc-900 border border-emerald-900/50 rounded-xl text-emerald-400 font-mono font-bold placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-red-500 uppercase tracking-wider mb-2">
                      Global Low Stock Alert
                    </label>
                    <input
                      type="number"
                      value={formData.lowStockThreshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lowStockThreshold: e.target.value,
                        })
                      }
                      placeholder="5"
                      className="w-full px-4 py-3 bg-zinc-900 border border-red-900/50 rounded-xl text-red-400 font-mono font-bold placeholder-zinc-600 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Profit Preview */}
                {formData.costPrice && formData.sellingPrice && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
                      Profit Preview
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Profit per Unit:</span>
                      <span
                        className={`text-2xl font-bold font-mono ${
                          Number(formData.sellingPrice) - Number(formData.costPrice) > 0
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        }`}
                      >
                        KES{' '}
                        {(
                          Number(formData.sellingPrice) - Number(formData.costPrice)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Procurement Link Section (Optional) */}
                {suppliers.length > 0 && (
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
                        <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider">
                          Supplier
                        </label>
                        <div className="relative">
                          <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <select
                            value={formData.supplierId}
                            onChange={(e) =>
                              setFormData({ ...formData, supplierId: e.target.value })
                            }
                            className="w-full pl-10 pr-10 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
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
                        <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                          Buying Price (KES)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input
                            type="number"
                            placeholder="Wholesale price"
                            value={formData.buyingPrice}
                            onChange={(e) =>
                              setFormData({ ...formData, buyingPrice: e.target.value })
                            }
                            disabled={!formData.supplierId}
                            className={`w-full pl-10 pr-4 py-3 bg-zinc-900 border rounded-xl font-mono placeholder-zinc-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                              !formData.supplierId
                                ? 'border-zinc-800/50 text-zinc-600 cursor-not-allowed'
                                : 'border-zinc-700 text-amber-400'
                            }`}
                          />
                        </div>
                        {!formData.supplierId && (
                          <p className="text-[10px] text-zinc-600">Select a supplier first</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Distribution Matrix */}
            {currentStep === 2 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Total Stock Display */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider opacity-90">
                        Total Initial Stock
                      </p>
                      <p className="text-4xl font-black mt-1">{totalStock} Units</p>
                    </div>
                    <Building2 className="w-12 h-12 opacity-50" />
                  </div>
                </div>

                {/* Distribution Table */}
                <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/50">
                  <table className="w-full">
                    <thead className="bg-zinc-900 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Enable
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Branch
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Initial Stock
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Branch Price (KES)
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Low Stock Alert
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {distribution.map((dist) => (
                        <tr
                          key={dist.branchId}
                          className={`transition-all ${
                            dist.enabled
                              ? 'bg-zinc-900/50 hover:bg-zinc-800'
                              : 'bg-zinc-950 opacity-40'
                          }`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={dist.enabled}
                              onChange={() => toggleBranch(dist.branchId)}
                              className="w-5 h-5 rounded border-zinc-700 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 bg-zinc-900"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  dist.enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                                }`}
                              />
                              <span className="font-bold text-zinc-300">
                                {dist.branchName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={dist.quantity}
                              onChange={(e) =>
                                updateDistribution(
                                  dist.branchId,
                                  'quantity',
                                  e.target.value
                                )
                              }
                              disabled={!dist.enabled}
                              className="w-28 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={dist.sellingPrice}
                              onChange={(e) =>
                                updateDistribution(
                                  dist.branchId,
                                  'sellingPrice',
                                  e.target.value
                                )
                              }
                              disabled={!dist.enabled}
                              placeholder={`Default: ${formData.sellingPrice}`}
                              className="w-32 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-30 disabled:cursor-not-allowed placeholder-zinc-700"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={dist.lowStockThreshold}
                              onChange={(e) =>
                                updateDistribution(
                                  dist.branchId,
                                  'lowStockThreshold',
                                  e.target.value
                                )
                              }
                              disabled={!dist.enabled}
                              placeholder={`Default: ${formData.lowStockThreshold}`}
                              className="w-24 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed placeholder-zinc-700"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-8 py-6 bg-zinc-900 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0 || loading}
            className="px-6 py-3 border border-zinc-700 rounded-xl text-zinc-400 font-bold hover:bg-zinc-800 hover:text-white transition-colors text-sm uppercase tracking-wide flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-bold shadow-lg shadow-emerald-900/20 text-sm uppercase tracking-wide flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-bold shadow-lg shadow-emerald-900/20 text-sm uppercase tracking-wide flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Create Product
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
