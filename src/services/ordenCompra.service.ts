import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { OrdenCompraDTO, OrdenCompraItemDTO } from '../types';

export const ordenCompraService = {
  getAll: async (): Promise<OrdenCompraDTO[]> => {
    const { data } = await axiosInstance.get<OrdenCompraDTO[]>(
      API_ENDPOINTS.ORDENES_COMPRA.LIST
    );
    return data;
  },

  getById: async (id: number): Promise<OrdenCompraDTO> => {
    const { data } = await axiosInstance.get<OrdenCompraDTO>(
      API_ENDPOINTS.ORDENES_COMPRA.GET(id)
    );
    return data;
  },

  create: async (dto: Omit<OrdenCompraDTO, 'id' | 'tenantId'>): Promise<OrdenCompraDTO> => {
    const { data } = await axiosInstance.post<OrdenCompraDTO>(
      API_ENDPOINTS.ORDENES_COMPRA.CREATE,
      dto
    );
    return data;
  },

  editarCabecera: async (id: number, observaciones: string | null): Promise<OrdenCompraDTO> => {
    const { data } = await axiosInstance.patch<OrdenCompraDTO>(
      API_ENDPOINTS.ORDENES_COMPRA.UPDATE(id),
      { observaciones }
    );
    return data;
  },

  addItem: async (id: number, item: OrdenCompraItemDTO): Promise<OrdenCompraDTO> => {
    const { data } = await axiosInstance.post<OrdenCompraDTO>(
      API_ENDPOINTS.ORDENES_COMPRA.ADD_ITEM(id),
      item
    );
    return data;
  },

  removeItem: async (id: number, itemId: number): Promise<OrdenCompraDTO> => {
    const { data } = await axiosInstance.delete<OrdenCompraDTO>(
      API_ENDPOINTS.ORDENES_COMPRA.REMOVE_ITEM(id, itemId)
    );
    return data;
  },

  enviar: async (id: number): Promise<OrdenCompraDTO> => {
    const { data } = await axiosInstance.patch<OrdenCompraDTO>(
      API_ENDPOINTS.ORDENES_COMPRA.ENVIAR(id)
    );
    return data;
  },

  cancelar: async (id: number): Promise<OrdenCompraDTO> => {
    const { data } = await axiosInstance.patch<OrdenCompraDTO>(
      API_ENDPOINTS.ORDENES_COMPRA.CANCELAR(id)
    );
    return data;
  },
};
