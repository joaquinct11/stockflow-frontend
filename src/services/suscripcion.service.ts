import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { SuscripcionDTO } from '../types';

export const suscripcionService = {
  getAll: async (): Promise<SuscripcionDTO[]> => {
    const { data } = await axiosInstance.get<SuscripcionDTO[]>(
      API_ENDPOINTS.SUSCRIPCIONES.LIST
    );
    return data;
  },

  getById: async (id: number): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.get<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.GET(id)
    );
    return data;
  },

  getByUser: async (usuarioId: number): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.get<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.GET_BY_USER(usuarioId)
    );
    return data;
  },

  getByState: async (estado: string): Promise<SuscripcionDTO[]> => {
    const { data } = await axiosInstance.get<SuscripcionDTO[]>(
      API_ENDPOINTS.SUSCRIPCIONES.GET_BY_STATE(estado)
    );
    return data;
  },

  create: async (suscripcion: SuscripcionDTO): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.post<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.CREATE,
      suscripcion
    );
    return data;
  },

  update: async (id: number, suscripcion: SuscripcionDTO): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.put<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.UPDATE(id),
      suscripcion
    );
    return data;
  },

  cancel: async (id: number): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.put<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.CANCEL(id)
    );
    return data;
  },

  activate: async (id: number): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.put<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.ACTIVATE(id)
    );
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.SUSCRIPCIONES.DELETE(id));
  },
};