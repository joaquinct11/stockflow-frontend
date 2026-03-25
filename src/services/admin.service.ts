import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { AdminUsuario, Permiso } from '../types';

export const adminService = {
  /**
   * Obtener catálogo completo de permisos
   */
  getPermisos: async (): Promise<Permiso[]> => {
    const { data } = await axiosInstance.get<Permiso[]>(API_ENDPOINTS.ADMIN.PERMISOS);
    return data;
  },

  /**
   * Obtener lista de usuarios del tenant actual
   */
  getUsuarios: async (): Promise<AdminUsuario[]> => {
    const { data } = await axiosInstance.get<AdminUsuario[]>(API_ENDPOINTS.ADMIN.USUARIOS);
    return data;
  },

  /**
   * Obtener códigos de permisos asignados a un usuario
   */
  getUsuarioPermisos: async (userId: number): Promise<string[]> => {
    const { data } = await axiosInstance.get<string[]>(
      API_ENDPOINTS.ADMIN.USUARIO_PERMISOS(userId)
    );
    return data;
  },

  /**
   * Reemplazar lista completa de permisos de un usuario
   */
  updateUsuarioPermisos: async (userId: number, permisos: string[]): Promise<void> => {
    await axiosInstance.put(API_ENDPOINTS.ADMIN.USUARIO_PERMISOS(userId), permisos);
  },
};
