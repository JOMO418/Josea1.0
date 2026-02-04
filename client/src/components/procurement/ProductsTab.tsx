// ============================================
// PRODUCTS & PRICING TAB
// ============================================

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Package,
  DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { procurementApi } from '../../services/procurement.service';
import type {
  SupplierProduct,
  ProductSearchResult,
  CreateSupplierProductData,
  Currency,
  Supplier,
  Product,
} from '../../types/procurement.types';

const CURRENCIES: Currency[] = ['KES', 'USD', 'AED', 'UGX'];

export default function ProductsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  // Modal form state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<CreateSupplierProductData>({
    supplier_id: '',
    product_id: '',
    wholesale_price: 0,
    currency: 'KES',
    notes: '',
    is_available: true,
  });

  // Fetch supplier products
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await procurementApi.products.getAll();
      if (result.data) setSupplierProducts(result.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const result = await procurementApi.products.searchProducts(searchQuery);
      if (result.data) setSearchResults(result.data);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Open add modal
  const openAddModal = async () => {
    // Fetch suppliers and products for the form
    const [suppliersRes, productsRes] = await Promise.all([
      procurementApi.suppliers.getAll(),
      procurementApi.productCatalog.search(''),
    ]);
    if (suppliersRes.data) setSuppliers(suppliersRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    setFormData({
      supplier_id: '',
      product_id: '',
      wholesale_price: 0,
      currency: 'KES',
      notes: '',
      is_available: true,
    });
    setShowAddModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await procurementApi.products.create(formData);
    if (result.data) {
      setSupplierProducts((prev) => [...prev, result.data!]);
    }
    setShowAddModal(false);
  };

  // Start inline edit
  const startEdit = (sp: SupplierProduct) => {
    setEditingId(sp.id);
    setEditPrice(sp.wholesale_price);
  };

  // Save inline edit
  const saveEdit = async (id: string) => {
    const result = await procurementApi.products.update(id, { wholesale_price: editPrice });
    if (result.data) {
      setSupplierProducts((prev) =>
        prev.map((sp) => (sp.id === id ? { ...sp, wholesale_price: editPrice } : sp))
      );
    }
    setEditingId(null);
  };

  // Cancel inline edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditPrice(0);
  };

  // Delete
  const handleDelete = async (id: string) => {
    const result = await procurementApi.products.delete(id);
    if (result.data?.success) {
      setSupplierProducts((prev) => prev.filter((sp) => sp.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Search products to compare supplier prices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl
                     text-zinc-100 placeholder-zinc-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
            {searchResults.map((result) => (
              <div key={result.product.id} className="p-4 border-b border-zinc-800 last:border-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-zinc-100">{result.product.name}</div>
                    <div className="text-xs text-zinc-500">{result.product.category}</div>
                  </div>
                  <button className="px-3 py-1 text-xs bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20">
                    Add to List
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-left">
                      <th className="pb-2">Supplier</th>
                      <th className="pb-2">Branch</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.suppliers.map((s) => (
                      <tr key={s.supplier.id} className="border-t border-zinc-800/50">
                        <td className="py-2 text-zinc-300">{s.supplier.name}</td>
                        <td className="py-2 text-zinc-400">{s.supplier.branch_name}</td>
                        <td className={`py-2 text-right font-medium ${s.is_best_price ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          {s.currency} {s.price.toLocaleString()}
                          {s.is_best_price && <span className="ml-1 text-xs">(Best)</span>}
                        </td>
                        <td className="py-2 text-right">
                          {s.is_available ? (
                            <span className="text-emerald-400">Yes</span>
                          ) : (
                            <span className="text-red-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing Table Section */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
          <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Supplier-Product Pricing
          </h3>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            <Plus className="w-4 h-4" />
            Add Pricing
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50">
              <tr className="text-zinc-500 text-left">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-center">Available</th>
                <th className="px-4 py-3 font-medium">Last Updated</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplierProducts.map((sp) => (
                <tr key={sp.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-3 text-zinc-300">{sp.product?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-zinc-400">{sp.supplier?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-zinc-500">{sp.supplier?.branch_name || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {editingId === sp.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-zinc-500">{sp.currency}</span>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-right text-zinc-100"
                        />
                        <button onClick={() => saveEdit(sp.id)} className="text-emerald-400 hover:text-emerald-300">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="text-zinc-500 hover:text-zinc-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-zinc-100">
                        {sp.currency} {sp.wholesale_price.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {sp.is_available ? (
                      <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">Yes</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{sp.last_updated}</td>
                  <td className="px-4 py-3 text-center">
                    {editingId !== sp.id && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEdit(sp)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sp.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {supplierProducts.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No product pricing added yet.</p>
          </div>
        )}
      </div>

      {/* Add Pricing Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-100">Add Product Pricing</h2>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Supplier *</label>
                  <select
                    required
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Product *</label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Price *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.wholesale_price}
                      onChange={(e) => setFormData({ ...formData, wholesale_price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Currency *</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-800 text-blue-600"
                  />
                  <label htmlFor="is_available" className="text-sm text-zinc-400">Available</label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-zinc-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">
                    Add Pricing
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
