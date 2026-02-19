import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { productoService } from '../../services/producto.service';
import { ventaService } from '../../services/venta.service';
import type { ProductoDTO, VentaDTO } from '../../types';
import { Package, ShoppingCart, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [ventas, setVentas] = useState<VentaDTO[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productosData, ventasData] = await Promise.all([
        productoService.getAll(),
        ventaService.getAll(),
      ]);
      setProductos(productosData);
      setVentas(ventasData);
    } catch (error) {
      toast.error('Error al cargar datos del dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = {
    totalProductos: productos.length,
    bajoStock: productos.filter(p => p.stockActual <= p.stockMinimo).length,
    totalVentas: ventas.length,
    ventasHoy: ventas.filter(v => {
      // Filtrar ventas de hoy (simplificado)
      return true;
    }).length,
    ingresoTotal: ventas.reduce((acc, v) => acc + v.total, 0),
  };

  const productosConBajoStock = productos
    .filter(p => p.stockActual <= p.stockMinimo)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general del sistema de inventario
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProductos}</div>
            <p className="text-xs text-muted-foreground">
              En inventario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajo Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.bajoStock}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
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
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/.{stats.ingresoTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total acumulado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {productosConBajoStock.length > 0 && (
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
              {productosConBajoStock.map((producto) => (
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