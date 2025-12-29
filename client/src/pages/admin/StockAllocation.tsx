import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, ArrowRight, Save, Package, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react';
import axios from '../../api/axios';
import { toast, Toaster } from 'sonner';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Branch {
  id: string;
  name: string;
  isActive: boolean;
}

interface Inventory {
  branchId: string;
  branch: {
    id: string;
    name: string;
  };
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  partNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  category: string;
  inventory: Inventory[];
}

interface AllocationState {
  branchId: string;
  branchName: string;
  currentStock: number;
  incomingQty: number;
  newLevel: number;
}

// ============================================
// SOUND NOTIFICATION HELPER
// ============================================

const playSuccessSound = () => {
  try {
    const audio = new Audio('/sounds/success.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.warn('Audio playback failed:', err);
    });
  } catch (error) {
    console.warn('Failed to play success sound:', error);
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function StockAllocation() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [allocations, setAllocations] = useState<Record<string, AllocationState>>({});
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ============================================
  // FETCH BRANCHES ON MOUNT
  // ============================================
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await axios.get('/admin/branches');
        setBranches(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
        toast.error('Failed to load branches');
      }
    };

    fetchBranches();
  }, []);

  // ============================================
  // SEARCH PRODUCTS WITH DEBOUNCE
  // ============================================
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchProducts();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const searchProducts = async () => {
    setSearching(true);
    try {
      // Use global products endpoint to get ALL inventory across branches
      const response = await axios.get('/products/global/inventory', {
        params: {
          search: searchQuery,
        },
      });

      // Transform the response to match our Product interface
      const products = (response.data.data || []).map((product: any) => ({
        id: product.id,
        name: product.name,
        partNumber: product.partNumber,
        vehicleMake: product.vehicleMake,
        vehicleModel: product.vehicleModel,
        category: product.category,
        inventory: product.distribution.map((dist: any) => ({
          branchId: dist.branchId,
          branch: {
            id: dist.branchId,
            name: dist.branch,
          },
          quantity: dist.quantity || 0,
        })),
      }));

      console.log('🔍 Search Results with Inventory:', products);
      setSearchResults(products);
    } catch (err) {
      console.error('Search failed:', err);
      toast.error('Failed to search products');
    } finally {
      setSearching(false);
    }
  };

  // ============================================
  // SELECT PRODUCT & INITIALIZE ALLOCATIONS
  // ============================================
  const handleSelectProduct = (product: Product) => {
    console.log('📦 Selected Product:', product);
    console.log('📦 Product Inventory:', product.inventory);

    setSelectedProduct(product);
    setSearchQuery('');
    setSearchResults([]);

    // Initialize allocations for all active branches
    const initialAllocations: Record<string, AllocationState> = {};

    branches.filter(b => b.isActive).forEach((branch) => {
      const existingInventory = product.inventory.find(inv => inv.branchId === branch.id);
      const currentStock = existingInventory?.quantity || 0;

      console.log(`🏢 ${branch.name}:`, {
        branchId: branch.id,
        existingInventory,
        currentStock,
      });

      initialAllocations[branch.id] = {
        branchId: branch.id,
        branchName: branch.name,
        currentStock: currentStock,
        incomingQty: 0,
        newLevel: currentStock,
      };
    });

    console.log('✅ Initialized Allocations:', initialAllocations);
    setAllocations(initialAllocations);
  };

  // ============================================
  // UPDATE INCOMING QUANTITY
  // ============================================
  const handleIncomingQtyChange = (branchId: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);

    if (isNaN(numValue) || numValue < 0) return;

    setAllocations(prev => {
      const allocation = prev[branchId];
      if (!allocation) return prev;

      return {
        ...prev,
        [branchId]: {
          ...allocation,
          incomingQty: numValue,
          newLevel: allocation.currentStock + numValue,
        },
      };
    });
  };

  // ============================================
  // SUBMIT ALLOCATION (ADDITIVE LOGIC)
  // ============================================
  const handleSubmit = async () => {
    if (!selectedProduct) return;

    // Filter out allocations where incoming qty > 0
    const updates = Object.values(allocations)
      .filter(allocation => allocation.incomingQty > 0)
      .map(allocation => {
        // CRITICAL: Send the SUM (currentStock + incomingQty), NOT the raw input
        const newTotal = allocation.currentStock + allocation.incomingQty;

        console.log('📦 Stock Allocation:', {
          branch: allocation.branchName,
          current: allocation.currentStock,
          incoming: allocation.incomingQty,
          newTotal: newTotal,
          formula: `${allocation.currentStock} + ${allocation.incomingQty} = ${newTotal}`,
        });

        return {
          branchId: allocation.branchId,
          quantity: newTotal, // Send the calculated sum
          isActive: true,
        };
      });

    if (updates.length === 0) {
      toast.error('No allocations to save', {
        description: 'Please enter incoming quantities for at least one branch',
      });
      return;
    }

    console.log('🚀 Submitting Stock Allocation:', {
      product: selectedProduct.name,
      updates,
    });

    const loadingToast = toast.loading('Updating stock levels...', {
      description: `Allocating ${selectedProduct.name} to ${updates.length} branch(es)`,
    });

    setSubmitting(true);

    try {
      await axios.put(`/products/${selectedProduct.id}`, {
        inventoryUpdates: updates,
      });

      toast.dismiss(loadingToast);
      playSuccessSound();

      toast.success('Stock allocated successfully!', {
        description: `${selectedProduct.name} has been distributed to ${updates.length} branch(es)`,
        duration: 4000,
      });

      // Reset state
      setSelectedProduct(null);
      setAllocations({});
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error('Allocation failed:', err);

      const errorMessage = err.response?.data?.message || 'Failed to allocate stock';
      toast.error('Allocation failed', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // CALCULATE TOTALS
  // ============================================
  const totalIncoming = Object.values(allocations).reduce(
    (sum, allocation) => sum + allocation.incomingQty,
    0
  );

  return (
    <div className="min-h-screen bg-[#09090b] py-8 px-6 font-sans">
      {/* Header */}
      <div className="max-w-[1200px] mx-auto mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-8 h-8 text-emerald-500" />
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
            Stock Allocation
          </h1>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Stock Reception
          </span>
        </div>
        <p className="text-zinc-500 font-medium">
          Receive new shipments and distribute to branches instantly
        </p>
      </div>

      {/* Search Section */}
      <div className="max-w-[1200px] mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by product name or part number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:bg-zinc-900 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-lg"
          />

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-20 max-h-[400px] overflow-y-auto"
              >
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800 last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm mb-1">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-500 font-mono">
                          SKU: {product.partNumber || 'N/A'}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-500">
                          {product.vehicleMake || 'Universal'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-600" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Searching indicator */}
          {searching && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Active Product Card (The Allocator) */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-[1200px] mx-auto"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              {/* Product Header */}
              <div className="bg-zinc-900/50 border-b border-zinc-800 px-8 py-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-white mb-2">
                      {selectedProduct.name}
                    </h2>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-zinc-500 font-mono">
                        SKU: <span className="text-emerald-400">{selectedProduct.partNumber || 'N/A'}</span>
                      </span>
                      <span className="text-zinc-700">|</span>
                      <span className="text-zinc-500">
                        Make: <span className="text-white font-medium">{selectedProduct.vehicleMake || 'Universal'}</span>
                      </span>
                      {selectedProduct.vehicleModel && (
                        <>
                          <span className="text-zinc-700">|</span>
                          <span className="text-zinc-500">
                            Model: <span className="text-white font-medium">{selectedProduct.vehicleModel}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setAllocations({});
                    }}
                    className="px-4 py-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Allocation Grid */}
              <div className="p-8">
                {/* Additive Logic Information Banner */}
                <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-blue-400 mb-1">Additive Stock Allocation</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Enter the <span className="font-bold text-blue-400">quantity you're adding</span> to each branch.
                      The system will automatically calculate the new total by adding to existing stock.
                      <span className="block mt-1 font-mono text-[10px] text-blue-300">
                        Example: Current (2) + Incoming (5) = New Total (7)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-500" />
                    Branch Allocation
                  </h3>
                  {totalIncoming > 0 && (
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <p className="text-sm font-bold text-emerald-400">
                        Total Incoming: <span className="text-2xl">{totalIncoming}</span> units
                      </p>
                    </div>
                  )}
                </div>

                <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/30">
                  <table className="w-full">
                    <thead className="bg-zinc-900 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Branch
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          In Stock
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-emerald-500 uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-2">
                            <Plus className="w-4 h-4" />
                            Incoming Qty
                          </div>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-2">
                            <ArrowRight className="w-4 h-4" />
                            New Total
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {Object.values(allocations).map((allocation, index) => (
                        <motion.tr
                          key={allocation.branchId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-zinc-900/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="font-bold text-zinc-300">
                                {allocation.branchName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-zinc-400 font-mono text-base font-medium">
                                {allocation.currentStock}
                              </span>
                              <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold mt-1">
                                In Stock
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <input
                              type="number"
                              min="0"
                              value={allocation.incomingQty || ''}
                              onChange={(e) => handleIncomingQtyChange(allocation.branchId, e.target.value)}
                              placeholder="0"
                              className="w-32 px-4 py-3 bg-zinc-950 border-2 border-emerald-700/50 rounded-lg text-emerald-400 font-mono font-bold text-right focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-zinc-700"
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`font-mono font-black text-xl ${
                                allocation.incomingQty > 0 ? 'text-emerald-400' : 'text-zinc-600'
                              }`}>
                                {allocation.newLevel}
                              </span>
                              {allocation.incomingQty > 0 && (
                                <div className="text-[10px] text-zinc-500 font-mono">
                                  <span className="text-zinc-400">{allocation.currentStock}</span>
                                  <span className="text-emerald-500 mx-1">+</span>
                                  <span className="text-emerald-400">{allocation.incomingQty}</span>
                                  <span className="text-zinc-600 mx-1">=</span>
                                  <span className="text-emerald-400 font-bold">{allocation.newLevel}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer - Submit Button */}
              <div className="border-t border-zinc-800 px-8 py-6 bg-zinc-900/50 flex items-center justify-between">
                <div className="text-sm text-zinc-500">
                  {totalIncoming > 0 ? (
                    <span className="text-emerald-400 font-medium">
                      Ready to allocate {totalIncoming} units across {Object.values(allocations).filter(a => a.incomingQty > 0).length} branch(es)
                    </span>
                  ) : (
                    <span>Enter incoming quantities to proceed</span>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || totalIncoming === 0}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-bold shadow-lg shadow-emerald-900/20 text-sm uppercase tracking-wide flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {submitting ? 'Updating...' : 'Confirm & Update Stock'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!selectedProduct && !searchQuery && (
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-900 rounded-2xl mb-6">
              <Search className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Search for a product to begin
            </h3>
            <p className="text-zinc-500">
              Use the search bar above to find products and allocate incoming stock
            </p>
          </div>
        </div>
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
