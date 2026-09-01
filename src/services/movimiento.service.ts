import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { MovimientoInventarioDTO } from '../types';

export interface LoteVencimientoDTO {
  movimientoId: number;
  productoId: number;
  productoNombre: string;
  codigoBarras?: string;
  lote?: string;
  fechaVencimiento: string; // yyyy-MM-dd
  cantidad: number;
  stockActual?: number;
  diasRestantes: number; // negativo = ya vencido
  registroSanitario?: string;
  proveedorNombre?: string;
  precioVenta?: number;
}

export interface LoteVentaDetalleDTO {
  lote?: string;
  proveedorNombre?: string;
  cantidadDescontada: number;
  precioVenta?: number;
}

export interface StockLoteDisponibleDTO {
  id: number;
  lote?: string;
  fechaVencimiento: string; // yyyy-MM-dd
  stockActual: number;
  proveedorId?: number;
  proveedorNombre?: string;
  diasParaVencer: number;
  precioVenta?: number;
}

export const movimientoService = {
  /**
   * Obtener todos los movimientos del tenant actual
   */
  getAll: async (sucursalId?: number): Promise<MovimientoInventarioDTO[]> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.LIST,
      { params: sucursalId ? { sucursalId } : undefined }
    );
    return data;
  },

  getRecientes: async (dias: number, sucursalId?: number): Promise<MovimientoInventarioDTO[]> => {
    const params: Record<string, unknown> = { dias };
    if (sucursalId) params.sucursalId = sucursalId;
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.LIST, { params }
    );
    return data;
  },

  getProximosAVencer: async (ventanaDias = 90): Promise<MovimientoInventarioDTO[]> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      `${API_ENDPOINTS.MOVIMIENTOS.LIST}/proximos-vencer`,
      { params: { ventanaDias } }
    );
    return data;
  },

  /**
   * Obtener movimiento por ID
   */
  getById: async (id: number): Promise<MovimientoInventarioDTO> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO>(
      API_ENDPOINTS.MOVIMIENTOS.GET(id)
    );
    return data;
  },

  /**
   * Obtener movimientos por producto
   */
  getByProducto: async (productoId: number, sucursalId?: number, desde?: string, hasta?: string): Promise<MovimientoInventarioDTO[]> => {
    const params: Record<string, unknown> = {};
    if (sucursalId) params.sucursalId = sucursalId;
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.GET_BY_PRODUCTO(productoId),
      { params: Object.keys(params).length ? params : undefined }
    );
    return data;
  },

  /**
   * Obtener movimientos por tipo (del tenant actual)
   */
  getByTipo: async (tipo: string): Promise<MovimientoInventarioDTO[]> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.GET_BY_TIPO(tipo)
    );
    return data;
  },

  /**
   * Obtener kardex de un producto
   */
  getKardex: async (productoId: number) => {
    const { data } = await axiosInstance.get(
      API_ENDPOINTS.MOVIMIENTOS.GET_KARDEX(productoId)
    );
    return data;
  },

  /**
   * Crear movimiento (se asigna automáticamente al tenant del usuario logueado)
   */
  create: async (movimiento: Omit<MovimientoInventarioDTO, 'id' | 'tenantId' | 'createdAt'>): Promise<MovimientoInventarioDTO> => {
    const { data } = await axiosInstance.post<MovimientoInventarioDTO>(
      API_ENDPOINTS.MOVIMIENTOS.CREATE,
      movimiento
    );
    return data;
  },

  /**
   * Actualizar movimiento
   */
  update: async (id: number, movimiento: Partial<MovimientoInventarioDTO>): Promise<MovimientoInventarioDTO> => {
    const { data } = await axiosInstance.put<MovimientoInventarioDTO>(
      API_ENDPOINTS.MOVIMIENTOS.UPDATE(id),
      movimiento
    );
    return data;
  },

  /**
   * Eliminar movimiento
   */
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.MOVIMIENTOS.DELETE(id));
  },

  /**
   * Obtener todos los lotes con fecha de vencimiento del tenant,
   * ordenados de más próximo a vencer al más lejano.
   */
  getLotes: async (): Promise<LoteVencimientoDTO[]> => {
    const { data } = await axiosInstance.get<LoteVencimientoDTO[]>(API_ENDPOINTS.MOVIMIENTOS.LOTES);
    return data;
  },

  /**
   * Obtener los lotes de un producto específico — para el selector de lote en ajustes.
   */
  getLotesPorProducto: async (productoId: number): Promise<LoteVencimientoDTO[]> => {
    const { data } = await axiosInstance.get<LoteVencimientoDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.LOTES_POR_PRODUCTO(productoId)
    );
    return data;
  },

  /**
   * Lotes disponibles (no vencidos, con stock) para seleccionar en el POS.
   */
  getLotesDisponibles: async (productoId: number, sucursalId?: number): Promise<StockLoteDisponibleDTO[]> => {
    const { data } = await axiosInstance.get<StockLoteDisponibleDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.LOTES_DISPONIBLES(productoId, sucursalId)
    );
    return data;
  },

  getLotesDeVenta: async (movimientoId: number): Promise<LoteVentaDetalleDTO[]> => {
    const { data } = await axiosInstance.get<LoteVentaDetalleDTO[]>(
      `${API_ENDPOINTS.MOVIMIENTOS.LIST}/${movimientoId}/lotes-venta`
    );
    return data;
  },

  actualizarProveedorLote: async (movimientoId: number, proveedorId: number | null, precioVenta?: number | null): Promise<void> => {
    await axiosInstance.patch(
      `${API_ENDPOINTS.MOVIMIENTOS.LIST}/lotes/${movimientoId}/proveedor`,
      { proveedorId, precioVenta: precioVenta ?? null }
    );
  },
};