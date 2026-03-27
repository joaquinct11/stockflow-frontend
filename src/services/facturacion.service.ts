import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ComprobanteDTO, EmitirComprobanteRequest, ReceptorDTO } from '../types';

export interface ListComprobantesFilters {
  tipo?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}

/**
 * DTO tal como lo devuelve el backend (campos planos)
 * Ajusta nombres si tu backend difiere.
 */
type ComprobanteApiDTO = Omit<ComprobanteDTO, 'receptor'> & {
  receptorDocTipo?: string | null;
  receptorDocNumero?: string | null;
  receptorNombre?: string | null;
  receptorDireccion?: string | null;
};

function mapApiToComprobanteDTO(api: ComprobanteApiDTO): ComprobanteDTO {
  const receptor: ReceptorDTO | undefined =
    api.receptorDocTipo || api.receptorDocNumero || api.receptorNombre || api.receptorDireccion
      ? {
          tipoDocumento: (api.receptorDocTipo as any) ?? undefined,
          numeroDocumento: api.receptorDocNumero ?? undefined,
          razonSocial: api.receptorNombre ?? undefined,
          direccion: api.receptorDireccion ?? undefined,
        }
      : undefined;

  // Quitamos los campos planos para que no “ensucien” el objeto final
  const { receptorDocTipo, receptorDocNumero, receptorNombre, receptorDireccion, ...rest } = api;

  return {
    ...rest,
    receptor,
  };
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
    const response = await axiosInstance.get<ComprobanteApiDTO[]>(`${API_ENDPOINTS.FACTURACION.LIST}${query}`);

    return (response.data ?? []).map(mapApiToComprobanteDTO);
  },

  emitirComprobante: async (payload: EmitirComprobanteRequest): Promise<ComprobanteDTO> => {
    const response = await axiosInstance.post<ComprobanteApiDTO>(API_ENDPOINTS.FACTURACION.CREATE, payload);
    return mapApiToComprobanteDTO(response.data);
  },

  getComprobante: async (id: number): Promise<ComprobanteDTO> => {
    const response = await axiosInstance.get<ComprobanteApiDTO>(API_ENDPOINTS.FACTURACION.GET(id));
    return mapApiToComprobanteDTO(response.data);
  },

  getComprobanteByVentaId: async (ventaId: number): Promise<ComprobanteDTO> => {
    const response = await axiosInstance.get<ComprobanteApiDTO>(API_ENDPOINTS.FACTURACION.GET_BY_VENTA(ventaId));
    return mapApiToComprobanteDTO(response.data);
  },

  anularComprobante: async (id: number): Promise<ComprobanteDTO> => {
    const response = await axiosInstance.post<ComprobanteApiDTO>(API_ENDPOINTS.FACTURACION.ANULAR(id));
    return mapApiToComprobanteDTO(response.data);
  },
};