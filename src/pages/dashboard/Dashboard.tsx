import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { productoService } from '../../services/producto.service';
import { ventaService } from '../../services/venta.service';
import type { ProductoDTO, VentaDTO } from '../../types';
import { Package, ShoppingCart, AlertCircle, DollarSign } from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';

type Role = 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'GESTOR_INVENTARIO';

function safeRol(rol?: string): Role {
  if (rol === 'ADMIN' || rol === 'GERENTE' || rol === 'VENDEDOR' || rol === 'GESTOR_INVENTARIO') return rol;
  return 'VENDEDOR';
}

export function Dashboard() {
  const { user } = useAuthStore();
  const { userId } = useCurrentUser();
  const rol = safeRol(user?.rol);

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [canLoadVentas, setCanLoadVentas] = useState<boolean>(false);

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

  const stats = useMemo(() => {
    const bajoStock = productos.filter((p) => p.stockActual <= p.stockMinimo);
    const ingresoTotal = ventas.reduce((acc, v) => acc + (v.total || 0), 0);

    // TODO: cuando tengas createdAt consistente, filtra por fecha real
    const ventasHoy = ventas.length;

    return {
      totalProductos: productos.length,
      bajoStockCount: bajoStock.length,
      bajoStockItems: bajoStock.slice(0, 5),
      totalVentas: ventas.length,
      ventasHoy,
      ingresoTotal,
    };
  }, [productos, ventas]);

  const gridColsClass =
    rol === 'GESTOR_INVENTARIO'
      ? 'lg:grid-cols-2'
      : 'lg:grid-cols-4';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        {rol === 'ADMIN' || rol === 'GERENTE' ? (
          <p className="text-muted-foreground">Resumen general del sistema.</p>
        ) : rol === 'VENDEDOR' ? (
          <p className="text-muted-foreground">
            Resumen de tu desempeño (ventas {ventasScopeLabel}).
          </p>
        ) : (
          <p className="text-muted-foreground">
            Resumen de inventario (sin métricas de ventas).
          </p>
        )}

      </div>

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
        {canLoadVentas && (rol === 'ADMIN' || rol === 'GERENTE' || rol === 'VENDEDOR') && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {rol === 'VENDEDOR' ? 'Tus Ventas' : 'Ventas Totales'}
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVentas}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats.ventasHoy} hoy
                </p>
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
                <div className="text-2xl font-bold">S/.{stats.ingresoTotal.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Total acumulado</p>
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
            <CardDescription>
              Productos que necesitan reabastecimiento urgente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.bajoStockItems.map((producto) => (
                <div key={producto.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{producto.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      Código: {producto.codigoBarras}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">Stock: {producto.stockActual}</p>
                      <p className="text-xs text-muted-foreground">
                        Mínimo: {producto.stockMinimo}
                      </p>
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