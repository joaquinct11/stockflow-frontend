import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, CheckCircle, XCircle, FileDown, RefreshCw, Package, Truck, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { guiaRemisionService } from '../../services/guiaRemision.service';
import type { GuiaRemisionResponse } from '../../types/gre.types';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import {
  EstadoTributarioBadge,
  EstadoLogisticoBadge,
  tipoTrasladoLabel,
  modalidadLabel,
  triggerPdfDownload,
} from './gre.helpers';
import { Button } from '../../components/ui/Button';

interface Props {
  guia: GuiaRemisionResponse | null;
  loading: boolean;
  canEmitir: boolean;
  canConfirmar: boolean;
  canCancelar: boolean;
  canEditar: boolean;
  canEliminar: boolean;
  onClose: () => void;
  onUpdate: (updated: GuiaRemisionResponse) => void;
  onDelete: (id: number) => void;
  onEdit: (guia: GuiaRemisionResponse) => void;
}

export function GuiaRemisionDetail({
  guia, loading,
  canEmitir, canConfirmar, canCancelar,
  canEditar, canEliminar,
  onClose, onUpdate, onDelete, onEdit,
}: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handle = async (action: string, fn: () => Promise<GuiaRemisionResponse>) => {
    setActionLoading(action);
    try {
      const updated = await fn();
      onUpdate(updated);
      toast.success(action === 'emitir' ? 'Guía emitida correctamente' :
        action === 'confirmar' ? 'Recepción confirmada' :
        'Guía cancelada');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la acción';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!guia) return;
    setActionLoading('delete');
    try {
      await guiaRemisionService.eliminar(guia.id);
      toast.success('Guía eliminada');
      onDelete(guia.id);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la guía');
    } finally {
      setActionLoading(null);
      setConfirmDelete(false);
    }
  };

  const handleDownload = async () => {
    if (!guia) return;
    setActionLoading('pdf');
    try {
      const blob = await guiaRemisionService.downloadPdf(guia.id);
      triggerPdfDownload(blob, `GRE-${guia.numeroCompleto}.pdf`);
    } catch {
      toast.error('Error al descargar PDF');
    } finally {
      setActionLoading(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex justify-end" aria-modal="true">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-card shadow-[−30px_0_60px_rgba(0,0,0,.18)] flex flex-col h-full overflow-hidden border-l border-border"
        style={{ animation: 'slideInRight .22s cubic-bezier(.16,1,.3,1)' }}>
        <style>{`@keyframes slideInRight { from { transform:translateX(24px); opacity:0; } to { transform:none; opacity:1; } }`}</style>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <span className="w-9 h-9 flex-shrink-0 grid place-items-center rounded-[10px] bg-primary/10 text-primary mt-0.5">
            <Truck className="w-[17px] h-[17px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[1rem] text-foreground leading-none">
                {guia ? guia.numeroCompleto : 'Detalle'}
              </span>
              {guia && (
                <>
                  <EstadoTributarioBadge estado={guia.estadoTributario} />
                  <EstadoLogisticoBadge estado={guia.estadoLogistico} />
                </>
              )}
            </div>
            {guia && (
              <p className="text-[.75rem] text-muted-foreground mt-1">
                {tipoTrasladoLabel(guia.tipoTraslado)} · {guia.fechaTraslado}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex-shrink-0 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}

          {!loading && !guia && (
            <p className="text-center text-muted-foreground py-12">No se pudo cargar el detalle.</p>
          )}

          {!loading && guia && (
            <>
              {/* Info general */}
              <Section title="General">
                <Row label="Tipo de traslado" value={tipoTrasladoLabel(guia.tipoTraslado)} />
                <Row label="Modalidad" value={modalidadLabel(guia.modalidadTransporte)} />
                <Row label="Fecha traslado" value={guia.fechaTraslado} />
                {guia.motivoTrasladoCodigo && (
                  <Row label="Motivo" value={`${guia.motivoTrasladoCodigo}${guia.motivoTrasladoDescripcion ? ' — ' + guia.motivoTrasladoDescripcion : ''}`} />
                )}
                {guia.observaciones && <Row label="Observaciones" value={guia.observaciones} />}
              </Section>

              {/* Destinatario / Sucursales */}
              {guia.tipoTraslado === 'DELIVERY' ? (
                <Section title="Destinatario">
                  {guia.destinatarioTipoDoc && <Row label="Tipo doc." value={guia.destinatarioTipoDoc} />}
                  {guia.destinatarioNumDoc && <Row label="N° doc." value={guia.destinatarioNumDoc} />}
                  {guia.destinatarioRazonSocial && <Row label="Razón social" value={guia.destinatarioRazonSocial} />}
                  {guia.destinatarioDireccion && <Row label="Dirección" value={guia.destinatarioDireccion} />}
                  {guia.ventaId && <Row label="Venta #" value={String(guia.ventaId)} />}
                </Section>
              ) : (
                <Section title="Sucursales">
                  {guia.sucursalOrigenNombre && <Row label="Origen" value={guia.sucursalOrigenNombre} />}
                  {guia.sucursalDestinoNombre && <Row label="Destino" value={guia.sucursalDestinoNombre} />}
                </Section>
              )}

              {/* Items */}
              {guia.items && guia.items.length > 0 && (
                <Section title={`Items (${guia.items.length})`}>
                  <div className="space-y-2">
                    {guia.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-foreground">{item.descripcion ?? `Producto #${item.productoId}`}</span>
                          <span className="text-muted-foreground ml-2">
                            {Number(item.cantidad).toLocaleString('es-PE')} {item.unidadMedida ?? 'NIU'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Transporte */}
              {guia.transporte && (
                <Section title="Transporte">
                  <Row label="Dirección partida" value={guia.transporte.direccionPartida} />
                  <Row label="Dirección llegada" value={guia.transporte.direccionLlegada} />
                  {guia.transporte.vehiculoPlaca && <Row label="Placa" value={guia.transporte.vehiculoPlaca} />}
                  {guia.transporte.conductorNombres && (
                    <Row label="Conductor" value={`${guia.transporte.conductorNombres} ${guia.transporte.conductorApellidos ?? ''}`} />
                  )}
                  {guia.transporte.transportistaRuc && (
                    <Row label="Transportista RUC" value={guia.transporte.transportistaRuc} />
                  )}
                  {guia.transporte.transportistaDenominacion && (
                    <Row label="Transportista" value={guia.transporte.transportistaDenominacion} />
                  )}
                </Section>
              )}

              {/* Info Lucode */}
              {(guia.lucodeHash || guia.xmlUrl) && (
                <Section title="Comprobante electrónico">
                  {guia.lucodeHash && <Row label="Hash" value={guia.lucodeHash} mono />}
                  {guia.xmlUrl && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-muted-foreground">XML</span>
                      <a href={guia.xmlUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline">Ver XML</a>
                    </div>
                  )}
                  {guia.cdrUrl && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-muted-foreground">CDR</span>
                      <a href={guia.cdrUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline">Ver CDR</a>
                    </div>
                  )}
                </Section>
              )}
            </>
          )}
        </div>

        {/* Footer — acciones */}
        {!loading && guia && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-border flex flex-wrap gap-2 bg-card">
            {/* Emitir */}
            {canEmitir && guia.estadoTributario === 'BORRADOR' && (
              <Button
                onClick={() => handle('emitir', () => guiaRemisionService.emitir(guia.id))}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5"
              >
                {actionLoading === 'emitir'
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
                Emitir GRE
              </Button>
            )}

            {/* Re-emitir en ERROR */}
            {canEmitir && guia.estadoTributario === 'ERROR' && (
              <Button
                onClick={() => handle('emitir', () => guiaRemisionService.emitir(guia.id))}
                disabled={actionLoading !== null}
                variant="secondary"
                className="flex items-center gap-1.5"
              >
                {actionLoading === 'emitir'
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                Re-intentar
              </Button>
            )}

            {/* Confirmar recepción */}
            {canConfirmar && guia.estadoTributario === 'EMITIDA' && guia.estadoLogistico === 'EN_TRANSITO' && (
              <Button
                onClick={() => handle('confirmar', () => guiaRemisionService.confirmarRecepcion(guia.id))}
                disabled={actionLoading !== null}
                variant="secondary"
                className="flex items-center gap-1.5"
              >
                {actionLoading === 'confirmar'
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />}
                Confirmar recepción
              </Button>
            )}

            {/* Editar borrador */}
            {canEditar && (guia.estadoTributario === 'BORRADOR' || guia.estadoTributario === 'ERROR') && (
              <Button
                onClick={() => onEdit(guia)}
                disabled={actionLoading !== null}
                variant="secondary"
                className="flex items-center gap-1.5"
              >
                <Pencil className="w-4 h-4" />
                Editar
              </Button>
            )}

            {/* Cancelar borrador */}
            {canCancelar && guia.estadoTributario === 'BORRADOR' && (
              <Button
                onClick={() => handle('cancelar', () => guiaRemisionService.cancelar(guia.id))}
                disabled={actionLoading !== null}
                variant="destructive"
                className="flex items-center gap-1.5"
              >
                {actionLoading === 'cancelar'
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <XCircle className="w-4 h-4" />}
                Cancelar
              </Button>
            )}

            {/* Eliminar borrador */}
            {canEliminar && (guia.estadoTributario === 'BORRADOR' || guia.estadoTributario === 'ERROR') && (
              <Button
                onClick={() => setConfirmDelete(true)}
                disabled={actionLoading !== null}
                variant="destructive"
                className="flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </Button>
            )}

            {/* Descargar PDF */}
            {guia.estadoTributario === 'EMITIDA' && (
              <Button
                onClick={handleDownload}
                disabled={actionLoading !== null}
                variant="secondary"
                className="flex items-center gap-1.5"
              >
                {actionLoading === 'pdf'
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <FileDown className="w-4 h-4" />}
                Descargar PDF
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Confirmación de eliminación — mismo patrón que Ventas */}
      <ConfirmDialog
        isOpen={confirmDelete}
        type="danger"
        title="Eliminar guía de remisión"
        description={guia ? `¿Estás seguro de que deseas eliminar la guía ${guia.numeroCompleto}? Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar guía"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>,
    document.body
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-2">{title}</h3>
      <div className="bg-card border border-border rounded-[14px] px-4 py-3 space-y-1 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`text-right text-foreground break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
