import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { Usuario, DeleteAccountValidationDTO } from '../types';

export const usuarioService = {
  getAll: async (): Promise<Usuario[]> => {
    const { data } = await axiosInstance.get<Usuario[]>(
      API_ENDPOINTS.USUARIOS.LIST
    );
    return data;
  },

  getById: async (id: number): Promise<Usuario> => {
    const { data } = await axiosInstance.get<Usuario>(
      API_ENDPOINTS.USUARIOS.GET(id)
    );
    return data;
  },

  getByTenant: async (tenantId: string): Promise<Usuario[]> => {
    const { data } = await axiosInstance.get<Usuario[]>(
      API_ENDPOINTS.USUARIOS.GET_BY_TENANT(tenantId)
    );
    return data;
  },

  create: async (usuario: Usuario): Promise<Usuario> => {
    const { data } = await axiosInstance.post<Usuario>(
      API_ENDPOINTS.USUARIOS.CREATE,
      usuario
    );
    return data;
  },

  update: async (id: number, usuario: Usuario): Promise<Usuario> => {
    const { data } = await axiosInstance.put<Usuario>(
      API_ENDPOINTS.USUARIOS.UPDATE(id),
      usuario
    );
    return data;
  },

  deactivate: async (id: number): Promise<void> => {
    await axiosInstance.patch(API_ENDPOINTS.USUARIOS.DEACTIVATE(id));
  },

  activate: async (id: number): Promise<void> => {
    await axiosInstance.patch(API_ENDPOINTS.USUARIOS.ACTIVATE(id));
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.USUARIOS.DELETE(id));
  },
  
  /**
   * Validar si la eliminación requiere confirmación especial
   */
  validarEliminacion: async (id: number): Promise<DeleteAccountValidationDTO> => {
    const { data } = await axiosInstance.get<DeleteAccountValidationDTO>(
      API_ENDPOINTS.USUARIOS.VALIDAR_ELIMINACION(id)
    );
    return data;
  },

  /**
   * Eliminar usuario (soft delete)
   */
  eliminarUsuario: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.USUARIOS.DELETE(id));
  },

  /**
   * Eliminar cuenta completa (tenant + todo)
   */
  eliminarCuentaCompleta: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.USUARIOS.DELETE_CUENTA_COMPLETA(id));
  },
};