import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { UnidadMedidaDTO } from '../types';

export const unidadMedidaService = {
  getAll: async (): Promise<UnidadMedidaDTO[]> => {
    const { data } = await axiosInstance.get<UnidadMedidaDTO[]>(
      API_ENDPOINTS.UNIDADES_MEDIDA.LIST
    );
    return data;
  },
};