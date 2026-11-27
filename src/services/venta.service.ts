import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { VentaDTO } from '../types';

// F-13: tipos para wizard de devoluciones
export interface VentaResumenDTO {
  id: number;
  createdAt: string;
  clienteNombre: string;
  clienteDocumento: string | null;
  total: number;
  estado: string;
}

// F-15: detalle de venta formateado para precargar GRE DELIVERY motivo 01
export interface VentaDetalleGREDTO {
  ventaId: number;
  estado: string;
  clienteNombre: string;
  /** Código SUNAT: 1=DNI, 4=CE, 6=RUC, 7=PASAPORTE */
  clienteTipoDoc: string | null;
  clienteNumDoc: string | null;
  clienteDireccion: string | null;
  items: {
    productoId: number;
    productoNombre: string;
    cantidad: number;
    factor: number;
    presentacionId: number | null;
    unidadMedida: string;
  }[];
}

export interface ItemDevolucionEstadoDTO {
  detalleVentaId: number;
  productoId: number;
  productoNombre: string;
  varianteId: number | null;
  varianteDescripcion: string | null;
  stockLoteId: number | null;
  presentacionId: number | null;
  factor: number;
  cantidadVendida: number;
  cantidadDevuelta: number;
  cantidadPendiente: number;
}

export const ventaService = {
  /**
   * Obtener todas las ventas del tenant actual
   */
  getAll: async (sucursalId?: number): Promise<VentaDTO[]> => {
    const params = sucursalId ? { sucursalId } : {};
    const { data } = await axiosInstance.get<VentaDTO[]>(
      API_ENDPOINTS.VENTAS.LIST, { params }
    );
    return data;
  },

  /**
   * Obtener venta por ID
   */
  getById: async (id: number): Promise<VentaDTO> => {
    const { data } = await axiosInstance.get<VentaDTO>(
      API_ENDPOINTS.VENTAS.GET(id)
    );
    return data;
  },

  /**
   * Obtener ventas por vendedor
   */
  getByVendor: async (vendedorId: number): Promise<VentaDTO[]> => {
    const { data } = await axiosInstance.get<VentaDTO[]>(
      API_ENDPOINTS.VENTAS.GET_BY_VENDOR(vendedorId)
    );
    return data;
  },

  getByVendorAndPeriod: async (vendedorId: number, inicio: string, fin: string, sucursalId?: number): Promise<VentaDTO[]> => {
    const params: Record<string, unknown> = { inicio, fin };
    if (sucursalId) params.sucursalId = sucursalId;
    const { data } = await axiosInstance.get<VentaDTO[]>(
      API_ENDPOINTS.VENTAS.GET_BY_VENDOR(vendedorId),
      { params }
    );
    return data;
  },

  /**
   * Obtener ventas por período
   */
  getByPeriod: async (inicio: string, fin: string, sucursalId?: number): Promise<VentaDTO[]> => {
    const params: Record<string, unknown> = { inicio, fin };
    if (sucursalId) params.sucursalId = sucursalId;
    const { data } = await axiosInstance.get<VentaDTO[]>('/ventas/periodo', { params });
    return data;
  },

  /**
   * Crear venta
   */
  create: async (venta: Omit<VentaDTO, 'id' | 'tenantId'>): Promise<VentaDTO> => {
    const { data } = await axiosInstance.post<VentaDTO>(
      API_ENDPOINTS.VENTAS.CREATE,
      venta
    );
    return data;
  },

  /**
   * Actualizar venta
   */
  update: async (id: number, venta: Partial<VentaDTO>): Promise<VentaDTO> => {
    const { data } = await axiosInstance.put<VentaDTO>(
      API_ENDPOINTS.VENTAS.UPDATE(id),
      venta
    );
    return data;
  },

  /**
   * Anular venta (cambia estado a ANULADA, no elimina)
   */
  anular: async (id: number): Promise<VentaDTO> => {
    const { data } = await axiosInstance.patch<VentaDTO>(API_ENDPOINTS.VENTAS.ANULAR(id));
    return data;
  },

  asignarCliente: async (id: number, clienteId: number): Promise<VentaDTO> => {
    const { data } = await axiosInstance.patch<VentaDTO>(API_ENDPOINTS.VENTAS.ASIGNAR_CLIENTE(id), { clienteId });
    return data;
  },

  // F-13: búsqueda de ventas para wizard de devoluciones
  buscar: async (q: string): Promise<VentaResumenDTO[]> => {
    const { data } = await axiosInstance.get<VentaResumenDTO[]>(API_ENDPOINTS.VENTAS.BUSCAR, { params: { q } });
    return data;
  },

  // F-13: estado de devolución por ítem de venta
  getEstadoDevolucion: async (ventaId: number): Promise<ItemDevolucionEstadoDTO[]> => {
    const { data } = await axiosInstance.get<ItemDevolucionEstadoDTO[]>(API_ENDPOINTS.VENTAS.ESTADO_DEVOLUCION(ventaId));
    return data;
  },

  // F-15: datos de venta formateados para precargar una GRE DELIVERY motivo 01
  getDetalleParaGRE: async (ventaId: number): Promise<VentaDetalleGREDTO> => {
    const { data } = await axiosInstance.get<VentaDetalleGREDTO>(`/ventas/${ventaId}/detalle-para-gre`);
    return data;
  },
};