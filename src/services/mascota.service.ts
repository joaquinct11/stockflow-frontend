import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export interface MascotaResumenDTO {
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteTelefono?: string | null;
  nombre: string;
  especie: string;
  raza: string | null;
  sexo: string | null;
  pesoKg: number | null;
  activo: boolean;
}

export interface MascotaDTO {
  id: number;
  clienteId: number;
  nombre: string;
  especie: string;
  raza: string | null;
  sexo: string | null;
  fechaNacimiento: string | null;
  color: string | null;
  pesoKg: number | null;
  microchip: string | null;
  esterilizado: boolean | null;
  activo: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrearMascotaRequestDTO {
  clienteId: number;
  nombre: string;
  especie: string;
  raza?: string;
  sexo?: string;
  fechaNacimiento?: string;
  color?: string;
  pesoKg?: number;
  microchip?: string;
  esterilizado?: boolean;
}

export interface ActualizarMascotaRequestDTO {
  nombre: string;
  especie: string;
  raza?: string;
  sexo?: string;
  fechaNacimiento?: string;
  color?: string;
  pesoKg?: number;
  microchip?: string;
  esterilizado?: boolean;
}

export interface MascotaPageResponse {
  content: MascotaResumenDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  resumen: {
    total: number;
    activas: number;
    inactivas: number;
    porEspecie?: { perro: number; gato: number; otros: number };
  };
}

export interface MascotaStatsDTO {
  total: number;
  activas: number;
  inactivas: number;
}

export const mascotaService = {
  async getAll(params: {
    page?: number;
    size?: number;
    estado?: 'ACTIVAS' | 'INACTIVAS' | 'TODOS';
    search?: string;
    especie?: string;
  } = {}): Promise<MascotaPageResponse> {
    const { page = 0, size = 15, estado = 'ACTIVAS', search = '', especie } = params;
    const { data } = await axiosInstance.get<MascotaPageResponse>(API_ENDPOINTS.MASCOTAS.LIST, {
      params: { page, size, estado, search, ...(especie && especie !== 'TODAS' ? { especie } : {}) },
    });
    return data;
  },

  async getById(id: number): Promise<MascotaDTO> {
    const { data } = await axiosInstance.get<MascotaDTO>(API_ENDPOINTS.MASCOTAS.GET(id));
    return data;
  },

  async porCliente(clienteId: number): Promise<MascotaResumenDTO[]> {
    const { data } = await axiosInstance.get<MascotaResumenDTO[]>(API_ENDPOINTS.MASCOTAS.BY_CLIENTE(clienteId));
    return data;
  },

  async buscarPorNombre(nombre: string): Promise<MascotaResumenDTO[]> {
    const { data } = await axiosInstance.get<MascotaResumenDTO[]>(API_ENDPOINTS.MASCOTAS.BUSCAR(nombre));
    return data;
  },

  async create(dto: CrearMascotaRequestDTO): Promise<MascotaDTO> {
    const { data } = await axiosInstance.post<MascotaDTO>(API_ENDPOINTS.MASCOTAS.CREATE, dto);
    return data;
  },

  async update(id: number, dto: ActualizarMascotaRequestDTO): Promise<MascotaDTO> {
    const { data } = await axiosInstance.put<MascotaDTO>(API_ENDPOINTS.MASCOTAS.UPDATE(id), dto);
    return data;
  },

  async activate(id: number): Promise<MascotaDTO> {
    const { data } = await axiosInstance.patch<MascotaDTO>(API_ENDPOINTS.MASCOTAS.ACTIVATE(id));
    return data;
  },

  async deactivate(id: number): Promise<MascotaDTO> {
    const { data } = await axiosInstance.patch<MascotaDTO>(API_ENDPOINTS.MASCOTAS.DEACTIVATE(id));
    return data;
  },

  async getStats(): Promise<MascotaStatsDTO> {
    const { data } = await axiosInstance.get<MascotaStatsDTO>(API_ENDPOINTS.MASCOTAS.STATS);
    return data;
  },
};
