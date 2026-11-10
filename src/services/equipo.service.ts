import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export interface EquipoClienteDTO {
  id?: number;
  tenantId?: string;
  clienteId?: number;
  clienteNombre?: string;
  nombre: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  ubicacion?: string;
  observaciones?: string;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EquipoResumenDTO {
  id: number;
  clienteId: number;
  clienteNombre: string;
  nombre: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  ubicacion?: string;
  activo: boolean;
}

export interface EquipoPageResumen {
  total: number;
  activos: number;
  inactivos: number;
}

export interface EquipoPageResponseDTO {
  content: EquipoResumenDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  clientesConEquipos: number;
  resumen: EquipoPageResumen;
}

export interface EquipoStatsDTO {
  total: number;
  activos: number;
  inactivos: number;
  clientesConEquipos: number;
}

export const equipoService = {
  async listar(params: {
    page?: number;
    size?: number;
    estado?: string;
    search?: string;
    clienteId?: number | null;
  }): Promise<EquipoPageResponseDTO> {
    const p: Record<string, unknown> = {
      page: params.page ?? 0,
      size: params.size ?? 15,
      estado: params.estado ?? 'ACTIVOS',
      search: params.search ?? '',
    };
    if (params.clienteId != null) p.clienteId = params.clienteId;
    const { data } = await axiosInstance.get<EquipoPageResponseDTO>(
      API_ENDPOINTS.EQUIPOS.LIST,
      { params: p }
    );
    return data;
  },

  async getById(id: number): Promise<EquipoClienteDTO> {
    const { data } = await axiosInstance.get<EquipoClienteDTO>(API_ENDPOINTS.EQUIPOS.GET(id));
    return data;
  },

  async listarPorCliente(clienteId: number): Promise<EquipoResumenDTO[]> {
    const { data } = await axiosInstance.get<EquipoPageResponseDTO>(
      API_ENDPOINTS.EQUIPOS.LIST,
      { params: { clienteId, estado: 'TODOS', size: 100, page: 0 } }
    );
    return data.content;
  },

  async getStats(): Promise<EquipoStatsDTO> {
    const { data } = await axiosInstance.get<EquipoStatsDTO>(API_ENDPOINTS.EQUIPOS.STATS);
    return data;
  },

  async create(dto: EquipoClienteDTO & { clienteId: number }): Promise<EquipoClienteDTO> {
    const { data } = await axiosInstance.post<EquipoClienteDTO>(API_ENDPOINTS.EQUIPOS.CREATE, dto);
    return data;
  },

  async update(id: number, dto: Partial<EquipoClienteDTO>): Promise<EquipoClienteDTO> {
    const { data } = await axiosInstance.put<EquipoClienteDTO>(API_ENDPOINTS.EQUIPOS.UPDATE(id), dto);
    return data;
  },

  async activate(id: number): Promise<void> {
    await axiosInstance.patch(API_ENDPOINTS.EQUIPOS.ACTIVATE(id));
  },

  async deactivate(id: number): Promise<void> {
    await axiosInstance.patch(API_ENDPOINTS.EQUIPOS.DEACTIVATE(id));
  },
};
