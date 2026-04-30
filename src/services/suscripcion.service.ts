import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type {
  SuscripcionCheckoutRequestDTO,
  SuscripcionCheckoutResponseDTO,
  SuscripcionDTO,
  SuscripcionEstadoResponseDTO,
  TipoDocumento,
} from '../types';

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

  /**
   * Iniciar checkout de Mercado Pago para un plan pagado
   */
  checkout: async (
    planId: SuscripcionCheckoutRequestDTO['planId'],
    tipoDocumento?: TipoDocumento,
    numeroDocumento?: string,
  ): Promise<SuscripcionCheckoutResponseDTO> => {
    const payload: SuscripcionCheckoutRequestDTO = { planId, tipoDocumento, numeroDocumento };
    const { data } = await axiosInstance.post<SuscripcionCheckoutResponseDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.CHECKOUT,
      payload
    );
    return data;
  },

  /**
   * Obtener la suscripción del usuario actual (por usuarioId)
   */
  getMiSuscripcion: async (usuarioId: number): Promise<SuscripcionDTO> => {
    const { data } = await axiosInstance.get<SuscripcionDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.GET_BY_USER(usuarioId)
    );
    return data;
  },

  /**
   * Obtener el estado de la suscripción del usuario autenticado (sin llamar a MP)
   */
  getEstado: async (): Promise<SuscripcionEstadoResponseDTO> => {
    const { data } = await axiosInstance.get<SuscripcionEstadoResponseDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.ESTADO
    );
    return data;
  },

  /**
   * Cancela la suscripción activa del usuario autenticado (sin necesidad de id)
   */
  cancelarMiSuscripcion: async (): Promise<void> => {
    await axiosInstance.patch(API_ENDPOINTS.SUSCRIPCIONES.CANCEL_MI_SUSCRIPCION);
  },

  /**
   * Sincronizar el estado de la suscripción consultando Mercado Pago en tiempo real
   */
  sincronizar: async (): Promise<SuscripcionEstadoResponseDTO> => {
    const { data } = await axiosInstance.post<SuscripcionEstadoResponseDTO>(
      API_ENDPOINTS.SUSCRIPCIONES.SINCRONIZAR
    );
    return data;
  },
};
