import { useEffect, useState } from 'react';
import { cajaService } from '../../services/caja.service';
import type { CajaDTO, CerrarCajaDTO, RegistrarRetiroDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import {
  Wallet, TrendingUp, Banknote, CreditCard, Smartphone,
  Lock, CheckCircle, Clock, Eye, ArrowDownLeft,
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

  // Retiro parcial
  const [isRetiroOpen, setIsRetiroOpen] = useState(false);
  const [retiroForm, setRetiroForm] = useState<RegistrarRetiroDTO>({ monto: 0, motivo: '' });
  const [retirando, setRetirando] = useState(false);

  useEffect(() => {
    fetchCajas();
  }, []);

  const fetchCajas = async () => {
    try {
      setLoading(true);
      const data = await cajaService.getAll();
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

  const handleAbrirRetiro = (caja: CajaDTO) => {
    setSelectedCaja(caja);
    setRetiroForm({ monto: 0, motivo: '' });
    setIsRetiroOpen(true);
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

  const handleRegistrarRetiro = async () => {
    if (!selectedCaja) return;
    if (!retiroForm.monto || retiroForm.monto <= 0) {
      toast.error('El monto del retiro debe ser mayor a 0');
      return;
    }
    const efectivoDisponible =
      (selectedCaja.montoApertura ?? 0) +
      (selectedCaja.totalEfectivo ?? 0) -
      (selectedCaja.totalRetiros ?? 0);
    if (retiroForm.monto > efectivoDisponible) {
      toast.error(`El retiro (${formatCurrency(retiroForm.monto)}) supera el efectivo disponible (${formatCurrency(efectivoDisponible)})`);
      return;
    }
    try {
      setRetirando(true);
      await cajaService.registrarRetiro(selectedCaja.id, retiroForm);
      toast.success(`Retiro de ${formatCurrency(retiroForm.monto)} registrado`);
      setIsRetiroOpen(false);
      await fetchCajas();
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || 'Error al registrar el retiro');
    } finally {
      setRetirando(false);
    }
  };

  const cajasAbiertas = cajas.filter(c => c.estado === 'ABIERTA');
  const cajaActiva = cajasAbiertas[0] ?? null;
  const totalIngresosHoy = cajas
    .filter(c => {
      if (!c.fechaApertura) return false;
      const hoy = new Date().toDateString();
      return new Date(c.fechaApertura).toDateString() === hoy;
    })
    .reduce((sum, c) => sum + (c.totalIngresos ?? 0), 0);

  // Cuadre por método de pago de la sesión activa
  const metodosPago = cajaActiva ? (() => {
    const filas = [
      { key: 'EFECTIVO',  label: 'Efectivo',  monto: cajaActiva.totalEfectivo ?? 0,  Icon: Banknote,    color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30',  border: 'border-emerald-200 dark:border-emerald-800' },
      { key: 'TARJETA',   label: 'Tarjeta',   monto: cajaActiva.totalTarjeta ?? 0,   Icon: CreditCard,  color: 'text-blue-600 dark:text-blue-400',       bar: 'bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30',        border: 'border-blue-200 dark:border-blue-800' },
      { key: 'YAPE_PLIN', label: 'Yape/Plin', monto: cajaActiva.totalYapePlin ?? 0,  Icon: Smartphone,  color: 'text-violet-600 dark:text-violet-400',   bar: 'bg-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/30',    border: 'border-violet-200 dark:border-violet-800' },
    ];
    const totalMonto = filas.reduce((s, f) => s + f.monto, 0);
    return { filas, totalMonto };
  })() : null;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cuadre de Caja</h1>
        <p className="text-muted-foreground">Historial de aperturas y cierres de caja</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 [&>*:last-child]:col-span-2 [&>*:last-child]:mx-auto [&>*:last-child]:max-w-[calc(50%-0.5rem)] sm:[&>*:last-child]:col-auto sm:[&>*:last-child]:max-w-none sm:[&>*:last-child]:mx-0">
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cajas abiertas</p>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="text-amber-600 dark:text-amber-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-3xl font-bold tracking-tight ${cajasAbiertas.length > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {cajasAbiertas.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes de cierre</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingresos hoy</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight">{formatCurrency(totalIngresosHoy)}</div>
            <p className="text-xs text-muted-foreground mt-1">De todas las cajas</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total historial</p>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Wallet className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight">{cajas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Sesiones de caja</p>
          </CardContent>
        </Card>
      </div>

      {/* Cuadre por método de pago — sesión activa */}
      {cajaActiva && metodosPago && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">Cuadre de sesión activa</CardTitle>
                <CardDescription className="mt-0.5">
                  Cajero: <span className="font-medium text-foreground">{cajaActiva.usuarioNombre}</span>
                  {' · '}Apertura: <span className="font-medium text-foreground">{formatDate(cajaActiva.fechaApertura)}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning"><Clock size={11} className="mr-1 inline" />ABIERTA</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  onClick={() => handleAbrirRetiro(cajaActiva)}
                >
                  <ArrowDownLeft size={14} />
                  Retiro parcial
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {metodosPago.filas.map(({ key, label, monto, Icon, color, bar, bg, border }) => {
                const pct = metodosPago.totalMonto > 0
                  ? Math.round((monto / metodosPago.totalMonto) * 100)
                  : 0;
                return (
                  <div key={key} className={`rounded-xl border p-4 ${bg} ${border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={color} />
                        <span className={`text-sm font-semibold ${color}`}>{label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{pct}%</span>
                    </div>
                    <p className={`text-2xl font-bold font-mono ${color}`}>
                      {formatCurrency(monto)}
                    </p>
                    <div className="mt-3 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Total row */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Wallet size={15} className="text-muted-foreground" />
                  Total recaudado ({cajaActiva.cantidadVentas ?? 0} ventas)
                </span>
                <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(metodosPago.totalMonto)}
                </span>
              </div>
              {/* Retiros */}
              {(cajaActiva.totalRetiros ?? 0) > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 px-4 py-3">
                  <span className="text-sm font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <ArrowDownLeft size={15} />
                    Retiros parciales ({cajaActiva.retiros?.length ?? 0})
                  </span>
                  <span className="font-mono font-bold text-lg text-orange-600 dark:text-orange-400">
                    -{formatCurrency(cajaActiva.totalRetiros)}
                  </span>
                </div>
              )}
              {/* Efectivo esperado en caja */}
              <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
                <span className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Banknote size={15} />
                  Efectivo esperado en caja
                </span>
                <span className="font-mono font-bold text-lg text-blue-600 dark:text-blue-400">
                  {formatCurrency(
                    (cajaActiva.montoApertura ?? 0) +
                    (cajaActiva.totalEfectivo ?? 0) -
                    (cajaActiva.totalRetiros ?? 0)
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Historial de Cajas</CardTitle>
          <CardDescription>{cajas.length} sesión(es) registrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {cajas.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Todavía no hay sesiones de caja"
              description="Cada vez que abras el Punto de Venta se creará una sesión de caja automáticamente. Aquí podrás ver el historial, los totales por método de pago y los cuadres."
            />
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
                    <TableHead className="text-right">Retiros</TableHead>
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
                        <TableCell className="text-right font-mono text-sm text-orange-600">
                          {(caja.totalRetiros ?? 0) > 0 ? `-${formatCurrency(caja.totalRetiros)}` : '-'}
                        </TableCell>
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
                              <>
                                <Button
                                  variant="ghost" size="icon"
                                  onClick={() => handleAbrirRetiro(caja)}
                                  title="Retiro parcial"
                                  className="text-orange-500 hover:text-orange-700"
                                >
                                  <ArrowDownLeft size={15} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleAbrirCerrar(caja)} title="Cerrar caja">
                                  <Lock size={15} className="text-destructive" />
                                </Button>
                              </>
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

            {/* Retiros parciales */}
            {selectedCaja.retiros && selectedCaja.retiros.length > 0 && (
              <div className="rounded-lg border border-orange-200 dark:border-orange-800 p-4 space-y-3 bg-orange-50/50 dark:bg-orange-950/10">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <ArrowDownLeft size={15} />
                    Retiros parciales
                  </p>
                  <span className="text-sm font-mono font-bold text-orange-600">
                    -{formatCurrency(selectedCaja.totalRetiros)}
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedCaja.retiros.map((r) => (
                    <div key={r.id} className="flex items-start justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground">{formatDate(r.fecha)}</p>
                        {r.motivo && <p className="text-xs text-muted-foreground italic">{r.motivo}</p>}
                      </div>
                      <span className="font-mono font-medium text-orange-600 flex-shrink-0 ml-2">
                        -{formatCurrency(r.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedCaja.estado === 'CERRADA' && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-semibold">Cierre de caja</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Esperado en caja (apertura + efectivo - retiros)</span>
                    <span className="font-mono">
                      {formatCurrency(
                        (selectedCaja.montoApertura ?? 0) +
                        (selectedCaja.totalEfectivo ?? 0) -
                        (selectedCaja.totalRetiros ?? 0)
                      )}
                    </span>
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

      {/* Dialog: Retiro Parcial */}
      <Dialog
        isOpen={isRetiroOpen}
        onClose={() => setIsRetiroOpen(false)}
        title="Retiro Parcial de Efectivo"
        description="Registra una salida de efectivo sin cerrar la caja (depósito en caja fuerte, pago urgente, etc.)."
      >
        {selectedCaja && (() => {
          const efectivoDisponible =
            (selectedCaja.montoApertura ?? 0) +
            (selectedCaja.totalEfectivo ?? 0) -
            (selectedCaja.totalRetiros ?? 0);
          const excede = !!retiroForm.monto && retiroForm.monto > efectivoDisponible;
          return (
          <div className="space-y-5">
            {/* Info actual */}
            <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Banknote size={13} /> Efectivo ventas</span>
                <span className="font-mono">{formatCurrency(selectedCaja.totalEfectivo)}</span>
              </div>
              {(selectedCaja.totalRetiros ?? 0) > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span className="flex items-center gap-1"><ArrowDownLeft size={13} /> Retiros anteriores</span>
                  <span className="font-mono">-{formatCurrency(selectedCaja.totalRetiros)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Efectivo disponible para retiro</span>
                <span className="font-mono text-blue-600">{formatCurrency(efectivoDisponible)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Monto a retirar <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">S/.</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={efectivoDisponible}
                  value={retiroForm.monto || ''}
                  onChange={e => setRetiroForm(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                  className={`pl-10 ${excede ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {excede && (
                <p className="text-xs text-red-500">El monto supera el efectivo disponible ({formatCurrency(efectivoDisponible)})</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Input
                value={retiroForm.motivo || ''}
                onChange={e => setRetiroForm(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Ej: Depósito caja fuerte, pago proveedor…"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setIsRetiroOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleRegistrarRetiro}
                disabled={retirando || !retiroForm.monto || retiroForm.monto <= 0 || excede}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {retirando ? 'Registrando...' : 'Confirmar retiro'}
              </Button>
            </div>
          </div>
          );
        })()}
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
              {(selectedCaja.totalRetiros ?? 0) > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span className="flex items-center gap-1"><ArrowDownLeft size={13} /> Retiros parciales ({selectedCaja.retiros?.length ?? 0})</span>
                  <span className="font-mono">-{formatCurrency(selectedCaja.totalRetiros)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total ingresos ({selectedCaja.cantidadVentas} ventas)</span>
                <span className="font-mono text-emerald-600">{formatCurrency(selectedCaja.totalIngresos)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Esperado en caja efectiva</span>
                <span className="font-mono font-medium">
                  {formatCurrency(
                    (selectedCaja.montoApertura ?? 0) +
                    (selectedCaja.totalEfectivo ?? 0) -
                    (selectedCaja.totalRetiros ?? 0)
                  )}
                </span>
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
                  cerrarForm.montoContado - ((selectedCaja.montoApertura ?? 0) + (selectedCaja.totalEfectivo ?? 0) - (selectedCaja.totalRetiros ?? 0)) >= 0
                    ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {(() => {
                    const esperado = (selectedCaja.montoApertura ?? 0) + (selectedCaja.totalEfectivo ?? 0) - (selectedCaja.totalRetiros ?? 0);
                    const diff = cerrarForm.montoContado - esperado;
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
