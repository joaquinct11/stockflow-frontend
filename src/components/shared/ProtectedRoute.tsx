import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, initialize } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dar tiempo para que se inicialice el store
    const checkAuth = async () => {
      initialize();
      // Pequeño delay para asegurar que el localStorage se leyó
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsLoading(false);
    };
    
    checkAuth();
  }, [initialize]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    console.log('🔒 No autenticado, redirigiendo a login'); // ← Log para debug
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}