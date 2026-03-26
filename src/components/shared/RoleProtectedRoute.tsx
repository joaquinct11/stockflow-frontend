import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  /** Also allow access when the user has this specific permission code (e.g. 'VER_SUSCRIPCIONES') */
  requiredPermission?: string;
  /** Also allow access when the user has ANY of these permission codes */
  anyPermission?: string[];
}

export function RoleProtectedRoute({ children, allowedRoles, requiredPermission, anyPermission }: RoleProtectedRouteProps) {
  const { user } = useAuthStore();
  const [hasShownToast, setHasShownToast] = useState(false);

  const userRole = user?.rol;
  const permisos = user?.permisos ?? [];
  const hasPermission =
    (userRole && (allowedRoles ?? []).includes(userRole)) ||
    (requiredPermission ? permisos.includes(requiredPermission) : false) ||
    (anyPermission ? anyPermission.some((p) => permisos.includes(p)) : false);

  useEffect(() => {
    if (!hasPermission && !hasShownToast) {
      toast.error('No tienes permisos para acceder a esta sección');
      setHasShownToast(true);
    }
  }, [hasPermission, hasShownToast]);

  if (!hasPermission) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}