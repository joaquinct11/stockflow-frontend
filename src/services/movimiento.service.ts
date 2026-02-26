import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { MovimientoInventarioDTO } from '../types';

export const movimientoService = {
  /**
   * Obtener todos los movimientos del tenant actual
   */
  getAll: async (): Promise<MovimientoInventarioDTO[]> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.LIST
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
  getByProducto: async (productoId: number): Promise<MovimientoInventarioDTO[]> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.GET_BY_PRODUCTO(productoId)
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
};