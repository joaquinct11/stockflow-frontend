export type TipoTrasladoGRE = 'SUCURSALES' | 'DELIVERY';
export type ModalidadTransporteGRE = 'PUBLICO' | 'PRIVADO';
export type EstadoTributarioGRE = 'BORRADOR' | 'EMITIENDO' | 'EMITIDA' | 'ERROR' | 'CANCELADA';
export type EstadoLogisticoGRE = 'PENDIENTE' | 'EN_TRANSITO' | 'RECIBIDA' | 'CANCELADA';

export interface GuiaRemisionItemDTO {
  productoId: number;
  descripcion?: string;
  cantidad: number;
  unidadMedida?: string;
  presentacionId?: number;
  /** F-23: ID de la variante seleccionada (talla/color). Nullable para productos sin variantes. */
  varianteId?: number;
}

/** F-23: Variante de producto con stock en la sucursal de origen. */
export interface VarianteConStockDTO {
  id: number;
  talla?: string;
  color?: string;
  sku?: string;
  stockEnSucursal: number;
}

export interface TransporteDTO {
  direccionPartida: string;
  ubigeoPartida?: string;
  direccionLlegada: string;
  ubigeoLlegada?: string;
  // Transporte PRIVADO
  vehiculoPlaca?: string;
  conductorTipoDoc?: string;
  conductorNumDoc?: string;
  conductorNombres?: string;
  conductorApellidos?: string;
  conductorLicencia?: string;
  fechaInicioTraslado?: string;
  // Transporte PÚBLICO
  transportistaRuc?: string;
  transportistaDenominacion?: string;
  transportistaNroRegistroMtc?: string;
  transportistaNroAutorizacion?: string;
  transportistaCodigoEntidadAutorizadora?: string;
  fechaEntregaTransportista?: string;
}

export interface GuiaRemisionListItem {
  id: number;
  numeroCompleto: string;
  tipoTraslado: TipoTrasladoGRE;
  modalidadTransporte: ModalidadTransporteGRE;
  fechaTraslado: string;
  sucursalOrigenNombre?: string;
  sucursalDestinoNombre?: string;
  destinatarioRazonSocial?: string;
  estadoTributario: EstadoTributarioGRE;
  estadoLogistico: EstadoLogisticoGRE;
  ventaId?: number;
  pdfUrl?: string;
  createdAt: string;
}

export interface GuiaRemisionResponse {
  id: number;
  tenantId: string;
  serie: string;
  correlativo: number;
  numeroCompleto: string;
  tipoTraslado: TipoTrasladoGRE;
  motivoTrasladoCodigo: string;
  motivoTrasladoDescripcion?: string;
  modalidadTransporte: ModalidadTransporteGRE;
  fechaTraslado: string;
  pesoBrutoTotal?: number;
  unidadMedidaPeso?: string;
  numeroBultos?: number;
  observaciones?: string;
  sucursalOrigenId?: number;
  sucursalOrigenNombre?: string;
  sucursalDestinoId?: number;
  sucursalDestinoNombre?: string;
  destinatarioTipoDoc?: string;
  destinatarioNumDoc?: string;
  destinatarioRazonSocial?: string;
  destinatarioDireccion?: string;
  ventaId?: number;
  estadoTributario: EstadoTributarioGRE;
  estadoLogistico: EstadoLogisticoGRE;
  lucodeId?: string;
  lucodeHash?: string;
  xmlUrl?: string;
  cdrUrl?: string;
  pdfUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  items: GuiaRemisionItemDTO[];
  transporte?: TransporteDTO;
}

export interface CrearGuiaRemisionRequest {
  tipoTraslado: TipoTrasladoGRE;
  motivoTrasladoCodigo?: string;
  motivoTrasladoDescripcion?: string;
  modalidadTransporte: ModalidadTransporteGRE;
  fechaTraslado: string;
  pesoBrutoTotal?: number;
  unidadMedidaPeso?: string;
  numeroBultos?: number;
  observaciones?: string;
  sucursalOrigenId?: number;
  sucursalDestinoId?: number;
  destinatarioTipoDoc?: string;
  destinatarioNumDoc?: string;
  destinatarioRazonSocial?: string;
  destinatarioDireccion?: string;
  ventaId?: number;
  items: GuiaRemisionItemDTO[];
  transporte: TransporteDTO;
  idempotencyKey?: string;
}

export interface EditarBorradorRequest {
  motivoTrasladoCodigo?: string;
  motivoTrasladoDescripcion?: string;
  modalidadTransporte: ModalidadTransporteGRE;
  fechaTraslado: string;
  pesoBrutoTotal?: number;
  unidadMedidaPeso?: string;
  numeroBultos?: number;
  observaciones?: string;
  sucursalOrigenId?: number;
  destinatarioTipoDoc?: string;
  destinatarioNumDoc?: string;
  destinatarioRazonSocial?: string;
  destinatarioDireccion?: string;
  items: GuiaRemisionItemDTO[];
  transporte: TransporteDTO;
}

export interface ConfirmarRecepcionRequest {
  observaciones?: string;
}
