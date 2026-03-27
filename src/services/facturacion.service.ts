import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ComprobanteDTO, EmitirComprobanteRequest } from '../types';

export interface ListComprobantesFilters {
  tipo?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}

export const facturacionService = {
  listComprobantes: async (filters?: ListComprobantesFilters): Promise<ComprobanteDTO[]> => {
    const params = new URLSearchParams();
    if (filters?.tipo) params.append('tipo', filters.tipo);
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
    if (filters?.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await axiosInstance.get<ComprobanteDTO[]>(`${API_ENDPOINTS.FACTURACION.LIST}${query}`);
    return response.data;
  },

  emitirComprobante: async (payload: EmitirComprobanteRequest): Promise<ComprobanteDTO> => {
    const response = await axiosInstance.post<ComprobanteDTO>(API_ENDPOINTS.FACTURACION.CREATE, payload);
    return response.data;
  },

  getComprobante: async (id: number): Promise<ComprobanteDTO> => {
    const response = await axiosInstance.get<ComprobanteDTO>(API_ENDPOINTS.FACTURACION.GET(id));
    return response.data;
  },

  getComprobanteByVentaId: async (ventaId: number): Promise<ComprobanteDTO> => {
    const response = await axiosInstance.get<ComprobanteDTO>(API_ENDPOINTS.FACTURACION.GET_BY_VENTA(ventaId));
    return response.data;
  },

  anularComprobante: async (id: number): Promise<ComprobanteDTO> => {
    const response = await axiosInstance.post<ComprobanteDTO>(API_ENDPOINTS.FACTURACION.ANULAR(id));
    return response.data;
  },
};
