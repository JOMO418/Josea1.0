// ============================================
// POS PAGE - HARDWARE-GRADE POINT OF SALE
// 60/40 Split Layout + High-Contrast Vision UI
// ENHANCED: Full Keyboard Navigation Support
// ============================================

import { useState, useEffect, useRef } from 'react';
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

  // Keyboard Navigation State
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(-1);
  const [focusMode, setFocusMode] = useState<'search' | 'products' | 'tray'>('search');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);
  const trayComponentRef = useRef<any>(null);

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

  // Auto-focus search bar on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Ensure proper focus when mode changes
  useEffect(() => {
    if (focusMode === 'products' && productGridRef.current) {
      productGridRef.current.focus();
    }
  }, [focusMode]);

  // Reset selected product when filtered products change
  useEffect(() => {
    setSelectedProductIndex(-1);
    setFocusMode('search');
  }, [debouncedSearch]);

  // Calculate grid dimensions for navigation
  const getGridColumns = () => {
    const width = window.innerWidth;
    if (width >= 1536) return 3; // 2xl
    if (width >= 768) return 2; // md
    return 1;
  };

  // Handle keyboard navigation in search bar
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && filteredProducts.length > 0) {
      e.preventDefault();
      setSelectedProductIndex(0);
      setFocusMode('products');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchTerm('');
      searchInputRef.current?.focus();
    } else if (e.key === 'Tab' && e.shiftKey === false && filteredProducts.length > 0) {
      e.preventDefault();
      setFocusMode('tray');
    }
  };

  // Handle keyboard navigation in product grid
  const handleProductGridKeyDown = (e: React.KeyboardEvent) => {
    if (focusMode !== 'products' || filteredProducts.length === 0) return;

    const cols = getGridColumns();
    const maxIndex = filteredProducts.length - 1;
    const currentRow = Math.floor(selectedProductIndex / cols);
    const currentCol = selectedProductIndex % cols;
    const isRightmostColumn = currentCol === cols - 1;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (selectedProductIndex < cols) {
          // Move back to search if in first row
          setFocusMode('search');
          setSelectedProductIndex(-1);
          searchInputRef.current?.focus();
        } else {
          setSelectedProductIndex(Math.max(0, selectedProductIndex - cols));
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        setSelectedProductIndex(Math.min(maxIndex, selectedProductIndex + cols));
        break;

      case 'ArrowLeft':
        e.preventDefault();
        setSelectedProductIndex(Math.max(0, selectedProductIndex - 1));
        break;

      case 'ArrowRight':
        e.preventDefault();
        // Check if we're at the rightmost column
        if (isRightmostColumn || selectedProductIndex === maxIndex) {
          // Move to transaction tray
          setFocusMode('tray');
          trayComponentRef.current?.focusFirstItem();
        } else {
          setSelectedProductIndex(Math.min(maxIndex, selectedProductIndex + 1));
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (selectedProductIndex >= 0 && selectedProductIndex <= maxIndex) {
          const product = filteredProducts[selectedProductIndex];
          handleAddToCart(product);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setFocusMode('search');
        setSelectedProductIndex(-1);
        searchInputRef.current?.focus();
        break;

      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setFocusMode('search');
          setSelectedProductIndex(-1);
          searchInputRef.current?.focus();
        } else {
          setFocusMode('tray');
          trayComponentRef.current?.focusFirstItem();
        }
        break;
    }
  };

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    const stock = product.inventory?.[0]?.quantity || 0;
    if (stock > 0) {
      useStore.getState().addToCart({
        productId: product.id,
        name: product.name,
        price: parseFloat(product.sellingPrice as any),
        stock: stock,
        oemNumber: product.partNumber,
      });
    }
  };

  // Scroll selected product into view and focus grid
  useEffect(() => {
    if (selectedProductIndex >= 0 && productGridRef.current) {
      const productCards = productGridRef.current.querySelectorAll('[data-product-index]');
      const selectedCard = productCards[selectedProductIndex] as HTMLElement;
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Auto-focus the grid when a product is selected
      if (focusMode === 'products') {
        productGridRef.current.focus();
      }
    }
  }, [selectedProductIndex, focusMode]);

  // Prevent page scrolling but allow navigation handlers to work
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only prevent default for Space key to avoid page scroll
      // Arrow keys are handled by individual components
      if (e.key === ' ' && (focusMode === 'products' || focusMode === 'tray')) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [focusMode]);

  return (
    // Changed main background to a deeper black to make white cards "pop"
    <div className="flex h-[calc(100vh-var(--topbar-height))] overflow-hidden bg-[#09090b]">
      
      {/* ===== MAIN PRODUCT AREA (60%) ===== */}
      <div className="w-[60%] flex flex-col overflow-hidden border-r border-zinc-800/50">
        
        {/* Search Bar - Modernized with better contrast + Keyboard Shortcuts */}
        <div className="p-6 border-b border-zinc-800/50 bg-[#09090b]">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
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

        {/* Product Grid Area - Using a slightly lighter zinc for the "floor" + Keyboard Navigation */}
        <div
          ref={productGridRef}
          className="flex-1 overflow-y-auto p-6 bg-zinc-950/30 focus:outline-none transition-all relative"
          onKeyDown={handleProductGridKeyDown}
          tabIndex={focusMode === 'products' ? 0 : -1}
          style={{ scrollBehavior: 'smooth' }}
        >
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
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  productId={product.id}
                  name={product.name}
                  partNumber={product.partNumber}
                  price={parseFloat(product.sellingPrice as any)}
                  stock={product.inventory?.[0]?.quantity || 0}
                  lowStockThreshold={product.lowStockThreshold}
                  isSelected={selectedProductIndex === index}
                  dataIndex={index}
                  onSelect={() => handleAddToCart(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== TRANSACTION TRAY (40%) ===== */}
      <div className="w-[40%] flex flex-col bg-[#09090b] shadow-2xl z-10">
        <TransactionTray
          ref={trayComponentRef}
          onCheckout={() => setCheckoutModalOpen(true)}
          isFocused={focusMode === 'tray'}
          onFocusSearch={() => {
            setFocusMode('search');
            searchInputRef.current?.focus();
          }}
          onFocusProducts={() => {
            setFocusMode('products');
            if (selectedProductIndex < 0 && filteredProducts.length > 0) {
              setSelectedProductIndex(0);
            }
            productGridRef.current?.focus();
          }}
        />
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