import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ProductoVarianteDTO } from '../types';

export const productoVarianteService = {
  getByProducto: async (productoId: number): Promise<ProductoVarianteDTO[]> => {
    const { data } = await axiosInstance.get<ProductoVarianteDTO[]>(
      API_ENDPOINTS.PRODUCTO_VARIANTES.BY_PRODUCTO(productoId)
    );
    return data;
  },

  create: async (dto: ProductoVarianteDTO): Promise<ProductoVarianteDTO> => {
    const { data } = await axiosInstance.post<ProductoVarianteDTO>(
      API_ENDPOINTS.PRODUCTO_VARIANTES.CREATE, dto
    );
    return data;
  },

  update: async (id: number, dto: ProductoVarianteDTO): Promise<ProductoVarianteDTO> => {
    const { data } = await axiosInstance.put<ProductoVarianteDTO>(
      API_ENDPOINTS.PRODUCTO_VARIANTES.UPDATE(id), dto
    );
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PRODUCTO_VARIANTES.DELETE(id));
  },
};
