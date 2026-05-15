import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export interface ClienteDTO {
  id?: number;
  nombre: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo?: boolean;
  tenantId?: string;
  createdAt?: string;
}

export const clienteService = {
  async getAll(): Promise<ClienteDTO[]> {
    const { data } = await axiosInstance.get<ClienteDTO[]>(API_ENDPOINTS.CLIENTES.LIST);
    return data;
  },

  async getActivos(): Promise<ClienteDTO[]> {
    const { data } = await axiosInstance.get<ClienteDTO[]>(API_ENDPOINTS.CLIENTES.LIST_ACTIVOS);
    return data;
  },

  async getById(id: number): Promise<ClienteDTO> {
    const { data } = await axiosInstance.get<ClienteDTO>(API_ENDPOINTS.CLIENTES.GET(id));
    return data;
  },

  async search(nombre: string): Promise<ClienteDTO[]> {
    const { data } = await axiosInstance.get<ClienteDTO[]>(API_ENDPOINTS.CLIENTES.SEARCH(nombre));
    return data;
  },

  async buscarPorDocumento(numero: string): Promise<ClienteDTO[]> {
    const { data } = await axiosInstance.get<ClienteDTO[]>(API_ENDPOINTS.CLIENTES.BUSCAR_DOCUMENTO(numero));
    return data;
  },

  async create(cliente: ClienteDTO): Promise<ClienteDTO> {
    const { data } = await axiosInstance.post<ClienteDTO>(API_ENDPOINTS.CLIENTES.CREATE, cliente);
    return data;
  },

  async update(id: number, cliente: ClienteDTO): Promise<ClienteDTO> {
    const { data } = await axiosInstance.put<ClienteDTO>(API_ENDPOINTS.CLIENTES.UPDATE(id), cliente);
    return data;
  },

  async activate(id: number): Promise<ClienteDTO> {
    const { data } = await axiosInstance.patch<ClienteDTO>(API_ENDPOINTS.CLIENTES.ACTIVATE(id));
    return data;
  },

  async deactivate(id: number): Promise<ClienteDTO> {
    const { data } = await axiosInstance.patch<ClienteDTO>(API_ENDPOINTS.CLIENTES.DEACTIVATE(id));
    return data;
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(API_ENDPOINTS.CLIENTES.DELETE(id));
  },
};
