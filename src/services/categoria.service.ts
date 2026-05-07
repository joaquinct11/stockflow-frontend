import { axiosInstance } from '../api/axios.config';
import type { CategoriaDTO } from '../types';

export const categoriaService = {
  getAll: async (): Promise<CategoriaDTO[]> => {
    const { data } = await axiosInstance.get<CategoriaDTO[]>('/categorias');
    return data;
  },

  crear: async (nombre: string): Promise<CategoriaDTO> => {
    const { data } = await axiosInstance.post<CategoriaDTO>('/categorias', { nombre });
    return data;
  },
};
