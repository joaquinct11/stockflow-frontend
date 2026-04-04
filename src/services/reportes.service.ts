import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ReportesResumenDTO } from '../types';

export const reportesService = {
  getResumen: async (desde: string, hasta: string): Promise<ReportesResumenDTO> => {
    const { data } = await axiosInstance.get<ReportesResumenDTO>(
      API_ENDPOINTS.REPORTES.RESUMEN(desde, hasta)
    );
    return data;
  },
};
