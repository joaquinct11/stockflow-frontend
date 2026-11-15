import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface SelectTenantRouteProps {
  children: React.ReactNode;
}

/**
 * Guard para /select-tenant.
 * - Si ya está completamente autenticado → /dashboard
 * - Si NO está en estado pendingTenantSelection → /login
 * - Si pendingTenantSelection === true → renderiza el selector
 */
export function SelectTenantRoute({ children }: SelectTenantRouteProps) {
  const { isAuthenticated, pendingTenantSelection, initialize } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize().finally(() => {
      setIsLoading(false);
    });
  }, [initialize]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!pendingTenantSelection) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
