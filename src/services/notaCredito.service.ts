import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { NotaCreditoDTO, ValidarNotaCreditoResponseDTO } from '../types';

export const notaCreditoService = {
  getAll: async (): Promise<NotaCreditoDTO[]> => {
    const { data } = await axiosInstance.get<NotaCreditoDTO[]>(
      API_ENDPOINTS.NOTAS_CREDITO.LIST
    );
    return data;
  },

  validar: async (codigo: string): Promise<ValidarNotaCreditoResponseDTO> => {
    const { data } = await axiosInstance.get<ValidarNotaCreditoResponseDTO>(
      API_ENDPOINTS.NOTAS_CREDITO.VALIDAR(codigo)
    );
    return data;
  },

  descargarPdf: async (id: number): Promise<void> => {
    const res = await axiosInstance.get(API_ENDPOINTS.NOTAS_CREDITO.PDF(id), {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nota-credito-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
