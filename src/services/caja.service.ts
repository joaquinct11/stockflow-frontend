import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { CajaDTO, AbrirCajaDTO, CerrarCajaDTO } from '../types';

export const cajaService = {
  getActiva: async (): Promise<CajaDTO | null> => {
    try {
      const { data } = await axiosInstance.get<CajaDTO>(API_ENDPOINTS.CAJAS.ACTIVA);
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  getAll: async (): Promise<CajaDTO[]> => {
    const { data } = await axiosInstance.get<CajaDTO[]>(API_ENDPOINTS.CAJAS.LIST);
    return data;
  },

  getById: async (id: number): Promise<CajaDTO> => {
    const { data } = await axiosInstance.get<CajaDTO>(API_ENDPOINTS.CAJAS.GET(id));
    return data;
  },

  abrir: async (req: AbrirCajaDTO): Promise<CajaDTO> => {
    const { data } = await axiosInstance.post<CajaDTO>(API_ENDPOINTS.CAJAS.ABRIR, req);
    return data;
  },

  cerrar: async (id: number, req: CerrarCajaDTO): Promise<CajaDTO> => {
    const { data } = await axiosInstance.post<CajaDTO>(API_ENDPOINTS.CAJAS.CERRAR(id), req);
    return data;
  },
};
