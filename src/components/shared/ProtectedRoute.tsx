import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, pendingTenantSelection, initialize } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize().finally(() => setIsLoading(false));
  }, [initialize]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Usuario autenticado parcialmente: debe completar la selección de tenant
  if (pendingTenantSelection) {
    if (import.meta.env.DEV) { console.log('🏢 Selección de tenant pendiente, redirigiendo...');}
    return <Navigate to="/select-tenant" replace />;
  }

  if (!isAuthenticated) {
    if (import.meta.env.DEV) { console.log('🔒 No autenticado, redirigiendo a login');}
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}