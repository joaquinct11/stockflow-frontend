import { axiosInstance } from '../api/axios.config';
import type { ProductoPresentacionDTO } from '../types';

const BASE = (productoId: number) => `/productos/${productoId}/presentaciones`;
const BY_ID = (id: number) => `/productos/presentaciones/${id}`;

export const productoPresentacionService = {
  listar: async (productoId: number): Promise<ProductoPresentacionDTO[]> => {
    const { data } = await axiosInstance.get<ProductoPresentacionDTO[]>(BASE(productoId));
    return data;
  },

  crear: async (productoId: number, dto: Omit<ProductoPresentacionDTO, 'id'>): Promise<ProductoPresentacionDTO> => {
    const { data } = await axiosInstance.post<ProductoPresentacionDTO>(BASE(productoId), dto);
    return data;
  },

  actualizar: async (id: number, dto: Partial<ProductoPresentacionDTO>): Promise<ProductoPresentacionDTO> => {
    const { data } = await axiosInstance.put<ProductoPresentacionDTO>(BY_ID(id), dto);
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await axiosInstance.delete(BY_ID(id));
  },
};
