import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export interface NotificacionDTO {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  referenciaId?: number;
  referenciaTipo?: string;
  createdAt: string;
}

export const notificacionService = {
  async getAll(): Promise<NotificacionDTO[]> {
    const { data } = await axiosInstance.get<NotificacionDTO[]>(API_ENDPOINTS.NOTIFICACIONES.LIST);
    return data;
  },

  async contarNoLeidas(): Promise<number> {
    const { data } = await axiosInstance.get<{ count: number }>(API_ENDPOINTS.NOTIFICACIONES.NO_LEIDAS_COUNT);
    return data.count;
  },

  async marcarLeida(id: number): Promise<void> {
    await axiosInstance.patch(API_ENDPOINTS.NOTIFICACIONES.MARCAR_LEIDA(id));
  },

  async marcarTodasLeidas(): Promise<void> {
    await axiosInstance.patch(API_ENDPOINTS.NOTIFICACIONES.MARCAR_TODAS_LEIDAS);
  },

  async eliminar(id: number): Promise<void> {
    await axiosInstance.delete(API_ENDPOINTS.NOTIFICACIONES.ELIMINAR(id));
  },

  async eliminarTodasLeidas(): Promise<void> {
    await axiosInstance.delete(API_ENDPOINTS.NOTIFICACIONES.ELIMINAR_LEIDAS);
  },
};
