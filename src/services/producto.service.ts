import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ProductoDTO } from '../types';

/**
 * Obtener tenantId del usuario logueado
 */
const getTenantId = (): string => {
  const user = localStorage.getItem('user');
  if (!user) throw new Error('Usuario no autenticado');
  
  const userData = JSON.parse(user);
  if (!userData.tenantId) throw new Error('TenantId no encontrado');
  
  return userData.tenantId;
};

export const productoService = {
  /**
   * Obtener todos los productos del tenant actual
   */
  getAll: async (): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      API_ENDPOINTS.PRODUCTOS.LIST
    );
    return data;
  },

  /**
   * Obtener producto por ID
   */
  getById: async (id: number): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.get<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.GET(id)
    );
    return data;
  },

  /**
   * Obtener producto por código de barras
   */
  getByBarcode: async (barcode: string): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.get<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.GET_BY_BARCODE(barcode)
    );
    return data;
  },

  /**
   * Buscar productos por nombre
   */
  search: async (nombre: string): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      API_ENDPOINTS.PRODUCTOS.SEARCH(nombre)
    );
    return data;
  },

  /**
   * Obtener productos con stock bajo
   */
  getLowStock: async (): Promise<ProductoDTO[]> => {
    const { data } = await axiosInstance.get<ProductoDTO[]>(
      '/productos/bajo-stock'
    );
    return data;
  },

  /**
   * Crear producto
   */
  create: async (producto: Omit<ProductoDTO, 'id' | 'tenantId'>): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.post<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.CREATE,
      producto
    );
    return data;
  },

  /**
   * Actualizar producto
   */
  update: async (id: number, producto: Partial<ProductoDTO>): Promise<ProductoDTO> => {
    const { data } = await axiosInstance.put<ProductoDTO>(
      API_ENDPOINTS.PRODUCTOS.UPDATE(id),
      producto
    );
    return data;
  },

  /**
   * Eliminar producto
   */
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PRODUCTOS.DELETE(id));
  },
};