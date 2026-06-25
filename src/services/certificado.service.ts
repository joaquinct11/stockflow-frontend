import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { CertificadoDTO } from '../types';

export const certificadoService = {
  getTipos: async (): Promise<string[]> => {
    const { data } = await axiosInstance.get<string[]>(API_ENDPOINTS.CERTIFICADOS.TIPOS);
    return data;
  },

  listar: async (): Promise<CertificadoDTO[]> => {
    const { data } = await axiosInstance.get<CertificadoDTO[]>(API_ENDPOINTS.CERTIFICADOS.LIST);
    return data;
  },

  contarAlertas: async (): Promise<number> => {
    const { data } = await axiosInstance.get<{ total: number }>(API_ENDPOINTS.CERTIFICADOS.ALERTAS);
    return data.total;
  },

  crear: async (dto: CertificadoDTO): Promise<CertificadoDTO> => {
    const { data } = await axiosInstance.post<CertificadoDTO>(API_ENDPOINTS.CERTIFICADOS.CREATE, dto);
    return data;
  },

  actualizar: async (id: number, dto: CertificadoDTO): Promise<CertificadoDTO> => {
    const { data } = await axiosInstance.put<CertificadoDTO>(API_ENDPOINTS.CERTIFICADOS.UPDATE(id), dto);
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.CERTIFICADOS.DELETE(id));
  },
};
