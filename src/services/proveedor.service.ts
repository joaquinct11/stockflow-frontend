import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ProveedorDTO } from '../types';

export const proveedorService = {
  /**
   * Obtener todos los proveedores del tenant actual
   */
  getAll: async (): Promise<ProveedorDTO[]> => {
    const { data } = await axiosInstance.get<ProveedorDTO[]>(
      API_ENDPOINTS.PROVEEDORES.LIST
    );
    return data;
  },

  /**
   * Obtener proveedores activos
   */
  getActivos: async (): Promise<ProveedorDTO[]> => {
    const { data } = await axiosInstance.get<ProveedorDTO[]>(
      API_ENDPOINTS.PROVEEDORES.LIST_ACTIVOS
    );
    return data;
  },

  /**
   * Obtener proveedor por ID
   */
  getById: async (id: number): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.get<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.GET(id)
    );
    return data;
  },

  /**
   * Obtener proveedor por RUC
   */
  getByRuc: async (ruc: string): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.get<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.GET_BY_RUC(ruc)
    );
    return data;
  },

  /**
   * Buscar proveedores por nombre
   */
  search: async (nombre: string): Promise<ProveedorDTO[]> => {
    const { data } = await axiosInstance.get<ProveedorDTO[]>(
      API_ENDPOINTS.PROVEEDORES.SEARCH(nombre)
    );
    return data;
  },

  /**
   * Crear proveedor
   */
  create: async (proveedor: Omit<ProveedorDTO, 'id' | 'tenantId'>): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.post<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.CREATE,
      proveedor
    );
    return data;
  },

  /**
   * Actualizar proveedor
   */
  update: async (id: number, proveedor: Partial<ProveedorDTO>): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.put<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.UPDATE(id),
      proveedor
    );
    return data;
  },

  /**
   * Activar proveedor
   */
  activate: async (id: number): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.patch<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.ACTIVATE(id)
    );
    return data;
  },

  /**
   * Desactivar proveedor
   */
  deactivate: async (id: number): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.patch<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.DEACTIVATE(id)
    );
    return data;
  },

  /**
   * Eliminar proveedor
   */
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PROVEEDORES.DELETE(id));
  },
};