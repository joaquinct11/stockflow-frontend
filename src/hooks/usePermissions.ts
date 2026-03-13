import { useAuthStore } from '../store/authStore';

type Permission = 'crear'| 'activar' | 'editar' | 'eliminar' | 'ver' | 'ver_todas' | 'ver_propias' | 'ver_global' | 'ver_personal';

type Module = 
  | 'DASHBOARD'
  | 'PRODUCTOS'
  | 'VENTAS'
  | 'USUARIOS'
  | 'INVENTARIO'
  | 'PROVEEDORES'
  | 'SUSCRIPCIONES'
  | 'REPORTES'
  | 'CONFIGURACION';

type Role = 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'GESTOR_INVENTARIO';

const PERMISSIONS: Record<Module, Record<Role, Permission[]>> = {
  DASHBOARD: {
    ADMIN: ['ver_global', 'ver_personal'],
    GERENTE: ['ver_global', 'ver_personal'],
    VENDEDOR: ['ver_personal'],
    GESTOR_INVENTARIO: ['ver_personal'],
  },

  PROVEEDORES: {
    ADMIN: ['crear', 'editar', 'activar', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: ['crear', 'editar', 'ver'],
  },
  
  PRODUCTOS: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'eliminar', 'ver'],
    VENDEDOR: ['ver'],
    GESTOR_INVENTARIO: ['crear', 'editar', 'eliminar', 'ver'],
  },
  
  VENTAS: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver_todas'],
    GERENTE: ['crear', 'editar', 'eliminar', 'ver_todas'],
    VENDEDOR: ['crear', 'ver_propias'],
    GESTOR_INVENTARIO: [],
  },

  INVENTARIO: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: ['crear', 'editar', 'eliminar', 'ver'],
  },
  
  USUARIOS: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: [],
  },
  
  SUSCRIPCIONES: {
    ADMIN: ['ver', 'activar','eliminar'],
    GERENTE: [],
    VENDEDOR: [],
    GESTOR_INVENTARIO: [],
  },
  
  REPORTES: {
    ADMIN: ['ver'],
    GERENTE: ['ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: [],
  },
  
  CONFIGURACION: {
    ADMIN: ['ver', 'editar'],
    GERENTE: ['ver'],
    VENDEDOR: ['ver'],
    GESTOR_INVENTARIO: ['ver'],
  },
};

export function usePermissions() {
  const { user } = useAuthStore();
  const rol = (user?.rol || 'VENDEDOR') as Role;

  const hasPermission = (module: Module, permission: Permission): boolean => {
    const modulePermissions = PERMISSIONS[module]?.[rol] || [];
    return modulePermissions.includes(permission);
  };

  const canCreate = (module: Module) => hasPermission(module, 'crear');
  const canEdit = (module: Module) => hasPermission(module, 'editar');
  const canDelete = (module: Module) => hasPermission(module, 'eliminar');
  const canActive = (module: Module) => hasPermission(module, 'activar');
  const canView = (module: Module) => hasPermission(module, 'ver');
  const canViewAll = (module: Module) => hasPermission(module, 'ver_todas');
  const canViewOwn = (module: Module) => hasPermission(module, 'ver_propias');
  const canViewGlobal = (module: Module) => hasPermission(module, 'ver_global');
  const canViewPersonal = (module: Module) => hasPermission(module, 'ver_personal');

  const isAdmin = rol === 'ADMIN';
  const isGerente = rol === 'GERENTE';
  const isVendedor = rol === 'VENDEDOR';
  const isGestorInventario = rol === 'GESTOR_INVENTARIO';

  return {
    rol,
    hasPermission,
    canCreate,
    canEdit,
    canDelete,
    canActive,
    canView,
    canViewAll,
    canViewOwn,
    canViewGlobal,
    canViewPersonal,
    isAdmin,
    isGerente,
    isVendedor,
    isGestorInventario,
  };
}