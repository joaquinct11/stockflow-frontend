import { axiosInstance } from '../api/axios.config';

export interface SucursalDTO {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  esPrincipal?: boolean;
  activo?: boolean;
  bloqueadaPorPlan?: boolean;
  tenantId?: string;
  createdAt?: string;
  /** Ubigeo SUNAT (6 dígitos). Requerido para usar la sucursal como punto GRE. */
  ubigeo?: string;
  /** Dirección formateada para documentos tributarios (GRE). */
  direccionCompleta?: string;
}

export const sucursalService = {
  listar: async (): Promise<SucursalDTO[]> => {
    const { data } = await axiosInstance.get<SucursalDTO[]>('/sucursales');
    return data;
  },

  obtenerPorId: async (id: number): Promise<SucursalDTO> => {
    const { data } = await axiosInstance.get<SucursalDTO>(`/sucursales/${id}`);
    return data;
  },

  crear: async (dto: Omit<SucursalDTO, 'id'>): Promise<SucursalDTO> => {
    const { data } = await axiosInstance.post<SucursalDTO>('/sucursales', dto);
    return data;
  },

  actualizar: async (id: number, dto: Partial<SucursalDTO>): Promise<SucursalDTO> => {
    const { data } = await axiosInstance.put<SucursalDTO>(`/sucursales/${id}`, dto);
    return data;
  },

  desactivar: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/sucursales/${id}`);
  },

  listarConBloqueadas: async (): Promise<SucursalDTO[]> => {
    const { data } = await axiosInstance.get<SucursalDTO[]>('/sucursales/con-bloqueadas');
    return data;
  },
};
