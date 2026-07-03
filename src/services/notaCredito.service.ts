import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { NotaCreditoDTO, ValidarNotaCreditoResponseDTO } from '../types';

export const notaCreditoService = {
  getAll: async (sucursalId?: number): Promise<NotaCreditoDTO[]> => {
    const { data } = await axiosInstance.get<NotaCreditoDTO[]>(
      API_ENDPOINTS.NOTAS_CREDITO.LIST,
      { params: sucursalId ? { sucursalId } : undefined }
    );
    return data;
  },

  validar: async (codigo: string): Promise<ValidarNotaCreditoResponseDTO> => {
    const { data } = await axiosInstance.get<ValidarNotaCreditoResponseDTO>(
      API_ENDPOINTS.NOTAS_CREDITO.VALIDAR(codigo)
    );
    return data;
  },

  descargarPdf: async (id: number, formato: 'A4' | 'TICKET' = 'A4'): Promise<void> => {
    const res = await axiosInstance.get(`${API_ENDPOINTS.NOTAS_CREDITO.PDF(id)}?formato=${formato}`, {
      responseType: 'blob',
    });
    const filename = formato === 'TICKET' ? `nc-ticket-${id}.pdf` : `nota-credito-${id}.pdf`;
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
