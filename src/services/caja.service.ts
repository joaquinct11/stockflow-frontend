import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { CajaDTO, AbrirCajaDTO, CerrarCajaDTO, RetiroCajaDTO, RegistrarRetiroDTO } from '../types';

export interface CorregirCierreDTO {
  montoContado: number;
  observaciones?: string;
}

export const cajaService = {
  getActiva: async (sucursalId?: number): Promise<CajaDTO | null> => {
    try {
      const { data } = await axiosInstance.get<CajaDTO>(API_ENDPOINTS.CAJAS.ACTIVA, {
        params: sucursalId ? { sucursalId } : undefined,
      });
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  getAll: async (sucursalId?: number): Promise<CajaDTO[]> => {
    const { data } = await axiosInstance.get<CajaDTO[]>(API_ENDPOINTS.CAJAS.LIST, {
      params: sucursalId ? { sucursalId } : undefined,
    });
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

  registrarRetiro: async (id: number, req: RegistrarRetiroDTO): Promise<RetiroCajaDTO> => {
    const { data } = await axiosInstance.post<RetiroCajaDTO>(API_ENDPOINTS.CAJAS.RETIRO(id), req);
    return data;
  },

  corregirCierre: async (id: number, req: CorregirCierreDTO): Promise<CajaDTO> => {
    const { data } = await axiosInstance.put<CajaDTO>(API_ENDPOINTS.CAJAS.CORREGIR_CIERRE(id), req);
    return data;
  },
};
