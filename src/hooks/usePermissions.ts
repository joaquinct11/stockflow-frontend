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

// Mapping from frontend Permission names to backend verb prefixes (verb-first format).
const PERMISSION_CODE_MAP: Record<Permission, string> = {
  crear: 'CREAR',
  editar: 'EDITAR',
  eliminar: 'ELIMINAR',
  activar: 'ACTIVAR',
  ver: 'VER',
  ver_todas: 'VER',
  ver_propias: 'VER',
  ver_global: 'VER',
  ver_personal: 'VER',
};

// Direct mapping to exact backend permission codes (verb-first, e.g. VER_VENTAS).
// Handles module-specific naming (singular/plural) and special permissions like VER_MIS_VENTAS.
const BACKEND_PERMISSION_MAP: Partial<Record<Module, Partial<Record<Permission, string>>>> = {
  VENTAS: {
    ver: 'VER_VENTAS',
    ver_todas: 'VER_VENTAS',
    ver_propias: 'VER_MIS_VENTAS',
    ver_global: 'VER_VENTAS',
    crear: 'CREAR_VENTA',
    editar: 'EDITAR_VENTA',
    eliminar: 'ELIMINAR_VENTA',
  },
  PRODUCTOS: {
    ver: 'VER_PRODUCTOS',
    ver_todas: 'VER_PRODUCTOS',
    crear: 'CREAR_PRODUCTO',
    editar: 'EDITAR_PRODUCTO',
    eliminar: 'ELIMINAR_PRODUCTO',
    activar: 'ACTIVAR_PRODUCTO',
  },
  PROVEEDORES: {
    ver: 'VER_PROVEEDORES',
    ver_todas: 'VER_PROVEEDORES',
    crear: 'CREAR_PROVEEDOR',
    editar: 'EDITAR_PROVEEDOR',
    eliminar: 'ELIMINAR_PROVEEDOR',
    activar: 'ACTIVAR_PROVEEDOR',
  },
  INVENTARIO: {
    ver: 'VER_INVENTARIO',
    ver_todas: 'VER_INVENTARIO',
    crear: 'CREAR_MOVIMIENTO',
    editar: 'EDITAR_MOVIMIENTO',
    eliminar: 'ELIMINAR_MOVIMIENTO',
  },
  USUARIOS: {
    ver: 'VER_USUARIOS',
    ver_todas: 'VER_USUARIOS',
    crear: 'CREAR_USUARIO',
    editar: 'EDITAR_USUARIO',
    eliminar: 'ELIMINAR_USUARIO',
    activar: 'ACTIVAR_USUARIO',
  },
  SUSCRIPCIONES: {
    ver: 'VER_SUSCRIPCIONES',
    ver_todas: 'VER_SUSCRIPCIONES',
    activar: 'ACTIVAR_SUSCRIPCION',
    eliminar: 'ELIMINAR_SUSCRIPCION',
  },
};

// Fallback role-based permission table (used when no backend permisos are assigned)
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
  const isAdmin = rol === 'ADMIN';

  const hasPermission = (module: Module, permission: Permission): boolean => {
    // ADMIN always has full access (backward compatibility)
    if (isAdmin) return true;

    const permisos = user?.permisos ?? [];

    if (permisos.length > 0) {
      // Check module-specific backend code first (handles singular/plural and special cases)
      const backendCode = BACKEND_PERMISSION_MAP[module]?.[permission];
      if (backendCode !== undefined) {
        return permisos.includes(backendCode);
      }
      // Default: verb-first format (e.g. VER_PRODUCTOS, CREAR_INVENTARIO)
      const code = `${PERMISSION_CODE_MAP[permission]}_${module}`;
      return permisos.includes(code);
    }

    // Fallback: role-based table (backward compatibility for existing roles)
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

  /** Check a raw backend permission code directly (e.g. 'CREAR_PRODUCTO'). Admin always returns true. */
  const puede = (code: string): boolean => {
    if (isAdmin) return true;
    const permisos = user?.permisos ?? [];
    return permisos.includes(code);
  };

  /**
   * Returns true if the user can access the module at all —
   * i.e. they are admin OR have at least one relevant permission for the module.
   * Used for sidebar visibility and route guards so that any relevant permission
   * (VER_*, CREAR_*, EDITAR_*, ELIMINAR_*, ACTIVAR_*) grants entry to the module.
   */
  const canAccess = (module: Module): boolean => {
    if (isAdmin) return true;
    return (
      canView(module) ||
      canViewAll(module) ||
      canViewOwn(module) ||
      canCreate(module) ||
      canEdit(module) ||
      canDelete(module) ||
      canActive(module)
    );
  };

  const isGerente = rol === 'GERENTE';
  const isVendedor = rol === 'VENDEDOR';
  const isGestorInventario = rol === 'GESTOR_INVENTARIO';

  return {
    rol,
    hasPermission,
    puede,
    canAccess,
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