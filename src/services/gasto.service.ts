import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

export type CategoriaGasto =
  | 'ALQUILER'
  | 'SERVICIOS'
  | 'SUELDOS'
  | 'MANTENIMIENTO'
  | 'PUBLICIDAD'
  | 'TRANSPORTE'
  | 'IMPUESTOS'
  | 'COMPRAS_INTERNAS'
  | 'OTROS';

export type MetodoPagoGasto = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'YAPE' | 'PLIN' | 'CHEQUE' | 'OTRO';

export interface GastoDTO {
  id?: number;
  concepto: string;
  categoria: CategoriaGasto;
  monto: number;
  fechaGasto: string; // ISO date yyyy-MM-dd
  metodoPago?: MetodoPagoGasto;
  numeroComprobante?: string;
  notas?: string;
  activo?: boolean;
  tenantId?: string;
  registradoPor?: string;
  createdAt?: string;
}

export const CATEGORIAS_GASTO: { value: CategoriaGasto; label: string; icon: string }[] = [
  { value: 'ALQUILER',         label: 'Alquiler',          icon: '🏠' },
  { value: 'SERVICIOS',        label: 'Servicios básicos',  icon: '💡' },
  { value: 'SUELDOS',          label: 'Sueldos y salarios', icon: '👥' },
  { value: 'MANTENIMIENTO',    label: 'Mantenimiento',      icon: '🔧' },
  { value: 'PUBLICIDAD',       label: 'Publicidad',         icon: '📢' },
  { value: 'TRANSPORTE',       label: 'Transporte',         icon: '🚚' },
  { value: 'IMPUESTOS',        label: 'Impuestos/Tributos', icon: '📋' },
  { value: 'COMPRAS_INTERNAS', label: 'Compras internas',   icon: '🛒' },
  { value: 'OTROS',            label: 'Otros',              icon: '📦' },
];

export const METODOS_PAGO_GASTO: { value: MetodoPagoGasto; label: string }[] = [
  { value: 'EFECTIVO',      label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'TARJETA',       label: 'Tarjeta' },
  { value: 'YAPE',          label: 'Yape' },
  { value: 'PLIN',          label: 'Plin' },
  { value: 'CHEQUE',        label: 'Cheque' },
  { value: 'OTRO',          label: 'Otro' },
];

export const gastoService = {
  async getAll(): Promise<GastoDTO[]> {
    const { data } = await axiosInstance.get<GastoDTO[]>(API_ENDPOINTS.GASTOS.LIST);
    return data;
  },

  async getActivos(): Promise<GastoDTO[]> {
    const { data } = await axiosInstance.get<GastoDTO[]>(API_ENDPOINTS.GASTOS.LIST_ACTIVOS);
    return data;
  },

  async getById(id: number): Promise<GastoDTO> {
    const { data } = await axiosInstance.get<GastoDTO>(API_ENDPOINTS.GASTOS.GET(id));
    return data;
  },

  async search(q: string): Promise<GastoDTO[]> {
    const { data } = await axiosInstance.get<GastoDTO[]>(API_ENDPOINTS.GASTOS.BUSCAR(q));
    return data;
  },

  async getPorCategoria(categoria: CategoriaGasto): Promise<GastoDTO[]> {
    const { data } = await axiosInstance.get<GastoDTO[]>(API_ENDPOINTS.GASTOS.POR_CATEGORIA(categoria));
    return data;
  },

  async getPorRango(inicio: string, fin: string): Promise<GastoDTO[]> {
    const { data } = await axiosInstance.get<GastoDTO[]>(API_ENDPOINTS.GASTOS.POR_RANGO(inicio, fin));
    return data;
  },

  async getTotal(inicio: string, fin: string): Promise<number> {
    const { data } = await axiosInstance.get<{ total: number }>(API_ENDPOINTS.GASTOS.TOTAL(inicio, fin));
    return data.total;
  },

  async create(gasto: GastoDTO): Promise<GastoDTO> {
    const { data } = await axiosInstance.post<GastoDTO>(API_ENDPOINTS.GASTOS.CREATE, gasto);
    return data;
  },

  async update(id: number, gasto: GastoDTO): Promise<GastoDTO> {
    const { data } = await axiosInstance.put<GastoDTO>(API_ENDPOINTS.GASTOS.UPDATE(id), gasto);
    return data;
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(API_ENDPOINTS.GASTOS.DELETE(id));
  },
};
