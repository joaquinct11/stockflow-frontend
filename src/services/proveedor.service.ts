import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ProveedorDTO } from '../types';

export const proveedorService = {
  getAll: async (): Promise<ProveedorDTO[]> => {
    const { data } = await axiosInstance.get<ProveedorDTO[]>(
      API_ENDPOINTS.PROVEEDORES.LIST
    );
    return data;
  },

  getActivos: async (): Promise<ProveedorDTO[]> => {
    const { data } = await axiosInstance.get<ProveedorDTO[]>(
      API_ENDPOINTS.PROVEEDORES.LIST_ACTIVOS
    );
    return data;
  },

  getById: async (id: number): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.get<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.GET(id)
    );
    return data;
  },

  getByRuc: async (ruc: string): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.get<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.GET_BY_RUC(ruc)
    );
    return data;
  },

  search: async (nombre: string): Promise<ProveedorDTO[]> => {
    const { data } = await axiosInstance.get<ProveedorDTO[]>(
      API_ENDPOINTS.PROVEEDORES.SEARCH(nombre)
    );
    return data;
  },

  create: async (proveedor: ProveedorDTO): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.post<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.CREATE,
      proveedor
    );
    return data;
  },

  update: async (id: number, proveedor: ProveedorDTO): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.put<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.UPDATE(id),
      proveedor
    );
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PROVEEDORES.DELETE(id));
  },

  activate: async (id: number): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.patch<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.ACTIVATE(id)
    );
    return data;
  },

  deactivate: async (id: number): Promise<ProveedorDTO> => {
    const { data } = await axiosInstance.patch<ProveedorDTO>(
      API_ENDPOINTS.PROVEEDORES.DEACTIVATE(id)
    );
    return data;
  },
};