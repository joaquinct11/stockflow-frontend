import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { RecepcionDTO, RecepcionItemDTO, ComprobanteProveedorDTO } from '../types';

export const recepcionService = {
  getAll: async (): Promise<RecepcionDTO[]> => {
    const { data } = await axiosInstance.get<RecepcionDTO[]>(API_ENDPOINTS.RECEPCIONES.LIST);
    return data;
  },

  getById: async (id: number): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.get<RecepcionDTO>(API_ENDPOINTS.RECEPCIONES.GET(id));
    return data;
  },

  create: async (dto: Omit<RecepcionDTO, 'id' | 'tenantId'>): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.post<RecepcionDTO>(API_ENDPOINTS.RECEPCIONES.CREATE, dto);
    return data;
  },

  update: async (id: number, dto: Partial<RecepcionDTO>): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.put<RecepcionDTO>(API_ENDPOINTS.RECEPCIONES.UPDATE(id), dto);
    return data;
  },

  // ✅ BACKEND REAL: POST /recepciones/{id}/items (1 item)
  upsertItem: async (id: number, item: RecepcionItemDTO): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.post<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.UPSERT_ITEMS(id), // apunta a /recepciones/{id}/items
      item
    );
    return data;
  },

  // ✅ BACKEND NO TIENE DELETE item, así que evitamos removeItem por ahora
  // removeItem: ...

  // ✅ BACKEND REAL: POST /recepciones/{id}/comprobante
  setComprobante: async (id: number, comprobante: ComprobanteProveedorDTO): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.post<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.SET_COMPROBANTE(id),
      comprobante
    );
    return data;
  },

  // ✅ BACKEND REAL: POST /recepciones/{id}/confirmar
  confirmar: async (id: number): Promise<RecepcionDTO> => {
    const { data } = await axiosInstance.post<RecepcionDTO>(
      API_ENDPOINTS.RECEPCIONES.CONFIRMAR(id)
    );
    return data;
  },

  // DELETE /recepciones/{id} — anula recepción BORRADOR
  anular: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.RECEPCIONES.ANULAR(id));
  },

  // DELETE /recepciones/{id}/items/{itemId} — quita un ítem de recepción BORRADOR
  removeItem: async (recepcionId: number, itemId: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.RECEPCIONES.REMOVE_ITEM(recepcionId, itemId));
  },
};