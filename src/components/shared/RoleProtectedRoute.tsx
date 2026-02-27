import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { user } = useAuthStore();
  const [hasShownToast, setHasShownToast] = useState(false);

  const userRole = user?.rol;
  const hasPermission = userRole && allowedRoles.includes(userRole);

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