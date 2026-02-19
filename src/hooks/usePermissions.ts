import { useAuthStore } from '../store/authStore';

type Permission = 
  | 'dashboard'
  | 'usuarios'
  | 'suscripciones'
  | 'productos'
  | 'ventas'
  | 'inventario'
  | 'reportes'
  | 'configuracion';

const PERMISOS_POR_ROL: Record<string, Permission[]> = {
  ADMIN: [
    'dashboard',
    'usuarios',
    'suscripciones',
    'productos',
    'ventas',
    'inventario',
    'reportes',
    'configuracion',
  ],
  GERENTE: [
    'dashboard',
    'usuarios',
    'suscripciones',
    'productos',
    'ventas',
    'inventario',
    'reportes',
  ],
  VENDEDOR: [
    'dashboard',
    'productos',
    'ventas',
    'inventario',
  ],
  ALMACENERO: [
    'dashboard',
    'productos',
    'ventas',
    'inventario',
  ],
};

export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const rol = user?.rol || 'VENDEDOR'; // Default a vendedor por seguridad

  const permisos = PERMISOS_POR_ROL[rol] || [];

  const puede = (permiso: Permission): boolean => {
    return permisos.includes(permiso);
  };

  const noPermitido = (permiso: Permission): boolean => {
    return !puede(permiso);
  };

  return {
    rol,
    permisos,
    puede,
    noPermitido,
  };
}