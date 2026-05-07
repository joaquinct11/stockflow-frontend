import { useEffect, useState } from 'react';
import { cajaService } from '../../services/caja.service';
import type { CajaDTO, CerrarCajaDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Input } from '../../components/ui/Input';
import {
  Wallet, TrendingUp, Banknote, CreditCard, Smartphone,
  Lock, CheckCircle, Clock, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return '-';
  return `S/. ${v.toFixed(2)}`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '-';
  return new Date(s).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function CajaPage() {

  const [cajas, setCajas] = useState<CajaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaja, setSelectedCaja] = useState<CajaDTO | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCerrarOpen, setIsCerrarOpen] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [cerrarForm, setCerrarForm] = useState<CerrarCajaDTO>({ montoContado: 0, observaciones: '' });

  useEffect(() => {
    fetchCajas();
  }, []);

  const fetchCajas = async () => {
    try {
      setLoading(true);
      const data = await cajaService.getAll();
      // Todos ven el historial completo del tenant (es la caja del negocio, no personal)
      setCajas(data);
    } catch {
      toast.error('Error al cargar el historial de caja');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (caja: CajaDTO) => {
    setSelectedCaja(caja);
    setIsDetailOpen(true);
  };

  const handleAbrirCerrar = (caja: CajaDTO) => {
    setSelectedCaja(caja);
    setCerrarForm({ montoContado: 0, observaciones: '' });
    setIsCerrarOpen(true);
  };

  const handleCerrarCaja = async () => {
    if (!selectedCaja) return;
    if (cerrarForm.montoContado < 0) {
      toast.error('El monto contado no puede ser negativo');
      return;
    }
    try {
      setCerrando(true);
      await cajaService.cerrar(selectedCaja.id, cerrarForm);
      toast.success('Caja cerrada correctamente');
      setIsCerrarOpen(false);
      await fetchCajas();
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || 'Error al cerrar la caja');
    } finally {
      setCerrando(false);
    }
  };

  const cajasAbiertas = cajas.filter(c => c.estado === 'ABIERTA');
  const totalIngresosHoy = cajas
    .filter(c => {
      if (!c.fechaApertura) return false;
      const hoy = new Date().toDateString();
      return new Date(c.fechaApertura).toDateString() === hoy;
    })
    .reduce((sum, c) => sum + (c.totalIngresos ?? 0), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cuadre de Caja</h1>
        <p className="text-muted-foreground">Historial de aperturas y cierres de caja</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cajas abiertas</p>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="text-amber-600" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-3xl font-bold ${cajasAbiertas.length > 0 ? 'text-amber-600' : ''}`}>
              {cajasAbiertas.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes de cierre</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingresos hoy</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="text-emerald-600" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{formatCurrency(totalIngresosHoy)}</div>
            <p className="text-xs text-muted-foreground mt-1">De todas las cajas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total historial</p>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Wallet className="text-blue-600" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{cajas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Sesiones de caja</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Historial de Cajas</CardTitle>
          <CardDescription>{cajas.length} sesión(es) registrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {cajas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No hay cajas registradas</p>
              <p className="text-sm">Las cajas se crean al abrir el Punto de Venta</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cajero</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead>Cierre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Apertura</TableHead>
                    <TableHead className="text-right">Efectivo</TableHead>
                    <TableHead className="text-right">Tarjeta</TableHead>
                    <TableHead className="text-right">Yape/Plin</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cajas.map((caja) => {
                    const diff = caja.diferencia;
                    const diffColor = diff == null ? '' : diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground';
                    return (
                      <TableRow key={caja.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{caja.usuarioNombre}</p>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(caja.fechaApertura)}</TableCell>
                        <TableCell className="text-sm">{formatDate(caja.fechaCierre)}</TableCell>
                        <TableCell>
                          <Badge variant={caja.estado === 'ABIERTA' ? 'warning' : 'success'}>
                            {caja.estado === 'ABIERTA'
                              ? <Clock size={12} className="inline mr-1" />
                              : <CheckCircle size={12} className="inline mr-1" />}
                            {caja.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(caja.montoApertura)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(caja.totalEfectivo)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(caja.totalTarjeta)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(caja.totalYapePlin)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(caja.totalIngresos)}</TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${diffColor}`}>
                          {diff == null ? '-' : (diff >= 0 ? '+' : '') + formatCurrency(diff)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleVerDetalle(caja)} title="Ver detalle">
                              <Eye size={15} />
                            </Button>
                            {caja.estado === 'ABIERTA' && (
                              <Button variant="ghost" size="icon" onClick={() => handleAbrirCerrar(caja)} title="Cerrar caja">
                                <Lock size={15} className="text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Detalle */}
      <Dialog isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detalle de Caja" size="lg">
        {selectedCaja && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Cajero</p>
                <p className="font-medium">{selectedCaja.usuarioNombre}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Estado</p>
                <Badge variant={selectedCaja.estado === 'ABIERTA' ? 'warning' : 'success'}>
                  {selectedCaja.estado}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Apertura</p>
                <p>{formatDate(selectedCaja.fechaApertura)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Cierre</p>
                <p>{formatDate(selectedCaja.fechaCierre)}</p>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-semibold">Resumen de ingresos</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><Banknote size={14} /> Fondo apertura</span>
                  <span className="font-mono font-medium">{formatCurrency(selectedCaja.montoApertura)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><Banknote size={14} /> Efectivo (ventas)</span>
                  <span className="font-mono font-medium">{formatCurrency(selectedCaja.totalEfectivo)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><CreditCard size={14} /> Tarjeta</span>
                  <span className="font-mono font-medium">{formatCurrency(selectedCaja.totalTarjeta)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><Smartphone size={14} /> Yape/Plin</span>
                  <span className="font-mono font-medium">{formatCurrency(selectedCaja.totalYapePlin)}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between font-semibold">
                  <span>Total ingresos ({selectedCaja.cantidadVentas} ventas)</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(selectedCaja.totalIngresos)}</span>
                </div>
              </div>
            </div>

            {selectedCaja.estado === 'CERRADA' && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-semibold">Cierre de caja</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Esperado en caja (apertura + efectivo)</span>
                    <span className="font-mono">{formatCurrency((selectedCaja.montoApertura ?? 0) + (selectedCaja.totalEfectivo ?? 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contado físicamente</span>
                    <span className="font-mono">{formatCurrency(selectedCaja.montoContado)}</span>
                  </div>
                  <div className={`flex justify-between font-semibold text-sm border-t pt-2 ${
                    (selectedCaja.diferencia ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    <span>Diferencia</span>
                    <span className="font-mono">
                      {(selectedCaja.diferencia ?? 0) >= 0 ? '+' : ''}{formatCurrency(selectedCaja.diferencia)}
                    </span>
                  </div>
                  {(selectedCaja.diferencia ?? 0) > 0 && (
                    <p className="text-xs text-emerald-600">Sobrante en caja</p>
                  )}
                  {(selectedCaja.diferencia ?? 0) < 0 && (
                    <p className="text-xs text-red-600">Faltante en caja</p>
                  )}
                </div>
              </div>
            )}

            {selectedCaja.observaciones && (
              <div className="text-sm">
                <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Observaciones</p>
                <p className="text-sm">{selectedCaja.observaciones}</p>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Dialog: Cerrar Caja */}
      <Dialog
        isOpen={isCerrarOpen}
        onClose={() => setIsCerrarOpen(false)}
        title="Cerrar Caja"
        description="Ingresa el efectivo que tienes físicamente en caja para calcular el cuadre."
      >
        {selectedCaja && (
          <div className="space-y-5">
            {/* Resumen rápido de lo esperado */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <p className="font-semibold text-sm mb-2">Resumen de ventas en esta sesión</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Banknote size={13} /> Fondo apertura</span>
                <span className="font-mono">{formatCurrency(selectedCaja.montoApertura)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Banknote size={13} /> Ventas efectivo</span>
                <span className="font-mono">{formatCurrency(selectedCaja.totalEfectivo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><CreditCard size={13} /> Ventas tarjeta</span>
                <span className="font-mono">{formatCurrency(selectedCaja.totalTarjeta)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Smartphone size={13} /> Yape/Plin</span>
                <span className="font-mono">{formatCurrency(selectedCaja.totalYapePlin)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total ingresos ({selectedCaja.cantidadVentas} ventas)</span>
                <span className="font-mono text-emerald-600">{formatCurrency(selectedCaja.totalIngresos)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Esperado en caja efectiva</span>
                <span className="font-mono font-medium">{formatCurrency((selectedCaja.montoApertura ?? 0) + (selectedCaja.totalEfectivo ?? 0))}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Efectivo contado físicamente <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">S/.</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cerrarForm.montoContado || ''}
                  onChange={e => setCerrarForm(prev => ({ ...prev, montoContado: parseFloat(e.target.value) || 0 }))}
                  className="pl-10"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {cerrarForm.montoContado > 0 && (
                <div className={`text-sm font-semibold ${
                  cerrarForm.montoContado - (selectedCaja.montoApertura + (selectedCaja.totalEfectivo ?? 0)) >= 0
                    ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {(() => {
                    const diff = cerrarForm.montoContado - (selectedCaja.montoApertura + (selectedCaja.totalEfectivo ?? 0));
                    return `Diferencia: ${diff >= 0 ? '+' : ''}S/. ${diff.toFixed(2)} ${diff > 0 ? '(sobrante)' : diff < 0 ? '(faltante)' : '(cuadra exacto)'}`;
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones (opcional)</label>
              <textarea
                value={cerrarForm.observaciones || ''}
                onChange={e => setCerrarForm(prev => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Motivo de diferencia, incidencias, etc."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setIsCerrarOpen(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={handleCerrarCaja}
                disabled={cerrando || cerrarForm.montoContado < 0}
              >
                {cerrando ? 'Cerrando...' : 'Cerrar Caja'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
