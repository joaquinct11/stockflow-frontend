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
  activo?: boolean;
  tenantId: string;
}

export interface VentaDTO {
  id?: number;
  vendedorId: number;
  total: number;
  metodoPago: string;
  estado: string;
  tenantId: string;
  detalles: DetalleVentaDTO[];
}

export interface DetalleVentaDTO {
  id?: number;
  productoId: number;
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

export interface MovimientoInventarioDTO {
  id?: number;
  productoId: number;
  cantidad: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION';
  ventaId?: number;
  usuarioId: number;
  descripcion?: string;
  tenantId: string;
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