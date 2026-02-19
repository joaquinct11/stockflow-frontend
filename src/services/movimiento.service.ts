import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { MovimientoInventarioDTO } from '../types';

export const movimientoService = {
  getAll: async (): Promise<MovimientoInventarioDTO[]> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.LIST
    );
    return data;
  },

  getById: async (id: number): Promise<MovimientoInventarioDTO> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO>(
      API_ENDPOINTS.MOVIMIENTOS.GET(id)
    );
    return data;
  },

  getByProducto: async (productoId: number): Promise<MovimientoInventarioDTO[]> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.GET_BY_PRODUCTO(productoId)
    );
    return data;
  },

  getByTipo: async (tipo: string): Promise<MovimientoInventarioDTO[]> => {
    const { data } = await axiosInstance.get<MovimientoInventarioDTO[]>(
      API_ENDPOINTS.MOVIMIENTOS.GET_BY_TIPO(tipo)
    );
    return data;
  },

  create: async (movimiento: MovimientoInventarioDTO): Promise<MovimientoInventarioDTO> => {
    const { data } = await axiosInstance.post<MovimientoInventarioDTO>(
      API_ENDPOINTS.MOVIMIENTOS.CREATE,
      movimiento
    );
    return data;
  },

  update: async (id: number, movimiento: MovimientoInventarioDTO): Promise<MovimientoInventarioDTO> => {
    const { data } = await axiosInstance.put<MovimientoInventarioDTO>(
      API_ENDPOINTS.MOVIMIENTOS.UPDATE(id),
      movimiento
    );
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.MOVIMIENTOS.DELETE(id));
  },

  getKardex: async (productoId: number) => {
    const { data } = await axiosInstance.get(
      API_ENDPOINTS.MOVIMIENTOS.GET_KARDEX(productoId)
    );
    return data;
  },
};