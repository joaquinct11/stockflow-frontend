import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productoService } from '../../services/producto.service';
import { ventaService } from '../../services/venta.service';
import { movimientoService } from '../../services/movimiento.service';
import { dashboardService, type ActividadRecienteDTO } from '../../services/dashboard.service';
import type { ProductoDTO, VentaDTO, MovimientoInventarioDTO, SuscripcionDTO } from '../../types';
import { Package, ShoppingCart, AlertCircle, Clock, RefreshCw, Calendar, CreditCard, Zap, ClipboardList, BarChart2, Wallet, FileText, Award, Users, ArrowRightLeft, PlusSquare } from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { gastoService } from '../../services/gasto.service';
import { comisionService } from '../../services/comision.service';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useSucursalStore } from '../../store/sucursalStore';
import { useOseConfigured } from '../../hooks/useOseConfigured';
import { OseBanner } from '../../components/shared/OseBanner';

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

function tipoActividadStyle(tipo: string) {
  switch (tipo) {
    case 'VENTA':       return { bg: 'bg-green-100 dark:bg-green-900/40',  text: 'text-green-700 dark:text-green-400',  letter: 'V' };
    case 'COMPROBANTE': return { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-400',    letter: 'F' };
    case 'ANULACION':   return { bg: 'bg-red-100 dark:bg-red-900/40',     text: 'text-red-700 dark:text-red-400',      letter: 'A' };
    case 'DEVOLUCION':  return { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-400',  letter: 'D' };
    case 'ENTRADA':     return { bg: 'bg-sky-100 dark:bg-sky-900/40',     text: 'text-sky-700 dark:text-sky-400',     letter: 'E' };
    case 'AJUSTE':      return { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-400', letter: 'A' };
    case 'MERMA':       return { bg: 'bg-red-100 dark:bg-red-900/40',     text: 'text-red-700 dark:text-red-400',     letter: 'M' };
    case 'ORDEN_COMPRA':return { bg: 'bg-violet-100 dark:bg-violet-900/40',text: 'text-violet-700 dark:text-violet-400',letter: 'O'};
    default:            return { bg: 'bg-muted',                          text: 'text-muted-foreground',              letter: '?' };
  }
}

function formatRelativo(fecha: Date): string {
  const diff = Date.now() - fecha.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.floor(hrs / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7)  return `hace ${dias} días`;
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
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
  const oseConfigured = useOseConfigured();

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventarioDTO[]>([]);
  const [canLoadVentas, setCanLoadVentas] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('MES');
  const isInitialLoad = useRef(true);
  const [totalComisionesMes, setTotalComisionesMes] = useState<number>(0);
  const [totalGastosPeriodo, setTotalGastosPeriodo] = useState<number>(0);
  const [actividad, setActividad] = useState<ActividadRecienteDTO[]>([]);
  const [actividadLoading, setActividadLoading] = useState(false);

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
  const esCancelacionPendiente = estadoSuscripcion === 'CANCELACION_PENDIENTE';


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
    isInitialLoad.current = true;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalLoaded, rol, userId, sucursalActual?.id]);

  // Re-fetcha solo ventas cuando cambia el tab (no en el mount inicial)
  useEffect(() => {
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    if (!canLoadVentas) return;
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 19);
    const rangeStart = getRangeStart(timeFilter, now);
    const promise = rol === 'ADMIN'
      ? ventaService.getByPeriod(fmt(rangeStart), fmt(now))
      : (userId ? ventaService.getByVendorAndPeriod(userId, fmt(rangeStart), fmt(now)) : Promise.resolve([] as VentaDTO[]));
    promise
      .then(setVentas)
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter]);

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

  // Actividad reciente — carga lazy después del render principal (no bloquea KPIs)
  useEffect(() => {
    if (!sucursalLoaded) return;
    setActividadLoading(true);
    const sucId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;
    dashboardService.getActividadReciente(15, sucId)
      .then(setActividad)
      .catch(() => setActividad([]))
      .finally(() => setActividadLoading(false));
  }, [sucursalLoaded, sucursalActual?.id]);

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

      const now = new Date();
      const fmt = (d: Date) => d.toISOString().slice(0, 19);

      // Movimientos: 30 días de actividad + endpoint dedicado para próximos a vencer
      let movimientosPromise: Promise<MovimientoInventarioDTO[]>;
      let proximosVencerPromise: Promise<MovimientoInventarioDTO[]>;
      if (rol === 'VENDEDOR') {
        movimientosPromise = Promise.resolve([]);
        proximosVencerPromise = movimientoService.getProximosAVencer(90).catch(() => []);
      } else {
        const sucId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;
        movimientosPromise = movimientoService
          .getRecientes(30, sucId)
          .catch((err) => {
            if (import.meta.env.DEV) { console.warn('⚠️ Error cargando movimientos:', err); }
            return [];
          });
        proximosVencerPromise = movimientoService.getProximosAVencer(90).catch(() => []);
      }

      // Ventas: carga según el tab activo (timeFilter)
      const rangeStart = getRangeStart(timeFilter, now);
      let ventasPromise: Promise<VentaDTO[]>;
      if (rol === 'ADMIN') {
        setCanLoadVentas(true);
        ventasPromise = ventaService.getByPeriod(fmt(rangeStart), fmt(now));
      } else if (rol === 'VENDEDOR' && userId) {
        setCanLoadVentas(true);
        ventasPromise = ventaService.getByVendorAndPeriod(userId, fmt(rangeStart), fmt(now));
      } else {
        setCanLoadVentas(rol === 'VENDEDOR');
        ventasPromise = Promise.resolve([]);
      }

      const [productosData, ventasData, movimientosData, proximosVencerData] = await Promise.all([
        productosPromise,
        ventasPromise,
        movimientosPromise,
        proximosVencerPromise,
      ]);

      setProductos(productosData);
      setVentas(ventasData);
      // Combina movimientos recientes + próximos a vencer (sin duplicados por id)
      const movimientosIds = new Set((movimientosData ?? []).map(m => m.id));
      const extra = (proximosVencerData ?? []).filter(m => !movimientosIds.has(m.id));
      setMovimientos([...(movimientosData ?? []), ...extra]);
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


      {/* Banner OSE / facturación */}
      {oseConfigured === false && <OseBanner />}

      {/* Header personalizado */}
      <div className="animate-fade-in-up flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {(() => {
              const h = new Date().getHours();
              return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
            })()}, {user?.nombre?.split(' ')[0] ?? 'bienvenido'} 👋
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {timeFilter === 'HOY' ? 'Resumen de hoy' : timeFilter === 'SEMANA' ? 'Resumen de la semana' : timeFilter === 'MES' ? 'Resumen del mes' : 'Resumen del año'}
          </h1>
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
              {/* ADMIN */}
              {rol === 'ADMIN' && (
                <>
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

                  <button
                    onClick={() => navigate('/dashboard/inventario', { state: { openDialog: true } })}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <ArrowRightLeft size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none">Ingresar Stock</p>
                      <p className="text-xs text-muted-foreground mt-1">Entrada / ajuste</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/productos', { state: { openDialog: true } })}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                      <PlusSquare size={18} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none">Nuevo Producto</p>
                      <p className="text-xs text-muted-foreground mt-1">Crear producto</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/inventario')}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                      <ClipboardList size={18} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none">Ver Movimientos</p>
                      <p className="text-xs text-muted-foreground mt-1">Historial stock</p>
                    </div>
                  </button>
                </>
              )}

              {/* VENDEDOR */}
              {rol === 'VENDEDOR' && (
                <>
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

                  <button
                    onClick={() => navigate('/dashboard/ventas')}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none">Mis Ventas</p>
                      <p className="text-xs text-muted-foreground mt-1">Ver historial</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/clientes')}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                      <Users size={18} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none">Clientes</p>
                      <p className="text-xs text-muted-foreground mt-1">Ver / buscar</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/productos')}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                      <Package size={18} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none">Productos</p>
                      <p className="text-xs text-muted-foreground mt-1">Ver stock</p>
                    </div>
                  </button>
                </>
              )}

              {/* GESTOR_INVENTARIO */}
              {rol === 'GESTOR_INVENTARIO' && (
                <>
                  <button
                    onClick={() => navigate('/dashboard/inventario', { state: { openDialog: true } })}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <ArrowRightLeft size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none">Ingresar Stock</p>
                      <p className="text-xs text-muted-foreground mt-1">Entrada / ajuste</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/inventario')}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                      <ClipboardList size={18} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none">Ver Movimientos</p>
                      <p className="text-xs text-muted-foreground mt-1">Historial stock</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/dashboard/compras/ordenes')}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/30 transition-all text-left group shadow-sm"
                  >
                    <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                      <ClipboardList size={18} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none">Nueva OC</p>
                      <p className="text-xs text-muted-foreground mt-1">Orden de compra</p>
                    </div>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Grid — 4 KPI cards */}
      <div className="grid gap-[14px] grid-cols-2 lg:grid-cols-4 animate-fade-in-up-delay-1">

        {esServicios ? (
          /* ── Cards para dealer ── */
          <>
            <div className="col-span-2 lg:col-span-2 p-[18px] bg-card border border-border rounded-2xl shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[.78rem] font-semibold text-muted-foreground">Unidades Vendidas</span>
              </div>
              <div className="text-[1.9rem] font-bold tracking-[-0.035em] mt-3 tabular-nums">{stats.unidadesVendidas}</div>
              <p className="text-[.78rem] text-muted-foreground mt-3">+{stats.unidadesHoy} hoy</p>
            </div>

            <div className="col-span-2 lg:col-span-2 p-[18px] bg-card border border-border rounded-2xl shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[.78rem] font-semibold text-muted-foreground">Comisiones del Mes</span>
              </div>
              <div className="text-[1.9rem] font-bold tracking-[-0.035em] mt-3 tabular-nums">S/ {totalComisionesMes.toFixed(2)}</div>
              <p className="text-[.78rem] text-muted-foreground mt-3">Recibido de operadoras</p>
            </div>
          </>
        ) : (
          /* ── 4 KPI cards para inventario ── */
          <>
            {/* Card 1: Ingresos */}
            <div className="col-span-2 lg:col-span-1 p-[18px] bg-card border border-border rounded-2xl shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[.78rem] font-semibold text-muted-foreground">
                  {timeFilter === 'HOY' ? 'Ingresos hoy' : timeFilter === 'SEMANA' ? 'Ingresos semana' : timeFilter === 'MES' ? 'Ingresos mes' : 'Ingresos año'}
                </span>
                {showVentasCards && stats.ingresoFiltrado > 0 && (
                  <span className="inline-flex items-center gap-[3px] text-[.72rem] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-[7px] py-[2px] flex-shrink-0">
                    ↑ activo
                  </span>
                )}
              </div>
              <div className="text-[1.9rem] font-bold tracking-[-0.035em] mt-3 tabular-nums">
                {showVentasCards ? `S/ ${stats.ingresoFiltrado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </div>
              {/* mini sparkline */}
              <div className="flex items-end gap-[3px] h-[30px] mt-3">
                <span className="flex-1 rounded-sm bg-primary" style={{ height: '38%', opacity: 0.22 }} />
                <span className="flex-1 rounded-sm bg-primary" style={{ height: '52%', opacity: 0.28 }} />
                <span className="flex-1 rounded-sm bg-primary" style={{ height: '44%', opacity: 0.28 }} />
                <span className="flex-1 rounded-sm bg-primary" style={{ height: '70%', opacity: 0.4 }} />
                <span className="flex-1 rounded-sm bg-primary" style={{ height: '58%', opacity: 0.4 }} />
                <span className="flex-1 rounded-sm bg-primary" style={{ height: '82%', opacity: 0.62 }} />
                <span className="flex-1 rounded-sm bg-primary" style={{ height: '100%' }} />
              </div>
            </div>

            {/* Card 2: Ventas */}
            <div className="p-[18px] bg-card border border-border rounded-2xl shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[.78rem] font-semibold text-muted-foreground">
                  {rol === 'VENDEDOR' ? 'Tus ventas' : timeFilter === 'HOY' ? 'Ventas hoy' : timeFilter === 'SEMANA' ? 'Ventas semana' : timeFilter === 'MES' ? 'Ventas mes' : 'Ventas año'}
                </span>
                {stats.ventasHoy > 0 && (
                  <span className="inline-flex items-center gap-[3px] text-[.72rem] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-[7px] py-[2px] flex-shrink-0">
                    ↑ {stats.ventasHoy} hoy
                  </span>
                )}
              </div>
              <div className="text-[1.9rem] font-bold tracking-[-0.035em] mt-3 tabular-nums">
                {showVentasCards ? stats.totalVentasFiltradas : '—'}
              </div>
              <p className="text-[.78rem] text-muted-foreground mt-3 leading-relaxed">
                Ticket promedio{' '}
                <strong className="text-foreground/80 font-semibold">
                  S/ {stats.totalVentasFiltradas > 0 ? (stats.ingresoFiltrado / stats.totalVentasFiltradas).toFixed(2) : '0.00'}
                </strong>
              </p>
            </div>

            {/* Card 3: Bajo stock */}
            <div className="p-[18px] bg-card border border-border rounded-2xl shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[.78rem] font-semibold text-muted-foreground">Bajo stock</span>
                {stats.bajoStockCount > 0 ? (
                  <span className="inline-flex items-center text-[.72rem] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-full px-[7px] py-[2px] flex-shrink-0">
                    Requiere acción
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[.72rem] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-[7px] py-[2px] flex-shrink-0">
                    Todo en orden
                  </span>
                )}
              </div>
              <div className={`text-[1.9rem] font-bold tracking-[-0.035em] mt-3 tabular-nums ${stats.bajoStockCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {stats.bajoStockCount}
              </div>
              <p className="text-[.78rem] text-muted-foreground mt-3 leading-relaxed">
                {stats.bajoStockCount === 0
                  ? 'Sin alertas de stock'
                  : `${stats.bajoStockItems.filter(p => p.stockActual === 0).length} sin stock · ${stats.bajoStockItems.filter(p => p.stockActual > 0).length} por debajo del mínimo`}
              </p>
            </div>

            {/* Card 4: Utilidad / Productos */}
            {rol === 'ADMIN' ? (
              (() => {
                const utilidad = stats.ingresoFiltrado - totalGastosPeriodo;
                const positiva = utilidad >= 0;
                return (
                  <div className="p-[18px] bg-card border border-border rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[.78rem] font-semibold text-muted-foreground">Utilidad neta</span>
                      <span className={`inline-flex items-center gap-[3px] text-[.72rem] font-bold rounded-full px-[7px] py-[2px] flex-shrink-0 ${positiva ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'}`}>
                        {positiva ? '↑' : '↓'} {positiva ? 'positiva' : 'negativa'}
                      </span>
                    </div>
                    <div className={`text-[1.9rem] font-bold tracking-[-0.035em] mt-3 tabular-nums ${positiva ? '' : 'text-red-600 dark:text-red-400'}`}>
                      S/ {utilidad.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[.78rem] text-muted-foreground mt-3 leading-relaxed">
                      Gastos <strong className="text-foreground/80 font-semibold">S/ {totalGastosPeriodo.toFixed(2)}</strong>
                    </p>
                  </div>
                );
              })()
            ) : (
              <div className="p-[18px] bg-card border border-border rounded-2xl shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[.78rem] font-semibold text-muted-foreground">Productos</span>
                </div>
                <div className="text-[1.9rem] font-bold tracking-[-0.035em] mt-3 tabular-nums">{stats.totalProductos}</div>
                <p className="text-[.78rem] text-muted-foreground mt-3">En inventario activo</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sección inferior — bajo stock · por vencer · actividad (2 columnas mockup) */}
      {!esServicios && (stats.bajoStockItems.length > 0 || stats.productosProximosAVencer.length > 0 || rol === 'ADMIN') && (
        <div className="grid gap-[14px] grid-cols-1 lg:grid-cols-[1.25fr_1fr] items-start animate-fade-in-up-delay-2">

          {/* Columna izquierda: Necesitan reposición */}
          {stats.bajoStockItems.length > 0 ? (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-[18px] py-[15px] border-b border-border/60">
                <div className="flex items-center gap-[9px]">
                  <span className="w-[7px] h-[7px] rounded-full bg-red-500 dark:bg-red-400 flex-shrink-0" />
                  <span className="text-[.92rem] font-[650]">Necesitan reposición</span>
                  <span className="text-[.7rem] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-full px-2 py-[2px]">
                    {stats.bajoStockCount}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/dashboard/productos?filtro=bajo-stock')}
                  className="text-[.8rem] font-semibold text-primary hover:underline"
                >
                  Ver todos
                </button>
              </div>
              <div className="overflow-y-auto overflow-x-hidden max-h-[330px]" style={{ overscrollBehavior: 'contain' }}>
                {stats.bajoStockItems.map((producto) => (
                  <div key={producto.id} className="flex items-center gap-[14px] px-[18px] py-[13px] border-b border-border/50 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[.875rem] font-semibold truncate">{producto.nombre}</p>
                      <p className="font-mono text-[.72rem] text-muted-foreground mt-[3px]">{producto.codigoBarras}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-[.875rem] font-bold tabular-nums ${producto.stockActual === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {producto.stockActual} und
                      </p>
                      <p className="text-[.72rem] text-muted-foreground mt-[3px]">mín. {producto.stockMinimo}</p>
                    </div>
                    <button
                      onClick={() => navigate('/dashboard/compras/ordenes')}
                      className="flex-shrink-0 text-[.78rem] font-semibold text-primary border border-primary/30 bg-primary/8 hover:bg-primary/15 rounded-lg px-[11px] py-[6px] transition-colors"
                    >
                      Pedir
                    </button>
                  </div>
                ))}
                <div className="h-px" />
              </div>
            </div>
          ) : (
            /* placeholder vacío para mantener el grid cuando solo hay por vencer / actividad */
            <div />
          )}

          {/* Columna derecha: Por vencer + Actividad reciente apiladas */}
          <div className="flex flex-col gap-[14px]">

            {/* Por vencer */}
            {stats.productosProximosAVencer.length > 0 && (
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-[18px] py-[15px] border-b border-border/60">
                  <div className="flex items-center gap-[9px]">
                    <span className="w-[7px] h-[7px] rounded-full bg-amber-500 dark:bg-amber-400 flex-shrink-0" />
                    <span className="text-[.92rem] font-[650]">Por vencer</span>
                    <span className="text-[.7rem] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-full px-2 py-[2px]">
                      {stats.productosProximosAVencer.length}
                    </span>
                  </div>
                  <span className="text-[.75rem] text-muted-foreground">próximos 90 días</span>
                </div>
                <div className="overflow-y-auto overflow-x-hidden max-h-[180px]" style={{ overscrollBehavior: 'contain' }}>
                  {stats.productosProximosAVencer.map((producto) => {
                    const fechaParts = producto.fechaVencimiento.split('T')[0].split('-');
                    const fv = new Date(parseInt(fechaParts[0]), parseInt(fechaParts[1]) - 1, parseInt(fechaParts[2]));
                    const diasRestantes = Math.ceil((fv.getTime() - new Date(new Date().toLocaleDateString('en-US')).getTime()) / (1000 * 60 * 60 * 24));
                    const badgeClass = diasRestantes <= 30
                      ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                      : diasRestantes <= 60
                        ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
                        : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30';
                    return (
                      <div key={`${producto.id}-${producto.fechaVencimiento}`} className="flex items-center gap-3 px-[18px] py-[12px] border-b border-border/50 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-[.86rem] font-semibold truncate">{producto.nombre}</p>
                          <p className="font-mono text-[.71rem] text-muted-foreground mt-[3px]">
                            {producto.lote ? `Lote ${producto.lote} · ` : ''}{producto.stockActual} und
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-[.74rem] font-bold rounded-[7px] px-2 py-1 ${badgeClass}`}>
                          {diasRestantes} días
                        </span>
                      </div>
                    );
                  })}
                  <div className="h-px" />
                </div>
              </div>
            )}

            {/* Actividad reciente (ADMIN) */}
            {rol === 'ADMIN' && (
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-[18px] py-[15px] border-b border-border/60">
                  <span className="text-[.92rem] font-[650]">Actividad reciente</span>
                </div>
                <div className="overflow-y-auto overflow-x-hidden max-h-[300px] px-[18px] pb-[14px]" style={{ overscrollBehavior: 'contain' }}>
                  {actividadLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      <RefreshCw size={13} className="mr-2 animate-spin" />
                      Cargando...
                    </div>
                  ) : actividad.length === 0 ? (
                    <p className="text-[.845rem] text-muted-foreground text-center py-6">Sin actividad reciente</p>
                  ) : (
                    actividad.map((item, i) => {
                      const { bg, text, letter } = tipoActividadStyle(item.tipo);
                      const fecha = new Date(item.fechaHora);
                      return (
                        <div key={i} className={`flex gap-3 py-[10px] ${i > 0 ? 'border-t border-border/50' : ''}`}>
                          <span className={`w-[28px] h-[28px] flex-shrink-0 rounded-lg flex items-center justify-center text-[.68rem] font-bold ${bg} ${text}`}>
                            {letter}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[.845rem] leading-[1.45]">
                              {item.descripcion}
                              {item.detalle && (
                                <span className="text-muted-foreground"> · {item.detalle}</span>
                              )}
                            </p>
                            <p className="font-mono text-[.71rem] text-muted-foreground mt-[3px]">
                              {formatRelativo(fecha)}{item.usuarioNombre ? ` · ${item.usuarioNombre}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Actividad reciente standalone — cuando no hay bajo stock ni vencimientos */}
      {rol === 'ADMIN' && esServicios && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden animate-fade-in-up-delay-2">
          <div className="flex items-center justify-between gap-3 px-[18px] py-[15px] border-b border-border/60">
            <span className="text-[.92rem] font-[650]">Actividad reciente</span>
          </div>
          <div className="overflow-y-auto overflow-x-hidden max-h-[300px] px-[18px] pb-[14px]" style={{ overscrollBehavior: 'contain' }}>
            {actividadLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <RefreshCw size={13} className="mr-2 animate-spin" />
                Cargando...
              </div>
            ) : actividad.length === 0 ? (
              <p className="text-[.845rem] text-muted-foreground text-center py-6">Sin actividad reciente</p>
            ) : (
              actividad.map((item, i) => {
                const { bg, text, letter } = tipoActividadStyle(item.tipo);
                const fecha = new Date(item.fechaHora);
                return (
                  <div key={i} className={`flex gap-3 py-[10px] ${i > 0 ? 'border-t border-border/50' : ''}`}>
                    <span className={`w-[28px] h-[28px] flex-shrink-0 rounded-lg flex items-center justify-center text-[.68rem] font-bold ${bg} ${text}`}>
                      {letter}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[.845rem] leading-[1.45]">
                        {item.descripcion}
                        {item.detalle && (
                          <span className="text-muted-foreground"> · {item.detalle}</span>
                        )}
                      </p>
                      <p className="font-mono text-[.71rem] text-muted-foreground mt-[3px]">
                        {formatRelativo(fecha)}{item.usuarioNombre ? ` · ${item.usuarioNombre}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}