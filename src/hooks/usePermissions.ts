import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

type Permission = 'crear'| 'activar' | 'cambiarEstado' | 'editar' | 'eliminar' | 'ver' | 'ver_todas' | 'ver_propias' | 'ver_global' | 'ver_personal';

export type Module =
  | 'DASHBOARD'
  | 'PRODUCTOS'
  | 'VENTAS'
  | 'POS'
  | 'USUARIOS'
  | 'INVENTARIO'
  | 'PROVEEDORES'
  | 'SUSCRIPCIONES'
  | 'REPORTES'
  | 'CONFIGURACION'
  | 'FACTURACION'
  | 'COMPRAS'
  | 'RECEPCIONES'
  | 'CLIENTES'
  | 'GASTOS'
  | 'CERTIFICADOS'
  | 'MASCOTAS'
  | 'CITAS'
  | 'CAJA'
  | 'DEVOLUCIONES'
  | 'NOTAS_CREDITO';

type Role = 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'GESTOR_INVENTARIO' | 'VETERINARIO' | 'RECEPCIONISTA' | 'AUXILIAR_VETERINARIO' | 'GROOMER';

// Mapping from frontend Permission names to backend verb prefixes (verb-first format).
const PERMISSION_CODE_MAP: Record<Permission, string> = {
  crear: 'CREAR',
  editar: 'EDITAR',
  eliminar: 'ELIMINAR',
  activar: 'ACTIVAR',
  cambiarEstado: 'CAMBIAR_ESTADO',
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
  },
  PROVEEDORES: {
    ver: 'VER_PROVEEDORES',
    ver_todas: 'VER_PROVEEDORES',
    crear: 'CREAR_PROVEEDOR',
    editar: 'EDITAR_PROVEEDOR',
    eliminar: 'ELIMINAR_PROVEEDOR',
    cambiarEstado: 'CAMBIAR_ESTADO_PROVEEDOR',
  },
  INVENTARIO: {
    ver: 'VER_INVENTARIO',
    ver_todas: 'VER_INVENTARIO',
    crear: 'CREAR_INVENTARIO',
    eliminar: 'ELIMINAR_INVENTARIO',
  },
  USUARIOS: {
    ver: 'VER_USUARIOS',
    ver_todas: 'VER_USUARIOS',
    crear: 'CREAR_USUARIO',
    editar: 'EDITAR_USUARIO',
    eliminar: 'ELIMINAR_USUARIO',
    cambiarEstado: 'CAMBIAR_ESTADO_USUARIO',
  },
  SUSCRIPCIONES: {
    ver: 'VER_SUSCRIPCIONES',
    ver_todas: 'VER_SUSCRIPCIONES',
    crear: 'CREAR_SUSCRIPCION',
    editar: 'EDITAR_SUSCRIPCION',
    eliminar: 'ELIMINAR_SUSCRIPCION',
    cambiarEstado: 'CAMBIAR_ESTADO_SUSCRIPCION',
  },
  FACTURACION: {
    ver: 'VER_FACTURACION',
    ver_todas: 'VER_FACTURACION',
    crear: 'EMITIR_COMPROBANTE',
    ver_propias: 'VER_COMPROBANTE',
    eliminar: 'ANULAR_COMPROBANTE',
  },
  COMPRAS: {
    ver: 'VER_OC',
    ver_todas: 'VER_OC',
    crear: 'CREAR_OC',
    editar: 'EDITAR_OC',
  },
  RECEPCIONES: {
    ver: 'VER_RECEPCIONES',
    ver_todas: 'VER_RECEPCIONES',
    crear: 'CREAR_RECEPCION',
    editar: 'CONFIRMAR_RECEPCION',
  },
  CLIENTES: {
    ver: 'VER_CLIENTES',
    ver_todas: 'VER_CLIENTES',
    crear: 'CREAR_CLIENTE',
    editar: 'EDITAR_CLIENTE',
    eliminar: 'ELIMINAR_CLIENTE',
    cambiarEstado: 'CAMBIAR_ESTADO_CLIENTE',
  },
  GASTOS: {
    ver: 'VER_GASTOS',
    ver_todas: 'VER_GASTOS',
    crear: 'CREAR_GASTO',
    editar: 'EDITAR_GASTO',
    eliminar: 'ELIMINAR_GASTO',
  },
  CERTIFICADOS: {
    ver: 'VER_CERTIFICADOS',
    ver_todas: 'VER_CERTIFICADOS',
    crear: 'CREAR_CERTIFICADO',
    editar: 'EDITAR_CERTIFICADO',
    eliminar: 'ELIMINAR_CERTIFICADO',
  },
  MASCOTAS: {
    ver: 'VER_MASCOTAS',
    ver_todas: 'VER_MASCOTAS',
    crear: 'CREAR_MASCOTA',
    editar: 'EDITAR_MASCOTA',
    cambiarEstado: 'CAMBIAR_ESTADO_MASCOTA',
  },
  CITAS: {
    ver: 'VER_CITAS',
    ver_todas: 'VER_CITAS',
    crear: 'CREAR_CITA',
    editar: 'EDITAR_CITA',
    cambiarEstado: 'CAMBIAR_ESTADO_CITA',
    eliminar: 'CANCELAR_CITA',
  },
  CAJA: {
    ver: 'VER_CAJA',
    crear: 'ABRIR_CAJA',
    editar: 'CERRAR_CAJA',
  },
  DEVOLUCIONES: {
    ver: 'VER_DEVOLUCIONES',
    crear: 'CREAR_DEVOLUCION',
  },
  NOTAS_CREDITO: {
    ver: 'VER_NOTAS_CREDITO',
    crear: 'EMITIR_NOTA_CREDITO',
  },
};

// Fallback role-based permission table (used when no backend permisos are assigned)
const PERMISSIONS: Record<Module, Record<Role, Permission[]>> = {
  DASHBOARD: {
    ADMIN: ['ver_global', 'ver_personal'],
    GERENTE: ['ver_global', 'ver_personal'],
    VENDEDOR: ['ver_personal'],
    GESTOR_INVENTARIO: ['ver_personal'],
    VETERINARIO: ['ver_personal'],
    RECEPCIONISTA: ['ver_personal'],
    AUXILIAR_VETERINARIO: ['ver_personal'],
    GROOMER: ['ver_personal'],
  },

  PROVEEDORES: {
    ADMIN: ['crear', 'editar', 'activar', 'cambiarEstado', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'cambiarEstado', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: ['crear', 'editar', 'cambiarEstado', 'ver'],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  PRODUCTOS: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'ver'],
    VENDEDOR: ['ver'],
    GESTOR_INVENTARIO: ['crear', 'editar', 'ver'],
    VETERINARIO: ['ver'],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: ['ver'],
    GROOMER: [],
  },

  VENTAS: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver_todas'],
    GERENTE: ['crear', 'eliminar', 'ver_todas'],
    VENDEDOR: ['crear', 'ver_propias'],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  POS: {
    ADMIN: ['ver', 'crear'],
    GERENTE: ['ver', 'crear'],
    VENDEDOR: ['ver', 'crear'],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  INVENTARIO: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver'],
    GERENTE: ['crear', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: ['crear', 'ver'],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  USUARIOS: {
    ADMIN: ['crear', 'editar', 'eliminar', 'cambiarEstado', 'ver'],
    GERENTE: ['crear', 'editar', 'cambiarEstado', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  SUSCRIPCIONES: {
    ADMIN: ['ver', 'activar', 'eliminar'],
    GERENTE: ['ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  REPORTES: {
    ADMIN: ['ver'],
    GERENTE: ['ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: ['ver'],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  FACTURACION: {
    ADMIN: ['ver', 'ver_todas', 'crear', 'eliminar'],
    GERENTE: ['ver', 'ver_todas', 'crear', 'eliminar'],
    VENDEDOR: ['crear', 'ver_propias'],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  COMPRAS: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: ['crear', 'editar', 'ver'],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  RECEPCIONES: {
    ADMIN: ['crear', 'editar', 'ver'],
    GERENTE: ['crear', 'editar', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: ['crear', 'editar', 'ver'],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  CONFIGURACION: {
    ADMIN: ['ver', 'editar'],
    GERENTE: ['ver'],
    VENDEDOR: ['ver'],
    GESTOR_INVENTARIO: ['ver'],
    VETERINARIO: ['ver'],
    RECEPCIONISTA: ['ver'],
    AUXILIAR_VETERINARIO: ['ver'],
    GROOMER: ['ver'],
  },

  CLIENTES: {
    ADMIN: ['crear', 'editar', 'eliminar', 'cambiarEstado', 'ver'],
    GERENTE: ['crear', 'editar', 'cambiarEstado', 'ver'],
    VENDEDOR: ['crear', 'editar', 'ver'],
    GESTOR_INVENTARIO: [],
    VETERINARIO: ['ver'],
    RECEPCIONISTA: ['crear', 'editar', 'ver'],
    AUXILIAR_VETERINARIO: ['ver'],
    GROOMER: ['ver'],
  },

  GASTOS: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  CERTIFICADOS: {
    ADMIN: ['crear', 'editar', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  MASCOTAS: {
    ADMIN: ['crear', 'editar', 'cambiarEstado', 'ver'],
    GERENTE: ['crear', 'editar', 'cambiarEstado', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: [],
    VETERINARIO: ['crear', 'editar', 'ver'],
    RECEPCIONISTA: ['crear', 'editar', 'ver'],
    AUXILIAR_VETERINARIO: ['ver'],
    GROOMER: ['ver'],
  },

  CITAS: {
    ADMIN: ['crear', 'editar', 'cambiarEstado', 'eliminar', 'ver'],
    GERENTE: ['crear', 'editar', 'cambiarEstado', 'eliminar', 'ver'],
    VENDEDOR: [],
    GESTOR_INVENTARIO: [],
    VETERINARIO: ['ver', 'cambiarEstado'],
    RECEPCIONISTA: ['crear', 'editar', 'cambiarEstado', 'eliminar', 'ver'],
    AUXILIAR_VETERINARIO: ['ver'],
    GROOMER: ['ver'],
  },

  CAJA: {
    ADMIN: ['ver', 'crear', 'editar'],
    GERENTE: ['ver', 'crear', 'editar'],
    VENDEDOR: ['ver', 'crear', 'editar'],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  DEVOLUCIONES: {
    ADMIN: ['ver', 'crear'],
    GERENTE: ['ver', 'crear'],
    VENDEDOR: ['ver', 'crear'],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
  },

  NOTAS_CREDITO: {
    ADMIN: ['ver', 'crear'],
    GERENTE: ['ver', 'crear'],
    VENDEDOR: ['ver', 'crear'],
    GESTOR_INVENTARIO: [],
    VETERINARIO: [],
    RECEPCIONISTA: [],
    AUXILIAR_VETERINARIO: [],
    GROOMER: [],
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
  const canToggleState = (module: Module) => hasPermission(module, 'cambiarEstado');
  const canView = (module: Module) => hasPermission(module, 'ver');
  /** Alias for canView — explicitly gates listing operations behind VER_ permissions per Policy A. */
  const canList = (module: Module) => canView(module);
  const canViewAll = (module: Module) => hasPermission(module, 'ver_todas');
  const canViewOwn = (module: Module) => hasPermission(module, 'ver_propias');
  const canViewGlobal = (module: Module) => hasPermission(module, 'ver_global');
  const canViewPersonal = (module: Module) => hasPermission(module, 'ver_personal');

  /** Check a raw backend permission code directly (e.g. 'CREAR_PRODUCTO'). Admin always returns true. */
  const puede = useCallback((code: string): boolean => {
    if (isAdmin) return true;
    const permisos = user?.permisos ?? [];
    return permisos.includes(code);
  }, [isAdmin, user]);

  /**
   * Returns true if the user can access the module at all —
   * i.e. they are admin OR have at least one relevant permission for the module.
   * Used for sidebar visibility and route guards so that any relevant permission
   * (VER_*, CREAR_*, EDITAR_*, ELIMINAR_*, CAMBIAR_ESTADO_*) grants entry to the module.
   */
  const canAccess = (module: Module): boolean => {
    if (isAdmin) return true;

    // POS no tiene códigos de permiso en el backend → usar tabla por rol directamente
    if (module === 'POS') {
      return (PERMISSIONS.POS[rol] ?? []).length > 0;
    }

    return (
      canView(module) ||
      canViewAll(module) ||
      canViewOwn(module) ||
      canCreate(module) ||
      canEdit(module) ||
      canDelete(module) ||
      canActive(module) ||
      canToggleState(module)
    );
  };

  const isVendedor = rol === 'VENDEDOR';
  const isGestorInventario = rol === 'GESTOR_INVENTARIO';
  const isGerente = rol === 'GERENTE';
  const isVeterinario = rol === 'VETERINARIO';
  const isRecepcionista = rol === 'RECEPCIONISTA';
  const isAuxiliarVeterinario = rol === 'AUXILIAR_VETERINARIO';
  const isGroomer = rol === 'GROOMER';
  const isRolVeterinaria = isVeterinario || isRecepcionista || isAuxiliarVeterinario || isGroomer;

  return {
    rol,
    hasPermission,
    puede,
    canAccess,
    canCreate,
    canEdit,
    canDelete,
    canActive,
    canToggleState,
    canList,
    canView,
    canViewAll,
    canViewOwn,
    canViewGlobal,
    canViewPersonal,
    isAdmin,
    isVendedor,
    isGestorInventario,
    isGerente,
    isVeterinario,
    isRecepcionista,
    isAuxiliarVeterinario,
    isGroomer,
    isRolVeterinaria,
  };
}