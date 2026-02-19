export interface Usuario {
  id?: number;
  email: string;
  nombre: string;
  contraseña?: string;
  rolNombre: string;
  activo?: boolean;
  tenantId: string;
  ultimoLogin?: string;
}

export interface JwtResponse {
  id?: number;
  token: string;
  tipo: string;
  usuarioId: number;
  email: string;
  nombre: string;
  rol: string;
}

export interface LoginDTO {
  email: string;
  contraseña: string;
}

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
  tenantId: string;
}

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

export interface SuscripcionDTO {
  id?: number;
  usuarioPrincipalId: number;
  planId: string;
  precioMensual: number;
  preapprovalId?: string;
  estado: string;
  metodoPago?: string;
  ultimos4Digitos?: string;
}

export interface RolDTO {
  id?: number;
  nombre: string;
  descripcion?: string;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  mensaje: string;
  path: string;
}

// Movimiento de Inventario
export interface MovimientoInventarioDTO {
  id?: number;
  productoId: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION';
  cantidad: number;
  descripcion: string;
  referencia?: string; // Número de compra, número de venta, etc.
  usuarioId?: number;
  tenantId: string;
  createdAt?: string;
}

// Kardex (Historial de movimientos por producto)
export interface KardexDTO {
  id?: number;
  productoId: number;
  productoNombre?: string;
  movimientos: MovimientoInventarioDTO[];
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
}

export interface ProveedorDTO {
  id?: number;
  nombre: string;
  ruc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo?: boolean;
  tenantId: string;
}