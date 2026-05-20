export const API_ENDPOINTS = {
  TENANT: {
    CONFIG: '/tenant/config',
  },
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',                        // ✅ NUEVO
    CHANGE_PASSWORD: '/auth/cambiar-contraseña',  // ✅ NUEVO
    FORGOT_PASSWORD: '/auth/forgot-password',      // ✅ NUEVO
    RESET_PASSWORD: '/auth/reset-password',        // ✅ NUEVO
    ACTIVATE_ACCOUNT: '/auth/activate-account',   // ✅ Activación cuenta nueva
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
    VALIDAR_ELIMINACION: (id: number) => `/usuarios/${id}/validar-eliminacion`,
    DELETE_CUENTA_COMPLETA: (id: number) => `/usuarios/${id}/cuenta-completa`,
    REENVIAR_ACTIVACION: (id: number) => `/usuarios/${id}/reenviar-activacion`,
  },

  UNIDADES_MEDIDA: {
    LIST: '/unidad-medida',
    GET: (id: number) => `/unidad-medida/${id}`,
    CREATE: '/unidad-medida',
    UPDATE: (id: number) => `/unidad-medida/${id}`,
    DELETE: (id: number) => `/unidad-medida/${id}`,
  },

  CATEGORIAS: {
    LIST: '/categorias',
    CREATE: '/categorias',
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
    IMPORTAR: '/productos/importar',
  },
  
  VENTAS: {
    LIST: '/ventas',
    GET: (id: number) => `/ventas/${id}`,
    GET_BY_VENDOR: (vendedorId: number) => `/ventas/vendedor/${vendedorId}`,
    GET_BY_TENANT: (tenantId: string) => `/ventas/tenant/${tenantId}`,
    CREATE: '/ventas',
    UPDATE: (id: number) => `/ventas/${id}`,
    ANULAR: (id: number) => `/ventas/${id}/anular`,
  },
  
  SUSCRIPCIONES: {
    LIST: '/suscripciones',
    GET: (id: number) => `/suscripciones/${id}`,
    GET_BY_USER: (usuarioId: number) => `/suscripciones/usuario/${usuarioId}`,
    GET_BY_STATE: (estado: string) => `/suscripciones/estado/${estado}`,
    ESTADO: '/suscripciones/estado',
    SINCRONIZAR: '/suscripciones/sincronizar',
    CHECKOUT: '/suscripciones/checkout',
    CREATE: '/suscripciones',
    UPDATE: (id: number) => `/suscripciones/${id}`,
    CANCEL: (id: number) => `/suscripciones/${id}/cancelar`,
    CANCEL_MI_SUSCRIPCION: '/suscripciones/cancelar',
    ACTIVATE: (id: number) => `/suscripciones/${id}/activar`,
    DELETE: (id: number) => `/suscripciones/${id}`,
  },
  
  MOVIMIENTOS: {
    LIST: '/movimientos-inventario',
    GET: (id: number) => `/movimientos-inventario/${id}`,
    GET_BY_PRODUCTO: (productoId: number) => `/movimientos-inventario/producto/${productoId}`,
    GET_BY_TIPO: (tipo: string) => `/movimientos-inventario/tipo/${tipo}`,
    GET_KARDEX: (productoId: number) => `/movimientos-inventario/kardex/${productoId}`,
    LOTES: '/movimientos-inventario/lotes',
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
    PDF: (id: number) => `/oc/${id}/pdf`,
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
    ANULAR: (id: number) => `/recepciones/${id}`,
  },

  DEVOLUCIONES: {
    LIST: '/devoluciones',
    BY_VENTA: (ventaId: number) => `/devoluciones/venta/${ventaId}`,
    CREATE: '/devoluciones',
  },

  CAJAS: {
    ACTIVA: '/cajas/activa',
    LIST: '/cajas',
    GET: (id: number) => `/cajas/${id}`,
    ABRIR: '/cajas/abrir',
    CERRAR: (id: number) => `/cajas/${id}/cerrar`,
    RETIRO: (id: number) => `/cajas/${id}/retiro`,
  },

  NOTAS_CREDITO: {
    LIST: '/notas-credito',
    VALIDAR: (codigo: string) => `/notas-credito/validar?codigo=${encodeURIComponent(codigo)}`,
    PDF: (id: number) => `/notas-credito/${id}/pdf`,
  },

  ONBOARDING: {
    PROGRESO: '/onboarding/progreso',
  },

  CLIENTES: {
    LIST: '/clientes',
    LIST_ACTIVOS: '/clientes/activos',
    GET: (id: number) => `/clientes/${id}`,
    SEARCH: (nombre: string) => `/clientes/buscar?nombre=${nombre}`,
    BUSCAR_DOCUMENTO: (numero: string) => `/clientes/documento/${numero}`,
    CREATE: '/clientes',
    UPDATE: (id: number) => `/clientes/${id}`,
    DELETE: (id: number) => `/clientes/${id}`,
    ACTIVATE: (id: number) => `/clientes/${id}/activar`,
    DEACTIVATE: (id: number) => `/clientes/${id}/desactivar`,
  },

  GASTOS: {
    LIST: '/gastos',
    LIST_ACTIVOS: '/gastos/activos',
    GET: (id: number) => `/gastos/${id}`,
    BUSCAR: (q: string) => `/gastos/buscar?q=${encodeURIComponent(q)}`,
    POR_CATEGORIA: (cat: string) => `/gastos/categoria/${encodeURIComponent(cat)}`,
    POR_RANGO: (inicio: string, fin: string) => `/gastos/rango?inicio=${inicio}&fin=${fin}`,
    TOTAL: (inicio: string, fin: string) => `/gastos/total?inicio=${inicio}&fin=${fin}`,
    CREATE: '/gastos',
    UPDATE: (id: number) => `/gastos/${id}`,
    DELETE: (id: number) => `/gastos/${id}`,
  },

  NOTIFICACIONES: {
    LIST: '/notificaciones',
    NO_LEIDAS_COUNT: '/notificaciones/no-leidas-count',
    MARCAR_LEIDA: (id: number) => `/notificaciones/${id}/leer`,
    MARCAR_TODAS_LEIDAS: '/notificaciones/leer-todas',
    ELIMINAR: (id: number) => `/notificaciones/${id}`,
    ELIMINAR_LEIDAS: '/notificaciones/leidas',
  },

  REPORTES: {
    RESUMEN: (desde: string, hasta: string) =>
      `/reportes/resumen?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,

    // Ventas
    VENTAS_TENDENCIA: (desde: string, hasta: string, agrupacion: string) =>
      `/reportes/ventas/tendencia?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&agrupacion=${agrupacion}`,
    VENTAS_POR_VENDEDOR: (desde: string, hasta: string, limit = 20) =>
      `/reportes/ventas/por-vendedor?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&limit=${limit}`,
    VENTAS_POR_CATEGORIA: (desde: string, hasta: string, limit = 20) =>
      `/reportes/ventas/por-categoria?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&limit=${limit}`,
    VENTAS_POR_METODO_PAGO: (desde: string, hasta: string) =>
      `/reportes/ventas/por-metodo-pago?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,
    VENTAS_PRODUCTOS: (desde: string, hasta: string, limit = 10, orden: string, metrica: string) =>
      `/reportes/ventas/productos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&limit=${limit}&orden=${orden}&metrica=${metrica}`,

    // Inventario
    INVENTARIO_ABC: (desde: string, hasta: string, limit = 50) =>
      `/reportes/inventario/abc?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&limit=${limit}`,
    INVENTARIO_SLOW_MOVERS: (diasSinSalida = 30, limit = 20) =>
      `/reportes/inventario/slow-movers?diasSinSalida=${diasSinSalida}&limit=${limit}`,
    INVENTARIO_COBERTURA: (desde: string, hasta: string, limit = 20) =>
      `/reportes/inventario/cobertura?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&limit=${limit}`,
    INVENTARIO_VENCIMIENTOS: '/reportes/inventario/vencimientos',

    // Compras
    COMPRAS_POR_PROVEEDOR: (desde: string, hasta: string, limit = 20) =>
      `/reportes/compras/por-proveedor?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&limit=${limit}`,

    // Financiero (P&L)
    FINANCIERO: (desde: string, hasta: string) =>
      `/reportes/financiero?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,

    // Clientes
    CLIENTES: (desde: string, hasta: string, limit = 20) =>
      `/reportes/clientes?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&limit=${limit}`,
  },
};
