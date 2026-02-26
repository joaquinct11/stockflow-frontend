import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { SuscripcionDTO } from '../types';

export const suscripcionService = {
  /**
   * Obtener todas las suscripciones del tenant actual
   */
  getAll: async (): Promise<SuscripcionDTO[]> => {
    const { data } = await axiosInstance.get<SuscripcionDTO[]>(
      API_ENDPOINTS.SUSCRIPCIONES.LIST
    );
    return data;
  },

  /**
   * Obtener suscripción por ID
   */
  getById: async (id: number): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.get<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.GET(id)
    );
    return data;
  },

  /**
   * Obtener suscripción por usuario
   */
  getByUser: async (usuarioId: number): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.get<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.GET_BY_USER(usuarioId)
    );
    return data;
  },

  /**
   * Obtener suscripciones por estado
   */
  getByState: async (estado: string): Promise<SuscripcionDTO[]> => {
    const { data } = await axiosInstance.get<SuscripcionDTO[]>(
      API_ENDPOINTS.SUSCRIPCIONES.GET_BY_STATE(estado)
    );
    return data;
  },

  /**
   * Crear suscripción
   */
  create: async (suscripcion: Omit<SuscripcionDTO, 'id' | 'tenantId'>): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.post<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.CREATE,
      suscripcion
    );
    return data;
  },

  /**
   * Actualizar suscripción
   */
  update: async (id: number, suscripcion: Partial<SuscripcionDTO>): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.put<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.UPDATE(id),
      suscripcion
    );
    return data;
  },

  /**
   * Cancelar suscripción
   */
  cancel: async (id: number): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.patch<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.CANCEL(id)
    );
    return data;
  },

  /**
   * Activar suscripción
   */
  activate: async (id: number): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.patch<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.ACTIVATE(id)
    );
    return data;
  },

  /**
   * Eliminar suscripción
   */
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.SUSCRIPCIONES.DELETE(id));
  },
};