export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/registro',
    LOGOUT: '/auth/logout',
  },
  
  USUARIOS: {
    LIST: '/usuarios',
    GET: (id: number) => `/usuarios/${id}`,
    GET_BY_EMAIL: (email: string) => `/usuarios/email/${email}`,
    GET_BY_TENANT: (tenantId: string) => `/usuarios/tenant/${tenantId}`,
    UPDATE: (id: number) => `/usuarios/${id}`,
    DEACTIVATE: (id: number) => `/usuarios/${id}/desactivar`,
    ACTIVATE: (id: number) => `/usuarios/${id}/activar`,
    DELETE: (id: number) => `/usuarios/${id}`,
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
    DELETE: (id: number) => `/suscripciones/${id}`,
  },
  
  MOVIMIENTOS: {
    LIST: '/movimientos-inventario',
    GET: (id: number) => `/movimientos-inventario/${id}`,
    GET_BY_PRODUCT: (productoId: number) => `/movimientos-inventario/producto/${productoId}`,
    GET_BY_TENANT: (tenantId: string) => `/movimientos-inventario/tenant/${tenantId}`,
    CREATE: '/movimientos-inventario',
    DELETE: (id: number) => `/movimientos-inventario/${id}`,
  },
  
  ROLES: {
    LIST: '/roles',
    GET: (id: number) => `/roles/${id}`,
    CREATE: '/roles',
    UPDATE: (id: number) => `/roles/${id}`,
    DELETE: (id: number) => `/roles/${id}`,
  },
};