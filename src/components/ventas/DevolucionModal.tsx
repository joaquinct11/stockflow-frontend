import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Copy, FileText, Tag, Calendar, Loader2, CheckCircle2, X, RotateCcw } from 'lucide-react';
import type { VentaDTO, CrearDevolucionDTO, DevolucionDetalleItemDTO, DevolucionDTO } from '../../types';
import { devolucionService } from '../../services/devolucion.service';
import { Button } from '../ui/Button';

interface DevolucionModalProps {
  venta: VentaDTO;
  onSuccess: () => void;
  onClose: () => void;
}

const MOTIVOS = [
  'Producto defectuoso',
  'Producto vencido',
  'Error en la venta',
  'Cliente se arrepintió',
  'Otro',
];

export function DevolucionModal({ venta, onSuccess, onClose }: DevolucionModalProps) {
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<DevolucionDTO | null>(null);
  const [yaDevuelto, setYaDevuelto] = useState<Record<number, number>>({});
  const [loadingDev, setLoadingDev] = useState(true);
  const [cantidades, setCantidades] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    for (const d of venta.detalles) init[d.productoId] = 0;
    return init;
  });

  useEffect(() => {
    devolucionService.getByVenta(venta.id!)
      .then(devs => {
        const acum: Record<number, number> = {};
        for (const dev of devs) {
          for (const det of dev.detalles) {
            acum[det.productoId] = (acum[det.productoId] ?? 0) + det.cantidadDevuelta;
          }
        }
        setYaDevuelto(acum);
      })
      .catch(() => {})
      .finally(() => setLoadingDev(false));
  }, [venta.id]);

  const disponible = (productoId: number, original: number) =>
    Math.max(0, original - (yaDevuelto[productoId] ?? 0));

  const handleDevolverTodo = () => {
    const todo: Record<number, number> = {};
    for (const d of venta.detalles) {
      todo[d.productoId] = disponible(d.productoId, d.cantidad);
    }
    setCantidades(todo);
  };

  const totalDevuelto = venta.detalles.reduce((sum, d) => {
    return sum + (cantidades[d.productoId] ?? 0) * d.precioUnitario;
  }, 0);

  const unidadesTotal = venta.detalles.reduce((sum, d) => sum + (cantidades[d.productoId] ?? 0), 0);

  const sinDisponible = venta.detalles.every(
    d => disponible(d.productoId, d.cantidad) === 0
  );

  const handleSubmit = async () => {
    const detalles: DevolucionDetalleItemDTO[] = venta.detalles
      .filter(d => (cantidades[d.productoId] ?? 0) > 0)
      .map(d => ({
        productoId: d.productoId,
        cantidadDevuelta: cantidades[d.productoId],
        precioUnitario: d.precioUnitario,
      }));

    if (detalles.length === 0) {
      toast.error('Debes devolver al menos un producto');
      return;
    }
    if (!motivo) {
      toast.error('Selecciona un motivo');
      return;
    }

    const dto: CrearDevolucionDTO = {
      ventaId: venta.id!,
      motivo,
      observaciones: observaciones.trim() || undefined,
      reponerStock: true,
      detalles,
    };

    try {
      setSubmitting(true);
      const resp = await devolucionService.crear(dto);
      setResultado(resp);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; mensaje?: string } } };
      toast.error(err?.response?.data?.mensaje || err?.response?.data?.message || 'Error al registrar la devolución');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (resultado) {
    const fechaVence = resultado.fechaVencimientoNc
      ? new Date(resultado.fechaVencimientoNc).toLocaleDateString('es-PE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        })
      : null;

    const copiarCodigo = () => {
      if (resultado.notaCreditoCodigo) {
        navigator.clipboard.writeText(resultado.notaCreditoCodigo);
        toast.success('Código copiado');
      }
    };

    return createPortal(
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-5"
        style={{ background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)' }}
        onClick={() => { onSuccess(); onClose(); }}
      >
        <div
          className="w-full max-w-md flex flex-col bg-background border border-border rounded-[18px] shadow-[0_30px_80px_-30px_rgba(0,0,0,.55)] overflow-hidden"
          style={{ animation: 'dvModalIn .2s ease', maxHeight: 'calc(100vh - 40px)' }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`@keyframes dvModalIn{from{transform:scale(.97);opacity:0}to{transform:none;opacity:1}}`}</style>
          <div className="flex items-start gap-3 px-[22px] pt-5 pb-4 border-b border-border/50 flex-shrink-0">
            <span className="w-[38px] h-[38px] flex-shrink-0 grid place-items-center rounded-[11px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[1.08rem] font-bold tracking-[-0.02em]">Devolución registrada</h2>
              <div className="font-mono text-[.76rem] text-muted-foreground mt-1">
                Devolución #{resultado.id} · Venta #{resultado.ventaId}
              </div>
            </div>
            <button type="button" onClick={() => { onSuccess(); onClose(); }} className="w-[30px] h-[30px] flex-shrink-0 ml-auto grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-[22px] py-5 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                S/.{resultado.totalDevuelto.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">total devuelto · stock actualizado</p>
            </div>

            {resultado.notaCreditoCodigo && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Nota de Crédito generada</span>
                </div>
                <div className="flex items-center justify-between bg-background rounded-lg border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono font-bold text-lg tracking-wider">{resultado.notaCreditoCodigo}</span>
                  </div>
                  <button type="button" onClick={copiarCodigo} className="text-muted-foreground hover:text-foreground transition-colors" title="Copiar código">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-background border px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Monto a favor</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      S/.{resultado.montoNotaCredito?.toFixed(2) ?? resultado.totalDevuelto.toFixed(2)}
                    </p>
                  </div>
                  {fechaVence && (
                    <div className="rounded-lg bg-background border px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Válido hasta
                      </p>
                      <p className="font-semibold">{fechaVence}</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Entrega este código al cliente para que lo canje en su próxima compra.</p>
              </div>
            )}
          </div>

          <div className="px-[22px] py-[14px] border-t border-border/50 flex-shrink-0">
            <Button className="w-full" onClick={() => { onSuccess(); onClose(); }}>Cerrar</Button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Formulario de devolución ────────────────────────────────────────────
  const tieneComprobante = !!(venta as VentaDTO & { comprobanteNumero?: string }).comprobanteNumero;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5"
      style={{ background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] flex flex-col bg-background border border-border rounded-[18px] shadow-[0_30px_80px_-30px_rgba(0,0,0,.55)] overflow-hidden"
        style={{ animation: 'dvModalIn .2s ease', maxHeight: 'calc(100vh - 40px)' }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes dvModalIn{from{transform:scale(.97);opacity:0}to{transform:none;opacity:1}}`}</style>

        {/* Header */}
        <div className="flex items-start gap-3 px-[22px] pt-5 pb-4 border-b border-border/50 flex-shrink-0">
          <span className="w-[38px] h-[38px] flex-shrink-0 grid place-items-center rounded-[11px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <RotateCcw size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[1.08rem] font-bold tracking-[-0.02em]">Registrar devolución</h2>
            <div className="font-mono text-[.76rem] text-muted-foreground mt-1">
              Venta #{venta.id} · Total original S/.{venta.total.toFixed(2)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-[30px] h-[30px] flex-shrink-0 ml-auto grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollbox */}
        <div className="flex-1 min-h-0 overflow-y-auto px-[22px] py-[18px] space-y-4">
          {/* Productos */}
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">
              Productos a devolver
            </span>
            <button
              type="button"
              onClick={handleDevolverTodo}
              className="h-7 px-[10px] text-[.78rem] font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Devolver todo
            </button>
          </div>

          {loadingDev ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
            </div>
          ) : (
            <div className="space-y-2">
              {venta.detalles.map(d => {
                const disp = disponible(d.productoId, d.cantidad);
                const ya = yaDevuelto[d.productoId] ?? 0;
                const q = cantidades[d.productoId] ?? 0;
                const selected = q > 0;
                return (
                  <div
                    key={d.productoId}
                    className={`flex flex-wrap items-center gap-3 px-[14px] py-3 rounded-xl border transition-all ${
                      selected
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-card border-border'
                    } ${disp === 0 ? 'opacity-50' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[.88rem] font-semibold leading-tight">
                        {d.productoNombre || `Producto #${d.productoId}`}
                      </div>
                      <div className="font-mono text-[.72rem] text-muted-foreground mt-1">
                        Vendido {d.cantidad} · Devuelto {ya} · Disponible {disp}
                        {d.precioUnitario > 0 ? ` · S/.${d.precioUnitario.toFixed(2)} c/u` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                      <div className="inline-flex items-center border border-border rounded-[10px] bg-background">
                        <button
                          type="button"
                          disabled={q <= 0}
                          onClick={() => setCantidades(prev => ({ ...prev, [d.productoId]: Math.max(0, (prev[d.productoId] ?? 0) - 1) }))}
                          className="w-[34px] h-[34px] grid place-items-center text-foreground disabled:text-muted-foreground disabled:opacity-40 hover:enabled:bg-muted rounded-[9px] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>
                        </button>
                        <span className={`min-w-[28px] text-center font-mono text-[.9rem] font-bold ${selected ? 'text-primary' : 'text-foreground'}`}>
                          {q}
                        </span>
                        <button
                          type="button"
                          disabled={q >= disp}
                          onClick={() => setCantidades(prev => ({ ...prev, [d.productoId]: Math.min(disp, (prev[d.productoId] ?? 0) + 1) }))}
                          className="w-[34px] h-[34px] grid place-items-center text-foreground disabled:text-muted-foreground disabled:opacity-40 hover:enabled:bg-muted rounded-[9px] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                        </button>
                      </div>
                      <div className="min-w-[72px] text-right font-mono text-[.85rem] font-semibold tabular-nums">
                        {q > 0 ? `S/.${(q * d.precioUnitario).toFixed(2)}` : '—'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {sinDisponible && (
                <div className="px-3 py-[11px] rounded-[10px] text-[.82rem] text-muted-foreground bg-muted">
                  Todos los productos de esta venta ya fueron devueltos.
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between gap-3 px-4 py-[15px] rounded-xl bg-primary/5 border border-primary/20">
            <div>
              <div className="text-[.86rem] font-semibold">Total a devolver</div>
              <div className="text-[.76rem] text-muted-foreground mt-0.5">
                {unidadesTotal === 1 ? '1 unidad' : `${unidadesTotal} unidades`}
              </div>
            </div>
            <div className="text-[1.45rem] font-bold tracking-tight text-primary tabular-nums">
              S/.{totalDevuelto.toFixed(2)}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1 text-[.78rem] text-muted-foreground leading-relaxed">
            <div>El stock devuelto regresa al inventario automáticamente.</div>
            {tieneComprobante && (
              <div>Se emitirá una nota de crédito sobre el comprobante.</div>
            )}
          </div>

          {/* Motivos */}
          <div>
            <div className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[9px]">
              Motivo <span className="text-destructive">*</span>
            </div>
            <div className="flex flex-wrap gap-[7px]">
              {MOTIVOS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className={`h-8 px-[13px] text-[.81rem] font-semibold rounded-[9px] whitespace-nowrap border transition-all ${
                    motivo === m
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-[.8rem] font-semibold text-muted-foreground mb-1.5">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Opcional · estado del producto, acuerdo con el cliente…"
              className="w-full px-[13px] py-[11px] font-sans text-[.875rem] leading-relaxed text-foreground bg-background border border-border rounded-[10px] outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-[9px] px-[22px] py-[14px] border-t border-border/50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-none min-w-[110px] h-11 px-[18px] text-[.9rem] font-semibold text-muted-foreground bg-background border border-border rounded-[11px] hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting || unidadesTotal === 0 || !motivo || loadingDev}
            onClick={handleSubmit}
            className="flex-1 h-11 flex items-center justify-center gap-2 text-[.9rem] font-semibold text-white bg-primary border-0 rounded-[11px] shadow-[0_8px_20px_-10px_var(--primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:brightness-105 transition-all"
          >
            <RotateCcw size={16} className={submitting ? 'animate-spin' : ''} />
            {submitting ? 'Registrando…' : 'Registrar devolución'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
