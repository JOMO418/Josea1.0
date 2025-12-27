// ============================================
// ADMIN ROUTE GUARD
// Role-Based Access Control for Admin Dashboard
// ============================================

import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { useEffect, useRef } from 'react';

export default function AdminRoute() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const userRole = useStore((state) => state.userRole);
  const hasShownToast = useRef(false);

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has admin or owner role
  const isAuthorized = userRole === 'ADMIN' || userRole === 'OWNER';

  useEffect(() => {
    if (!isAuthorized && !hasShownToast.current) {
      toast.error('Unauthorized Access', {
        description: 'You do not have permission to access the Admin Dashboard.',
        duration: 4000,
      });
      hasShownToast.current = true;
    }
  }, [isAuthorized]);

  // Redirect managers to their dashboard
  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  // Render admin routes
  return <Outlet />;
}
