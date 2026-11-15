import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';

// ── DTOs (reflejan los contratos reales del backend) ──────────────────────────

export interface OtResumenDTO {
  id: number;
  numeroOt: string;
  estado: string;
  prioridad: string;
  equipoNombre: string;
  clienteNombre: string;
  sucursalNombre: string | null;
  tecnicoNombre: string | null;
  createdAt: string;
}

export interface HistorialEstadoDTO {
  id: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  usuarioId: number;
  observacion: string | null;
  createdAt: string;
}

export interface OrdenTrabajoDTO {
  id: number;
  tenantId: string;
  numeroOt: string;
  ventaId: number | null;
  anio: number;
  equipoClienteId: number;
  equipoNombre: string;
  equipoTipo: string | null;
  equipoMarca: string | null;
  equipoModelo: string | null;
  equipoNumeroSerie: string | null;
  clienteId: number;
  clienteNombre: string;
  sucursalId: number | null;
  sucursalNombre: string | null;
  tecnicoId: number | null;
  tecnicoNombre: string | null;
  estado: string;
  prioridad: string;
  descripcionProblema: string;
  diagnostico: string | null;
  trabajoRealizado: string | null;
  observaciones: string | null;
  fechaCierreTecnico: string | null;
  montoManoObra: number | null;
  totalFacturado: number | null;
  recibidoPor: string | null;
  documentoReceptor: string | null;
  fechaEntrega: string | null;
  entregadoPor: number | null;
  observacionesEntrega: string | null;
  conformidadCliente: boolean | null;
  createdAt: string;
  updatedAt: string | null;
  historial: HistorialEstadoDTO[];
}

export interface OtPageResumenDTO {
  total: number;
  abiertas: number;
  enProceso: number;
  cerradas: number;
}

export interface OtPageResponseDTO {
  content: OtResumenDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  resumen: OtPageResumenDTO;
}

export interface CrearOtRequestDTO {
  equipoClienteId: number;
  clienteId: number;
  sucursalId: number;
  tecnicoId?: number | null;
  descripcionProblema: string;
  prioridad?: string;
  observaciones?: string;
}

export interface ActualizarOtRequestDTO {
  prioridad?: string;
  descripcionProblema?: string;
  diagnostico?: string;
  trabajoRealizado?: string;
  observaciones?: string;
}

export interface ActualizarEstadoOtRequestDTO {
  estado: string;
  observacion?: string;
}

export interface OtConsumoLoteDTO {
  stockLoteId: number;
  cantidad: number;
}

export interface OtConsumoDevolucionLoteDTO {
  stockLoteId: number;
  cantidad: number;
}

export interface OtConsumoDevolucionDTO {
  id: number;
  consumoId: number;
  ordenTrabajoId: number;
  cantidadBase: number;
  motivo: string | null;
  registradoPor: number | null;
  registradoPorNombre: string | null;
  createdAt: string;
  lotes: OtConsumoDevolucionLoteDTO[];
}

export interface OtConsumoClasificacionDTO {
  id: number;
  consumoId: number;
  ordenTrabajoId: number;
  clasificacion: 'INSTALADO' | 'RECUPERABLE' | 'DAÑADO' | 'PERDIDO';
  cantidad: number;
  notas: string | null;
  registradoPor: number | null;
  registradoPorNombre: string | null;
  createdAt: string;
}

export interface OtConsumoMaterialDTO {
  id: number;
  ordenTrabajoId: number;
  productoId: number;
  presentacionId: number | null;
  factorPresentacion: number;
  cantidadPresentacion: number;
  cantidadBase: number;
  precioUnitario: number | null;
  notas: string | null;
  registradoPor: number | null;
  createdAt: string;
  lotes: OtConsumoLoteDTO[];
  productoNombre: string | null;
  presentacionNombre: string | null;
  registradoPorNombre: string | null;
  // Fase 2B
  productoTipo: string | null;
  cantidadDevuelta: number;
  cantidadClasificada: number;
  devoluciones: OtConsumoDevolucionDTO[];
  clasificaciones: OtConsumoClasificacionDTO[];
}

export interface RegistrarDevolucionOtRequestDTO {
  cantidadBase: number;
  motivo?: string;
}

export interface RegistrarClasificacionOtRequestDTO {
  clasificacion: 'INSTALADO' | 'RECUPERABLE' | 'DAÑADO' | 'PERDIDO';
  cantidad: number;
  notas?: string;
}

export interface CierreTecnicoOtRequestDTO {
  diagnosticoFinal: string;
  solucionAplicada: string;
  observaciones?: string;
}

export interface RegistrarConsumoOtRequestDTO {
  productoId: number;
  presentacionId?: number | null;
  cantidadPresentacion: number;
  precioUnitario?: number | null;
  notas?: string;
}

export interface FacturarOtRequestDTO {
  vendedorId: number;
  metodoPago: string;
  cajaId?: number | null;
  montoManoObra?: number | null;
}

export interface EntregarOtRequestDTO {
  recibidoPor: string;
  documentoReceptor?: string;
  conformidadCliente: boolean;
  observaciones?: string;
}

// ── Servicio ──────────────────────────────────────────────────────────────────

export const ordenTrabajoService = {
  async listar(params: {
    page?: number;
    size?: number;
    estado?: string;
    equipoClienteId?: number | null;
    clienteId?: number | null;
    search?: string;
  }): Promise<OtPageResponseDTO> {
    const p: Record<string, unknown> = {
      page: params.page ?? 0,
      size: params.size ?? 20,
    };
    if (params.estado) p.estado = params.estado;
    if (params.equipoClienteId != null) p.equipoClienteId = params.equipoClienteId;
    if (params.clienteId != null) p.clienteId = params.clienteId;
    if (params.search) p.search = params.search;
    const { data } = await axiosInstance.get<OtPageResponseDTO>(
      API_ENDPOINTS.ORDENES_TRABAJO.LIST,
      { params: p }
    );
    return data;
  },

  async getById(id: number): Promise<OrdenTrabajoDTO> {
    const { data } = await axiosInstance.get<OrdenTrabajoDTO>(API_ENDPOINTS.ORDENES_TRABAJO.GET(id));
    return data;
  },

  async crear(dto: CrearOtRequestDTO): Promise<OrdenTrabajoDTO> {
    const { data } = await axiosInstance.post<OrdenTrabajoDTO>(API_ENDPOINTS.ORDENES_TRABAJO.CREATE, dto);
    return data;
  },

  async actualizar(id: number, dto: ActualizarOtRequestDTO): Promise<OrdenTrabajoDTO> {
    const { data } = await axiosInstance.put<OrdenTrabajoDTO>(API_ENDPOINTS.ORDENES_TRABAJO.UPDATE(id), dto);
    return data;
  },

  async cambiarEstado(id: number, dto: ActualizarEstadoOtRequestDTO): Promise<OrdenTrabajoDTO> {
    const { data } = await axiosInstance.patch<OrdenTrabajoDTO>(
      API_ENDPOINTS.ORDENES_TRABAJO.CAMBIAR_ESTADO(id),
      dto
    );
    return data;
  },

  async getConsumos(id: number): Promise<OtConsumoMaterialDTO[]> {
    const { data } = await axiosInstance.get<OtConsumoMaterialDTO[]>(
      API_ENDPOINTS.ORDENES_TRABAJO.CONSUMOS(id)
    );
    return data;
  },

  async registrarConsumo(id: number, dto: RegistrarConsumoOtRequestDTO): Promise<OtConsumoMaterialDTO> {
    const { data } = await axiosInstance.post<OtConsumoMaterialDTO>(
      API_ENDPOINTS.ORDENES_TRABAJO.CONSUMOS(id),
      dto
    );
    return data;
  },

  async getDevoluciones(otId: number, consumoId: number): Promise<OtConsumoDevolucionDTO[]> {
    const { data } = await axiosInstance.get<OtConsumoDevolucionDTO[]>(
      API_ENDPOINTS.ORDENES_TRABAJO.DEVOLUCIONES(otId, consumoId)
    );
    return data;
  },

  async registrarDevolucion(
    otId: number,
    consumoId: number,
    dto: RegistrarDevolucionOtRequestDTO
  ): Promise<OtConsumoDevolucionDTO> {
    const { data } = await axiosInstance.post<OtConsumoDevolucionDTO>(
      API_ENDPOINTS.ORDENES_TRABAJO.DEVOLUCIONES(otId, consumoId),
      dto
    );
    return data;
  },

  async getClasificaciones(otId: number, consumoId: number): Promise<OtConsumoClasificacionDTO[]> {
    const { data } = await axiosInstance.get<OtConsumoClasificacionDTO[]>(
      API_ENDPOINTS.ORDENES_TRABAJO.CLASIFICACIONES(otId, consumoId)
    );
    return data;
  },

  async registrarClasificacion(
    otId: number,
    consumoId: number,
    dto: RegistrarClasificacionOtRequestDTO
  ): Promise<OtConsumoClasificacionDTO> {
    const { data } = await axiosInstance.post<OtConsumoClasificacionDTO>(
      API_ENDPOINTS.ORDENES_TRABAJO.CLASIFICACIONES(otId, consumoId),
      dto
    );
    return data;
  },

  async cierreTecnico(id: number, dto: CierreTecnicoOtRequestDTO): Promise<OrdenTrabajoDTO> {
    const { data } = await axiosInstance.post<OrdenTrabajoDTO>(
      API_ENDPOINTS.ORDENES_TRABAJO.CIERRE_TECNICO(id),
      dto
    );
    return data;
  },

  async facturar(id: number, dto: FacturarOtRequestDTO): Promise<OrdenTrabajoDTO> {
    const { data } = await axiosInstance.post<OrdenTrabajoDTO>(
      API_ENDPOINTS.ORDENES_TRABAJO.FACTURAR(id),
      dto
    );
    return data;
  },

  async entregar(id: number, dto: EntregarOtRequestDTO): Promise<OrdenTrabajoDTO> {
    const { data } = await axiosInstance.post<OrdenTrabajoDTO>(
      API_ENDPOINTS.ORDENES_TRABAJO.ENTREGA(id),
      dto
    );
    return data;
  },

  async anularFactura(id: number): Promise<OrdenTrabajoDTO> {
    const { data } = await axiosInstance.post<OrdenTrabajoDTO>(
      API_ENDPOINTS.ORDENES_TRABAJO.ANULAR_FACTURA(id)
    );
    return data;
  },
};
