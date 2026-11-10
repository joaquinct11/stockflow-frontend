import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

// ── Tipos de dominio ──────────────────────────────────────────────────────────

export type TipoCita =
  | 'CONSULTA'
  | 'VACUNACION'
  | 'DESPARASITACION'
  | 'CONTROL'
  | 'PELUQUERIA'
  | 'OTRO';

export type EstadoCita =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'EN_ATENCION'
  | 'ATENDIDA'
  | 'CANCELADA'
  | 'NO_ASISTIO';

// ── DTOs de respuesta ─────────────────────────────────────────────────────────

export interface CitaDTO {
  id: number;
  tenantId: string;
  sucursalId: number | null;
  clienteId: number;
  clienteNombre: string | null;
  mascotaId: number;
  mascotaNombre: string | null;
  mascotaEspecie: string | null;
  usuarioTenantId: number | null;
  profesionalNombre: string | null;
  creadoPorId: number | null;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoCita;
  motivo: string | null;
  estado: EstadoCita;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CitaResumenDTO {
  id: number;
  sucursalId?: number | null;
  clienteId: number;
  clienteNombre: string | null;
  mascotaId: number;
  mascotaNombre: string | null;
  mascotaEspecie: string | null;
  usuarioTenantId: number | null;
  profesionalNombre: string | null;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoCita;
  estado: EstadoCita;
  motivo: string | null;
}

export interface CitaPageResponse {
  content: CitaResumenDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ── DTOs de request ───────────────────────────────────────────────────────────

export interface CrearCitaRequestDTO {
  clienteId: number;
  mascotaId: number;
  usuarioTenantId?: number;
  sucursalId?: number;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoCita;
  motivo?: string;
  observaciones?: string;
}

export interface ActualizarCitaRequestDTO {
  usuarioTenantId?: number;
  sucursalId?: number;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoCita;
  motivo?: string;
  observaciones?: string;
}

export interface CambiarEstadoCitaRequestDTO {
  nuevoEstado: EstadoCita;
  observaciones?: string;
}

export interface ProfesionalElegibleDTO {
  /** ID de la membresía UsuarioTenant — es el valor para Cita.usuarioTenantId */
  usuarioTenantId: number;
  nombre: string;
  rolNombre: string;
  sucursalId: number | null;
}

// ── Parámetros de listado ─────────────────────────────────────────────────────

export interface ListarCitasParams {
  page?: number;
  size?: number;
  estado?: EstadoCita;
  fechaInicio?: string;
  fechaFin?: string;
  clienteId?: number;
  mascotaId?: number;
  usuarioTenantId?: number;
  sucursalId?: number;
  q?: string;
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const citaService = {
  async getAll(params: ListarCitasParams = {}): Promise<CitaPageResponse> {
    const { page = 0, size = 15, ...rest } = params;
    const { data } = await axiosInstance.get<CitaPageResponse>(API_ENDPOINTS.CITAS.LIST, {
      params: { page, size, ...rest },
    });
    return data;
  },

  async getById(id: number): Promise<CitaDTO> {
    const { data } = await axiosInstance.get<CitaDTO>(API_ENDPOINTS.CITAS.GET(id));
    return data;
  },

  async create(dto: CrearCitaRequestDTO): Promise<CitaDTO> {
    const { data } = await axiosInstance.post<CitaDTO>(API_ENDPOINTS.CITAS.CREATE, dto);
    return data;
  },

  async update(id: number, dto: ActualizarCitaRequestDTO): Promise<CitaDTO> {
    const { data } = await axiosInstance.put<CitaDTO>(API_ENDPOINTS.CITAS.UPDATE(id), dto);
    return data;
  },

  async cambiarEstado(id: number, dto: CambiarEstadoCitaRequestDTO): Promise<CitaDTO> {
    const { data } = await axiosInstance.patch<CitaDTO>(API_ENDPOINTS.CITAS.CAMBIAR_ESTADO(id), dto);
    return data;
  },

  async getProfesionales(sucursalId?: number | null, tipo?: TipoCita): Promise<ProfesionalElegibleDTO[]> {
    const params: Record<string, unknown> = {};
    if (sucursalId != null) params.sucursalId = sucursalId;
    if (tipo)              params.tipo = tipo;
    const { data } = await axiosInstance.get<ProfesionalElegibleDTO[]>(
      `${API_ENDPOINTS.CITAS.LIST}/profesionales`,
      { params }
    );
    return data;
  },
};
