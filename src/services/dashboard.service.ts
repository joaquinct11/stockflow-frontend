import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export interface ActividadRecienteDTO {
  tipo: 'VENTA' | 'COMPROBANTE' | 'ENTRADA' | 'AJUSTE' | 'MERMA' | 'ORDEN_COMPRA' | 'ANULACION' | 'DEVOLUCION';
  descripcion: string;
  detalle?: string | null;
  usuarioNombre?: string | null;
  fechaHora: string; // ISO datetime
}

export const dashboardService = {
  getActividadReciente: async (
    limit = 15,
    sucursalId?: number,
  ): Promise<ActividadRecienteDTO[]> => {
    const { data } = await axiosInstance.get<ActividadRecienteDTO[]>(
      API_ENDPOINTS.DASHBOARD.ACTIVIDAD_RECIENTE(limit, sucursalId),
    );
    return data;
  },
};
