// ============================================
// AXIOS INSTANCE - API CLIENT
// ============================================

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useStore } from '../store/useStore';

// ===== BASE CONFIGURATION =====

// Using Vite proxy - all /api requests go to http://localhost:5000/api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS
});

// ===== REQUEST INTERCEPTOR =====
// Auto-inject token and branch ID from Zustand store

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get state from Zustand store
    const state = useStore.getState();
    const { token, branchId } = state;

    // Inject JWT token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Inject branch ID if available
    if (branchId) {
      config.headers['x-branch-id'] = branchId;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ===== RESPONSE INTERCEPTOR =====
// Handle global errors

axiosInstance.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API] ✅ ${response.config.url}`);
    }
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401) {
      console.error('[API] ❌ Unauthorized - clearing auth');
      const { logout } = useStore.getState();
      logout();
      window.location.href = '/login';
    }

    // Log error in development
    if (import.meta.env.DEV) {
      console.error('[API] ❌ Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

// ===== TYPED API CLIENT =====

export const api = {
  // Authentication
  auth: {
    login: (email: string, password: string) =>
      axiosInstance.post('/auth/login', { email, password }),
    logout: () => axiosInstance.post('/auth/logout'),
    getMe: () => axiosInstance.get('/auth/me'),
  },

  // Products
  products: {
    list: (params?: Record<string, any>) =>
      axiosInstance.get('/products', { params }),
    get: (id: string) => axiosInstance.get(`/products/${id}`),
  },

  // Sales
  sales: {
    list: (params?: Record<string, any>) =>
      axiosInstance.get('/sales', { params }),
    get: (id: string) => axiosInstance.get(`/sales/${id}`),
    create: (data: any) => axiosInstance.post('/sales', data),
  },

  // Dashboard
  dashboard: {
    stats: () => axiosInstance.get('/dashboard/stats'),
    branch: (branchId: string) =>
      axiosInstance.get(`/dashboard/branch/${branchId}`),
  },
};

export default axiosInstance;
