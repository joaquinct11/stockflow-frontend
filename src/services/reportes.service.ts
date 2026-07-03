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
  FinancieroDTO,
  VencimientosRiesgoDTO,
  ClienteReporteDTO,
} from '../types';

export type AgrupacionTendencia = 'DIA' | 'SEMANA' | 'MES';
export type OrdenProductos = 'MAS' | 'MENOS';
export type MetricaProductos = 'UNIDADES' | 'INGRESOS';

const sid = (sucursalId?: number) => (sucursalId ? { sucursalId } : undefined);

export const reportesService = {
  getResumen: async (desde: string, hasta: string, sucursalId?: number): Promise<ReportesResumenDTO> => {
    const { data } = await axiosInstance.get<ReportesResumenDTO>(
      API_ENDPOINTS.REPORTES.RESUMEN(desde, hasta),
      { params: sid(sucursalId) }
    );
    return data;
  },

  // ── Ventas ────────────────────────────────────────────────────────────────

  getVentasTendencia: async (
    desde: string,
    hasta: string,
    agrupacion: AgrupacionTendencia = 'DIA',
    sucursalId?: number
  ): Promise<VentasTendenciaPuntoDTO[]> => {
    const { data } = await axiosInstance.get<VentasTendenciaPuntoDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_TENDENCIA(desde, hasta, agrupacion),
      { params: sid(sucursalId) }
    );
    return data ?? [];
  },

  getVentasPorVendedor: async (
    desde: string,
    hasta: string,
    limit = 20,
    sucursalId?: number
  ): Promise<VentasPorVendedorDTO[]> => {
    const { data } = await axiosInstance.get<VentasPorVendedorDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_POR_VENDEDOR(desde, hasta, limit),
      { params: sid(sucursalId) }
    );
    return data ?? [];
  },

  getVentasPorCategoria: async (
    desde: string,
    hasta: string,
    limit = 20,
    sucursalId?: number
  ): Promise<VentasPorCategoriaDTO[]> => {
    const { data } = await axiosInstance.get<VentasPorCategoriaDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_POR_CATEGORIA(desde, hasta, limit),
      { params: sid(sucursalId) }
    );
    return data ?? [];
  },

  getVentasPorMetodoPago: async (
    desde: string,
    hasta: string,
    sucursalId?: number
  ): Promise<VentasPorMetodoPagoDTO[]> => {
    const { data } = await axiosInstance.get<VentasPorMetodoPagoDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_POR_METODO_PAGO(desde, hasta),
      { params: sid(sucursalId) }
    );
    return data ?? [];
  },

  getVentasProductos: async (
    desde: string,
    hasta: string,
    limit = 10,
    orden: OrdenProductos = 'MAS',
    metrica: MetricaProductos = 'UNIDADES',
    sucursalId?: number
  ): Promise<VentasProductoDTO[]> => {
    const { data } = await axiosInstance.get<VentasProductoDTO[]>(
      API_ENDPOINTS.REPORTES.VENTAS_PRODUCTOS(desde, hasta, limit, orden, metrica),
      { params: sid(sucursalId) }
    );
    return data ?? [];
  },

  // ── Inventario ───────────────────────────────────────────────────────────

  getInventarioABC: async (
    desde: string,
    hasta: string,
    limit = 50,
    sucursalId?: number
  ): Promise<InventarioABCDTO[]> => {
    const { data } = await axiosInstance.get<InventarioABCDTO[]>(
      API_ENDPOINTS.REPORTES.INVENTARIO_ABC(desde, hasta, limit),
      { params: sid(sucursalId) }
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
    limit = 20,
    sucursalId?: number
  ): Promise<InventarioCoberturaDTO[]> => {
    const { data } = await axiosInstance.get<InventarioCoberturaDTO[]>(
      API_ENDPOINTS.REPORTES.INVENTARIO_COBERTURA(desde, hasta, limit),
      { params: sid(sucursalId) }
    );
    return data ?? [];
  },

  // ── Compras ──────────────────────────────────────────────────────────────

  getComprasPorProveedor: async (
    desde: string,
    hasta: string,
    limit = 20,
    sucursalId?: number
  ): Promise<ComprasPorProveedorDTO[]> => {
    const { data } = await axiosInstance.get<ComprasPorProveedorDTO[]>(
      API_ENDPOINTS.REPORTES.COMPRAS_POR_PROVEEDOR(desde, hasta, limit),
      { params: sid(sucursalId) }
    );
    return data ?? [];
  },

  // ── Financiero (P&L) ─────────────────────────────────────────────────────

  getFinanciero: async (desde: string, hasta: string, sucursalId?: number): Promise<FinancieroDTO> => {
    const { data } = await axiosInstance.get<FinancieroDTO>(
      API_ENDPOINTS.REPORTES.FINANCIERO(desde, hasta),
      { params: sid(sucursalId) }
    );
    return data;
  },

  // ── Vencimientos en riesgo ────────────────────────────────────────────────

  getVencimientosRiesgo: async (): Promise<VencimientosRiesgoDTO> => {
    const { data } = await axiosInstance.get<VencimientosRiesgoDTO>(
      API_ENDPOINTS.REPORTES.INVENTARIO_VENCIMIENTOS
    );
    return data;
  },

  // ── Top clientes ──────────────────────────────────────────────────────────

  getTopClientes: async (
    desde: string,
    hasta: string,
    limit = 20,
    sucursalId?: number
  ): Promise<ClienteReporteDTO[]> => {
    const { data } = await axiosInstance.get<ClienteReporteDTO[]>(
      API_ENDPOINTS.REPORTES.CLIENTES(desde, hasta, limit),
      { params: sid(sucursalId) }
    );
    return data ?? [];
  },
};
