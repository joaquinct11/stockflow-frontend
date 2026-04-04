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
  Truck,
} from 'lucide-react';
import { reportesService } from '../../services/reportes.service';
import type { AgrupacionTendencia, MetricaProductos } from '../../services/reportes.service';
import type {
  ReportesResumenDTO,
  VentasTendenciaPuntoDTO,
  VentasPorVendedorDTO,
  VentasPorCategoriaDTO,
  VentasPorMetodoPagoDTO,
  VentasProductoDTO,
  InventarioABCDTO,
  InventarioSlowMoverDTO,
  InventarioCoberturaDTO,
  ComprasPorProveedorDTO,
} from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
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

function formatPct(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toFixed(1)} %`;
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

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type TabId = 'resumen' | 'ventas' | 'inventario' | 'compras';

const TABS: { id: TabId; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'compras', label: 'Compras' },
];

interface TabBarProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex gap-1 border-b">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === t.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tab loading/error helpers ────────────────────────────────────────────────

function TabLoading() {
  return (
    <div className="flex justify-center py-12">
      <LoadingSpinner />
    </div>
  );
}

function TabError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Error al cargar datos"
      description={message}
      action={{ label: 'Reintentar', onClick: onRetry }}
    />
  );
}

function TabEmpty() {
  return (
    <EmptyState
      icon={BarChart3}
      title="Sin datos"
      description="Presiona Actualizar para cargar los datos."
    />
  );
}

// ─── Resumen tab ──────────────────────────────────────────────────────────────

interface ResumenTabProps {
  loading: boolean;
  error: string | null;
  data: ReportesResumenDTO | null;
  onRetry: () => void;
}

function ResumenTab({ loading, error, data, onRetry }: ResumenTabProps) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  return (
    <div className="space-y-6">
      {/* Inventario */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Boxes className="h-5 w-5 text-muted-foreground" />
          Inventario
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={<Package className="h-5 w-5" />} title="Total productos" value={formatNum(data.totalProductos)} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Valorización de stock" value={formatSoles(data.valorizacionStock)} colorClass="text-green-600" />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Productos bajo stock"
            value={formatNum(data.productosBajoStock?.length)}
            colorClass={(data.productosBajoStock?.length ?? 0) > 0 ? 'text-red-600' : 'text-foreground'}
          />
        </div>
      </section>

      {/* Productos bajo stock */}
      {(data.productosBajoStock?.length ?? 0) > 0 && (
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
                      <TableCell className="text-center text-red-600 font-semibold">{p.stockActual}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{p.stockMinimo}</TableCell>
                      <TableCell className="text-center text-red-600 font-semibold">{p.stockMinimo - p.stockActual}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movimientos */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          Movimientos de inventario
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Entradas (unidades)" value={formatNum(data.entradasCantidad)} colorClass="text-green-600" />
          <StatCard icon={<TrendingDown className="h-5 w-5" />} title="Salidas (unidades)" value={formatNum(data.salidasCantidad)} colorClass="text-red-600" />
        </div>
      </section>

      {/* Recepciones */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          Recepciones
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={<ClipboardCheck className="h-5 w-5" />} title="Recepciones confirmadas" value={formatNum(data.recepcionesConfirmadasCount)} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Unidades recibidas" value={formatNum(data.unidadesRecibidas)} />
        </div>
      </section>

      {/* Ventas (opcional) */}
      {data.ventas != null && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            Ventas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<ShoppingCart className="h-5 w-5" />} title="Número de ventas" value={formatNum(data.ventas.ventasCount)} />
            <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Ingresos totales" value={formatSoles(data.ventas.ingresosTotal)} colorClass="text-green-600" />
            <StatCard icon={<BarChart3 className="h-5 w-5" />} title="Ticket promedio" value={formatSoles(data.ventas.ticketPromedio)} />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Margen estimado"
              value={formatSoles(data.ventas.margenEstimado)}
              colorClass={data.ventas.margenEstimado != null && data.ventas.margenEstimado > 0 ? 'text-green-600' : 'text-foreground'}
            />
          </div>

          {(data.ventas.topProductosVendidos?.length ?? 0) > 0 && (
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
                          <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
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
  );
}

// ─── Ventas tab ───────────────────────────────────────────────────────────────

interface VentasData {
  tendencia: VentasTendenciaPuntoDTO[];
  porVendedor: VentasPorVendedorDTO[];
  porCategoria: VentasPorCategoriaDTO[];
  porMetodoPago: VentasPorMetodoPagoDTO[];
  topProductos: VentasProductoDTO[];
  menosProductos: VentasProductoDTO[];
}

interface VentasTabProps {
  loading: boolean;
  error: string | null;
  data: VentasData | null;
  agrupacion: AgrupacionTendencia;
  setAgrupacion: (v: AgrupacionTendencia) => void;
  metrica: MetricaProductos;
  setMetrica: (v: MetricaProductos) => void;
  onRetry: () => void;
}

function VentasTab({ loading, error, data, agrupacion, setAgrupacion, metrica, setMetrica, onRetry }: VentasTabProps) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const totalIngresos = data.porMetodoPago.reduce((s, r) => s + (r.ingresos ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Tendencia */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base">Tendencia de ventas</CardTitle>
              <CardDescription>Ingresos y número de ventas por período</CardDescription>
            </div>
            <div className="flex gap-1">
              {(['DIA', 'SEMANA', 'MES'] as AgrupacionTendencia[]).map((a) => (
                <Button key={a} size="sm" variant={agrupacion === a ? 'default' : 'outline'} onClick={() => setAgrupacion(a)}>
                  {a === 'DIA' ? 'Día' : a === 'SEMANA' ? 'Semana' : 'Mes'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.tendencia.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos para el período seleccionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-center">Ventas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tendencia.map((p) => (
                    <TableRow key={p.periodo}>
                      <TableCell>{p.periodo}</TableCell>
                      <TableCell className="text-center">{formatNum(p.ventasCount)}</TableCell>
                      <TableCell className="text-right">{formatSoles(p.ingresos)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por vendedor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas por vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          {data.porVendedor.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Ventas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Ticket prom.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.porVendedor.map((v) => (
                    <TableRow key={v.vendedorId}>
                      <TableCell className="font-medium">{v.vendedorNombre}</TableCell>
                      <TableCell className="text-center">{formatNum(v.ventasCount)}</TableCell>
                      <TableCell className="text-right">{formatSoles(v.ingresos)}</TableCell>
                      <TableCell className="text-right">{formatSoles(v.ticketPromedio)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por categoría */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {data.porCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-center">Ventas</TableHead>
                    <TableHead className="text-center">Unidades</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.porCategoria.map((c) => (
                    <TableRow key={c.categoria}>
                      <TableCell className="font-medium">{c.categoria}</TableCell>
                      <TableCell className="text-center">{formatNum(c.ventasCount)}</TableCell>
                      <TableCell className="text-center">{formatNum(c.unidades)}</TableCell>
                      <TableCell className="text-right">{formatSoles(c.ingresos)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por método de pago */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas por método de pago</CardTitle>
        </CardHeader>
        <CardContent>
          {data.porMetodoPago.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método de pago</TableHead>
                    <TableHead className="text-center">Ventas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.porMetodoPago.map((m) => {
                    const pct = m.porcentaje != null ? m.porcentaje : totalIngresos > 0 ? (m.ingresos / totalIngresos) * 100 : null;
                    return (
                      <TableRow key={m.metodoPago}>
                        <TableCell className="font-medium">{m.metodoPago}</TableCell>
                        <TableCell className="text-center">{formatNum(m.ventasCount)}</TableCell>
                        <TableCell className="text-right">{formatSoles(m.ingresos)}</TableCell>
                        <TableCell className="text-right">{formatPct(pct)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top / Menos productos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base">Productos por desempeño</CardTitle>
              <CardDescription>Top 10 más y menos vendidos</CardDescription>
            </div>
            <div className="flex gap-1">
              {(['UNIDADES', 'INGRESOS'] as MetricaProductos[]).map((m) => (
                <Button key={m} size="sm" variant={metrica === m ? 'default' : 'outline'} onClick={() => setMetrica(m)}>
                  {m === 'UNIDADES' ? 'Unidades' : 'Ingresos'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top MAS */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" /> Más vendidos
              </p>
              {data.topProductos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">{metrica === 'UNIDADES' ? 'Unidades' : 'Ingresos'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProductos.map((p, i) => (
                      <TableRow key={p.productoId}>
                        <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-right">
                          {metrica === 'UNIDADES' ? formatNum(p.cantidadVendida) : formatSoles(p.ingresos)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Top MENOS */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <TrendingDown className="h-4 w-4 text-red-600" /> Menos vendidos
              </p>
              {data.menosProductos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">{metrica === 'UNIDADES' ? 'Unidades' : 'Ingresos'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.menosProductos.map((p, i) => (
                      <TableRow key={p.productoId}>
                        <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-right">
                          {metrica === 'UNIDADES' ? formatNum(p.cantidadVendida) : formatSoles(p.ingresos)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inventario tab ───────────────────────────────────────────────────────────

interface InventarioData {
  abc: InventarioABCDTO[];
  slowMovers: InventarioSlowMoverDTO[];
  cobertura: InventarioCoberturaDTO[];
}

interface InventarioTabProps {
  loading: boolean;
  error: string | null;
  data: InventarioData | null;
  onRetry: () => void;
}

function abcVariant(clasificacion: string): 'success' | 'warning' | 'destructive' | 'default' {
  if (clasificacion === 'A') return 'success';
  if (clasificacion === 'B') return 'warning';
  if (clasificacion === 'C') return 'destructive';
  return 'default';
}

function InventarioTab({ loading, error, data, onRetry }: InventarioTabProps) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  return (
    <div className="space-y-6">
      {/* ABC */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análisis ABC</CardTitle>
          <CardDescription>Clasificación de productos por participación en ingresos</CardDescription>
        </CardHeader>
        <CardContent>
          {data.abc.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Clase</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">% Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.abc.map((p) => (
                    <TableRow key={p.productoId}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={abcVariant(p.clasificacion)}>{p.clasificacion}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatSoles(p.ingresos)}</TableCell>
                      <TableCell className="text-right">{formatPct(p.porcentajeAcumulado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slow movers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos sin movimiento</CardTitle>
          <CardDescription>Productos con pocas o nulas salidas recientes</CardDescription>
        </CardHeader>
        <CardContent>
          {data.slowMovers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-right">Costo total</TableHead>
                    <TableHead className="text-right">Días sin salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slowMovers.map((p) => (
                    <TableRow key={p.productoId}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-center">{formatNum(p.stockActual)}</TableCell>
                      <TableCell className="text-right">{formatSoles(p.costoTotal)}</TableCell>
                      <TableCell className="text-right">{formatNum(p.diasSinSalida)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cobertura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cobertura de stock</CardTitle>
          <CardDescription>Días estimados de stock disponible según demanda reciente</CardDescription>
        </CardHeader>
        <CardContent>
          {data.cobertura.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-right">Salidas/día (prom.)</TableHead>
                    <TableHead className="text-right">Días cobertura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cobertura.map((p) => (
                    <TableRow key={p.productoId}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-center">{formatNum(p.stockActual)}</TableCell>
                      <TableCell className="text-right">
                        {p.promedioSalidasDia != null ? p.promedioSalidasDia.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.diasCobertura != null ? formatNum(p.diasCobertura) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Compras tab ──────────────────────────────────────────────────────────────

interface ComprasTabProps {
  loading: boolean;
  error: string | null;
  data: ComprasPorProveedorDTO[] | null;
  onRetry: () => void;
}

function ComprasTab({ loading, error, data, onRetry }: ComprasTabProps) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            Compras por proveedor
          </CardTitle>
          <CardDescription>Recepciones confirmadas en el período</CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-center">Recepciones</TableHead>
                    <TableHead className="text-center">Unidades</TableHead>
                    <TableHead className="text-right">Monto estimado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p) => (
                    <TableRow key={p.proveedorId}>
                      <TableCell className="font-medium">{p.proveedorNombre}</TableCell>
                      <TableCell className="text-center">{formatNum(p.recepciones)}</TableCell>
                      <TableCell className="text-center">{formatNum(p.unidades)}</TableCell>
                      <TableCell className="text-right">{formatSoles(p.montoEstimado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReportesPage() {
  const { canView } = usePermissions();
  const hasAccess = canView('REPORTES');

  const [desde, setDesde] = useState<string>(defaultDesde());
  const [hasta, setHasta] = useState<string>(defaultHasta());
  const [activeTab, setActiveTab] = useState<TabId>('resumen');

  // ── Per-tab state ──────────────────────────────────────────────────────────
  const [resumenLoading, setResumenLoading] = useState(false);
  const [resumenError, setResumenError] = useState<string | null>(null);
  const [resumenData, setResumenData] = useState<ReportesResumenDTO | null>(null);

  const [ventasLoading, setVentasLoading] = useState(false);
  const [ventasError, setVentasError] = useState<string | null>(null);
  const [ventasData, setVentasData] = useState<VentasData | null>(null);
  const [agrupacion, setAgrupacion] = useState<AgrupacionTendencia>('DIA');
  const [metrica, setMetrica] = useState<MetricaProductos>('UNIDADES');

  const [inventarioLoading, setInventarioLoading] = useState(false);
  const [inventarioError, setInventarioError] = useState<string | null>(null);
  const [inventarioData, setInventarioData] = useState<InventarioData | null>(null);

  const [comprasLoading, setComprasLoading] = useState(false);
  const [comprasError, setComprasError] = useState<string | null>(null);
  const [comprasData, setComprasData] = useState<ComprasPorProveedorDTO[] | null>(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchResumen = async () => {
    try {
      setResumenLoading(true);
      setResumenError(null);
      const data = await reportesService.getResumen(desde, hasta);
      setResumenData(data);
    } catch {
      const msg = 'Error al cargar el resumen.';
      setResumenError(msg);
      toast.error(msg);
    } finally {
      setResumenLoading(false);
    }
  };

  const fetchVentas = async (ag: AgrupacionTendencia = agrupacion, met: MetricaProductos = metrica) => {
    try {
      setVentasLoading(true);
      setVentasError(null);
      const [tendencia, porVendedor, porCategoria, porMetodoPago, topProductos, menosProductos] = await Promise.all([
        reportesService.getVentasTendencia(desde, hasta, ag),
        reportesService.getVentasPorVendedor(desde, hasta),
        reportesService.getVentasPorCategoria(desde, hasta),
        reportesService.getVentasPorMetodoPago(desde, hasta),
        reportesService.getVentasProductos(desde, hasta, 10, 'MAS', met),
        reportesService.getVentasProductos(desde, hasta, 10, 'MENOS', met),
      ]);
      setVentasData({ tendencia, porVendedor, porCategoria, porMetodoPago, topProductos, menosProductos });
    } catch {
      const msg = 'Error al cargar datos de ventas.';
      setVentasError(msg);
      toast.error(msg);
    } finally {
      setVentasLoading(false);
    }
  };

  const fetchInventario = async () => {
    try {
      setInventarioLoading(true);
      setInventarioError(null);
      const [abc, slowMovers, cobertura] = await Promise.all([
        reportesService.getInventarioABC(desde, hasta),
        reportesService.getInventarioSlowMovers(30),
        reportesService.getInventarioCobertura(desde, hasta),
      ]);
      setInventarioData({ abc, slowMovers, cobertura });
    } catch {
      const msg = 'Error al cargar datos de inventario.';
      setInventarioError(msg);
      toast.error(msg);
    } finally {
      setInventarioLoading(false);
    }
  };

  const fetchCompras = async () => {
    try {
      setComprasLoading(true);
      setComprasError(null);
      const data = await reportesService.getComprasPorProveedor(desde, hasta);
      setComprasData(data);
    } catch {
      const msg = 'Error al cargar datos de compras.';
      setComprasError(msg);
      toast.error(msg);
    } finally {
      setComprasLoading(false);
    }
  };

  // ── Actualizar: fetch all tabs in parallel ─────────────────────────────────

  const handleActualizar = () => {
    if (!desde || !hasta) {
      toast.error('Selecciona un rango de fechas');
      return;
    }
    if (desde > hasta) {
      toast.error('La fecha "Desde" no puede ser mayor a "Hasta"');
      return;
    }
    fetchResumen();
    fetchVentas(agrupacion, metrica);
    fetchInventario();
    fetchCompras();
  };

  const isAnyLoading = resumenLoading || ventasLoading || inventarioLoading || comprasLoading;

  // ── Agrupacion/metrica changes re-fetch ventas ─────────────────────────────

  const handleAgrupacion = (ag: AgrupacionTendencia) => {
    setAgrupacion(ag);
    if (ventasData) fetchVentas(ag, metrica);
  };

  const handleMetrica = (met: MetricaProductos) => {
    setMetrica(met);
    if (ventasData) fetchVentas(agrupacion, met);
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
        <p className="text-muted-foreground">Dashboard operativo del negocio por período</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-sm font-medium" htmlFor="rpt-desde">Desde</label>
              <Input id="rpt-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full sm:w-40" />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-sm font-medium" htmlFor="rpt-hasta">Hasta</label>
              <Input id="rpt-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full sm:w-40" />
            </div>
            <Button onClick={handleActualizar} disabled={isAnyLoading} className="w-full sm:w-auto">
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnyLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div>
        {activeTab === 'resumen' && (
          <ResumenTab loading={resumenLoading} error={resumenError} data={resumenData} onRetry={fetchResumen} />
        )}
        {activeTab === 'ventas' && (
          <VentasTab
            loading={ventasLoading}
            error={ventasError}
            data={ventasData}
            agrupacion={agrupacion}
            setAgrupacion={handleAgrupacion}
            metrica={metrica}
            setMetrica={handleMetrica}
            onRetry={() => fetchVentas()}
          />
        )}
        {activeTab === 'inventario' && (
          <InventarioTab loading={inventarioLoading} error={inventarioError} data={inventarioData} onRetry={fetchInventario} />
        )}
        {activeTab === 'compras' && (
          <ComprasTab loading={comprasLoading} error={comprasError} data={comprasData} onRetry={fetchCompras} />
        )}
      </div>
    </div>
  );
}

