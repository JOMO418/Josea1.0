// ============================================
// PROCUREMENT SERVICE - API METHODS
// ============================================

import { axiosInstance } from '../api/axios';
import type {
  Supplier,
  SupplierProduct,
  ProcurementOrder,
  Worker,
  Product,
  SupplierPayment,
  LocationGroup,
  CreateSupplierData,
  UpdateSupplierData,
  CreateSupplierProductData,
  UpdateSupplierProductData,
  CreateProcurementOrderData,
  UpdateProcurementOrderData,
  UpdateOrderItemData,
  UpdateSupplierPaymentData,
  ProcurementStats,
  RecentActivity,
  ProductSearchResult,
  SupplierFilters,
  OrderFilters,
  PendingPaymentsResponse,
} from '../types/procurement.types';

// ===== RESPONSE WRAPPER =====

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

async function handleRequest<T>(request: Promise<{ data: T }>): Promise<ApiResponse<T>> {
  try {
    const response = await request;
    return { data: response.data, error: null };
  } catch (err: any) {
    const message = err.response?.data?.message || err.message || 'An error occurred';
    console.error('[Procurement Service]', message);
    return { data: null, error: message };
  }
}

// ===== SUPPLIERS API =====

export const supplierService = {
  getAll: (filters?: SupplierFilters) =>
    handleRequest<Supplier[]>(
      axiosInstance.get('/procurement/suppliers', { params: filters })
    ),

  getById: (id: string) =>
    handleRequest<Supplier>(
      axiosInstance.get(`/procurement/suppliers/${id}`)
    ),

  create: (data: CreateSupplierData) =>
    handleRequest<Supplier>(
      axiosInstance.post('/procurement/suppliers', data)
    ),

  update: (id: string, data: UpdateSupplierData) =>
    handleRequest<Supplier>(
      axiosInstance.put(`/procurement/suppliers/${id}`, data)
    ),

  delete: (id: string) =>
    handleRequest<{ success: boolean }>(
      axiosInstance.delete(`/procurement/suppliers/${id}`)
    ),

  // Get suppliers grouped by location (for tree view)
  getByLocation: () =>
    handleRequest<LocationGroup[]>(
      axiosInstance.get('/procurement/suppliers/by-location')
    ),

  // Get supplier's product catalog
  getCatalog: (supplierId: string, params?: { search?: string; available_only?: boolean }) =>
    handleRequest<SupplierProduct[]>(
      axiosInstance.get(`/procurement/suppliers/${supplierId}/products`, { params })
    ),

  // Add product to supplier's catalog
  addProduct: (supplierId: string, data: { product_id: string; wholesale_price: number; currency?: string; notes?: string; is_available?: boolean }) =>
    handleRequest<SupplierProduct>(
      axiosInstance.post(`/procurement/suppliers/${supplierId}/products`, data)
    ),
};

// ===== SUPPLIER PRODUCTS (PRICING) API =====

export const supplierProductService = {
  getAll: (params?: { supplier_id?: string; product_id?: string }) =>
    handleRequest<SupplierProduct[]>(
      axiosInstance.get('/procurement/supplier-products', { params })
    ),

  getById: (id: string) =>
    handleRequest<SupplierProduct>(
      axiosInstance.get(`/procurement/supplier-products/${id}`)
    ),

  create: (data: CreateSupplierProductData) =>
    handleRequest<SupplierProduct>(
      axiosInstance.post('/procurement/supplier-products', data)
    ),

  update: (id: string, data: UpdateSupplierProductData) =>
    handleRequest<SupplierProduct>(
      axiosInstance.put(`/procurement/supplier-products/${id}`, data)
    ),

  delete: (id: string) =>
    handleRequest<{ success: boolean }>(
      axiosInstance.delete(`/procurement/supplier-products/${id}`)
    ),

  searchProducts: (query: string) =>
    handleRequest<ProductSearchResult[]>(
      axiosInstance.get('/procurement/products/search', { params: { q: query } })
    ),

  // Get all suppliers that sell a specific product
  getProductSuppliers: (productId: string) =>
    handleRequest<SupplierProduct[]>(
      axiosInstance.get(`/procurement/products/${productId}/suppliers`)
    ),
};

// ===== PROCUREMENT ORDERS API =====

export const procurementOrderService = {
  getAll: (filters?: OrderFilters) =>
    handleRequest<ProcurementOrder[]>(
      axiosInstance.get('/procurement/orders', { params: filters })
    ),

  getById: (id: string) =>
    handleRequest<ProcurementOrder>(
      axiosInstance.get(`/procurement/orders/${id}`)
    ),

  create: (data: CreateProcurementOrderData) =>
    handleRequest<ProcurementOrder>(
      axiosInstance.post('/procurement/orders', data)
    ),

  update: (id: string, data: UpdateProcurementOrderData) =>
    handleRequest<ProcurementOrder>(
      axiosInstance.put(`/procurement/orders/${id}`, data)
    ),

  delete: (id: string) =>
    handleRequest<{ success: boolean }>(
      axiosInstance.delete(`/procurement/orders/${id}`)
    ),

  // Mark item as received (legacy)
  markItemReceived: (orderId: string, itemId: string, received: boolean) =>
    handleRequest<ProcurementOrder>(
      axiosInstance.patch(`/procurement/orders/${orderId}/items/${itemId}`, { is_received: received })
    ),

  // Update order item (actual price, purchased status, worker notes)
  updateItem: (orderId: string, itemId: string, data: UpdateOrderItemData) =>
    handleRequest<ProcurementOrder>(
      axiosInstance.put(`/procurement/orders/${orderId}/items/${itemId}`, data)
    ),

  updateStatus: (id: string, status: string) =>
    handleRequest<ProcurementOrder>(
      axiosInstance.patch(`/procurement/orders/${id}/status`, { status })
    ),

  updatePaymentStatus: (id: string, paymentStatus: string) =>
    handleRequest<ProcurementOrder>(
      axiosInstance.patch(`/procurement/orders/${id}/payment`, { payment_status: paymentStatus })
    ),
};

// ===== SUPPLIER PAYMENTS API =====

export const supplierPaymentService = {
  getAll: (params?: { order_id?: string; supplier_id?: string; status?: string }) =>
    handleRequest<SupplierPayment[]>(
      axiosInstance.get('/procurement/supplier-payments', { params })
    ),

  update: (id: string, data: UpdateSupplierPaymentData) =>
    handleRequest<SupplierPayment>(
      axiosInstance.put(`/procurement/supplier-payments/${id}`, data)
    ),

  // Get pending payments grouped by supplier
  getPending: () =>
    handleRequest<PendingPaymentsResponse>(
      axiosInstance.get('/procurement/payments/pending')
    ),
};

// ===== WORKERS API =====

export const workerService = {
  getAll: () =>
    handleRequest<Worker[]>(
      axiosInstance.get('/procurement/workers')
    ),
};

// ===== PRODUCTS API =====

export const productService = {
  search: (query: string) =>
    handleRequest<Product[]>(
      axiosInstance.get('/products/search', { params: { q: query } })
    ),

  getById: (id: string) =>
    handleRequest<Product>(
      axiosInstance.get(`/products/${id}`)
    ),
};

// ===== DASHBOARD/STATS API =====

export const procurementDashboardService = {
  getStats: () =>
    handleRequest<ProcurementStats>(
      axiosInstance.get('/procurement/stats')
    ),

  getRecentActivity: (limit: number = 10) =>
    handleRequest<RecentActivity[]>(
      axiosInstance.get('/procurement/activity', { params: { limit } })
    ),
};

// ===== COMBINED EXPORT =====

export const procurementApi = {
  suppliers: supplierService,
  products: supplierProductService,
  orders: procurementOrderService,
  payments: supplierPaymentService,
  workers: workerService,
  productCatalog: productService,
  dashboard: procurementDashboardService,
};

export default procurementApi;
