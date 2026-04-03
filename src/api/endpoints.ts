export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',                        // ✅ NUEVO
    CHANGE_PASSWORD: '/auth/cambiar-contraseña',  // ✅ NUEVO
    FORGOT_PASSWORD: '/auth/forgot-password',      // ✅ NUEVO
    RESET_PASSWORD: '/auth/reset-password',        // ✅ NUEVO
  },
  
  USUARIOS: {
    LIST: '/usuarios',
    GET: (id: number) => `/usuarios/${id}`,
    GET_BY_EMAIL: (email: string) => `/usuarios/email/${email}`,
    GET_BY_TENANT: (tenantId: string) => `/usuarios/tenant/${tenantId}`,
    CREATE: '/usuarios',
    UPDATE: (id: number) => `/usuarios/${id}`,
    DEACTIVATE: (id: number) => `/usuarios/${id}/desactivar`,
    ACTIVATE: (id: number) => `/usuarios/${id}/activar`,
    DELETE: (id: number) => `/usuarios/${id}`,
    VALIDAR_ELIMINACION: (id: number) => `/usuarios/${id}/validar-eliminacion`,  // ✅ NUEVO
    DELETE_CUENTA_COMPLETA: (id: number) => `/usuarios/${id}/cuenta-completa`,  // ✅ NUEVO
  },

  UNIDADES_MEDIDA: {
    LIST: '/unidad-medida',
    GET: (id: number) => `/unidad-medida/${id}`,
    CREATE: '/unidad-medida',
    UPDATE: (id: number) => `/unidad-medida/${id}`,
    DELETE: (id: number) => `/unidad-medida/${id}`,
  },
  
  PRODUCTOS: {
    LIST: '/productos',
    GET: (id: number) => `/productos/${id}`,
    GET_BY_BARCODE: (barcode: string) => `/productos/codigo/${barcode}`,
    SEARCH: (nombre: string) => `/productos/buscar?nombre=${nombre}`,
    GET_BY_TENANT: (tenantId: string) => `/productos/tenant/${tenantId}`,
    GET_LOW_STOCK: (tenantId: string) => `/productos/tenant/${tenantId}/bajo-stock`,
    CREATE: '/productos',
    UPDATE: (id: number) => `/productos/${id}`,
    DELETE: (id: number) => `/productos/${id}`,
  },
  
  VENTAS: {
    LIST: '/ventas',
    GET: (id: number) => `/ventas/${id}`,
    GET_BY_VENDOR: (vendedorId: number) => `/ventas/vendedor/${vendedorId}`,
    GET_BY_TENANT: (tenantId: string) => `/ventas/tenant/${tenantId}`,
    CREATE: '/ventas',
    UPDATE: (id: number) => `/ventas/${id}`,
    DELETE: (id: number) => `/ventas/${id}`,
  },
  
  SUSCRIPCIONES: {
    LIST: '/suscripciones',
    GET: (id: number) => `/suscripciones/${id}`,
    GET_BY_USER: (usuarioId: number) => `/suscripciones/usuario/${usuarioId}`,
    GET_BY_STATE: (estado: string) => `/suscripciones/estado/${estado}`,
    CREATE: '/suscripciones',
    UPDATE: (id: number) => `/suscripciones/${id}`,
    CANCEL: (id: number) => `/suscripciones/${id}/cancelar`,
    ACTIVATE: (id: number) => `/suscripciones/${id}/activar`,
    DELETE: (id: number) => `/suscripciones/${id}`,
  },
  
  MOVIMIENTOS: {
    LIST: '/movimientos-inventario',
    GET: (id: number) => `/movimientos-inventario/${id}`,
    GET_BY_PRODUCTO: (productoId: number) => `/movimientos-inventario/producto/${productoId}`,
    GET_BY_TIPO: (tipo: string) => `/movimientos-inventario/tipo/${tipo}`,
    GET_KARDEX: (productoId: number) => `/movimientos-inventario/kardex/${productoId}`,
    CREATE: '/movimientos-inventario',
    UPDATE: (id: number) => `/movimientos-inventario/${id}`,
    DELETE: (id: number) => `/movimientos-inventario/${id}`,
  },
  
  ROLES: {
    LIST: '/roles',
    GET: (id: number) => `/roles/${id}`,
    CREATE: '/roles',
    UPDATE: (id: number) => `/roles/${id}`,
    DELETE: (id: number) => `/roles/${id}`,
  },

  PROVEEDORES: {
    LIST: '/proveedores',
    LIST_ACTIVOS: '/proveedores/activos',
    GET: (id: number) => `/proveedores/${id}`,
    GET_BY_RUC: (ruc: string) => `/proveedores/ruc/${ruc}`,
    SEARCH: (nombre: string) => `/proveedores/buscar?nombre=${nombre}`,
    CREATE: '/proveedores',
    UPDATE: (id: number) => `/proveedores/${id}`,
    DELETE: (id: number) => `/proveedores/${id}`,
    ACTIVATE: (id: number) => `/proveedores/${id}/activar`,
    DEACTIVATE: (id: number) => `/proveedores/${id}/desactivar`,
  },

  ADMIN: {
    PERMISOS: '/admin/permisos',
    USUARIOS: '/admin/usuarios',
    USUARIO_PERMISOS: (id: number) => `/admin/usuarios/${id}/permisos`,
  },

  FACTURACION: {
    LIST: '/facturacion/comprobantes',
    GET: (id: number) => `/facturacion/comprobantes/${id}`,
    CREATE: '/facturacion/comprobantes',
    ANULAR: (id: number) => `/facturacion/comprobantes/${id}/anular`,
    GET_BY_VENTA: (ventaId: number) => `/ventas/${ventaId}/comprobante`,
  },

  ORDENES_COMPRA: {
    LIST: '/oc',
    GET: (id: number) => `/oc/${id}`,
    CREATE: '/oc',
    UPDATE: (id: number) => `/oc/${id}`,
    ADD_ITEM: (id: number) => `/oc/${id}/items`,
    REMOVE_ITEM: (id: number, itemId: number) => `/oc/${id}/items/${itemId}`,
    ENVIAR: (id: number) => `/oc/${id}/enviar`,
    CANCELAR: (id: number) => `/oc/${id}/cancelar`,
  },

  RECEPCIONES: {
    LIST: '/recepciones',
    GET: (id: number) => `/recepciones/${id}`,
    CREATE: '/recepciones',
    UPDATE: (id: number) => `/recepciones/${id}`,
    UPSERT_ITEMS: (id: number) => `/recepciones/${id}/items`,
    REMOVE_ITEM: (id: number, itemId: number) => `/recepciones/${id}/items/${itemId}`,
    SET_COMPROBANTE: (id: number) => `/recepciones/${id}/comprobante`,
    CONFIRMAR: (id: number) => `/recepciones/${id}/confirmar`,
  },
};