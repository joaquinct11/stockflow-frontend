import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import type { Module } from '../../hooks/usePermissions';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  /** Also allow access when the user has this specific permission code (e.g. 'VER_SUSCRIPCIONES') */
  requiredPermission?: string;
  /** Also allow access when the user has ANY of these permission codes */
  anyPermission?: string[];
  /**
   * Grant access when the user has ANY permission for the given module
   * (Policy A: VER_*, CREAR_*, EDITAR_*, ELIMINAR_*, ACTIVAR_*).
   * When provided, allowedRoles / requiredPermission / anyPermission are ignored.
   */
  module?: Module;
}

export function RoleProtectedRoute({ children, allowedRoles, requiredPermission, anyPermission, module }: RoleProtectedRouteProps) {
  const { user } = useAuthStore();
  const { canAccess } = usePermissions();
  const [hasShownToast, setHasShownToast] = useState(false);

  const userRole = user?.rol;
  const permisos = user?.permisos ?? [];
  const hasPermission = module
    ? canAccess(module)
    : (userRole && (allowedRoles ?? []).includes(userRole)) ||
      (requiredPermission ? permisos.includes(requiredPermission) : false) ||
      (anyPermission ? anyPermission.some((p) => permisos.includes(p)) : false);

  useEffect(() => {
    if (!hasPermission && !hasShownToast) {
      toast.error('No tienes permisos para acceder a esta sección');
      setHasShownToast(true);
    }
  }, [hasPermission, hasShownToast]);

  if (!hasPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}