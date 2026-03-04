import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { VentaDTO } from '../types';

export const ventaService = {
  /**
   * Obtener todas las ventas del tenant actual
   */
  getAll: async (): Promise<VentaDTO[]> => {
    const { data } = await axiosInstance.get<VentaDTO[]>(
      API_ENDPOINTS.VENTAS.LIST
    );
    return data;
  },

  /**
   * Obtener venta por ID
   */
  getById: async (id: number): Promise<VentaDTO> => {
    const { data } = await axiosInstance.get<VentaDTO>(
      API_ENDPOINTS.VENTAS.GET(id)
    );
    return data;
  },

  /**
   * Obtener ventas por vendedor
   */
  getByVendor: async (vendedorId: number): Promise<VentaDTO[]> => {
    const { data } = await axiosInstance.get<VentaDTO[]>(
      API_ENDPOINTS.VENTAS.GET_BY_VENDOR(vendedorId)
    );
    return data;
  },

  /**
   * Obtener ventas por período
   */
  getByPeriod: async (inicio: string, fin: string): Promise<VentaDTO[]> => {
    const { data } = await axiosInstance.get<VentaDTO[]>(
      `/ventas/periodo?inicio=${inicio}&fin=${fin}`
    );
    return data;
  },

  /**
   * Crear venta
   */
  create: async (venta: Omit<VentaDTO, 'id' | 'tenantId'>): Promise<VentaDTO> => {
    const { data } = await axiosInstance.post<VentaDTO>(
      API_ENDPOINTS.VENTAS.CREATE,
      venta
    );
    return data;
  },

  /**
   * Actualizar venta
   */
  update: async (id: number, venta: Partial<VentaDTO>): Promise<VentaDTO> => {
    const { data } = await axiosInstance.put<VentaDTO>(
      API_ENDPOINTS.VENTAS.UPDATE(id),
      venta
    );
    return data;
  },

  /**
   * Eliminar venta
   */
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.VENTAS.DELETE(id));
  },
};