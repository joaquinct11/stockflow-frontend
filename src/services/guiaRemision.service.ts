import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type {
  GuiaRemisionListItem,
  GuiaRemisionResponse,
  CrearGuiaRemisionRequest,
  EditarBorradorRequest,
  ConfirmarRecepcionRequest,
  EstadoTributarioGRE,
} from '../types/gre.types';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface GuiaRemisionStats {
  total: number;
  emitidas: number;
  pendientes: number;
  conError: number;
}

export const guiaRemisionService = {
  listar: async (
    page = 0,
    size = 10,
    q?: string,
    estado?: EstadoTributarioGRE | '',
    sucursalId?: number,
  ): Promise<PageResponse<GuiaRemisionListItem>> => {
    const params: Record<string, unknown> = { page, size, sort: 'createdAt,desc' };
    if (q && q.trim()) params.q = q.trim();
    if (estado) params.estado = estado;
    if (sucursalId) params.sucursalId = sucursalId;
    const { data } = await axiosInstance.get<PageResponse<GuiaRemisionListItem>>(
      API_ENDPOINTS.GUIAS_REMISION.LIST,
      { params }
    );
    return data;
  },

  stats: async (sucursalId?: number): Promise<GuiaRemisionStats> => {
    const params: Record<string, unknown> = {};
    if (sucursalId) params.sucursalId = sucursalId;
    const { data } = await axiosInstance.get<GuiaRemisionStats>(
      `${API_ENDPOINTS.GUIAS_REMISION.LIST}/stats`,
      { params }
    );
    return data;
  },

  obtener: async (id: number): Promise<GuiaRemisionResponse> => {
    const { data } = await axiosInstance.get<GuiaRemisionResponse>(
      API_ENDPOINTS.GUIAS_REMISION.GET(id)
    );
    return data;
  },

  crear: async (request: CrearGuiaRemisionRequest): Promise<GuiaRemisionResponse> => {
    const { data } = await axiosInstance.post<GuiaRemisionResponse>(
      API_ENDPOINTS.GUIAS_REMISION.CREATE,
      request
    );
    return data;
  },

  actualizar: async (id: number, request: EditarBorradorRequest): Promise<GuiaRemisionResponse> => {
    const { data } = await axiosInstance.put<GuiaRemisionResponse>(
      API_ENDPOINTS.GUIAS_REMISION.ACTUALIZAR(id),
      request
    );
    return data;
  },

  eliminar: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.GUIAS_REMISION.ELIMINAR(id));
  },

  emitir: async (id: number): Promise<GuiaRemisionResponse> => {
    const { data } = await axiosInstance.post<GuiaRemisionResponse>(
      API_ENDPOINTS.GUIAS_REMISION.EMITIR(id)
    );
    return data;
  },

  confirmarRecepcion: async (id: number, req?: ConfirmarRecepcionRequest): Promise<GuiaRemisionResponse> => {
    const { data } = await axiosInstance.post<GuiaRemisionResponse>(
      API_ENDPOINTS.GUIAS_REMISION.CONFIRMAR_RECEPCION(id),
      req ?? {}
    );
    return data;
  },

  cancelar: async (id: number): Promise<GuiaRemisionResponse> => {
    const { data } = await axiosInstance.post<GuiaRemisionResponse>(
      API_ENDPOINTS.GUIAS_REMISION.CANCELAR(id)
    );
    return data;
  },

  downloadPdf: async (id: number): Promise<Blob> => {
    const { data } = await axiosInstance.get<Blob>(
      API_ENDPOINTS.GUIAS_REMISION.PDF(id),
      { responseType: 'blob' }
    );
    return data;
  },
};
