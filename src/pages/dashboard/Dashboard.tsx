import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { productoService } from '../../services/producto.service';
import { ventaService } from '../../services/venta.service';
import { movimientoService } from '../../services/movimiento.service';
import { suscripcionService } from '../../services/suscripcion.service';
import type { ProductoDTO, VentaDTO, MovimientoInventarioDTO, SuscripcionDTO } from '../../types';
import { Package, ShoppingCart, AlertCircle, DollarSign, Clock, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';

type Role = 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'GESTOR_INVENTARIO';
type TimeFilter = 'HOY' | 'SEMANA' | 'MES' | 'ANUAL';

function safeRol(rol?: string): Role {
  if (rol === 'ADMIN' || rol === 'GERENTE' || rol === 'VENDEDOR' || rol === 'GESTOR_INVENTARIO') return rol;
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
  const { user, suscripcionEstado, setSuscripcionEstado } = useAuthStore();
  const { userId } = useCurrentUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rol = safeRol(user?.rol);

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventarioDTO[]>([]);
  const [canLoadVentas, setCanLoadVentas] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('HOY');

  // Estado de suscripción
  const [suscripcion, setSuscripcion] = useState<SuscripcionDTO | null>(user?.suscripcion ?? null);
  const [suscripcionLoading, setSuscripcionLoading] = useState(false);

  // Parámetro billing que viene de la página de retorno de Mercado Pago
  const billingParam = searchParams.get('billing');

  const ventasScopeLabel = useMemo(() => {
    if (rol === 'ADMIN' || rol === 'GERENTE') return 'globales';
    if (rol === 'VENDEDOR') return 'tuyas';
    return '—';
  }, [rol]);

  // Al regresar de Mercado Pago: sincronizar estado real desde MP
  useEffect(() => {
    if (!billingParam) return;

    setSearchParams((prev) => {
      prev.delete('billing');
      return prev;
    }, { replace: true });

    if (rol === 'ADMIN') {
      setSuscripcionLoading(true);
      suscripcionService
        .sincronizar()
        .then((s) => {
          setSuscripcionEstado(s.estado);
          setSuscripcion((prev) => ({
            ...(prev ?? { usuarioPrincipalId: 0, planId: s.planId ?? '', precioMensual: 0, estado: '' }),
            estado: s.estado,
            planId: s.planId,
            preapprovalId: s.preapprovalId,
            fechaProximoCobro: s.fechaProximoCobro,
          }));
        })
        .catch(() => {
          setSuscripcion((prev) => ({
            ...(prev ?? { usuarioPrincipalId: 0, planId: '', precioMensual: 0, estado: '' }),
            estado: billingParam,
          }));
        })
        .finally(() => setSuscripcionLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingParam]);

  const estadoSuscripcion = suscripcionEstado ?? suscripcion?.estado ?? user?.suscripcion?.estado ?? '';
  const suscripcionActiva = estadoSuscripcion === 'ACTIVA' || estadoSuscripcion === '' || !estadoSuscripcion;
  const mostrarBloqueo = rol === 'ADMIN' && !suscripcionActiva && !!estadoSuscripcion;

  const planParaReintentar = (suscripcion?.planId ?? user?.suscripcion?.planId ?? '') as string;
  const puedeReintentar = planParaReintentar === 'BASICO' || planParaReintentar === 'PRO';

  const handleReintentar = () => {
    navigate(`/checkout?plan=${planParaReintentar}`);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, userId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // ✅ Productos siempre
      const productosPromise = productoService.getAll();

      // ✅ Movimientos siempre
      let movimientosPromise: Promise<MovimientoInventarioDTO[]>;
      if (movimientoService.getAll) {
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
      if (rol === 'ADMIN' || rol === 'GERENTE') {
        setCanLoadVentas(true);
        ventasPromise = ventaService.getAll();
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
    const bajoStock = productos.filter((p) => p.stockActual <= p.stockMinimo);

    // ✅ NUEVO: productos próximos a vencer en 30 días (desde movimientos)
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    
    const proximosMes = new Date(ahora);
    proximosMes.setDate(proximosMes.getDate() + 30);

    if (import.meta.env.DEV) { console.log('📅 Debug vencimientos:');}
    if (import.meta.env.DEV) { console.log('   Hoy:', ahora.toLocaleDateString('es-PE'));}
    if (import.meta.env.DEV) { console.log('   Próximos 30 días hasta:', proximosMes.toLocaleDateString('es-PE'));}
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

      // Solo si vence entre hoy y +30 días
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

    return {
      totalProductos: productos.length,
      bajoStockCount: bajoStock.length,
      bajoStockItems: bajoStock.slice(0, 5),
      productosProximosAVencer,
      totalVentasFiltradas: filteredVentas.length,
      ingresoFiltrado,
      ventasHoy,
    };
  }, [productos, ventas, filteredVentas, movimientos]);

  const gridColsClass = rol === 'GESTOR_INVENTARIO' ? 'lg:grid-cols-2' : 'lg:grid-cols-4';

  if (loading || suscripcionLoading) return <LoadingSpinner />;

  const showVentasCards = canLoadVentas && (rol === 'ADMIN' || rol === 'GERENTE' || rol === 'VENDEDOR');

  return (
    <div className="relative space-y-6">
      {/* Alerta de suscripción y overlay de bloqueo */}
      {mostrarBloqueo && (
        <>
          {/* Overlay semitransparente sobre el contenido */}
          <div className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-background/60 backdrop-blur-[2px]" />

          {/* Banner de alerta (fuera del overlay para que sea clicable) */}
          <div className="relative z-20">
            {estadoSuscripcion === 'PENDIENTE' ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Tu suscripción está pendiente</p>
                      <p className="text-sm">
                        Tu pago está siendo procesado. Intenta nuevamente o espera la confirmación de Mercado Pago.
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
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Tu pago fue rechazado o cancelado</p>
                      <p className="text-sm">
                        Tu suscripción no está activa. Vuelve a intentarlo para continuar usando StockFlow.
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
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        {rol === 'ADMIN' || rol === 'GERENTE' ? (
          <p className="text-muted-foreground">Resumen general del sistema.</p>
        ) : rol === 'VENDEDOR' ? (
          <p className="text-muted-foreground">Resumen de tu desempeño (ventas {ventasScopeLabel}).</p>
        ) : (
          <p className="text-muted-foreground">Resumen de inventario (sin métricas de ventas).</p>
        )}
      </div>

      {/* Quick filter (solo si se muestran métricas de ventas) */}
      {showVentasCards && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Filtrar:</span>
          <Button
            type="button"
            variant={timeFilter === 'HOY' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter('HOY')}
          >
            Hoy
          </Button>
          <Button
            type="button"
            variant={timeFilter === 'SEMANA' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter('SEMANA')}
          >
            Semana
          </Button>
          <Button
            type="button"
            variant={timeFilter === 'MES' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter('MES')}
          >
            Mes
          </Button>
          <Button
            type="button"
            variant={timeFilter === 'ANUAL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter('ANUAL')}
          >
            Anual
          </Button>

          <Badge variant="secondary" className="ml-auto">
            {timeFilter === 'HOY'
              ? 'Hoy'
              : timeFilter === 'SEMANA'
                ? 'Esta semana'
                : timeFilter === 'MES'
                  ? 'Este mes'
                  : 'Este año'}
          </Badge>
        </div>
      )}

      {/* Stats Grid */}
      <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${gridColsClass}`}>
        {/* Productos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProductos}</div>
            <p className="text-xs text-muted-foreground">En inventario</p>
          </CardContent>
        </Card>

        {/* Bajo stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajo Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.bajoStockCount}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        {/* Ventas e Ingresos SOLO para ADMIN/GERENTE/VENDEDOR */}
        {showVentasCards && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {rol === 'VENDEDOR' ? 'Tus Ventas' : 'Ventas'}
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVentasFiltradas}</div>
                <p className="text-xs text-muted-foreground">+{stats.ventasHoy} hoy</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {rol === 'VENDEDOR' ? 'Tus Ingresos' : 'Ingresos'}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">S/.{stats.ingresoFiltrado.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {timeFilter === 'HOY'
                    ? 'Ingresos de hoy'
                    : timeFilter === 'SEMANA'
                      ? 'Ingresos de la semana'
                      : timeFilter === 'MES'
                        ? 'Ingresos del mes'
                        : 'Ingresos del año'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Low Stock Alert */}
      {stats.bajoStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Productos con Bajo Stock
            </CardTitle>
            <CardDescription>Productos que necesitan reabastecimiento urgente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.bajoStockItems.map((producto) => (
                <div key={producto.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{producto.nombre}</p>
                    <p className="text-sm text-muted-foreground">Código: {producto.codigoBarras}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">Stock: {producto.stockActual}</p>
                      <p className="text-xs text-muted-foreground">Mínimo: {producto.stockMinimo}</p>
                    </div>
                    <Badge variant="destructive">Bajo</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Productos próximos a vencer (30 días) */}
      {stats.productosProximosAVencer.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Productos Próximos a Vencer
            </CardTitle>
            <CardDescription>
              {stats.productosProximosAVencer.length} producto(s) vencen en los próximos 30 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                    className="flex items-center justify-between border-b pb-3 last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{producto.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        Código: {producto.codigoBarras}
                        {producto.lote ? ` | Lote: ${producto.lote}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">Vence: {fv.toLocaleDateString('es-PE')}</p>
                        <p className="text-xs text-muted-foreground">{diasRestantes} días restantes</p>
                      </div>
                      <Badge variant={urgencia as any}>
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