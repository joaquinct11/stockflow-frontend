import { axiosInstance } from '../api/axios.config';

export interface ComisionDTO {
  id?: number;
  concepto: string;
  pagador: string;
  monto: number;
  fecha: string; // yyyy-MM-dd
  metodoPago?: string;
  numeroComprobante?: string;
  notas?: string;
  tenantId?: string;
  registradoPor?: string;
  createdAt?: string;
  sucursalId?: number;
}

export const METODOS_PAGO_COMISION = ['TRANSFERENCIA', 'EFECTIVO', 'DEPOSITO', 'OTRO'] as const;

export const comisionService = {
  listar: async (sucursalId?: number, desde?: string, hasta?: string): Promise<ComisionDTO[]> => {
    const params: Record<string, unknown> = {};
    if (sucursalId) params.sucursalId = sucursalId;
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const { data } = await axiosInstance.get<ComisionDTO[]>('/comisiones', {
      params: Object.keys(params).length ? params : undefined,
    });
    return data;
  },
  crear: async (dto: ComisionDTO): Promise<ComisionDTO> => {
    const { data } = await axiosInstance.post<ComisionDTO>('/comisiones', dto);
    return data;
  },
  actualizar: async (id: number, dto: ComisionDTO): Promise<ComisionDTO> => {
    const { data } = await axiosInstance.put<ComisionDTO>(`/comisiones/${id}`, dto);
    return data;
  },
  eliminar: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/comisiones/${id}`);
  },
};
