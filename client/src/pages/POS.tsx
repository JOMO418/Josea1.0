// ============================================
// POS PAGE - HARDWARE-GRADE POINT OF SALE
// 60/40 Split Layout + High-Contrast Vision UI
// ============================================

import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import TransactionTray from '../components/TransactionTray';
import CheckoutModal from '../components/CheckoutModal';
import { useDebounce } from '../hooks/useDebounce';
import { useStore } from '../store/useStore';
import { axiosInstance } from '../api/axios';
import { notifyApiError } from '../utils/notification';

interface Product {
  id: string;
  name: string;
  partNumber?: string;
  sellingPrice: number;
  inventory: Array<{
    quantity: number;
    branchId: string;
  }>;
  lowStockThreshold: number;
}

export default function POS() {
  const branchId = useStore((state) => state.branchId);
  const user = useStore((state) => state);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.get('/products', {
        params: {
          branchId: branchId || user.branchId,
        },
      });

      const rawData = response.data;
      const productsArray = Array.isArray(rawData)
        ? rawData
        : (rawData.products || rawData.data || []);

      setProducts(productsArray);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      const errorMessage = err.response?.data?.message || 'Failed to sync branch inventory.';
      setError(errorMessage);
      notifyApiError(errorMessage, 'Unable to load product inventory for this branch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [branchId]);

  const filteredProducts = products.filter((product) => {
    const search = debouncedSearch.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.partNumber?.toLowerCase().includes(search)
    );
  });

  return (
    // Changed main background to a deeper black to make white cards "pop"
    <div className="flex h-[calc(100vh-var(--topbar-height))] overflow-hidden bg-[#09090b]">
      
      {/* ===== MAIN PRODUCT AREA (60%) ===== */}
      <div className="w-[60%] flex flex-col overflow-hidden border-r border-zinc-800/50">
        
        {/* Search Bar - Modernized with better contrast */}
        <div className="p-6 border-b border-zinc-800/50 bg-[#09090b]">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name, OEM, or model..."
                className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>

            <button
              onClick={fetchProducts}
              disabled={loading}
              className="bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800 text-white p-3.5 rounded-xl transition-all disabled:opacity-50 shadow-sm"
              title="Refresh products"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'text-zinc-400'}`} />
            </button>
          </div>

          {searchTerm && (
            <p className="text-xs font-medium text-zinc-500 mt-3 uppercase tracking-wider">
              Results: {filteredProducts.length} items found
            </p>
          )}
        </div>

        {/* Product Grid Area - Using a slightly lighter zinc for the "floor" */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 max-w-md text-center">
                <AlertCircle className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Sync Error</h3>
                <p className="text-zinc-400 text-sm mb-6">{error}</p>
                <button
                  onClick={fetchProducts}
                  className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold rounded-xl border border-red-500/20 transition-all"
                >
                  Reconnect Inventory
                </button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full opacity-40">
              <div className="text-center">
                <Search className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium">No matching parts found</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  productId={product.id}
                  name={product.name}
                  partNumber={product.partNumber}
                  price={parseFloat(product.sellingPrice as any)}
                  stock={product.inventory?.[0]?.quantity || 0}
                  lowStockThreshold={product.lowStockThreshold}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== TRANSACTION TRAY (40%) ===== */}
      <div className="w-[40%] flex flex-col bg-[#09090b] shadow-2xl z-10">
        <TransactionTray onCheckout={() => setCheckoutModalOpen(true)} />
      </div>

      {/* ===== CHECKOUT MODAL ===== */}
      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        onSuccess={fetchProducts}
      />
    </div>
  );
}