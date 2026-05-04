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
  deletedAt?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  numeroCelular?: string;
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

export type PlanId = 'BASICO' | 'PRO';

// ✅ NUEVO: Para registro de nueva farmacia
export interface RegistrationRequestDTO {
  email: string;
  contraseña: string;
  nombre: string;
  nombreFarmacia: string;
  planId: PlanId;
  tipoDocumento?: string;
  numeroDocumento?: string;
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
  intentosFallidos?: number;
  estado: string;
  metodoPago?: string;
  ultimos4Digitos?: string;
  tenantId?: string;
  fechaInicio?: string;
  fechaProximoCobro?: string;
  fechaCancelacion?: string;
  deletedAt?: string;
  trialEndDate?: string;
  enPeriodoPrueba?: boolean;
}

export type TipoDocumento = 'DNI' | 'CE' | 'RUC' | 'PASAPORTE';

export interface SuscripcionCheckoutRequestDTO {
  planId: PlanId;
  tipoDocumento?: TipoDocumento;
  numeroDocumento?: string;
}

export interface SuscripcionCheckoutResponseDTO {
  initPoint: string;
  preferenceId: string;
  preapprovalId?: string;
}

export interface SuscripcionEstadoResponseDTO {
  estado: string;
  planId: string;
  preapprovalId?: string;
  mpPaymentId?: string;
  fechaProximoCobro?: string;
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
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION' | 'SALDO_INICIAL';
  cantidad: number;
  descripcion: string;
  referencia?: string;
  usuarioId?: number;
  tenantId: string;
  createdAt?: string;
  // Campos exclusivos para tipo === 'ENTRADA' o 'SALDO_INICIAL'
  proveedorId?: number;
  costoUnitario?: number;
  lote?: string;
  fechaVencimiento?: string;
}

/** Tipos de movimiento que se muestran en la lista principal de Movimientos Inventario */
export const TIPOS_MOVIMIENTO_INVENTARIO: MovimientoInventarioDTO['tipo'][] = [
  'AJUSTE',
  'DEVOLUCION',
  'SALDO_INICIAL',
];

/** Tipos de movimiento que solo se muestran en el detalle (Kardex) */
export const TIPOS_MOVIMIENTO_KARDEX_ONLY: MovimientoInventarioDTO['tipo'][] = [
  'ENTRADA',
  'SALIDA',
];

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

export type MetodoPago = 'TODOS' | 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
export type TipoComprobante = 'BOLETA' | 'FACTURA';
export type EstadoComprobante = 'EMITIDO' | 'ANULADO' | 'PENDIENTE';

export interface ReceptorDTO {
  tipoDocumento?: 'DNI' | 'RUC';
  numeroDocumento?: string;
  razonSocial?: string;
  direccion?: string;
}

export interface ItemComprobanteDTO {
  productoId?: number;
  productoNombre?: string;
  codigoBarras?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
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
  subtotal?: number;     // base imponible (total / 1.18)
  igv?: number;          // IGV incluido
  total?: number;        // total con IGV
  items?: ItemComprobanteDTO[];
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmitirComprobanteForm {
  ventaId: number;
  tipo: TipoComprobante;
  receptor?: ReceptorDTO;
}

export interface EmitirComprobanteRequest {
  ventaId: number;
  tipo: TipoComprobante;
  receptor?: ReceptorDTO;
  receptorDocTipo?: string | null;
  receptorDocNumero?: string | null;
  receptorNombre?: string | null;
  receptorDireccion?: string | null;
}

// ========================================
// ÓRDENES DE COMPRA
// ========================================

export type EstadoOC = 'BORRADOR' | 'ENVIADA' | 'RECIBIDA_PARCIAL' | 'RECIBIDA' | 'CANCELADA';

export interface OrdenCompraItemDTO {
  id?: number;
  productoId: number;
  productoNombre?: string;
  codigoBarras?: string;
  cantidadSolicitada: number;
  cantidadRecibida?: number;
  precioUnitario?: number;
}

export interface OrdenCompraDTO {
  id?: number;
  proveedorId: number;
  proveedorNombre?: string;
  estado: EstadoOC;
  observaciones?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  items: OrdenCompraItemDTO[];
}

// ========================================
// RECEPCIONES DE MERCADERÍA
// ========================================

export type EstadoRecepcion = 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
export type TipoComprobanteProveedor = 'FACTURA' | 'BOLETA';

export interface ComprobanteProveedorDTO {
  tipoComprobante: TipoComprobanteProveedor;
  serie: string;
  numero: string;
  urlAdjunto?: string;
}

export interface RecepcionItemDTO {
  id?: number;
  productoId: number;
  productoNombre?: string;
  codigoBarras?: string;
  cantidadEsperada?: number;
  cantidadRecibida: number;
  precioUnitario?: number;
  fechaVencimiento?: string;
  lote?: string;
}

export interface RecepcionDTO {
  id?: number;
  ordenCompraId?: number;
  proveedorId: number;
  proveedorNombre?: string;
  estado: EstadoRecepcion;
  comprobante?: ComprobanteProveedorDTO;
  observaciones?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  items: RecepcionItemDTO[];
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
// REPORTES
// ========================================

export interface ProductoBajoStockDTO {
  id: number;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
}

export interface TopProductoVendidoDTO {
  productoId: number;
  nombre: string;
  cantidadVendida: number;
  ingresos: number;
}

export interface VentasResumenDTO {
  ventasCount: number;
  ingresosTotal: number;
  ticketPromedio: number;
  margenEstimado: number | null;
  topProductosVendidos: TopProductoVendidoDTO[];
}

export interface ReportesResumenDTO {
  totalProductos: number;
  valorizacionStock: number | null;
  productosBajoStock: ProductoBajoStockDTO[];
  entradasCantidad: number;
  salidasCantidad: number;
  recepcionesConfirmadasCount: number;
  unidadesRecibidas: number;
  ventas: VentasResumenDTO | null;
}

// ── Ventas tendencia ───────────────────────────────────────────────────────────
export interface VentasTendenciaPuntoDTO {
  periodo: string;
  ventasCount: number;
  ingresos: number;
}

// ── Ventas por vendedor ────────────────────────────────────────────────────────
export interface VentasPorVendedorDTO {
  vendedorId: number;
  vendedorNombre: string;
  ventasCount: number;
  ingresos: number;
  ticketPromedio: number | null;
}

// ── Ventas por categoría ───────────────────────────────────────────────────────
export interface VentasPorCategoriaDTO {
  categoria: string;
  ventasCount: number;
  unidades: number;
  ingresos: number;
}

// ── Ventas por método de pago ──────────────────────────────────────────────────
export interface VentasPorMetodoPagoDTO {
  metodoPago: string;
  ventasCount: number;
  ingresos: number;
  porcentaje: number | null;
}

// ── Ventas productos (top / menos) ────────────────────────────────────────────
export interface VentasProductoDTO {
  productoId: number;
  nombre: string;
  cantidadVendida: number;
  ingresos: number;
}

// ── Inventario ABC ─────────────────────────────────────────────────────────────
export interface InventarioABCDTO {
  productoId: number;
  nombre: string;
  clasificacion: 'A' | 'B' | 'C';
  ingresos: number;
  porcentajeAcumulado: number | null;
}

// ── Inventario slow movers ─────────────────────────────────────────────────────
export interface InventarioSlowMoverDTO {
  productoId: number;
  nombre: string;
  stockActual: number;
  costoTotal: number | null;
  diasSinSalida: number;
}

// ── Inventario cobertura ───────────────────────────────────────────────────────
export interface InventarioCoberturaDTO {
  productoId: number;
  nombre: string;
  stockActual: number;
  promedioSalidasDia: number | null;
  diasCobertura: number | null;
}

// ── Compras por proveedor ──────────────────────────────────────────────────────
export interface ComprasPorProveedorDTO {
  proveedorId: number;
  proveedorNombre: string;
  recepciones: number;
  unidades: number;
  montoEstimado: number | null;
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
