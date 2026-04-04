import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type {
  ReportesResumenDTO,
  VentasTendenciaPuntoDTO,
  VentasPorVendedorDTO,
  VentasPorCategoriaDTO,
  VentasPorMetodoPagoDTO,
  VentasProductoDTO,
  InventarioABCDTO,
  InventarioSlowMoverDTO,
  InventarioCoberturaDTO,
  ComprasPorProveedorDTO,
} from '../types';

export type AgrupacionTendencia = 'DIA' | 'SEMANA' | 'MES';
export type OrdenProductos = 'MAS' | 'MENOS';
export type MetricaProductos = 'UNIDADES' | 'INGRESOS';

export const reportesService = {
  getResumen: async (desde: string, hasta: string): Promise<ReportesResumenDTO> => {
    const { data } = await axiosInstance.get<ReportesResumenDTO>(
      API_ENDPOINTS.REPORTES.RESUMEN(desde, hasta)
    );
    return data;
  },

  // ── Ventas ────────────────────────────────────────────────────────────────

  getVentasTendencia: async (
    desde: string,
    hasta: string,
    agrupacion: AgrupacionTendencia = 'DIA'
  ): Promise<VentasTendenciaPuntoDTO[]> => {
    const { data } = await axiosInstance.get<VentasTendenciaPuntoDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_TENDENCIA(desde, hasta, agrupacion)
    );
    return data ?? [];
  },

  getVentasPorVendedor: async (
    desde: string,
    hasta: string,
    limit = 20
  ): Promise<VentasPorVendedorDTO[]> => {
    const { data } = await axiosInstance.get<VentasPorVendedorDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_POR_VENDEDOR(desde, hasta, limit)
    );
    return data ?? [];
  },

  getVentasPorCategoria: async (
    desde: string,
    hasta: string,
    limit = 20
  ): Promise<VentasPorCategoriaDTO[]> => {
    const { data } = await axiosInstance.get<VentasPorCategoriaDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_POR_CATEGORIA(desde, hasta, limit)
    );
    return data ?? [];
  },

  getVentasPorMetodoPago: async (
    desde: string,
    hasta: string
  ): Promise<VentasPorMetodoPagoDTO[]> => {
    const { data } = await axiosInstance.get<VentasPorMetodoPagoDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_POR_METODO_PAGO(desde, hasta)
    );
    return data ?? [];
  },

  getVentasProductos: async (
    desde: string,
    hasta: string,
    limit = 10,
    orden: OrdenProductos = 'MAS',
    metrica: MetricaProductos = 'UNIDADES'
  ): Promise<VentasProductoDTO[]> => {
    const { data } = await axiosInstance.get<VentasProductoDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_PRODUCTOS(desde, hasta, limit, orden, metrica)
    );
    return data ?? [];
  },

  // ── Inventario ───────────────────────────────────────────────────────────

  getInventarioABC: async (
    desde: string,
    hasta: string,
    limit = 50
  ): Promise<InventarioABCDTO[]> => {
    const { data } = await axiosInstance.get<InventarioABCDTO[]>(
      API_ENDPOINTS.REPORTES.INVENTARIO_ABC(desde, hasta, limit)
    );
    return data ?? [];
  },

  getInventarioSlowMovers: async (
    diasSinSalida = 30,
    limit = 20
  ): Promise<InventarioSlowMoverDTO[]> => {
    const { data } = await axiosInstance.get<InventarioSlowMoverDTO[]>(
      API_ENDPOINTS.REPORTES.INVENTARIO_SLOW_MOVERS(diasSinSalida, limit)
    );
    return data ?? [];
  },

  getInventarioCobertura: async (
    desde: string,
    hasta: string,
    limit = 20
  ): Promise<InventarioCoberturaDTO[]> => {
    const { data } = await axiosInstance.get<InventarioCoberturaDTO[]>(
      API_ENDPOINTS.REPORTES.INVENTARIO_COBERTURA(desde, hasta, limit)
    );
    return data ?? [];
  },

  // ── Compras ──────────────────────────────────────────────────────────────

  getComprasPorProveedor: async (
    desde: string,
    hasta: string,
    limit = 20
  ): Promise<ComprasPorProveedorDTO[]> => {
    const { data } = await axiosInstance.get<ComprasPorProveedorDTO[]>(
      API_ENDPOINTS.REPORTES.COMPRAS_POR_PROVEEDOR(desde, hasta, limit)
    );
    return data ?? [];
  },
};
