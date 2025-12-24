// ============================================
// ZUSTAND GLOBAL STATE - MANAGER DASHBOARD
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notifyItemAdded, notifyWarning } from '../utils/notification';

// ===== TYPE DEFINITIONS =====

type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  oemNumber?: string;
}

interface DashboardState {
  // Branch Information
  branchName: string;
  branchId: string | null;

  // User Information
  userRole: UserRole;
  userName: string;
  userId: string | null;

  // Authentication
  token: string | null;
  isAuthenticated: boolean;

  // POS Cart
  cart: CartItem[];

  // UI State
  isDrawerOpen: boolean;

  // Actions
  setBranch: (branchName: string, branchId?: string) => void;
  setUser: (userName: string, userRole: UserRole, userId?: string) => void;
  setAuth: (token: string) => void;
  logout: () => void;

  // Cart Actions
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // UI Actions
  toggleDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
}

// ===== ZUSTAND STORE =====

export const useStore = create<DashboardState>()(
  persist(
    (set) => ({
      // Initial State
      branchName: 'Kiserian Branch',  // ✅ Default branch
      branchId: null,
      userRole: 'MANAGER',             // ✅ Default role
      userName: 'Josea',               // ✅ Default user
      userId: null,
      token: null,
      isAuthenticated: false,
      cart: [],
      isDrawerOpen: false,             // ✅ Drawer closed by default - Focus Mode

      // ===== ACTIONS =====

      /**
       * Set active branch information
       */
      setBranch: (branchName: string, branchId?: string) => {
        set({
          branchName,
          branchId: branchId || null
        });
      },

      /**
       * Set user information
       */
      setUser: (userName: string, userRole: UserRole, userId?: string) => {
        set({
          userName,
          userRole,
          userId: userId || null
        });
      },

      /**
       * Set authentication token
       */
      setAuth: (token: string) => {
        set({
          token,
          isAuthenticated: true
        });
      },

      /**
       * Logout and clear all user session data
       */
      logout: () => {
        set({
          token: null,
          isAuthenticated: false,
          userName: '',
          userId: null,
          branchName: '',
          branchId: null,
          cart: [],
        });
      },

      /**
       * Add item to cart (or increment if exists)
       */
      addToCart: (item) => {
        set((state) => {
          const existingItem = state.cart.find((i) => i.productId === item.productId);

          if (existingItem) {
            // Check if we can increment quantity
            const canIncrement = existingItem.quantity < existingItem.stock;

            if (canIncrement) {
              // Show info toast for quantity increment with Undo action
              notifyItemAdded(
                item.name,
                item.price,
                () => {
                  // Undo: decrement quantity back
                  set((s) => ({
                    cart: s.cart.map((i) =>
                      i.productId === item.productId
                        ? { ...i, quantity: i.quantity - 1 }
                        : i
                    ).filter((i) => i.quantity > 0),
                  }));
                }
              );

              // Increment quantity if already in cart
              return {
                cart: state.cart.map((i) =>
                  i.productId === item.productId
                    ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
                    : i
                ),
              };
            } else {
              // Already at max stock
              notifyWarning('Maximum stock reached', {
                description: `Only ${existingItem.stock} available`,
              });
              return { cart: state.cart };
            }
          } else {
            // Show success toast for new item with Undo action
            notifyItemAdded(
              item.name,
              item.price,
              () => {
                // Undo: remove the item from cart
                set((s) => ({
                  cart: s.cart.filter((i) => i.productId !== item.productId),
                }));
              }
            );

            // Add new item with quantity 1
            return {
              cart: [...state.cart, { ...item, quantity: 1 }],
            };
          }
        });
      },

      /**
       * Update cart item quantity
       */
      updateCartItemQuantity: (productId, quantity) => {
        set((state) => ({
          cart: state.cart
            .map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.min(Math.max(quantity, 0), item.stock) }
                : item
            )
            .filter((item) => item.quantity > 0), // Remove if quantity is 0
        }));
      },

      /**
       * Remove item from cart
       */
      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.productId !== productId),
        }));
      },

      /**
       * Clear entire cart
       */
      clearCart: () => {
        set({ cart: [] });
      },

      /**
       * Toggle drawer open/closed
       */
      toggleDrawer: () => {
        set((state) => ({ isDrawerOpen: !state.isDrawerOpen }));
      },

      /**
       * Set drawer open state
       */
      setDrawerOpen: (open: boolean) => {
        set({ isDrawerOpen: open });
      },
    }),
    {
      name: 'pram-dashboard-storage', // localStorage key
      partialize: (state) => ({
        // Persist only essential data
        branchName: state.branchName,
        branchId: state.branchId,
        userName: state.userName,
        userRole: state.userRole,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        cart: state.cart, // Persist cart items
      }),
    }
  )
);

// ===== SELECTORS =====

/**
 * Get formatted branch display name
 */
export const useBranchDisplay = () => {
  return useStore((state) => `📍 ${state.branchName}`);
};

/**
 * Get formatted user display name
 */
export const useUserDisplay = () => {
  return useStore((state) => `Manager: ${state.userName}`);
};

/**
 * Check if user has specific role
 */
export const useHasRole = (role: UserRole) => {
  return useStore((state) => state.userRole === role);
};

/**
 * Get cart total amount
 */
export const useCartTotal = () => {
  return useStore((state) =>
    state.cart.reduce((total, item) => total + item.price * item.quantity, 0)
  );
};

/**
 * Get cart item count
 */
export const useCartItemCount = () => {
  return useStore((state) =>
    state.cart.reduce((count, item) => count + item.quantity, 0)
  );
};
