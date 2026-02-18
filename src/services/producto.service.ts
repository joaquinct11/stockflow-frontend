import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ProductoDTO } from '../types';

export const productoService = {
  getAll: async (): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      API_ENDPOINTS.PRODUCTOS.LIST
    );
    return data;
  },

  getById: async (id: number): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.get<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.GET(id)
    );
    return data;
  },

  getByTenant: async (tenantId: string): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      API_ENDPOINTS.PRODUCTOS.GET_BY_TENANT(tenantId)
    );
    return data;
  },

  getLowStock: async (tenantId: string): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      API_ENDPOINTS.PRODUCTOS.GET_LOW_STOCK(tenantId)
    );
    return data;
  },

  search: async (nombre: string): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      API_ENDPOINTS.PRODUCTOS.SEARCH(nombre)
    );
    return data;
  },

  create: async (producto: ProductoDTO): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.post<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.CREATE,
      producto
    );
    return data;
  },

  update: async (id: number, producto: ProductoDTO): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.put<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.UPDATE(id),
      producto
    );
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PRODUCTOS.DELETE(id));
  },
};