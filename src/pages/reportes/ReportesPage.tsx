import { useEffect, useState } from 'react';
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
  DollarSign,
  Target,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
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
  ProductoBajoStockDTO,
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

// ─── Palette ──────────────────────────────────────────────────────────────────

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const COLOR_PRIMARY = '#6366f1';
const COLOR_SUCCESS = '#10b981';
const COLOR_WARNING = '#f59e0b';
// const COLOR_DANGER  = '#ef4444';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

function startOfYear(): string {
  const d = new Date();
  d.setMonth(0, 1);
  return toDateString(d);
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

function shortLabel(label: string, max = 12): string {
  return label.length > max ? label.slice(0, max) + '…' : label;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description?: string;
  colorClass?: string;
  trend?: { value: number; label: string };
}

function StatCard({ icon, title, value, description, colorClass = 'text-foreground', trend }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{title}</p>
        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className={`text-3xl font-bold tracking-tight ${colorClass}`}>{value}</p>
        {trend && (
          <p className={`text-xs flex items-center gap-1 mt-1 ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}% {trend.label}
          </p>
        )}
        {description && !trend && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  color?: string;
  name?: string;
  value?: number;
}

function ChartTooltip({ active, payload, label, isSoles = true }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  isSoles?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm space-y-1">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: {isSoles ? formatSoles(p.value) : formatNum(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type TabId = 'resumen' | 'ventas' | 'inventario' | 'compras';
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen',    label: 'Resumen',    icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'ventas',     label: 'Ventas',     icon: <ShoppingCart className="h-4 w-4" /> },
  { id: 'inventario', label: 'Inventario', icon: <Boxes className="h-4 w-4" /> },
  { id: 'compras',    label: 'Compras',    icon: <Truck className="h-4 w-4" /> },
];

function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <div className="flex gap-1 border-b overflow-x-auto">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
            active === t.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tab states ───────────────────────────────────────────────────────────────

function TabLoading() {
  return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
}

function TabError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <EmptyState icon={AlertTriangle} title="Error al cargar datos" description={message} action={{ label: 'Reintentar', onClick: onRetry }} />;
}

function TabEmpty() {
  return <EmptyState icon={BarChart3} title="Sin datos" description="No hay información disponible para el rango seleccionado." />;
}

// ─── Resumen tab ──────────────────────────────────────────────────────────────

function ResumenTab({ loading, error, data, onRetry }: {
  loading: boolean; error: string | null; data: ReportesResumenDTO | null; onRetry: () => void;
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const inv   = data.inventario;
  const mov   = data.movimientos;
  const comp  = data.comprasRecepciones;
  const ventas = data.ventas;

  const margenPct = ventas?.ingresosTotal && ventas.margenEstimado != null
    ? (ventas.margenEstimado / ventas.ingresosTotal) * 100
    : null;

  const margenColor = margenPct == null ? 'text-foreground'
    : margenPct >= 30 ? 'text-green-600'
    : margenPct >= 15 ? 'text-yellow-600'
    : 'text-red-600';

  const bajoStockList: ProductoBajoStockDTO[] = inv?.productosBajoStock ?? [];

  return (
    <div className="space-y-6">
      {/* KPIs de ventas */}
      {ventas != null && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ventas del período</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              title="Ingresos totales"
              value={formatSoles(ventas.ingresosTotal)}
              colorClass="text-green-600"
            />
            <StatCard
              icon={<ShoppingCart className="h-5 w-5" />}
              title="Nº de ventas"
              value={formatNum(ventas.ventasCount)}
            />
            <StatCard
              icon={<Target className="h-5 w-5" />}
              title="Ticket promedio"
              value={formatSoles(ventas.ticketPromedio)}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Margen estimado"
              value={margenPct != null ? formatPct(margenPct) : formatSoles(ventas.margenEstimado)}
              colorClass={margenColor}
              description={margenPct != null ? formatSoles(ventas.margenEstimado) : undefined}
            />
          </div>
        </section>
      )}

      {/* KPIs de inventario */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Inventario</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Package className="h-5 w-5" />} title="Total productos" value={formatNum(inv?.totalProductos)} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Valorización" value={formatSoles(inv?.valorizacionStock)} colorClass="text-green-600" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Entradas período" value={formatNum(mov?.entradasCantidad)} colorClass="text-blue-600" description="unidades ingresadas" />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Bajo stock"
            value={formatNum(bajoStockList.length)}
            colorClass={bajoStockList.length > 0 ? 'text-red-600' : 'text-green-600'}
            description={bajoStockList.length > 0 ? 'requieren reposición' : 'todo en orden'}
          />
        </div>
      </section>

      {/* Recepciones y compras */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recepciones del período</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 [&>*:last-child]:col-span-2 [&>*:last-child]:mx-auto [&>*:last-child]:max-w-[calc(50%-0.5rem)] sm:[&>*:last-child]:col-auto sm:[&>*:last-child]:max-w-none sm:[&>*:last-child]:mx-0">
          <StatCard icon={<ClipboardCheck className="h-5 w-5" />} title="Recepciones confirmadas" value={formatNum(comp?.recepcionesConfirmadasCount)} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Unidades recibidas" value={formatNum(comp?.unidadesRecibidas)} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Monto compras est." value={formatSoles(comp?.montoComprasEstimado)} colorClass="text-amber-600" description="costo unitario actual" />
        </div>
      </section>

      {/* Top productos */}
      {(ventas?.topProductosVendidos?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top productos del período</CardTitle>
            <CardDescription>Por ingresos generados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ventas!.topProductosVendidos.slice(0, 5).map((p, i) => {
                const maxIngresos = ventas!.topProductosVendidos[0].ingresos ?? 1;
                const pct = ((p.ingresos ?? 0) / maxIngresos) * 100;
                return (
                  <div key={p.productoId} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{p.nombre}</span>
                        <span className="text-sm text-muted-foreground ml-2 shrink-0">{formatSoles(p.ingresos)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bajo stock */}
      {bajoStockList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Productos que requieren reposición
            </CardTitle>
            <CardDescription>{bajoStockList.length} producto(s) por debajo del stock mínimo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Actual</TableHead>
                    <TableHead className="text-center">Mínimo</TableHead>
                    <TableHead className="text-center">Déficit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bajoStockList.slice(0, 10).map((p) => (
                    <TableRow key={p.productoId}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-center text-red-600 font-semibold">{p.stockActual}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{p.stockMinimo}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">-{p.stockMinimo - p.stockActual}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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

function VentasTab({ loading, error, data, agrupacion, setAgrupacion, metrica, setMetrica, onRetry }: {
  loading: boolean; error: string | null; data: VentasData | null;
  agrupacion: AgrupacionTendencia; setAgrupacion: (v: AgrupacionTendencia) => void;
  metrica: MetricaProductos; setMetrica: (v: MetricaProductos) => void;
  onRetry: () => void;
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const totalIngresos = data.porMetodoPago.reduce((s, r) => s + (r.ingresosTotal ?? 0), 0);

  // Tendencia para gráfico
  const tendenciaChart = data.tendencia.map((p) => ({
    periodo: shortLabel(p.periodo, 8),
    ingresos: p.ingresosTotal ?? 0,
    ventas: p.ventasCount ?? 0,
  }));

  // Top 5 productos para gráfico
  const topChart = data.topProductos.slice(0, 6).map((p) => ({
    nombre: shortLabel(p.nombre, 14),
    valor: metrica === 'UNIDADES' ? (p.cantidad ?? 0) : (p.ingresos ?? 0),
  }));

  // Categorías para gráfico pie
  const catChart = data.porCategoria.slice(0, 7).map((c) => ({
    name: shortLabel(c.categoria, 14),
    value: c.ingresosTotal ?? 0,
  }));

  // Vendedores para gráfico horizontal
  const vendedorChart = data.porVendedor.slice(0, 6).map((v) => ({
    nombre: shortLabel(v.vendedorNombre, 16),
    ingresos: v.ingresosTotal ?? 0,
    ventas: v.ventasCount ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Tendencia — gráfico de área */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base">Tendencia de ingresos</CardTitle>
              <CardDescription>Evolución de ventas en el período</CardDescription>
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
          {tendenciaChart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos para el período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={tendenciaChart} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLOR_PRIMARY} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLOR_PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} width={55} />
                <Tooltip content={<ChartTooltip isSoles />} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke={COLOR_PRIMARY} strokeWidth={2} fill="url(#gradIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top productos + Categorías — grid 2 col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top productos — barras horizontales */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Top productos</CardTitle>
                <CardDescription>Los más vendidos del período</CardDescription>
              </div>
              <div className="flex gap-1">
                {(['UNIDADES', 'INGRESOS'] as MetricaProductos[]).map((m) => (
                  <Button key={m} size="sm" variant={metrica === m ? 'default' : 'outline'} onClick={() => setMetrica(m)}>
                    {m === 'UNIDADES' ? 'Und.' : 'S/'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topChart} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" strokeOpacity={0.1} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => metrica === 'INGRESOS' ? `S/${(v/1000).toFixed(0)}k` : String(v)} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip content={<ChartTooltip isSoles={metrica === 'INGRESOS'} />} />
                  <Bar dataKey="valor" name={metrica === 'UNIDADES' ? 'Unidades' : 'Ingresos'} fill={COLOR_SUCCESS} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Categorías — donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos por categoría</CardTitle>
            <CardDescription>Distribución porcentual del período</CardDescription>
          </CardHeader>
          <CardContent>
            {catChart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catChart} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={2}>
                    {catChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatSoles(value as number)} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendedores — gráfico de barras */}
      {vendedorChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance por vendedor</CardTitle>
            <CardDescription>Ingresos generados en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vendedorChart} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/${(v/1000).toFixed(0)}k`} width={55} />
                <Tooltip content={<ChartTooltip isSoles />} />
                <Bar dataKey="ingresos" name="Ingresos" fill={COLOR_PRIMARY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Tabla detalle debajo */}
            <div className="mt-4 overflow-x-auto">
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
                      <TableCell className="text-right">{formatSoles(v.ingresosTotal)}</TableCell>
                      <TableCell className="text-right">{formatSoles(v.ticketPromedio)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Método de pago */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métodos de pago</CardTitle>
          <CardDescription>Distribución de ventas por forma de cobro</CardDescription>
        </CardHeader>
        <CardContent>
          {data.porMetodoPago.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos.</p>
          ) : (
            <div className="space-y-3">
              {data.porMetodoPago.map((m) => {
                const pct = m.porcentaje ?? (totalIngresos > 0 ? (m.ingresosTotal / totalIngresos) * 100 : 0);
                return (
                  <div key={m.metodoPago} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-28 shrink-0">{m.metodoPago}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right shrink-0">{pct.toFixed(0)}%</span>
                    <span className="text-sm font-medium w-28 text-right shrink-0">{formatSoles(m.ingresosTotal)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menos vendidos */}
      {data.menosProductos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Productos con menor desempeño
            </CardTitle>
            <CardDescription>Considera revisar su rotación o precio</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">{metrica === 'UNIDADES' ? 'Unidades' : 'Ingresos'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.menosProductos.slice(0, 8).map((p) => (
                  <TableRow key={p.productoId}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {metrica === 'UNIDADES' ? formatNum(p.cantidad) : formatSoles(p.ingresos)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Inventario tab ───────────────────────────────────────────────────────────

interface InventarioData {
  abc: InventarioABCDTO[];
  slowMovers: InventarioSlowMoverDTO[];
  cobertura: InventarioCoberturaDTO[];
}

function abcVariant(c: string): 'success' | 'warning' | 'destructive' | 'default' {
  if (c === 'A') return 'success';
  if (c === 'B') return 'warning';
  return 'destructive';
}

function coberturaColor(dias: number | null | undefined): string {
  if (dias == null) return 'bg-muted';
  if (dias <= 7)  return 'bg-red-500';
  if (dias <= 15) return 'bg-yellow-500';
  return 'bg-green-500';
}

function coberturaTextColor(dias: number | null | undefined): string {
  if (dias == null) return 'text-muted-foreground';
  if (dias <= 7)  return 'text-red-600 font-semibold';
  if (dias <= 15) return 'text-yellow-600 font-semibold';
  return 'text-green-600';
}

function InventarioTab({ loading, error, data, onRetry }: {
  loading: boolean; error: string | null; data: InventarioData | null; onRetry: () => void;
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  // Datos para gráfico ABC (barras apiladas por clase)
  const abcGroups = data.abc.reduce<Record<string, { clase: string; totalIngresos: number; count: number }>>(
    (acc, p) => {
      const k = p.clasificacion;
      if (!acc[k]) acc[k] = { clase: k, totalIngresos: 0, count: 0 };
      acc[k].totalIngresos += p.ingresos ?? 0;
      acc[k].count++;
      return acc;
    }, {}
  );
  const abcChart = Object.values(abcGroups).sort((a, b) => a.clase.localeCompare(b.clase));

  const maxCobertura = Math.max(...data.cobertura.map((c) => c.diasCobertura ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* ABC — gráfico de barras + tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análisis ABC</CardTitle>
          <CardDescription>Clase A = 80% de ingresos · B = 15% · C = 5%</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {abcChart.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {abcChart.map((g) => (
                <div key={g.clase} className="rounded-lg border p-3 text-center space-y-1">
                  <Badge variant={abcVariant(g.clase)} className="text-base px-3 py-0.5">Clase {g.clase}</Badge>
                  <p className="text-2xl font-bold">{g.count}</p>
                  <p className="text-xs text-muted-foreground">productos</p>
                  <p className="text-sm font-medium text-green-600">{formatSoles(g.totalIngresos)}</p>
                </div>
              ))}
            </div>
          )}
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
                      <TableCell className="text-center"><Badge variant={abcVariant(p.clasificacion)}>{p.clasificacion}</Badge></TableCell>
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

      {/* Cobertura de stock */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cobertura de stock</CardTitle>
          <CardDescription>Días estimados hasta agotamiento · Rojo &lt;7d · Amarillo &lt;15d</CardDescription>
        </CardHeader>
        <CardContent>
          {data.cobertura.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos.</p>
          ) : (
            <div className="space-y-3">
              {data.cobertura.slice(0, 15).map((p) => (
                <div key={p.productoId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm truncate">{p.nombre}</span>
                      <span className={`text-sm ml-2 shrink-0 ${coberturaTextColor(p.diasCobertura)}`}>
                        {p.diasCobertura != null ? `${formatNum(p.diasCobertura)} días` : '—'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${coberturaColor(p.diasCobertura)}`}
                        style={{ width: `${Math.min(((p.diasCobertura ?? 0) / maxCobertura) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right shrink-0">Stock: {p.stockActual}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slow movers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Productos sin movimiento
          </CardTitle>
          <CardDescription>Capital inmovilizado — considera promociones o descuentos</CardDescription>
        </CardHeader>
        <CardContent>
          {data.slowMovers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin productos estancados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-right">Capital inmovilizado</TableHead>
                    <TableHead className="text-right">Días sin salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slowMovers.map((p) => (
                    <TableRow key={p.productoId}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-center">{formatNum(p.stockActual)}</TableCell>
                      <TableCell className="text-right text-yellow-600 font-medium">{formatSoles(p.costoTotal)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.diasSinSalida != null && p.diasSinSalida > 60 ? 'destructive' : 'warning'}>
                          {formatNum(p.diasSinSalida)}d
                        </Badge>
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

function ComprasTab({ loading, error, data, onRetry }: {
  loading: boolean; error: string | null; data: ComprasPorProveedorDTO[] | null; onRetry: () => void;
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const chartData = data.slice(0, 8).map((p) => ({
    nombre: shortLabel(p.proveedorNombre, 16),
    monto: p.montoEstimado ?? 0,
    unidades: p.unidadesRecibidas ?? 0,
  }));

  const totalMonto = data.reduce((s, p) => s + (p.montoEstimado ?? 0), 0);
  const totalUnidades = data.reduce((s, p) => s + (p.unidadesRecibidas ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 [&>*:last-child]:col-span-2 [&>*:last-child]:mx-auto [&>*:last-child]:max-w-[calc(50%-0.5rem)] sm:[&>*:last-child]:col-auto sm:[&>*:last-child]:max-w-none sm:[&>*:last-child]:mx-0">
        <StatCard icon={<Truck className="h-5 w-5" />} title="Proveedores activos" value={formatNum(data.length)} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} title="Monto total compras" value={formatSoles(totalMonto)} colorClass="text-blue-600" />
        <StatCard icon={<Package className="h-5 w-5" />} title="Unidades recibidas" value={formatNum(totalUnidades)} />
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compras por proveedor</CardTitle>
            <CardDescription>Monto estimado en recepciones confirmadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" strokeOpacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={100} />
                <Tooltip content={<ChartTooltip isSoles />} />
                <Bar dataKey="monto" name="Monto" fill={COLOR_WARNING} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabla detalle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por proveedor</CardTitle>
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
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">% del total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p) => {
                    const pct = totalMonto > 0 ? ((p.montoEstimado ?? 0) / totalMonto) * 100 : 0;
                    return (
                      <TableRow key={p.proveedorId}>
                        <TableCell className="font-medium">{p.proveedorNombre}</TableCell>
                        <TableCell className="text-center">{formatNum(p.recepcionesCount)}</TableCell>
                        <TableCell className="text-center">{formatNum(p.unidadesRecibidas)}</TableCell>
                        <TableCell className="text-right">{formatSoles(p.montoEstimado)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{pct.toFixed(0)}%</span>
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
    </div>
  );
}

// ─── Quick range buttons ──────────────────────────────────────────────────────

const QUICK_RANGES = [
  { label: '7d',    desde: () => daysAgo(7),   hasta: () => toDateString(new Date()) },
  { label: '30d',   desde: () => daysAgo(30),  hasta: () => toDateString(new Date()) },
  { label: '90d',   desde: () => daysAgo(90),  hasta: () => toDateString(new Date()) },
  { label: 'Este año', desde: startOfYear,     hasta: () => toDateString(new Date()) },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReportesPage() {
  const { canView } = usePermissions();
  const hasAccess = canView('REPORTES');

  const [desde, setDesde] = useState<string>(daysAgo(30));
  const [hasta, setHasta] = useState<string>(toDateString(new Date()));
  const [activeTab, setActiveTab] = useState<TabId>('resumen');

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

  const fetchResumen = async (d = desde, h = hasta) => {
    try { setResumenLoading(true); setResumenError(null);
      setResumenData(await reportesService.getResumen(d, h));
    } catch { setResumenError('Error al cargar el resumen.'); toast.error('Error al cargar el resumen.');
    } finally { setResumenLoading(false); }
  };

  const fetchVentas = async (d = desde, h = hasta, ag = agrupacion, met = metrica) => {
    try { setVentasLoading(true); setVentasError(null);
      const [tendencia, porVendedor, porCategoria, porMetodoPago, topProductos, menosProductos] = await Promise.all([
        reportesService.getVentasTendencia(d, h, ag),
        reportesService.getVentasPorVendedor(d, h),
        reportesService.getVentasPorCategoria(d, h),
        reportesService.getVentasPorMetodoPago(d, h),
        reportesService.getVentasProductos(d, h, 10, 'MAS', met),
        reportesService.getVentasProductos(d, h, 10, 'MENOS', met),
      ]);
      setVentasData({ tendencia, porVendedor, porCategoria, porMetodoPago, topProductos, menosProductos });
    } catch { setVentasError('Error al cargar datos de ventas.'); toast.error('Error al cargar datos de ventas.');
    } finally { setVentasLoading(false); }
  };

  const fetchInventario = async () => {
    try { setInventarioLoading(true); setInventarioError(null);
      const [abc, slowMovers, cobertura] = await Promise.all([
        reportesService.getInventarioABC(desde, hasta),
        reportesService.getInventarioSlowMovers(30),
        reportesService.getInventarioCobertura(desde, hasta),
      ]);
      setInventarioData({ abc, slowMovers, cobertura });
    } catch { setInventarioError('Error al cargar datos de inventario.'); toast.error('Error al cargar datos de inventario.');
    } finally { setInventarioLoading(false); }
  };

  const fetchCompras = async () => {
    try { setComprasLoading(true); setComprasError(null);
      setComprasData(await reportesService.getComprasPorProveedor(desde, hasta));
    } catch { setComprasError('Error al cargar datos de compras.'); toast.error('Error al cargar datos de compras.');
    } finally { setComprasLoading(false); }
  };

  const handleActualizar = (d = desde, h = hasta) => {
    if (!d || !h) { toast.error('Selecciona un rango de fechas'); return; }
    if (d > h) { toast.error('La fecha "Desde" no puede ser mayor a "Hasta"'); return; }
    fetchResumen(d, h);
    fetchVentas(d, h, agrupacion, metrica);
    fetchInventario();
    fetchCompras();
  };

  // Auto-carga al montar con el rango por defecto (últimos 30 días)
  useEffect(() => {
    handleActualizar(desde, hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuickRange = (rango: typeof QUICK_RANGES[0]) => {
    const d = rango.desde();
    const h = rango.hasta();
    setDesde(d);
    setHasta(h);
    handleActualizar(d, h);
  };

  const handleAgrupacion = (ag: AgrupacionTendencia) => {
    setAgrupacion(ag);
    if (ventasData) fetchVentas(desde, hasta, ag, metrica);
  };

  const handleMetrica = (met: MetricaProductos) => {
    setMetrica(met);
    if (ventasData) fetchVentas(desde, hasta, agrupacion, met);
  };

  const isAnyLoading = resumenLoading || ventasLoading || inventarioLoading || comprasLoading;

  if (!hasAccess) {
    return <EmptyState icon={Lock} title="Sin acceso" description="No tienes permisos para ver el módulo de Reportes." />;
  }

  return (
    <div className="space-y-6">
      {/* Header + filtros integrados */}
      <div className="flex flex-col gap-4">
        {/* Título */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
            <p className="text-muted-foreground">Indicadores clave para la toma de decisiones</p>
          </div>
          {/* Botón actualizar — visible en desktop junto al título */}
          <Button
            onClick={() => handleActualizar()}
            disabled={isAnyLoading}
            className="hidden sm:inline-flex items-center gap-2 h-10 px-5"
          >
            <RefreshCw className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
            {isAnyLoading ? 'Cargando…' : 'Actualizar'}
          </Button>
        </div>

        {/* Barra de filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border bg-card shadow-sm">
          {/* Atajos rápidos */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">
              Período
            </span>
            {QUICK_RANGES.map((r) => {
              const isActive = desde === r.desde() && hasta === r.hasta();
              return (
                <button
                  key={r.label}
                  onClick={() => handleQuickRange(r)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-input hover:text-foreground hover:border-primary/40',
                  ].join(' ')}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Separador vertical */}
          <div className="hidden sm:block h-8 w-px bg-border/60 mx-1" />

          {/* Rango personalizado */}
          <div className="flex items-center gap-2 flex-1 pt-2 sm:pt-0">
            <div className="relative flex-1 sm:flex-initial">
              <label className="absolute -top-2 left-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-card px-1">
                Desde
              </label>
              <Input
                id="rpt-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="h-9 w-full sm:w-36 text-sm"
              />
            </div>
            <span className="text-muted-foreground text-sm shrink-0">→</span>
            <div className="relative flex-1 sm:flex-initial">
              <label className="absolute -top-2 left-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-card px-1">
                Hasta
              </label>
              <Input
                id="rpt-hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="h-9 w-full sm:w-36 text-sm"
              />
            </div>
          </div>

          {/* Botón actualizar — mobile */}
          <Button
            onClick={() => handleActualizar()}
            disabled={isAnyLoading}
            className="sm:hidden w-full h-9 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
            {isAnyLoading ? 'Cargando…' : 'Actualizar'}
          </Button>
        </div>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'resumen' && (
          <ResumenTab loading={resumenLoading} error={resumenError} data={resumenData} onRetry={fetchResumen} />
        )}
        {activeTab === 'ventas' && (
          <VentasTab
            loading={ventasLoading} error={ventasError} data={ventasData}
            agrupacion={agrupacion} setAgrupacion={handleAgrupacion}
            metrica={metrica} setMetrica={handleMetrica}
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
