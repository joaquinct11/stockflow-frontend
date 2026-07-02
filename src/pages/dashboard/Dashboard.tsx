import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { productoService } from '../../services/producto.service';
import { ventaService } from '../../services/venta.service';
import { movimientoService } from '../../services/movimiento.service';
import type { ProductoDTO, VentaDTO, MovimientoInventarioDTO, SuscripcionDTO } from '../../types';
import { Package, ShoppingCart, AlertCircle, DollarSign, Clock, RefreshCw, Calendar, CreditCard, TrendingDown, TrendingUp, Zap, ClipboardList, BarChart2, Wallet, FileText, Award } from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { gastoService } from '../../services/gasto.service';
import { comisionService } from '../../services/comision.service';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useSucursalStore } from '../../store/sucursalStore';

type Role = 'ADMIN' | 'VENDEDOR' | 'GESTOR_INVENTARIO';
type TimeFilter = 'HOY' | 'SEMANA' | 'MES' | 'ANUAL';

function safeRol(rol?: string): Role {
  if (rol === 'ADMIN' || rol === 'VENDEDOR' || rol === 'GESTOR_INVENTARIO') return rol;
  return 'VENDEDOR';
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function startOfYear(d: Date) {
  const x = startOfDay(d);
  x.setMonth(0, 1);
  return x;
}

function getRangeStart(filter: TimeFilter, now = new Date()) {
  switch (filter) {
    case 'HOY':
      return startOfDay(now);
    case 'SEMANA':
      return startOfWeek(now);
    case 'MES':
      return startOfMonth(now);
    case 'ANUAL':
      return startOfYear(now);
    default:
      return startOfDay(now);
  }
}

function getVentaDate(v: VentaDTO): Date | null {
  const anyV = v as any;
  const raw =
    anyV?.createdAt ??
    anyV?.fecha ??
    anyV?.fechaVenta ??
    anyV?.fechaCreacion ??
    anyV?.created_at ??
    null;

  if (!raw) return null;

  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

interface ProductoConVencimiento {
  id?: number;
  nombre: string;
  codigoBarras?: string;
  stockActual: number;
  fechaVencimiento: string;
  lote?: string;
}

export function Dashboard() {
  const { user, suscripcionEstado } = useAuthStore();
  const { userId } = useCurrentUser();
  const navigate = useNavigate();
  const rol = safeRol(user?.rol);
  const { config: negocioConfig } = useTenantConfigStore();
  const esServicios = negocioConfig?.rubro === 'EMPRESA_SERVICIOS';
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventarioDTO[]>([]);
  const [canLoadVentas, setCanLoadVentas] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('MES');
  const [totalComisionesMes, setTotalComisionesMes] = useState<number>(0);

  const [totalGastosPeriodo, setTotalGastosPeriodo] = useState<number>(0);

  // Estado de suscripción
  const [suscripcion] = useState<SuscripcionDTO | null>(user?.suscripcion ?? null);


  // const ventasScopeLabel = useMemo(() => {
  //   if (rol === 'ADMIN') return 'globales';
  //   if (rol === 'VENDEDOR') return 'tuyas';
  //   return '—';
  // }, [rol]);

  const estadoSuscripcionRaw = suscripcionEstado ?? suscripcion?.estado ?? user?.suscripcion?.estado ?? '';
  const trialEndDate = (suscripcion?.trialEndDate ?? user?.suscripcion?.trialEndDate) as string | undefined;
  const preapprovalId = suscripcion?.preapprovalId ?? user?.suscripcion?.preapprovalId;

  // Si el backend aún dice TRIAL pero la fecha ya venció, tratarlo como PENDIENTE en el cliente
  const trialVencidoClientSide = estadoSuscripcionRaw === 'TRIAL' && !!trialEndDate && new Date(trialEndDate) < new Date();
  const estadoSuscripcion = trialVencidoClientSide ? 'PENDIENTE' : estadoSuscripcionRaw;

  // "Trial vencido" cubre dos escenarios:
  //  1. Backend aún dice TRIAL pero la fecha ya pasó (detección client-side)
  //  2. Backend ya cambió a PENDIENTE porque el trial venció, pero NO hay preapprovalId
  //     (si hubiera preapprovalId, significaría que hay un pago real de MP en curso)
  const esTrialVencido =
    trialVencidoClientSide ||
    (estadoSuscripcionRaw === 'PENDIENTE' && !preapprovalId && !!trialEndDate && new Date(trialEndDate) < new Date());

  const suscripcionActiva = estadoSuscripcion === 'ACTIVA' || estadoSuscripcion === 'TRIAL' || estadoSuscripcion === 'CANCELACION_PENDIENTE' || estadoSuscripcion === '' || !estadoSuscripcion;
  const mostrarBloqueo = rol === 'ADMIN' && !suscripcionActiva && !!estadoSuscripcion;
  const esTrial                = estadoSuscripcion === 'TRIAL';
  const esCancelacionPendiente = estadoSuscripcion === 'CANCELACION_PENDIENTE';

  // Calcular días restantes de trial (solo cuando sigue en TRIAL activo)
  const diasTrialRestantes = (() => {
    if (!esTrial || !trialEndDate) return null;
    const diff = Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  })();

  // Fecha de corte para cancelación pendiente
  const currentPeriodEndRaw = (suscripcion as any)?.currentPeriodEnd as string | undefined;
  const fechaCorte = currentPeriodEndRaw
    ? new Date(currentPeriodEndRaw).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const planParaReintentar = (suscripcion?.planId ?? user?.suscripcion?.planId ?? '') as string;
  const puedeReintentar = planParaReintentar === 'BASICO' || planParaReintentar === 'PRO';

  const handleReintentar = () => {
    navigate(`/checkout/culqi?plan=${planParaReintentar}`);
  };

  useEffect(() => {
    if (!sucursalLoaded) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalLoaded, rol, userId, sucursalActual?.id]);

  // Gastos del período — solo ADMIN
  useEffect(() => {
    if (rol !== 'ADMIN') return;
    const now = new Date();
    const inicio = getRangeStart(timeFilter, now);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const sid = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;
    gastoService.getTotal(fmt(inicio), fmt(now), sid)
      .then((t) => setTotalGastosPeriodo(Number(t)))
      .catch(() => setTotalGastosPeriodo(0));
  }, [timeFilter, rol, sucursalActual?.id]);

  // Comisiones del mes — solo para dealer
  useEffect(() => {
    if (!esServicios || rol !== 'ADMIN') return;
    comisionService.listar()
      .then((lista) => {
        const mesActual = new Date().toISOString().slice(0, 7); // yyyy-MM
        const total = lista
          .filter((c) => c.fecha?.startsWith(mesActual))
          .reduce((s, c) => s + c.monto, 0);
        setTotalComisionesMes(total);
      })
      .catch(() => setTotalComisionesMes(0));
  }, [esServicios, rol]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // ✅ Productos siempre (con stock por sucursal si es multi-local)
      const productosPromise = productoService.getAll(isMultiLocal && sucursalActual ? sucursalActual.id : undefined);

      // ✅ Movimientos: solo roles con acceso a inventario (VENDEDOR no tiene permiso)
      let movimientosPromise: Promise<MovimientoInventarioDTO[]>;
      if (rol === 'VENDEDOR') {
        movimientosPromise = Promise.resolve([]);
      } else if (movimientoService.getAll) {
        movimientosPromise = movimientoService
          .getAll()
          .catch((err) => {
            if (import.meta.env.DEV) { console.warn('⚠️ Error cargando movimientos:', err);}
            return [];
          });
      } else {
        if (import.meta.env.DEV) { console.warn('⚠️ movimientoService.getAll no existe');}
        movimientosPromise = Promise.resolve([]);
      }

      // ✅ Ventas según rol
      let ventasPromise: Promise<VentaDTO[]>;
      if (rol === 'ADMIN') {
        setCanLoadVentas(true);
        ventasPromise = ventaService.getAll(isMultiLocal && sucursalActual ? sucursalActual.id : undefined);
      } else if (rol === 'VENDEDOR') {
        if (!userId) {
          setCanLoadVentas(true);
          ventasPromise = Promise.resolve([]);
        } else {
          setCanLoadVentas(true);
          ventasPromise = ventaService.getByVendor(userId);
        }
      } else {
        setCanLoadVentas(false);
        ventasPromise = Promise.resolve([]);
      }

      const [productosData, ventasData, movimientosData] = await Promise.all([
        productosPromise,
        ventasPromise,
        movimientosPromise,
      ]);

      if (import.meta.env.DEV) { console.log('✅ Productos:', productosData.length);}
      if (import.meta.env.DEV) { console.log('✅ Ventas:', ventasData.length);}
      if (import.meta.env.DEV) { console.log('✅ Movimientos:', movimientosData?.length ?? 0, movimientosData);}

      setProductos(productosData);
      setVentas(ventasData);
      setMovimientos(movimientosData ?? []);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setVentas([]);
        setCanLoadVentas(false);
        toast.error('No tienes permisos para ver ventas');
      } else {
        toast.error('Error al cargar datos del dashboard');
      }
      if (import.meta.env.DEV) { console.error('❌ Error en fetchData:', error);}
    } finally {
      setLoading(false);
    }
  };

  const filteredVentas = useMemo(() => {
    const start = getRangeStart(timeFilter, new Date());
    const end = new Date();

    return ventas.filter((v) => {
      const d = getVentaDate(v);
      if (!d) return false;
      return d >= start && d <= end;
    });
  }, [ventas, timeFilter]);

  const stats = useMemo(() => {
    const productosParaStock = esServicios
      ? productos.filter((p) => p.tipo === 'PRODUCTO' || !p.tipo)
      : productos;
    const bajoStock = productosParaStock.filter((p) => p.stockActual <= p.stockMinimo);

    // productos próximos a vencer en 90 días (desde movimientos)
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);

    const proximosMes = new Date(ahora);
    proximosMes.setDate(proximosMes.getDate() + 90);

    if (import.meta.env.DEV) { console.log('📅 Debug vencimientos:');}
    if (import.meta.env.DEV) { console.log('   Hoy:', ahora.toLocaleDateString('es-PE'));}
    if (import.meta.env.DEV) { console.log('   Próximos 90 días hasta:', proximosMes.toLocaleDateString('es-PE'));}
    if (import.meta.env.DEV) { console.log('   Total movimientos:', movimientos.length);}

    // Construir mapa de productos por ID
    const productosById = new Map<number, ProductoDTO>();
    productos.forEach((p) => productosById.set(p.id!, p));

    // Filtrar movimientos con fechaVencimiento (ENTRADA o SALDO_INICIAL)
    const movimientosConVencimiento = movimientos.filter(
      (m) => m.fechaVencimiento && (m.tipo === 'ENTRADA' || m.tipo === 'SALDO_INICIAL')
    );

    if (import.meta.env.DEV) { console.log('   Movimientos con vencimiento:', movimientosConVencimiento.length);}

    // Agrupar por producto y obtener el vencimiento más próximo
    const productosProximosMap = new Map<number, ProductoConVencimiento>();

    movimientosConVencimiento.forEach((mov) => {
      // Parsear fechaVencimiento (formato YYYY-MM-DD)
      const fechaParts = mov.fechaVencimiento!.split('T')[0].split('-');
      const fv = new Date(
        parseInt(fechaParts[0]), 
        parseInt(fechaParts[1]) - 1, 
        parseInt(fechaParts[2])
      );
      fv.setHours(0, 0, 0, 0);

      if (import.meta.env.DEV) { console.log(
        `   Movimiento ${mov.id}: Producto ${mov.productoId}, Vence: ${fv.toLocaleDateString('es-PE')}`
      );}

      // Solo si vence entre hoy y +90 días
      if (fv >= ahora && fv <= proximosMes) {
        const prod = productosById.get(mov.productoId);

        if (import.meta.env.DEV) { console.log(
          `     ✅ En rango. Stock: ${prod?.stockActual}, Nombre: ${prod?.nombre}`
        );}

        if (prod && prod.stockActual > 0) {
          const key = mov.productoId;
          const existing = productosProximosMap.get(key);

          // Mantener el vencimiento más próximo
          if (!existing || fv < new Date(existing.fechaVencimiento)) {
            productosProximosMap.set(key, {
              id: prod.id,
              nombre: prod.nombre,
              codigoBarras: prod.codigoBarras,
              stockActual: prod.stockActual,
              fechaVencimiento: mov.fechaVencimiento!,
              lote: mov.lote,
            });
          }
        }
      } else {
        if (import.meta.env.DEV) { console.log(`     ❌ Fuera de rango`);}
      }
    });

    // Convertir a array y ordenar por fecha de vencimiento
    const productosProximosAVencer = Array.from(productosProximosMap.values())
      .sort(
        (a, b) =>
          new Date(a.fechaVencimiento.split('T')[0]).getTime() -
          new Date(b.fechaVencimiento.split('T')[0]).getTime()
      )
      .slice(0, 10);

    if (import.meta.env.DEV) { console.log('🎯 Productos próximos a vencer (FINAL):', productosProximosAVencer);}

    // ventas filtradas
    const ingresoFiltrado = filteredVentas.reduce((acc, v) => acc + (v.total || 0), 0);

    // solo para el label "+X hoy"
    const hoyStart = getRangeStart('HOY', new Date());
    const ventasHoy = ventas.filter((v) => {
      const d = getVentaDate(v);
      if (!d) return false;
      return d >= hoyStart;
    }).length;

    // Unidades totales despachadas en el período (suma de cantidades de detalles)
    const unidadesVendidas = filteredVentas.reduce(
      (acc, v) => acc + (v.detalles?.reduce((s, d) => s + (d.cantidad ?? 0), 0) ?? 0), 0
    );
    const unidadesHoy = ventas
      .filter((v) => { const d = getVentaDate(v); return d ? d >= hoyStart : false; })
      .reduce((acc, v) => acc + (v.detalles?.reduce((s, d) => s + (d.cantidad ?? 0), 0) ?? 0), 0);

    return {
      totalProductos: productos.length,
      bajoStockCount: bajoStock.length,
      bajoStockItems: bajoStock.slice(0, 5),
      productosProximosAVencer,
      totalVentasFiltradas: filteredVentas.length,
      ingresoFiltrado,
      ventasHoy,
      unidadesVendidas,
      unidadesHoy,
    };
  }, [productos, ventas, filteredVentas, movimientos, esServicios]);

  const gridColsClass =
    rol === 'GESTOR_INVENTARIO'
      ? 'lg:grid-cols-2'
      : rol === 'ADMIN'
        ? 'lg:grid-cols-3'
        : 'lg:grid-cols-4';

  if (loading) return <LoadingSpinner />;

  const showVentasCards = canLoadVentas && (rol === 'ADMIN' || rol === 'VENDEDOR');

  return (
    <div className="relative space-y-6">
      {/* Alerta de suscripción y overlay de bloqueo */}
      {mostrarBloqueo && (
        <>
          {/* Overlay semitransparente sobre el contenido */}
          <div className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-background/60 backdrop-blur-[2px]" />

          {/* Banner de alerta (fuera del overlay para que sea clicable) */}
          <div className="relative z-20">
            {esTrialVencido ? (
              /* Trial expirado sin pago — nunca hubo transacción en curso */
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Tu período de prueba venció</p>
                      <p className="text-sm">
                        Activa tu suscripción para seguir usando el sistema sin interrupciones.
                      </p>
                    </div>
                  </div>
                  {puedeReintentar && (
                    <Button size="sm" className="shrink-0" onClick={handleReintentar}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Activar suscripción
                    </Button>
                  )}
                </div>
              </div>
            ) : estadoSuscripcion === 'PENDIENTE' ? (
              /* Pago iniciado pero aún no confirmado */
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Pago en proceso</p>
                      <p className="text-sm">
                        Tu pago está siendo procesado. Si ya pagaste, espera unos minutos o reintenta.
                      </p>
                    </div>
                  </div>
                  {puedeReintentar && (
                    <Button size="sm" className="shrink-0" onClick={handleReintentar}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reintentar pago
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* CANCELADA o SUSPENDIDA — pago rechazado / cancelado explícitamente */
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        {estadoSuscripcion === 'CANCELADA' ? 'Suscripción cancelada' : 'Suscripción suspendida'}
                      </p>
                      <p className="text-sm">
                        {estadoSuscripcion === 'CANCELADA'
                          ? 'Tu suscripción fue cancelada. Reactívala para continuar usando el sistema.'
                          : 'Tu suscripción está suspendida por un pago fallido. Actualiza tu método de pago.'}
                      </p>
                    </div>
                  </div>
                  {puedeReintentar && (
                    <Button size="sm" variant="destructive" className="shrink-0" onClick={handleReintentar}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reintentar pago
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {/* Banner de cancelación pendiente — acceso activo hasta currentPeriodEnd */}
      {rol === 'ADMIN' && esCancelacionPendiente && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Suscripción cancelada</p>
                <p className="text-sm">
                  {fechaCorte
                    ? `Acceso activo hasta el ${fechaCorte}. Después deberás renovar para seguir usando el sistema.`
                    : 'Tu acceso se mantendrá hasta el final del período pagado.'}
                </p>
              </div>
            </div>
            {puedeReintentar && (
              <Button size="sm" variant="outline" className="shrink-0 text-amber-800 border-amber-400 hover:bg-amber-100 dark:text-amber-200 dark:border-amber-600" onClick={handleReintentar}>
                <CreditCard className="mr-2 h-4 w-4" />
                Renovar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Banner de período de prueba */}
      {rol === 'ADMIN' && esTrial && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {diasTrialRestantes === 0
                    ? 'Tu período de prueba vence hoy'
                    : `Período de prueba — ${diasTrialRestantes} día${diasTrialRestantes === 1 ? '' : 's'} restante${diasTrialRestantes === 1 ? '' : 's'}`}
                </p>
                <p className="text-sm">
                  Estás usando el plan <strong>{planParaReintentar}</strong>. Al vencer, deberás activar tu suscripción para continuar.
                </p>
              </div>
            </div>
            {puedeReintentar && (
              <Button size="sm" className="shrink-0" onClick={handleReintentar}>
                <CreditCard className="mr-2 h-4 w-4" />
                Activar suscripción
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Header personalizado */}
      <div className="animate-fade-in-up flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {(() => {
              const h = new Date().getHours();
              return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
            })()}, {user?.nombre?.split(' ')[0] ?? 'bienvenido'} 👋
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Quick filter — segmented control */}
        {showVentasCards && (
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 self-start sm:self-auto">
            {(['HOY', 'SEMANA', 'MES', 'ANUAL'] as TimeFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  timeFilter === f
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'HOY' ? 'Hoy' : f === 'SEMANA' ? 'Semana' : f === 'MES' ? 'Mes' : 'Anual'}
              </button>
            ))}
          </div>
        )}
      </div>

{/* ── Acciones rápidas ─────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up-delay-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Zap size={12} /> Acceso rápido
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

          {esServicios ? (
            /* ── Acciones para EMPRESA_SERVICIOS / Dealer ── */
            <>
              <button
                onClick={() => navigate('/dashboard/ventas')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
              >
                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                  <ShoppingCart size={18} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none">Registrar Servicio</p>
                  <p className="text-xs text-muted-foreground mt-1">Nueva prestación</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/dashboard/comisiones')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
              >
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                  <Award size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none">Comisiones</p>
                  <p className="text-xs text-muted-foreground mt-1">Ingresos de Bitel</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/dashboard/facturacion')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
              >
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none">Facturación</p>
                  <p className="text-xs text-muted-foreground mt-1">Boletas y facturas</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/dashboard/caja')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
              >
                <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-500/20 transition-colors">
                  <Wallet size={18} className="text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none">Cuadre de Caja</p>
                  <p className="text-xs text-muted-foreground mt-1">Apertura / cierre</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/pos')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
              >
                <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                  <ShoppingCart size={18} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none">Venta en POS</p>
                  <p className="text-xs text-muted-foreground mt-1">Punto de venta</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/dashboard/reportes')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
              >
                <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                  <BarChart2 size={18} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none">Reportes</p>
                  <p className="text-xs text-muted-foreground mt-1">Ver análisis</p>
                </div>
              </button>
            </>
          ) : (
            /* ── Acciones para rubros con inventario ── */
            <>
              {(rol === 'ADMIN' || rol === 'VENDEDOR') && (
                <button
                  onClick={() => navigate('/pos')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                >
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                    <ShoppingCart size={18} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none">Nueva Venta</p>
                    <p className="text-xs text-muted-foreground mt-1">Abrir POS</p>
                  </div>
                </button>
              )}
              {(rol === 'ADMIN' || rol === 'GESTOR_INVENTARIO') && (
                <button
                  onClick={() => navigate('/dashboard/inventario')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                >
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                    <Package size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none">Ajuste Stock</p>
                    <p className="text-xs text-muted-foreground mt-1">Inventario</p>
                  </div>
                </button>
              )}
              {rol === 'ADMIN' && (
                <button
                  onClick={() => navigate('/dashboard/gastos')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                >
                  <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-500/20 transition-colors">
                    <Wallet size={18} className="text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none">Registrar Gasto</p>
                    <p className="text-xs text-muted-foreground mt-1">Egresos</p>
                  </div>
                </button>
              )}
              {(rol === 'ADMIN' || rol === 'GESTOR_INVENTARIO') && (
                <button
                  onClick={() => navigate('/dashboard/reportes')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                >
                  <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                    <BarChart2 size={18} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none">Reportes</p>
                    <p className="text-xs text-muted-foreground mt-1">Ver análisis</p>
                  </div>
                </button>
              )}
              {(rol === 'ADMIN' || rol === 'GESTOR_INVENTARIO') && (
                <button
                  onClick={() => navigate('/dashboard/compras/ordenes')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <ClipboardList size={18} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none">Nueva OC</p>
                    <p className="text-xs text-muted-foreground mt-1">Orden de compra</p>
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid gap-4 grid-cols-2 ${gridColsClass} animate-fade-in-up-delay-1`}>

        {esServicios ? (
          /* ── Cards para dealer ── */
          <>
            <Card className="relative overflow-hidden border-0 shadow-sm bg-card">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unidades Vendidas</p>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Package className="text-blue-600 dark:text-blue-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">{stats.unidadesVendidas}</div>
                <p className="text-xs text-muted-foreground mt-1">+{stats.unidadesHoy} hoy</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm bg-card">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comisiones del Mes</p>
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Award className="text-amber-600 dark:text-amber-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">S/.{totalComisionesMes.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Recibido de operadoras</p>
              </CardContent>
            </Card>
          </>
        ) : (
          /* ── Cards para inventario ── */
          <>
            <Card className="relative overflow-hidden border-0 shadow-sm bg-card">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Productos</p>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Package className="text-blue-600 dark:text-blue-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">{stats.totalProductos}</div>
                <p className="text-xs text-muted-foreground mt-1">En inventario activo</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm bg-card">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bajo Stock</p>
                <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="text-red-600 dark:text-red-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`text-3xl font-bold tracking-tight ${stats.bajoStockCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {stats.bajoStockCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.bajoStockCount === 0 ? 'Sin alertas 🎉' : 'Requieren reabastecimiento'}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Ventas e Ingresos SOLO para ADMIN/VENDEDOR */}
        {showVentasCards && (
          <>
            <Card className="relative overflow-hidden border-0 shadow-sm bg-card">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {rol === 'VENDEDOR' ? 'Tus Ventas' : 'Ventas'}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="text-violet-600 dark:text-violet-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">{stats.totalVentasFiltradas}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  +{stats.ventasHoy} hoy
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm bg-card">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {rol === 'VENDEDOR' ? 'Tus Ingresos' : 'Ingresos'}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="text-emerald-600 dark:text-emerald-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">S/.{stats.ingresoFiltrado.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {timeFilter === 'HOY'
                    ? 'Ingresos de hoy'
                    : timeFilter === 'SEMANA'
                      ? 'Esta semana'
                      : timeFilter === 'MES'
                        ? 'Este mes'
                        : 'Este año'}
                </p>
              </CardContent>
            </Card>

            {/* Gastos y Utilidad Neta — solo ADMIN */}
            {(rol === 'ADMIN') && (
              <>
                <Card className="relative overflow-hidden border-0 shadow-sm bg-card">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gastos</p>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="text-rose-600 dark:text-rose-400" size={18} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                      S/.{totalGastosPeriodo.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Egresos del período</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-0 shadow-sm bg-card">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Utilidad Neta</p>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="text-teal-600 dark:text-teal-400" size={18} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {(() => {
                      const utilidad = stats.ingresoFiltrado - totalGastosPeriodo;
                      const positiva = utilidad >= 0;
                      return (
                        <>
                          <div className={`text-3xl font-bold tracking-tight ${positiva ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            S/.{utilidad.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {positiva ? 'Ingresos − Gastos' : 'Pérdida neta del período'}
                          </p>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>

      {/* Low Stock Alert — físicos para dealer, todos los demás para inventario */}
      {stats.bajoStockItems.length > 0 && (
        <Card className="border-0 shadow-sm animate-fade-in-up-delay-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-base">Productos con Bajo Stock</CardTitle>
                <CardDescription className="text-xs">Requieren reabastecimiento urgente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {stats.bajoStockItems.map((producto) => (
                <div key={producto.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{producto.nombre}</p>
                    <p className="text-xs text-muted-foreground">{producto.codigoBarras}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{producto.stockActual} uds</p>
                      <p className="text-xs text-muted-foreground">mín. {producto.stockMinimo}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">Bajo</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Productos próximos a vencer — oculto para dealer */}
      {!esServicios && stats.productosProximosAVencer.length > 0 && (
        <Card className="border-0 shadow-sm animate-fade-in-up-delay-3">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">Próximos a Vencer</CardTitle>
                <CardDescription className="text-xs">
                  {stats.productosProximosAVencer.length} producto(s) vencen en los próximos 90 días
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {stats.productosProximosAVencer.map((producto) => {
                const fechaParts = producto.fechaVencimiento.split('T')[0].split('-');
                const fv = new Date(
                  parseInt(fechaParts[0]),
                  parseInt(fechaParts[1]) - 1,
                  parseInt(fechaParts[2])
                );

                const diasRestantes = Math.ceil(
                  (fv.getTime() - new Date(new Date().toLocaleDateString('en-US')).getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                const urgencia =
                  diasRestantes <= 7 ? 'destructive' : diasRestantes <= 15 ? 'warning' : 'secondary';

                return (
                  <div
                    key={`${producto.id}-${producto.fechaVencimiento}`}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{producto.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {producto.codigoBarras}
                        {producto.lote ? ` · Lote: ${producto.lote}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fv.toLocaleDateString('es-PE')}</p>
                        <p className="text-xs text-muted-foreground">{diasRestantes} días</p>
                      </div>
                      <Badge variant={urgencia as any} className="text-xs">
                        {diasRestantes <= 7
                          ? 'Urgente'
                          : diasRestantes <= 15
                            ? 'Pronto'
                            : 'Próximo'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}