import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { RecepcionDTO, RecepcionItemDTO, ComprobanteProveedorDTO } from '../types';

export const recepcionService = {
  getAll: async (): Promise<RecepcionDTO[]> => {
    const { data } = await axiosInstance.get<RecepcionDTO[]>(
      API_ENDPOINTS.RECEPCIONES.LIST
    );
    return data;
  },

  getById: async (id: number): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.get<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.GET(id)
    );
    return data;
  },

  create: async (dto: Omit<RecepcionDTO, 'id' | 'tenantId'>): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.post<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.CREATE,
      dto
    );
    return data;
  },

  update: async (id: number, dto: Partial<RecepcionDTO>): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.put<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.UPDATE(id),
      dto
    );
    return data;
  },

  upsertItems: async (id: number, items: RecepcionItemDTO[]): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.put<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.UPSERT_ITEMS(id),
      items
    );
    return data;
  },

  removeItem: async (id: number, itemId: number): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.delete<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.REMOVE_ITEM(id, itemId)
    );
    return data;
  },

  setComprobante: async (id: number, comprobante: ComprobanteProveedorDTO): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.put<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.SET_COMPROBANTE(id),
      comprobante
    );
    return data;
  },

  confirmar: async (id: number): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.patch<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.CONFIRMAR(id)
    );
    return data;
  },
};
