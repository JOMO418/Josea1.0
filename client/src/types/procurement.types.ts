// ============================================
// PROCUREMENT TYPES & INTERFACES
// ============================================

// ===== ENUMS =====

export type Location = 'Nairobi CBD' | 'Dubai' | 'Uganda' | 'Other';

export type OrderStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

export type OrderPriority = 'Normal' | 'Urgent';

export type PaymentMethod = 'Cash' | 'M-Pesa' | 'Bank Transfer' | 'Credit';

export type ProductCategory =
  | 'Filters'
  | 'Brake Parts'
  | 'Engine Parts'
  | 'Body Parts'
  | 'Electrical'
  | 'Oils & Fluids'
  | 'Tires'
  | 'Batteries'
  | 'Accessories'
  | 'Other';

export type Currency = 'KES' | 'USD' | 'AED' | 'UGX';

// ===== INTERFACES =====

export interface Supplier {
  id: string;
  name: string;
  location: Location;
  branch_name: string;
  contact_person: string;
  phone: string;
  email?: string;
  specialties: string[];
  notes?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_id: string;
  wholesale_price: number;
  selling_price: number | null;
  margin_percent: number | null;
  currency: Currency;
  last_updated: string;
  notes?: string;
  is_available: boolean;
  is_best_price?: boolean;
  // Joined fields
  supplier?: Supplier;
  product?: Product;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description?: string;
  part_number?: string;
  selling_price?: number | null;
}

export interface OrderItem {
  id: string;
  procurement_order_id: string;
  product_id: string;
  supplier_id: string;
  quantity: number;
  unit_price: number;
  expected_price: number;
  actual_price?: number | null;
  subtotal: number;
  is_received: boolean;
  is_purchased: boolean;
  purchased_at?: string | null;
  worker_notes?: string | null;
  alternative_supplier_id?: string | null;
  notes?: string;
  // Joined fields
  product?: Product;
  supplier?: {
    id: string;
    name: string;
    location: Location;
    branch_name?: string;
  };
  alternative_supplier?: {
    id: string;
    name: string;
    location: Location;
  } | null;
}

export interface SupplierPayment {
  id: string;
  procurement_order_id: string;
  supplier_id: string;
  expected_amount: number;
  actual_amount?: number | null;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod | null;
  paid_at?: string | null;
  receipt_image_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  order?: {
    id: string;
    order_number: string;
  };
}

export interface ItemsBySupplier {
  supplier: {
    id: string;
    name: string;
    location: Location;
    branch_name?: string;
    phone?: string;
  };
  items: OrderItem[];
  expected_subtotal: number;
  actual_subtotal: number;
  items_purchased: number;
  items_total: number;
}

export interface ProcurementOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  priority: OrderPriority;
  assigned_to?: string;
  assigned_worker?: Worker;
  total_amount: number;
  route_order?: string[] | null;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  items_count?: number;
  supplier_payments?: SupplierPayment[];
  items_by_supplier?: ItemsBySupplier[];
}

export interface Worker {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

// ===== LOCATION TREE =====

export interface LocationGroup {
  location: Location;
  suppliers: Supplier[];
  count: number;
}

// ===== API REQUEST/RESPONSE TYPES =====

export interface CreateSupplierData {
  name: string;
  location: Location;
  branch_name: string;
  contact_person: string;
  phone: string;
  email?: string;
  specialties: string[];
  notes?: string;
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {}

export interface CreateSupplierProductData {
  supplier_id: string;
  product_id: string;
  wholesale_price: number;
  currency: Currency;
  notes?: string;
  is_available?: boolean;
}

export interface UpdateSupplierProductData extends Partial<CreateSupplierProductData> {}

export interface CreateOrderItemData {
  product_id: string;
  supplier_id: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface CreateProcurementOrderData {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  priority?: OrderPriority;
  assigned_to?: string;
  route_order?: string[];
  notes?: string;
  items: CreateOrderItemData[];
}

export interface UpdateProcurementOrderData {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  priority?: OrderPriority;
  assigned_to?: string;
  route_order?: string[];
  notes?: string;
  items?: CreateOrderItemData[];
}

export interface UpdateOrderItemData {
  actual_price?: number;
  is_purchased?: boolean;
  is_received?: boolean;
  worker_notes?: string;
  alternative_supplier_id?: string | null;
}

export interface UpdateSupplierPaymentData {
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  receipt_image_url?: string;
  notes?: string;
  actual_amount?: number;
}

// ===== FILTER TYPES =====

export interface SupplierFilters {
  search?: string;
  location?: Location | 'all';
}

export interface OrderFilters {
  search?: string;
  status?: OrderStatus | 'all';
  payment_status?: PaymentStatus | 'all';
  priority?: OrderPriority | 'all';
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'total_amount' | 'order_number';
  sort_order?: 'asc' | 'desc';
}

export interface ProductSearchResult {
  product: Product;
  suppliers: Array<{
    supplier: Supplier;
    price: number;
    currency: Currency;
    is_available: boolean;
    is_best_price: boolean;
  }>;
}

// ===== STATS TYPES =====

export interface ProcurementStats {
  total_suppliers: number;
  active_orders: number;
  unpaid_orders: number;
  total_products: number;
}

export interface RecentActivity {
  id: string;
  type: 'order_created' | 'order_updated' | 'supplier_added' | 'payment_received';
  description: string;
  timestamp: string;
  order_id?: string;
  supplier_id?: string;
}

// ===== PENDING PAYMENTS =====

export interface PendingPaymentsGroup {
  supplier: Supplier;
  payments: SupplierPayment[];
  total_expected: number;
  total_actual: number;
  total_pending: number;
}

export interface PendingPaymentsResponse {
  suppliers: PendingPaymentsGroup[];
  grand_total: number;
  total_suppliers: number;
}
