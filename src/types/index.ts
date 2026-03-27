// ========================================
// AUTH & USUARIOS
// ========================================

export interface Usuario {
  id?: number;
  email: string;
  nombre: string;
  contraseña?: string;
  rolNombre: string;
  activo?: boolean;
  tenantId: string;
  ultimoLogin?: string;
  deletedAt?: string;  // ✅ AGREGADO
}

export interface JwtResponse {
  // id?: number;
  accessToken: string;      // ✅ Token corto (15 min)
  refreshToken: string;     // ✅ Token largo (7 días)
  tipo: string;
  usuarioId: number;
  email: string;
  nombre: string;
  rol: string;
  tenantId: string;  // ✅ AGREGADO
  expiresIn: number;        // Segundos (ej: 900 para 15 min)
  suscripcion?: SuscripcionDTO;  // ✅ AGREGADO
  permisos?: string[];      // Códigos de permisos del usuario (e.g. PRODUCTOS_VER)
}

// ========================================
// ADMIN - PERMISOS
// ========================================

export interface AdminUsuario {
  id: number;
  email: string;
  nombre: string;
  rolNombre: string;
  activo: boolean;
  tenantId: string;
}

export interface Permiso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export interface LoginDTO {
  email: string;
  contraseña: string;
}

// ✅ NUEVO: Para registro de nueva farmacia
export interface RegistrationRequestDTO {
  email: string;
  contraseña: string;
  nombre: string;
  nombreFarmacia: string;
  planId: 'FREE' | 'BASICO' | 'PRO';
}

// ========================================
// UNIDAD DE MEDIDA
// ========================================

export interface UnidadMedidaDTO {
  id: number;
  nombre: string;        // ej: "Kg", "Caja", "Unidad"
  abreviatura?: string;  // ej: "kg", "caja", "und" (si la tienes)
  activo?: boolean;
  tenantId?: string;
}

// ========================================
// PRODUCTOS
// ========================================

export interface ProductoDTO {
  id?: number;
  nombre: string;
  codigoBarras: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  costoUnitario: number;
  precioVenta: number;
  fechaVencimiento?: string;
  lote?: string;
  proveedorId?: number;
  activo?: boolean;
  deletedAt?: string;
  tenantId: string;
  // ✅ NUEVO (elige lo que tu backend exponga)
  unidadMedidaId: number;
  // opcional para mostrar sin otra llamada (si tu backend lo manda)
  unidadMedidaNombre?: string;
}

// ========================================
// VENTAS
// ========================================

export interface VentaDTO {
  id?: number;
  vendedorId: number;
  vendedorNombre?: string;
  total: number;
  metodoPago: string;
  estado: string;
  tenantId: string;
  createdAt?: string;
  detalles: DetalleVentaDTO[];
}

export interface DetalleVentaDTO {
  id?: number;
  productoId: number;
  productoNombre?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal?: number;
}

// ========================================
// SUSCRIPCIONES
// ========================================

export interface SuscripcionDTO {
  id?: number;
  usuarioPrincipalId: number;
  planId: string;
  precioMensual: number;
  preapprovalId?: string;
  intentosFallidos?: number;  // ✅ AGREGADO
  estado: string;
  metodoPago?: string;
  ultimos4Digitos?: string;
  tenantId?: string;  // ✅ AGREGADO
  fechaInicio?: string;  // ✅ AGREGADO
  fechaProximoCobro?: string;  // ✅ AGREGADO
  fechaCancelacion?: string;  // ✅ AGREGADO
  deletedAt?: string;  // ✅ AGREGADO
}

// ========================================
// TENANTS
// ========================================

// ✅ NUEVO
export interface TenantDTO {
  id?: number;
  tenantId: string;
  nombre: string;
  activo: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ========================================
// ROLES
// ========================================

export interface RolDTO {
  id?: number;
  nombre: string;
  descripcion?: string;
}

// ========================================
// MOVIMIENTOS DE INVENTARIO
// ========================================

export interface MovimientoInventarioDTO {
  id?: number;
  productoId: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION';
  cantidad: number;
  descripcion: string;
  referencia?: string;
  usuarioId?: number;
  tenantId: string;
  createdAt?: string;
  // Campos exclusivos para tipo === 'ENTRADA'
  proveedorId?: number;
  costoUnitario?: number;
  lote?: string;
  fechaVencimiento?: string;
}

export interface KardexDTO {
  id?: number;
  productoId: number;
  productoNombre?: string;
  movimientos: MovimientoInventarioDTO[];
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
}

// ========================================
// PROVEEDORES
// ========================================

export interface ProveedorDTO {
  id?: number;
  nombre: string;
  ruc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo?: boolean;
  deletedAt?: string;  // ✅ AGREGADO
  tenantId: string;
}

// ========================================
// UM
// ========================================

export interface UnidadMedidaDTO {
  id: number;
  nombre: string;
  abreviatura?: string;
  activo?: boolean;
  tenantId?: string;
}

// ========================================
// FACTURACIÓN
// ========================================

export type TipoComprobante = 'BOLETA' | 'FACTURA';
export type EstadoComprobante = 'EMITIDO' | 'ANULADO' | 'PENDIENTE';

export interface ReceptorDTO {
  tipoDocumento?: 'DNI' | 'RUC';
  numeroDocumento?: string;
  razonSocial?: string;
  direccion?: string;
}

export interface ComprobanteDTO {
  id?: number;
  numero?: string;       // e.g. B001-00000001
  serie?: string;        // e.g. B001
  correlativo?: string;
  tipo: TipoComprobante;
  estado: EstadoComprobante;
  ventaId: number;
  receptor?: ReceptorDTO;
  total?: number;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmitirComprobanteRequest {
  ventaId: number;
  tipo: TipoComprobante;
  receptor?: ReceptorDTO;
}

// ========================================
// ERROR HANDLING
// ========================================

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  mensaje: string;
  path: string;
}

export interface DeleteAccountValidationDTO {
  requiereConfirmacion: boolean;
  tipo: 'USUARIO_NORMAL' | 'TENANT_OWNER';
  mensaje: string;
  datosAEliminar?: DatosEliminacionDTO;
}

// ✅ NUEVO
export interface DatosEliminacionDTO {
  usuarios: number;
  productos: number;
  ventas: number;
  proveedores: number;
  suscripciones: number;
  tenantId: string;
  nombreFarmacia: string;
}

// ========================================
// ENUMS
// ========================================

// export enum PlanSuscripcion {
//   FREE = 'FREE',
//   BASICO = 'BASICO',
//   PRO = 'PRO',
// }

// export enum EstadoSuscripcion {
//   ACTIVA = 'ACTIVA',
//   CANCELADA = 'CANCELADA',
//   VENCIDA = 'VENCIDA',
//   PENDIENTE = 'PENDIENTE',
// }

// export enum TipoMovimiento {
//   ENTRADA = 'ENTRADA',
//   SALIDA = 'SALIDA',
//   AJUSTE = 'AJUSTE',
//   DEVOLUCION = 'DEVOLUCION',
// }

// export enum EstadoVenta {
//   COMPLETADA = 'COMPLETADA',
//   PENDIENTE = 'PENDIENTE',
//   CANCELADA = 'CANCELADA',
// }