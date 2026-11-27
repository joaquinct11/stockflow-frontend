import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ProductoDTO } from '../types';

export interface DashboardSummaryDTO {
  totalProductos: number;
  /** Total activos con stockActual < stockMinimo (sinStock + bajoMinimo). */
  bajoStockCount: number;
  /** Activos con stockActual <= 0 (calculado server-side, no derivar de bajoStockItems). */
  sinStockCount: number;
  /** Activos con 0 < stockActual < stockMinimo (calculado server-side). */
  stockBajoMinimoCount: number;
  bajoStockItems: BajoStockItemDTO[];
  productosProximosAVencer: ProximoVencerItemDTO[];
}

export interface BajoStockItemDTO {
  id: number;
  nombre: string;
  codigoBarras?: string;
  stockActual: number;
  stockMinimo: number;
}

export interface ProximoVencerItemDTO {
  id: number;
  nombre: string;
  codigoBarras?: string;
  stockActual: number;
  fechaVencimiento?: string;
  lote?: string;
}

export const productoService = {
  /**
   * Obtener todos los productos del tenant actual
   */
  getAll: async (sucursalId?: number, incluirInactivos = false): Promise<ProductoDTO[]> => {
    const params: Record<string, unknown> = {};
    if (sucursalId) params.sucursalId = sucursalId;
    if (incluirInactivos) params.incluirInactivos = true;
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      API_ENDPOINTS.PRODUCTOS.LIST, { params }
    );
    return data;
  },

  /**
   * Obtener producto por ID
   */
  getById: async (id: number): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.get<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.GET(id)
    );
    return data;
  },

  /**
   * Obtener producto por código de barras
   */
  getByBarcode: async (barcode: string): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.get<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.GET_BY_BARCODE(barcode)
    );
    return data;
  },

  /**
   * Buscar productos por nombre
   */
  search: async (nombre: string): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      API_ENDPOINTS.PRODUCTOS.SEARCH(nombre)
    );
    return data;
  },

  /**
   * Buscar productos para GRE: retorna stockActual por sucursal cuando se pasa sucursalId.
   */
  searchGre: async (nombre: string, sucursalId?: number): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      API_ENDPOINTS.PRODUCTOS.SEARCH_GRE(nombre, sucursalId)
    );
    return data;
  },

  /**
   * F-23: Obtener variantes activas de un producto con stock en la sucursal indicada.
   */
  getVariantesConStock: async (productoId: number, sucursalId?: number): Promise<import('../types/gre.types').VarianteConStockDTO[]> => {
    const { data } = await axiosInstance.get(
      API_ENDPOINTS.PRODUCTOS.VARIANTES_CON_STOCK(productoId, sucursalId)
    );
    return data;
  },

  /**
   * Obtener productos con stock bajo
   */
  getLowStock: async (): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      '/productos/bajo-stock'
    );
    return data;
  },

  /**
   * Crear producto
   */
  create: async (producto: Omit<ProductoDTO, 'id' | 'tenantId'>, sucursalId?: number): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.post<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.CREATE,
      producto,
      { params: sucursalId ? { sucursalId } : undefined }
    );
    return data;
  },

  /**
   * Actualizar producto
   */
  update: async (id: number, producto: Partial<ProductoDTO>): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.put<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.UPDATE(id),
      producto
    );
    return data;
  },

  /**
   * Eliminar producto
   */
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PRODUCTOS.DELETE(id));
  },

  /**
   * Activar o desactivar producto (solo ADMIN)
   */
  toggleActivo: async (id: number, activo: boolean): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.patch<ProductoDTO>(
      `/productos/${id}/activo`,
      { activo }
    );
    return data;
  },

  getDashboardSummary: async (sucursalId?: number): Promise<DashboardSummaryDTO> => {
    const { data } = await axiosInstance.get<DashboardSummaryDTO>(
      '/productos/dashboard-summary',
      { params: sucursalId ? { sucursalId } : undefined }
    );
    return data;
  },
};