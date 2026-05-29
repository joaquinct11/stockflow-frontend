import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { DevolucionDTO, CrearDevolucionDTO } from '../types';

export const devolucionService = {
  getByVenta: async (ventaId: number): Promise<DevolucionDTO[]> => {
    const res = await axiosInstance.get(API_ENDPOINTS.DEVOLUCIONES.BY_VENTA(ventaId));
    return res.data;
  },

  getAll: async (): Promise<DevolucionDTO[]> => {
    const res = await axiosInstance.get(API_ENDPOINTS.DEVOLUCIONES.LIST);
    return res.data;
  },

  crear: async (dto: CrearDevolucionDTO): Promise<DevolucionDTO> => {
    const res = await axiosInstance.post(API_ENDPOINTS.DEVOLUCIONES.CREATE, dto);
    return res.data;
  },
};
