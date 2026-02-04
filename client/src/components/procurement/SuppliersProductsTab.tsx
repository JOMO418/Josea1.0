// ============================================
// SUPPLIERS & PRODUCTS TAB
// Combined view with location tree sidebar and product catalog
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  MapPin,
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Phone,
  User,
  Building,
  AlertCircle,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { supplierService, supplierProductService } from '../../services/procurement.service';
import type {
  Supplier,
  SupplierProduct,
  LocationGroup,
  Location,
  Currency,
  CreateSupplierData,
  ProductSearchResult,
} from '../../types/procurement.types';

// ===== LOCATION COLORS =====
const LOCATION_COLORS: Record<Location, { bg: string; text: string; border: string }> = {
  'Nairobi CBD': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Dubai': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  'Uganda': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  'Other': { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

const SPECIALTIES = [
  'Filters', 'Brake Parts', 'Engine Parts', 'Body Parts', 'Electrical',
  'Oils & Fluids', 'Tires', 'Batteries', 'Accessories', 'Other'
];

// ===== MARGIN HELPERS =====
// Returns styling based on margin percentage
const getMarginStyle = (margin: number | null) => {
  if (margin === null) return { bg: 'bg-zinc-500/10', text: 'text-zinc-500', icon: Minus };
  if (margin < 0) return { bg: 'bg-red-500/20', text: 'text-red-400', icon: TrendingDown };
  if (margin < 15) return { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: TrendingDown };
  if (margin < 25) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Minus };
  if (margin < 40) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: TrendingUp };
  return { bg: 'bg-green-500/20', text: 'text-green-400', icon: TrendingUp };
};

// ===== MAIN COMPONENT =====

export default function SuppliersProductsTab() {
  // State
  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([]);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set(['Nairobi CBD']));
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState(false);

  // Supplier form data
  const [supplierFormData, setSupplierFormData] = useState<CreateSupplierData>({
    name: '',
    location: 'Nairobi CBD',
    branch_name: '',
    contact_person: '',
    phone: '',
    specialties: [],
    notes: '',
  });

  // Product search for adding
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [productPrice, setProductPrice] = useState('');
  const [productCurrency, setProductCurrency] = useState<Currency>('KES');

  // Load suppliers by location
  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supplierService.getByLocation();
    if (data) {
      setLocationGroups(data);
      // Auto-select first supplier if none selected
      if (!selectedSupplier && data.length > 0) {
        const firstLocation = data[0];
        if (firstLocation.suppliers.length > 0) {
          setSelectedSupplier(firstLocation.suppliers[0]);
        }
      }
    }
    setLoading(false);
  }, []);

  // Load supplier products
  const loadSupplierProducts = useCallback(async (supplierId: string) => {
    setLoadingProducts(true);
    const { data, error } = await supplierService.getCatalog(supplierId, {
      search: searchQuery || undefined,
    });
    if (data) {
      setSupplierProducts(data);
    }
    setLoadingProducts(false);
  }, [searchQuery]);

  // Search products for adding
  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setProductSearchResults([]);
      return;
    }
    setSearchingProducts(true);
    const { data } = await supplierProductService.searchProducts(query);
    if (data) {
      setProductSearchResults(data);
    }
    setSearchingProducts(false);
  }, []);

  // Effects
  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    if (selectedSupplier) {
      loadSupplierProducts(selectedSupplier.id);
    }
  }, [selectedSupplier, loadSupplierProducts]);

  // Debounced product search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(productSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearchQuery, searchProducts]);

  // Toggle location expansion
  const toggleLocation = (location: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(location)) {
        next.delete(location);
      } else {
        next.add(location);
      }
      return next;
    });
  };

  // Handle supplier creation/update
  const handleSaveSupplier = async () => {
    setSaving(true);
    if (editingSupplier) {
      const { data } = await supplierService.update(editingSupplier.id, supplierFormData);
      if (data) {
        loadSuppliers();
        setSelectedSupplier(data);
      }
    } else {
      const { data } = await supplierService.create(supplierFormData);
      if (data) {
        loadSuppliers();
        setSelectedSupplier(data);
        // Expand the location of the new supplier
        setExpandedLocations(prev => new Set(prev).add(data.location));
      }
    }
    setSaving(false);
    setShowAddSupplierModal(false);
    setEditingSupplier(null);
    resetSupplierForm();
  };

  // Handle supplier deletion
  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) return;

    const { error } = await supplierService.delete(supplier.id);
    if (!error) {
      loadSuppliers();
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier(null);
      }
    }
  };

  // Add product to supplier
  const handleAddProduct = async () => {
    if (!selectedSupplier || !selectedProduct || !productPrice) return;

    setSaving(true);
    const { data, error } = await supplierService.addProduct(selectedSupplier.id, {
      product_id: selectedProduct.product.id,
      wholesale_price: parseFloat(productPrice),
      currency: productCurrency,
    });

    if (data) {
      loadSupplierProducts(selectedSupplier.id);
      setShowAddProductModal(false);
      setSelectedProduct(null);
      setProductPrice('');
      setProductSearchQuery('');
      setProductSearchResults([]);
    }
    setSaving(false);
  };

  // Update product price inline
  const handleUpdatePrice = async (productId: string) => {
    if (!newPrice) return;
    setSaving(true);
    const { data } = await supplierProductService.update(productId, {
      wholesale_price: parseFloat(newPrice),
    });
    if (data && selectedSupplier) {
      loadSupplierProducts(selectedSupplier.id);
    }
    setSaving(false);
    setEditingPrice(null);
    setNewPrice('');
  };

  // Remove product from supplier
  const handleRemoveProduct = async (productId: string) => {
    if (!confirm('Remove this product from supplier catalog?')) return;

    const { error } = await supplierProductService.delete(productId);
    if (!error && selectedSupplier) {
      loadSupplierProducts(selectedSupplier.id);
    }
  };

  // Toggle availability
  const handleToggleAvailability = async (product: SupplierProduct) => {
    const { data } = await supplierProductService.update(product.id, {
      is_available: !product.is_available,
    });
    if (data && selectedSupplier) {
      loadSupplierProducts(selectedSupplier.id);
    }
  };

  // Reset supplier form
  const resetSupplierForm = () => {
    setSupplierFormData({
      name: '',
      location: 'Nairobi CBD',
      branch_name: '',
      contact_person: '',
      phone: '',
      specialties: [],
      notes: '',
    });
  };

  // Open edit modal
  const openEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({
      name: supplier.name,
      location: supplier.location,
      branch_name: supplier.branch_name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      specialties: supplier.specialties,
      notes: supplier.notes || '',
    });
    setShowAddSupplierModal(true);
  };

  // Filter products by search
  const filteredProducts = supplierProducts.filter(sp =>
    !searchQuery ||
    sp.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sp.product?.part_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Left Sidebar - Supplier Tree */}
      <div className="w-80 flex-shrink-0 bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-zinc-200">Suppliers</h3>
            <button
              onClick={() => {
                resetSupplierForm();
                setEditingSupplier(null);
                setShowAddSupplierModal(true);
              }}
              className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* Location stats */}
          <div className="flex gap-1 flex-wrap">
            {locationGroups.map(group => (
              <span
                key={group.location}
                className={`text-xs px-2 py-0.5 rounded-full ${LOCATION_COLORS[group.location].bg} ${LOCATION_COLORS[group.location].text}`}
              >
                {group.location}: {group.count}
              </span>
            ))}
          </div>
        </div>

        {/* Supplier Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {locationGroups.map(group => (
                <div key={group.location}>
                  {/* Location Header */}
                  <button
                    onClick={() => toggleLocation(group.location)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${LOCATION_COLORS[group.location].bg} hover:opacity-80`}
                  >
                    {expandedLocations.has(group.location) ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                    <MapPin className={`w-4 h-4 ${LOCATION_COLORS[group.location].text}`} />
                    <span className={`text-sm font-medium ${LOCATION_COLORS[group.location].text}`}>
                      {group.location}
                    </span>
                    <span className="ml-auto text-xs text-zinc-500">
                      {group.count}
                    </span>
                  </button>

                  {/* Suppliers */}
                  <AnimatePresence>
                    {expandedLocations.has(group.location) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 py-1 space-y-0.5">
                          {group.suppliers.map(supplier => (
                            <button
                              key={supplier.id}
                              onClick={() => setSelectedSupplier(supplier)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors group ${
                                selectedSupplier?.id === supplier.id
                                  ? 'bg-blue-500/20 border border-blue-500/30'
                                  : 'hover:bg-zinc-800/50'
                              }`}
                            >
                              <Building className="w-4 h-4 text-zinc-500" />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${
                                  selectedSupplier?.id === supplier.id ? 'text-blue-400' : 'text-zinc-300'
                                }`}>
                                  {supplier.name}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">
                                  {supplier.branch_name}
                                </p>
                              </div>
                              <span className="text-xs text-zinc-600 group-hover:text-zinc-400">
                                {supplier.product_count || 0}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Product Catalog */}
      <div className="flex-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden flex flex-col">
        {selectedSupplier ? (
          <>
            {/* Supplier Header */}
            <div className="p-4 border-b border-zinc-800/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-zinc-100">{selectedSupplier.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${LOCATION_COLORS[selectedSupplier.location].bg} ${LOCATION_COLORS[selectedSupplier.location].text}`}>
                      {selectedSupplier.location}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">{selectedSupplier.branch_name}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {selectedSupplier.contact_person}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedSupplier.phone}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditSupplier(selectedSupplier)}
                    className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSupplier(selectedSupplier)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Specialties */}
              {selectedSupplier.specialties.length > 0 && (
                <div className="flex gap-1 mt-3 flex-wrap">
                  {selectedSupplier.specialties.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Search and Add */}
            <div className="p-4 border-b border-zinc-800/50 flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Product</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="flex-1 overflow-y-auto">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <Package className="w-12 h-12 mb-3 opacity-50" />
                  <p>No products in this supplier's catalog</p>
                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="mt-3 text-sm text-blue-400 hover:underline"
                  >
                    Add your first product
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-zinc-800/30 sticky top-0">
                    <tr className="text-left text-xs text-zinc-500 uppercase">
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Buying Price</th>
                      <th className="px-4 py-3 font-medium">Selling Price</th>
                      <th className="px-4 py-3 font-medium text-center">Margin</th>
                      <th className="px-4 py-3 font-medium text-center">In Stock</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredProducts.map(sp => {
                      const marginStyle = getMarginStyle(sp.margin_percent);
                      const MarginIcon = marginStyle.icon;
                      return (
                        <tr key={sp.id} className="hover:bg-zinc-800/30 group">
                          <td className="px-4 py-3">
                            <p className="text-sm text-zinc-200">{sp.product?.name}</p>
                            {sp.product?.part_number && (
                              <p className="text-xs text-zinc-500">{sp.product.part_number}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-zinc-400">{sp.product?.category || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {editingPrice === sp.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={newPrice}
                                  onChange={(e) => setNewPrice(e.target.value)}
                                  className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdatePrice(sp.id)}
                                  disabled={saving}
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingPrice(null)}
                                  className="p-1 text-zinc-400 hover:bg-zinc-700 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPrice(sp.id);
                                  setNewPrice(sp.wholesale_price.toString());
                                }}
                                className="flex items-center gap-1 text-sm text-zinc-200 hover:text-blue-400 transition-colors"
                              >
                                <DollarSign className="w-3 h-3" />
                                {sp.currency} {sp.wholesale_price.toLocaleString()}
                                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 ml-1" />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {sp.selling_price !== null ? (
                              <span className="text-sm text-zinc-300">
                                KES {sp.selling_price.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-600 italic">Not set</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sp.margin_percent !== null ? (
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${marginStyle.bg}`}>
                                <MarginIcon className={`w-3.5 h-3.5 ${marginStyle.text}`} />
                                <span className={`text-sm font-medium ${marginStyle.text}`}>
                                  {sp.margin_percent.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleToggleAvailability(sp)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                sp.is_available
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {sp.is_available ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveProduct(sp.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <Building className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">Select a supplier</p>
            <p className="text-sm">Click on a supplier from the left panel to view their catalog</p>
          </div>
        )}
      </div>

      {/* Add/Edit Supplier Modal */}
      <AnimatePresence>
        {showAddSupplierModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddSupplierModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-100">
                  {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
                </h3>
                <button
                  onClick={() => setShowAddSupplierModal(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Name */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Premier Motor Spares"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Location *</label>
                  <select
                    value={supplierFormData.location}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, location: e.target.value as Location })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Nairobi CBD">Nairobi CBD</option>
                    <option value="Dubai">Dubai</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Branch Name */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Branch/Shop Name *</label>
                  <input
                    type="text"
                    value={supplierFormData.branch_name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, branch_name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Kirinyaga Road Shop"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., John Kamau"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., 0712345678"
                  />
                </div>

                {/* Specialties */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Specialties</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map(specialty => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => {
                          const current = supplierFormData.specialties;
                          const updated = current.includes(specialty)
                            ? current.filter(s => s !== specialty)
                            : [...current, specialty];
                          setSupplierFormData({ ...supplierFormData, specialties: updated });
                        }}
                        className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                          supplierFormData.specialties.includes(specialty)
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                  <textarea
                    value={supplierFormData.notes}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSupplier}
                  disabled={saving || !supplierFormData.name || !supplierFormData.branch_name || !supplierFormData.contact_person || !supplierFormData.phone}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProductModal && selectedSupplier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddProductModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-100">
                  Add Product to {selectedSupplier.name}
                </h3>
                <button
                  onClick={() => setShowAddProductModal(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Product Search */}
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Search Product</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                      placeholder="Search by product name or part number..."
                    />
                    {searchingProducts && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
                    )}
                  </div>

                  {/* Search Results */}
                  {productSearchResults.length > 0 && !selectedProduct && (
                    <div className="mt-2 max-h-48 overflow-y-auto bg-zinc-800/50 border border-zinc-700 rounded-lg">
                      {productSearchResults.map(result => (
                        <button
                          key={result.product.id}
                          onClick={() => {
                            setSelectedProduct(result);
                            setProductSearchQuery(result.product.name);
                            // Set suggested price from best supplier
                            if (result.suppliers.length > 0) {
                              const bestPrice = result.suppliers.find(s => s.is_best_price);
                              if (bestPrice) {
                                setProductPrice(bestPrice.price.toString());
                              }
                            }
                          }}
                          className="w-full p-3 text-left hover:bg-zinc-700/50 border-b border-zinc-700/50 last:border-0"
                        >
                          <p className="text-sm text-zinc-200">{result.product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {result.product.part_number && (
                              <span className="text-xs text-zinc-500">{result.product.part_number}</span>
                            )}
                            {result.suppliers.length > 0 && (
                              <span className="text-xs text-emerald-400">
                                Best: KES {result.suppliers.find(s => s.is_best_price)?.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Product */}
                {selectedProduct && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-zinc-200">{selectedProduct.product.name}</p>
                        <p className="text-xs text-zinc-500">{selectedProduct.product.part_number}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setProductSearchQuery('');
                          setProductPrice('');
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-zinc-400 mb-1">Buying Price *</label>
                    <input
                      type="number"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm text-zinc-400 mb-1">Currency</label>
                    <select
                      value={productCurrency}
                      onChange={(e) => setProductCurrency(e.target.value as Currency)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="KES">KES</option>
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                      <option value="UGX">UGX</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProduct}
                  disabled={saving || !selectedProduct || !productPrice}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add to Catalog
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
