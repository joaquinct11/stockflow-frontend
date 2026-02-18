import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { VentaDTO } from '../types';

export const ventaService = {
  getAll: async (): Promise<VentaDTO[]> => {
    const { data } = await axiosInstance.get<VentaDTO[]>(
      API_ENDPOINTS.VENTAS.LIST
    );
    return data;
  },

  getById: async (id: number): Promise<VentaDTO> => {
    const { data } = await axiosInstance.get<VentaDTO>(
      API_ENDPOINTS.VENTAS.GET(id)
    );
    return data;
  },

  getByTenant: async (tenantId: string): Promise<VentaDTO[]> => {
    const { data } = await axiosInstance.get<VentaDTO[]>(
      API_ENDPOINTS.VENTAS.GET_BY_TENANT(tenantId)
    );
    return data;
  },

  getByVendor: async (vendedorId: number): Promise<VentaDTO[]> => {
    const { data } = await axiosInstance.get<VentaDTO[]>(
      API_ENDPOINTS.VENTAS.GET_BY_VENDOR(vendedorId)
    );
    return data;
  },

  create: async (venta: VentaDTO): Promise<VentaDTO> => {
    const { data } = await axiosInstance.post<VentaDTO>(
      API_ENDPOINTS.VENTAS.CREATE,
      venta
    );
    return data;
  },

  update: async (id: number, venta: VentaDTO): Promise<VentaDTO> => {
    const { data } = await axiosInstance.put<VentaDTO>(
      API_ENDPOINTS.VENTAS.UPDATE(id),
      venta
    );
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.VENTAS.DELETE(id));
  },
};