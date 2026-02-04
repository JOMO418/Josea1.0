// ============================================
// SUPPLIERS TAB
// Manage supplier network with CRUD operations
// ============================================

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  MapPin,
  Phone,
  Package,
  Edit,
  Trash2,
  X,
  User,
  Mail,
  Building2,
  Globe,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { procurementApi } from '../../services/procurement.service';
import type { Supplier, Location, CreateSupplierData } from '../../types/procurement.types';

const LOCATIONS: Location[] = ['Nairobi CBD', 'Dubai', 'Uganda', 'Other'];
const SPECIALTY_OPTIONS = [
  'Filters', 'Brake Parts', 'Engine Parts', 'Body Parts',
  'Electrical', 'Oils & Fluids', 'Tires', 'Batteries', 'Accessories'
];

const LOCATION_COLORS: Record<Location, { bg: string; text: string; border: string }> = {
  'Nairobi CBD': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Dubai': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Uganda': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Other': { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' },
};

export default function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<Location | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: '',
    location: 'Nairobi CBD',
    branch_name: '',
    contact_person: '',
    phone: '',
    specialties: [],
    notes: '',
  });

  // Fetch suppliers
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const result = await procurementApi.suppliers.getAll();
      if (result.data) setSuppliers(result.data);
      if (result.error) toast.error(result.error);
    } catch (error) {
      toast.error('Failed to fetch suppliers');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.branch_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === 'all' || s.location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  // Open modal for add/edit
  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        location: supplier.location,
        branch_name: supplier.branch_name,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        specialties: supplier.specialties,
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        location: 'Nairobi CBD',
        branch_name: '',
        contact_person: '',
        phone: '',
        specialties: [],
        notes: '',
      });
    }
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingSupplier) {
        const result = await procurementApi.suppliers.update(editingSupplier.id, formData);
        if (result.data) {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === editingSupplier.id ? result.data! : s))
          );
          toast.success('Supplier updated successfully');
        }
        if (result.error) toast.error(result.error);
      } else {
        const result = await procurementApi.suppliers.create(formData);
        if (result.data) {
          setSuppliers((prev) => [...prev, result.data!]);
          toast.success('Supplier created successfully');
        }
        if (result.error) toast.error(result.error);
      }
      setShowModal(false);
    } catch (error) {
      toast.error('Operation failed');
    }
    setSaving(false);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const result = await procurementApi.suppliers.delete(id);
      if (result.data?.success) {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        toast.success('Supplier deleted');
      }
      if (result.error) toast.error(result.error);
    } catch (error) {
      toast.error('Delete failed');
    }
    setDeleteConfirm(null);
  };

  // Toggle specialty
  const toggleSpecialty = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-zinc-500">Loading suppliers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search suppliers by name, contact, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl
                       text-zinc-100 placeholder-zinc-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                       transition-all"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value as Location | 'all')}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Locations</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl
                       font-medium transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LOCATIONS.map((loc) => {
          const count = suppliers.filter((s) => s.location === loc).length;
          const colors = LOCATION_COLORS[loc];
          return (
            <button
              key={loc}
              onClick={() => setLocationFilter(locationFilter === loc ? 'all' : loc)}
              className={`p-3 rounded-xl border transition-all ${
                locationFilter === loc
                  ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-offset-zinc-950 ${colors.border.replace('border', 'ring')}`
                  : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{loc}</span>
                <Globe className={`w-3.5 h-3.5 ${locationFilter === loc ? colors.text : 'text-zinc-600'}`} />
              </div>
              <p className={`text-2xl font-bold mt-1 ${locationFilter === loc ? colors.text : 'text-zinc-300'}`}>
                {count}
              </p>
            </button>
          );
        })}
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredSuppliers.map((supplier, index) => {
            const colors = LOCATION_COLORS[supplier.location];
            return (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 hover:border-zinc-700/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                      <Building2 className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100">{supplier.name}</h3>
                      <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 text-xs ${colors.bg} ${colors.text} rounded-lg`}>
                        <Globe className="w-3 h-3" />
                        {supplier.location}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openModal(supplier)}
                      className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(supplier.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <MapPin className="w-4 h-4 text-zinc-600" />
                    <span className="truncate">{supplier.branch_name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <User className="w-4 h-4 text-zinc-600" />
                    <span className="truncate">{supplier.contact_person}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <Phone className="w-4 h-4 text-zinc-600" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <Package className="w-4 h-4 text-zinc-600" />
                    <span>{supplier.product_count ?? 0} products listed</span>
                  </div>
                </div>

                {supplier.specialties.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-800/50">
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.specialties.slice(0, 4).map((spec) => (
                        <span key={spec} className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded-lg">
                          {spec}
                        </span>
                      ))}
                      {supplier.specialties.length > 4 && (
                        <span className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-500 rounded-lg">
                          +{supplier.specialties.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredSuppliers.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No suppliers found</h3>
          <p className="text-sm text-zinc-500 mb-6">
            {searchQuery || locationFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add your first supplier to get started'}
          </p>
          {!searchQuery && locationFilter === 'all' && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">
                      {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {editingSupplier ? 'Update supplier details' : 'Add a new supplier to your network'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Auto Parts Kenya Ltd"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100
                               placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Location *</label>
                    <select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value as Location })}
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Shop/Branch *</label>
                    <input
                      type="text"
                      required
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      placeholder="e.g., Moi Avenue Shop"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100
                                 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="e.g., John Mwangi"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100
                                 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g., +254 712 345 678"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100
                                 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Specialties</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTY_OPTIONS.map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                          formData.specialties.includes(spec)
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this supplier..."
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100
                               placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">Delete Supplier</h3>
              </div>
              <p className="text-zinc-400 mb-6">
                Are you sure you want to delete this supplier? This will also remove all associated product pricing data.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
