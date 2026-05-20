import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RotateCcw, CheckCircle2, FileText, Tag, Calendar, Copy, Loader2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { VentaDTO, CrearDevolucionDTO, DevolucionDetalleItemDTO, DevolucionDTO } from '../../types';
import { devolucionService } from '../../services/devolucion.service';

interface DevolucionModalProps {
  venta: VentaDTO;
  onSuccess: () => void;
  onClose: () => void;
}

const MOTIVOS = [
  'Producto defectuoso',
  'Error en pedido',
  'Cambio de producto',
  'Otro',
];

export function DevolucionModal({ venta, onSuccess, onClose }: DevolucionModalProps) {
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [observaciones, setObservaciones] = useState('');
  const [reponerStock, setReponerStock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<DevolucionDTO | null>(null);

  // Cantidades ya devueltas por productoId (de devoluciones anteriores)
  const [yaDevuelto, setYaDevuelto] = useState<Record<number, number>>({});
  const [loadingDev, setLoadingDev] = useState(true);

  // Cantidades a devolver en ESTA devolución
  const [cantidades, setCantidades] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    for (const d of venta.detalles) init[d.productoId] = 0;
    return init;
  });

  // Cargar devoluciones previas para calcular disponible real
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

  // disponible[productoId] = cantidad original - ya devuelto
  const disponible = (productoId: number, original: number) =>
    Math.max(0, original - (yaDevuelto[productoId] ?? 0));

  const handleCantidadChange = (productoId: number, value: number, max: number) => {
    setCantidades(prev => ({ ...prev, [productoId]: Math.max(0, Math.min(value, max)) }));
  };

  const totalDevuelto = venta.detalles.reduce((sum, d) => {
    const qty = cantidades[d.productoId] ?? 0;
    return sum + qty * d.precioUnitario;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const detalles: DevolucionDetalleItemDTO[] = venta.detalles
      .filter(d => (cantidades[d.productoId] ?? 0) > 0)
      .map(d => ({
        productoId: d.productoId,
        cantidadDevuelta: cantidades[d.productoId],
        precioUnitario: d.precioUnitario,
      }));

    if (detalles.length === 0) {
      toast.error('Debes devolver al menos un producto (cantidad > 0)');
      return;
    }

    const dto: CrearDevolucionDTO = {
      ventaId: venta.id!,
      motivo,
      observaciones: observaciones.trim() || undefined,
      reponerStock,
      detalles,
    };

    try {
      setSubmitting(true);
      const resp = await devolucionService.crear(dto);
      toast.success('Devolución registrada exitosamente');
      onSuccess();
      setResultado(resp);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; mensaje?: string } } };
      const msg =
        err?.response?.data?.mensaje ||
        err?.response?.data?.message ||
        'Error al registrar la devolución';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Pantalla de éxito con datos de la Nota de Crédito ──────────────────
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

    return (
      <Dialog isOpen={true} onClose={onClose} title="Devolución registrada" size="md">
        <div className="space-y-5 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              Devolución #{resultado.id} — Venta #{resultado.ventaId}
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              S/.{resultado.totalDevuelto.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">total devuelto</p>
          </div>

          {resultado.notaCreditoCodigo && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Nota de Crédito generada</span>
              </div>

              <div className="flex items-center justify-between bg-background rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono font-bold text-lg tracking-wider">
                    {resultado.notaCreditoCodigo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copiarCodigo}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Copiar código"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-background border px-3 py-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Monto a favor</p>
                  <p className="font-bold text-green-600 dark:text-green-400">
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

              <p className="text-xs text-muted-foreground">
                Entrega este código al cliente para que lo canje en su próxima compra.
              </p>
            </div>
          )}

          <Button className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </Dialog>
    );
  }

  // ── Formulario de devolución ────────────────────────────────────────────
  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Registrar Devolución"
      size="lg"
    >
      {/* descripción dentro del form para evitar choque con el header */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-muted-foreground -mt-2">
          Venta #{venta.id} — Total original: S/.{venta.total.toFixed(2)}
        </p>

        {loadingDev ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando devoluciones previas...
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Producto</th>
                  <th className="text-center px-3 py-2 font-medium">Vendido</th>
                  <th className="text-center px-3 py-2 font-medium">Ya devuelto</th>
                  <th className="text-center px-3 py-2 font-medium">Disponible</th>
                  <th className="text-center px-3 py-2 font-medium">A devolver</th>
                  <th className="text-right px-3 py-2 font-medium">Precio unit.</th>
                </tr>
              </thead>
              <tbody>
                {venta.detalles.map((d) => {
                  const disp = disponible(d.productoId, d.cantidad);
                  const prevDevuelto = yaDevuelto[d.productoId] ?? 0;
                  return (
                    <tr key={d.productoId} className={`border-t ${disp === 0 ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2 font-medium">
                        {d.productoNombre || `Producto #${d.productoId}`}
                        {disp === 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">(ya devuelto)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {d.cantidad}
                      </td>
                      <td className="px-3 py-2 text-center text-amber-600 dark:text-amber-400 font-medium">
                        {prevDevuelto > 0 ? prevDevuelto : '—'}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">
                        {disp}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Input
                          type="number"
                          min={0}
                          max={disp}
                          disabled={disp === 0}
                          value={cantidades[d.productoId] ?? 0}
                          onChange={(e) =>
                            handleCantidadChange(d.productoId, parseInt(e.target.value) || 0, disp)
                          }
                          className="w-20 text-center mx-auto"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        S/.{d.precioUnitario.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Total preview */}
        <div className="flex justify-between items-center bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
          <span className="font-medium text-sm">Total a devolver:</span>
          <span className="text-xl font-bold text-primary">S/.{totalDevuelto.toFixed(2)}</span>
        </div>

        {/* Motivo */}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Motivo <span className="text-destructive">*</span>
          </label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Observaciones */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Observaciones (opcional)</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Detalles adicionales sobre la devolución..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        {/* Reponer stock */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reponerStock}
            onChange={(e) => setReponerStock(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm font-medium">Reponer stock al inventario</span>
        </label>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || loadingDev} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {submitting ? 'Registrando...' : 'Registrar devolución'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
