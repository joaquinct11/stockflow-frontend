import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  Lock,
  Boxes,
  ClipboardCheck,
} from 'lucide-react';
import { reportesService } from '../../services/reportes.service';
import type { ReportesResumenDTO } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { usePermissions } from '../../hooks/usePermissions';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function defaultDesde(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toDateString(d);
}

function defaultHasta(): string {
  return toDateString(new Date());
}

function formatSoles(value: number | null | undefined): string {
  if (value == null) return '—';
  return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNum(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('es-PE');
}

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description?: string;
  colorClass?: string;
}

function StatCard({ icon, title, value, description, colorClass = 'text-foreground' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReportesPage() {
  const { canView } = usePermissions();
  const hasAccess = canView('REPORTES');

  const [desde, setDesde] = useState<string>(defaultDesde());
  const [hasta, setHasta] = useState<string>(defaultHasta());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportesResumenDTO | null>(null);

  const fetchResumen = async () => {
    if (!desde || !hasta) {
      toast.error('Selecciona un rango de fechas');
      return;
    }
    if (desde > hasta) {
      toast.error('La fecha "Desde" no puede ser mayor a "Hasta"');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const resumen = await reportesService.getResumen(desde, hasta);
      setData(resumen);
    } catch (err) {
      console.error(err);
      const msg = 'Error al cargar el reporte. Intenta nuevamente.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── No access ──────────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <EmptyState
        icon={Lock}
        title="Sin acceso"
        description="No tienes permisos para ver el módulo de Reportes."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Resumen operativo del negocio por período
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-sm font-medium" htmlFor="rpt-desde">
                Desde
              </label>
              <Input
                id="rpt-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-sm font-medium" htmlFor="rpt-hasta">
                Hasta
              </label>
              <Input
                id="rpt-hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <Button onClick={fetchResumen} disabled={loading} className="w-full sm:w-auto">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && <LoadingSpinner />}

      {/* Error */}
      {!loading && error && (
        <EmptyState
          icon={AlertTriangle}
          title="Error al cargar datos"
          description={error}
          action={{ label: 'Reintentar', onClick: fetchResumen }}
        />
      )}

      {/* Empty (no data yet) */}
      {!loading && !error && !data && (
        <EmptyState
          icon={BarChart3}
          title="Sin datos"
          description="Selecciona un rango de fechas y presiona Actualizar para ver el resumen."
        />
      )}

      {/* Results */}
      {!loading && !error && data && (
        <div className="space-y-6">
          {/* ── Inventario ─────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-muted-foreground" />
              Inventario
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                icon={<Package className="h-5 w-5" />}
                title="Total productos"
                value={formatNum(data.totalProductos)}
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                title="Valorización de stock"
                value={formatSoles(data.valorizacionStock)}
                colorClass="text-green-600"
              />
              <StatCard
                icon={<AlertTriangle className="h-5 w-5" />}
                title="Productos bajo stock"
                value={formatNum(data.productosBajoStock.length)}
                colorClass={data.productosBajoStock.length > 0 ? 'text-red-600' : 'text-foreground'}
              />
            </div>
          </section>

          {/* ── Productos bajo stock (top 10) ──────────────────────────────── */}
          {data.productosBajoStock.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Productos bajo stock mínimo</CardTitle>
                <CardDescription>
                  Top {Math.min(data.productosBajoStock.length, 10)} productos que requieren reposición
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Stock actual</TableHead>
                        <TableHead className="text-center">Stock mínimo</TableHead>
                        <TableHead className="text-center">Déficit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.productosBajoStock.slice(0, 10).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nombre}</TableCell>
                          <TableCell className="text-center text-red-600 font-semibold">
                            {p.stockActual}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {p.stockMinimo}
                          </TableCell>
                          <TableCell className="text-center text-red-600 font-semibold">
                            {p.stockMinimo - p.stockActual}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Movimientos ────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Movimientos de inventario
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                title="Entradas (unidades)"
                value={formatNum(data.entradasCantidad)}
                colorClass="text-green-600"
              />
              <StatCard
                icon={<TrendingDown className="h-5 w-5" />}
                title="Salidas (unidades)"
                value={formatNum(data.salidasCantidad)}
                colorClass="text-red-600"
              />
            </div>
          </section>

          {/* ── Recepciones ────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              Recepciones
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                icon={<ClipboardCheck className="h-5 w-5" />}
                title="Recepciones confirmadas"
                value={formatNum(data.recepcionesConfirmadasCount)}
              />
              <StatCard
                icon={<Package className="h-5 w-5" />}
                title="Unidades recibidas"
                value={formatNum(data.unidadesRecibidas)}
              />
            </div>
          </section>

          {/* ── Ventas (opcional) ──────────────────────────────────────────── */}
          {data.ventas !== null && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                Ventas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<ShoppingCart className="h-5 w-5" />}
                  title="Número de ventas"
                  value={formatNum(data.ventas.ventasCount)}
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  title="Ingresos totales"
                  value={formatSoles(data.ventas.ingresosTotal)}
                  colorClass="text-green-600"
                />
                <StatCard
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Ticket promedio"
                  value={formatSoles(data.ventas.ticketPromedio)}
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  title="Margen estimado"
                  value={formatSoles(data.ventas.margenEstimado)}
                  colorClass={
                    data.ventas.margenEstimado != null && data.ventas.margenEstimado > 0
                      ? 'text-green-600'
                      : 'text-foreground'
                  }
                />
              </div>

              {/* Top productos vendidos */}
              {data.ventas.topProductosVendidos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top productos vendidos</CardTitle>
                    <CardDescription>Período seleccionado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-center">Unidades</TableHead>
                            <TableHead className="text-right">Ingresos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.ventas.topProductosVendidos.map((p, idx) => (
                            <TableRow key={p.productoId}>
                              <TableCell className="text-muted-foreground text-sm">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-medium">{p.nombre}</TableCell>
                              <TableCell className="text-center">{p.cantidadVendida}</TableCell>
                              <TableCell className="text-right">{formatSoles(p.ingresos)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
