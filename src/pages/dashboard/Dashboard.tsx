import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { productoService } from '../../services/producto.service';
import { ventaService } from '../../services/venta.service';
import type { ProductoDTO, VentaDTO } from '../../types';
import { Package, ShoppingCart, AlertCircle, DollarSign } from 'lucide-react';
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
  // Lunes como inicio de semana (puedes cambiarlo si quieres domingo)
  const x = startOfDay(d);
  const day = x.getDay(); // 0 domingo ... 6 sábado
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

/**
 * Intenta extraer una fecha de la venta con distintos campos posibles.
 * Ajusta esta función si tu VentaDTO usa otro nombre.
 */
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

export function Dashboard() {
  const { user } = useAuthStore();
  const { userId } = useCurrentUser();
  const rol = safeRol(user?.rol);

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [canLoadVentas, setCanLoadVentas] = useState<boolean>(false);

  // Nuevo: filtro rápido de tiempo
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('HOY');

  const ventasScopeLabel = useMemo(() => {
    if (rol === 'ADMIN' || rol === 'GERENTE') return 'globales';
    if (rol === 'VENDEDOR') return 'tuyas';
    return '—';
  }, [rol]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, userId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // ✅ Productos siempre
      const productosPromise = productoService.getAll();

      // ✅ Ventas según rol
      let ventasPromise: Promise<VentaDTO[]>;
      if (rol === 'ADMIN' || rol === 'GERENTE') {
        setCanLoadVentas(true);
        ventasPromise = ventaService.getAll();
      } else if (rol === 'VENDEDOR') {
        // si aún no tenemos userId, no pedimos ventas todavía
        if (!userId) {
          setCanLoadVentas(true);
          ventasPromise = Promise.resolve([]);
        } else {
          setCanLoadVentas(true);
          ventasPromise = ventaService.getByVendor(userId);
        }
      } else {
        // GESTOR_INVENTARIO: no debe ver ventas
        setCanLoadVentas(false);
        ventasPromise = Promise.resolve([]);
      }

      const [productosData, ventasData] = await Promise.all([productosPromise, ventasPromise]);

      setProductos(productosData);
      setVentas(ventasData);
    } catch (error: any) {
      // Si backend protege ventas y por error llamamos, no reventar el dashboard
      if (error?.response?.status === 403) {
        setVentas([]);
        setCanLoadVentas(false);
        toast.error('No tienes permisos para ver ventas');
      } else {
        toast.error('Error al cargar datos del dashboard');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVentas = useMemo(() => {
    const start = getRangeStart(timeFilter, new Date());
    const end = new Date(); // ahora

    return ventas.filter((v) => {
      const d = getVentaDate(v);
      if (!d) return false; // si no hay fecha consistente, no la contamos (evita números erróneos)
      return d >= start && d <= end;
    });
  }, [ventas, timeFilter]);

  const stats = useMemo(() => {
    const bajoStock = productos.filter((p) => p.stockActual <= p.stockMinimo);

    // ventas filtradas
    const ingresoFiltrado = filteredVentas.reduce((acc, v) => acc + (v.total || 0), 0);

    // solo para el label “+X hoy”
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

      // métricas según filtro
      totalVentasFiltradas: filteredVentas.length,
      ingresoFiltrado,

      ventasHoy,
    };
  }, [productos, ventas, filteredVentas]);

  const gridColsClass = rol === 'GESTOR_INVENTARIO' ? 'lg:grid-cols-2' : 'lg:grid-cols-4';

  if (loading) return <LoadingSpinner />;

  const showVentasCards = canLoadVentas && (rol === 'ADMIN' || rol === 'GERENTE' || rol === 'VENDEDOR');

  return (
    <div className="space-y-6">
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
    </div>
  );
}