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
  FileSpreadsheet,
  FileDown,
  Wallet,
  Users,
  FlaskConical,
  ArrowRight,
  Minus,
} from 'lucide-react';
import { exportarExcel, exportarPDF } from '../../utils/reportes-export';
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
  FinancieroDTO,
  VencimientosRiesgoDTO,
  ClienteReporteDTO,
  GastoCategoriaDTO,
} from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { usePermissions } from '../../hooks/usePermissions';
import { usePlan } from '../../hooks/usePlan';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Labels de categorías de gasto ───────────────────────────────────────────

const GASTO_LABELS: Record<string, string> = {
  ALQUILER:          'Alquiler',
  SERVICIOS:         'Servicios básicos',
  SUELDOS:           'Sueldos y salarios',
  MANTENIMIENTO:     'Mantenimiento',
  PUBLICIDAD:        'Publicidad',
  TRANSPORTE:        'Transporte',
  IMPUESTOS:         'Impuestos',
  COMPRAS_INTERNAS:  'Compras internas',
  COMPRA_PROVEEDOR:  'Compra a proveedor',
  OTROS:             'Otros',
};

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

// Formatea el período del eje X según la agrupación
const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function formatPeriodoEje(periodo: string, agrupacion: AgrupacionTendencia): string {
  if (!periodo) return '';
  // DIA → "2026-04-06" → "06 abr"
  if (agrupacion === 'DIA' && /^\d{4}-\d{2}-\d{2}$/.test(periodo)) {
    const [, m, d] = periodo.split('-');
    return `${d} ${MESES_CORTOS[parseInt(m, 10) - 1]}`;
  }
  // MES → "2026-04" → "abr '26"
  if (agrupacion === 'MES' && /^\d{4}-\d{2}$/.test(periodo)) {
    const [y, m] = periodo.split('-');
    return `${MESES_CORTOS[parseInt(m, 10) - 1]} '${y.slice(2)}`;
  }
  // SEMANA → "2026-W15" u otro formato → recortar
  if (agrupacion === 'SEMANA') {
    return periodo.replace(/^\d{4}-/, '');   // quita el año → "W15" o "04-06"
  }
  return periodo.length > 10 ? periodo.slice(5) : periodo;
}

// Formatea valores del eje Y de forma adaptativa (sin hardcodear /1000)
function formatYAxisSoles(v: number): string {
  if (v === 0) return 'S/0';
  if (Math.abs(v) >= 1_000_000) return `S/${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `S/${(v / 1_000).toFixed(1)}k`;
  if (Math.abs(v) >= 1)         return `S/${v.toFixed(0)}`;
  return `S/${v.toFixed(2)}`;
}

function formatYAxisNum(v: number): string {
  if (v === 0) return '0';
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(Math.round(v));
}

// ─── Comparativa período anterior ────────────────────────────────────────────

/** Calcula el período anterior de igual duración, justo antes del período actual */
function calcPrevPeriod(desde: string, hasta: string): { prevDesde: string; prevHasta: string } {
  const d1 = new Date(desde);
  const d2 = new Date(hasta);
  const duracionMs = d2.getTime() - d1.getTime();
  const prevHastaDate = new Date(d1.getTime() - 86_400_000);          // desde − 1 día
  const prevDesdeDate = new Date(prevHastaDate.getTime() - duracionMs);
  return { prevDesde: toDateString(prevDesdeDate), prevHasta: toDateString(prevHastaDate) };
}

/** Retorna el delta % entre valor actual y anterior, o null si no aplica */
function delta(current: number | null | undefined, prev: number | null | undefined): number | null {
  if (current == null || prev == null || prev === 0) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}

function trendLabel(prevDesde: string, prevHasta: string): string {
  return `vs ${prevDesde} → ${prevHasta}`;
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

type TabId = 'resumen' | 'ventas' | 'inventario' | 'compras' | 'financiero' | 'clientes';
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen',     label: 'Resumen',     icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'ventas',      label: 'Ventas',      icon: <ShoppingCart className="h-4 w-4" /> },
  { id: 'inventario',  label: 'Inventario',  icon: <Boxes className="h-4 w-4" /> },
  { id: 'compras',     label: 'Compras',     icon: <Truck className="h-4 w-4" /> },
  { id: 'financiero',  label: 'Financiero',  icon: <Wallet className="h-4 w-4" /> },
  { id: 'clientes',    label: 'Clientes',    icon: <Users className="h-4 w-4" /> },
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

function ResumenTab({ loading, error, data, prevData, prevDesde, prevHasta, onRetry }: {
  loading: boolean; error: string | null;
  data: ReportesResumenDTO | null;
  prevData: ReportesResumenDTO | null;
  prevDesde: string; prevHasta: string;
  onRetry: () => void;
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const inv    = data.inventario;
  const mov    = data.movimientos;
  const comp   = data.comprasRecepciones;
  const ventas = data.ventas;

  const prevInv    = prevData?.inventario;
  const prevMov    = prevData?.movimientos;
  const prevComp   = prevData?.comprasRecepciones;
  const prevVentas = prevData?.ventas;

  const tl = trendLabel(prevDesde, prevHasta);

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
              trend={delta(ventas.ingresosTotal, prevVentas?.ingresosTotal) != null
                ? { value: delta(ventas.ingresosTotal, prevVentas?.ingresosTotal)!, label: tl }
                : undefined}
            />
            <StatCard
              icon={<ShoppingCart className="h-5 w-5" />}
              title="Nº de ventas"
              value={formatNum(ventas.ventasCount)}
              trend={delta(ventas.ventasCount, prevVentas?.ventasCount) != null
                ? { value: delta(ventas.ventasCount, prevVentas?.ventasCount)!, label: tl }
                : undefined}
            />
            <StatCard
              icon={<Target className="h-5 w-5" />}
              title="Ticket promedio"
              value={formatSoles(ventas.ticketPromedio)}
              trend={delta(ventas.ticketPromedio, prevVentas?.ticketPromedio) != null
                ? { value: delta(ventas.ticketPromedio, prevVentas?.ticketPromedio)!, label: tl }
                : undefined}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Margen estimado"
              value={margenPct != null ? formatPct(margenPct) : formatSoles(ventas.margenEstimado)}
              colorClass={margenColor}
              description={margenPct != null ? formatSoles(ventas.margenEstimado) : undefined}
              trend={delta(ventas.margenEstimado, prevVentas?.margenEstimado) != null
                ? { value: delta(ventas.margenEstimado, prevVentas?.margenEstimado)!, label: tl }
                : undefined}
            />
          </div>
        </section>
      )}

      {/* KPIs de inventario */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Inventario</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Package className="h-5 w-5" />} title="Total productos" value={formatNum(inv?.totalProductos)} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Valorización" value={formatSoles(inv?.valorizacionStock)} colorClass="text-green-600"
            trend={delta(inv?.valorizacionStock, prevInv?.valorizacionStock) != null
              ? { value: delta(inv?.valorizacionStock, prevInv?.valorizacionStock)!, label: tl }
              : undefined}
          />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Entradas período" value={formatNum(mov?.entradasCantidad)} colorClass="text-blue-600"
            trend={delta(mov?.entradasCantidad, prevMov?.entradasCantidad) != null
              ? { value: delta(mov?.entradasCantidad, prevMov?.entradasCantidad)!, label: tl }
              : undefined}
          />
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
          <StatCard icon={<ClipboardCheck className="h-5 w-5" />} title="Recepciones confirmadas" value={formatNum(comp?.recepcionesConfirmadasCount)}
            trend={delta(comp?.recepcionesConfirmadasCount, prevComp?.recepcionesConfirmadasCount) != null
              ? { value: delta(comp?.recepcionesConfirmadasCount, prevComp?.recepcionesConfirmadasCount)!, label: tl }
              : undefined}
          />
          <StatCard icon={<Package className="h-5 w-5" />} title="Unidades recibidas" value={formatNum(comp?.unidadesRecibidas)}
            trend={delta(comp?.unidadesRecibidas, prevComp?.unidadesRecibidas) != null
              ? { value: delta(comp?.unidadesRecibidas, prevComp?.unidadesRecibidas)!, label: tl }
              : undefined}
          />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Monto compras est." value={formatSoles(comp?.montoComprasEstimado)} colorClass="text-amber-600"
            trend={delta(comp?.montoComprasEstimado, prevComp?.montoComprasEstimado) != null
              ? { value: delta(comp?.montoComprasEstimado, prevComp?.montoComprasEstimado)!, label: tl }
              : undefined}
          />
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
    periodo: formatPeriodoEje(p.periodo, agrupacion),
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
                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatYAxisSoles} width={65} />
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
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => metrica === 'INGRESOS' ? formatYAxisSoles(v) : formatYAxisNum(v)} />
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
                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatYAxisSoles} width={65} />
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
  vencimientos: VencimientosRiesgoDTO | null;
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

  const venc = data.vencimientos;

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

      {/* ── Capital en riesgo de vencimiento ── */}
      {venc && (venc.lotesVencidos > 0 || venc.lotesRiesgo7d > 0 || venc.lotesRiesgo30d > 0 || venc.lotesRiesgo90d > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-red-500" />
            Capital en riesgo de vencimiento
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-2"><p className="text-xs font-semibold uppercase tracking-wider text-red-500">Ya vencido</p></CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-red-600">{formatSoles(venc.capitalVencido)}</p>
                <p className="text-xs text-muted-foreground">{venc.lotesVencidos} lote(s)</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-900">
              <CardHeader className="pb-2"><p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Crítico &lt;7 días</p></CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-orange-600">{formatSoles(venc.capitalRiesgo7d)}</p>
                <p className="text-xs text-muted-foreground">{venc.lotesRiesgo7d} lote(s)</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-2"><p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Próx. 30 días</p></CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-amber-600">{formatSoles(venc.capitalRiesgo30d)}</p>
                <p className="text-xs text-muted-foreground">{venc.lotesRiesgo30d} lote(s)</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 dark:border-yellow-900">
              <CardHeader className="pb-2"><p className="text-xs font-semibold uppercase tracking-wider text-yellow-600">Próx. 90 días</p></CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-yellow-600">{formatSoles(venc.capitalRiesgo90d)}</p>
                <p className="text-xs text-muted-foreground">{venc.lotesRiesgo90d} lote(s)</p>
              </CardContent>
            </Card>
          </div>

          {venc.lotesUrgentes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Lotes más urgentes
                </CardTitle>
                <CardDescription>Capital crítico: {formatSoles(venc.totalCapitalCritico)} (vencido + próx. 30d)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead className="text-center">Vence</TableHead>
                        <TableHead className="text-center">Días</TableHead>
                        <TableHead className="text-center">Cant.</TableHead>
                        <TableHead className="text-right">Valor en riesgo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {venc.lotesUrgentes.map((l, i) => {
                        const vencido  = l.diasRestantes < 0;
                        const critico  = !vencido && l.diasRestantes <= 7;
                        const proximo  = !vencido && l.diasRestantes <= 30;
                        const rowBg    = vencido ? 'bg-red-500/5' : critico ? 'bg-orange-500/5' : proximo ? 'bg-amber-500/5' : '';
                        const daysText = vencido ? `Hace ${Math.abs(l.diasRestantes)}d` : `${l.diasRestantes}d`;
                        const daysColor = vencido ? 'text-red-600 font-bold' : critico ? 'text-orange-600 font-semibold' : 'text-amber-600';
                        return (
                          <TableRow key={i} className={rowBg}>
                            <TableCell className="font-medium text-sm">{l.productoNombre}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{l.lote ?? '—'}</TableCell>
                            <TableCell className="text-center text-sm">
                              {new Date(l.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-sm ${daysColor}`}>{daysText}</span>
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">{l.cantidad}</TableCell>
                            <TableCell className="text-right font-semibold text-red-500">{formatSoles(l.valorRiesgo)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatYAxisSoles} />
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

// ─── Financiero tab (P&L) ─────────────────────────────────────────────────────

/** Fila del estado de resultados con barra visual */
function PLRow({
  label, value, sub, colorClass = 'text-foreground', bold = false,
  indent = false, separator = false, bg = false,
}: {
  label: string; value: number | null; sub?: string;
  colorClass?: string; bold?: boolean;
  indent?: boolean; separator?: boolean; bg?: boolean;
}) {
  return (
    <div className={[
      'flex items-center justify-between py-2 px-3 rounded-lg',
      separator ? 'border-t mt-1' : '',
      bg ? 'bg-muted/50' : '',
    ].join(' ')}>
      <span className={`text-sm flex items-center gap-2 ${indent ? 'ml-4 text-muted-foreground' : ''} ${bold ? 'font-semibold' : ''}`}>
        {indent && <Minus className="h-3 w-3 text-muted-foreground" />}
        {!indent && separator && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
        {label}
      </span>
      <div className="text-right">
        <span className={`text-sm font-mono ${bold ? 'font-bold text-base' : ''} ${colorClass}`}>
          {value != null ? formatSoles(value) : '—'}
        </span>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function FinancieroTab({ loading, error, data, prevData, prevDesde, prevHasta, onRetry }: {
  loading: boolean; error: string | null;
  data: FinancieroDTO | null;
  prevData: FinancieroDTO | null;
  prevDesde: string; prevHasta: string;
  onRetry: () => void;
}) {
  if (loading) return <TabLoading />;
  if (error)   return <TabError message={error} onRetry={onRetry} />;
  if (!data)   return <TabEmpty />;

  const tl = trendLabel(prevDesde, prevHasta);

  const margenBrutoColor  = (data.margenBruto ?? 0) >= 30 ? 'text-green-600' : (data.margenBruto ?? 0) >= 15 ? 'text-yellow-600' : 'text-red-600';
  const margenNetoColor   = (data.margenNeto  ?? 0) >= 15 ? 'text-green-600' : (data.margenNeto  ?? 0) >= 5  ? 'text-yellow-600' : 'text-red-600';
  const utilidadNetaColor = (data.utilidadNeta ?? 0) >= 0  ? 'text-green-600' : 'text-red-600';

  const catChart = data.gastosPorCategoria.slice(0, 8).map(g => ({
    name: GASTO_LABELS[g.categoria] ?? g.categoria,
    value: g.monto ?? 0,
  }));

  const gastosChartData = data.gastosPorCategoria.map(g => ({
    nombre: (GASTO_LABELS[g.categoria] ?? g.categoria).slice(0, 18),
    monto: g.monto ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* KPI rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Ingresos de ventas"
          value={formatSoles(data.ingresosVentas)}
          colorClass="text-green-600"
          trend={delta(data.ingresosVentas, prevData?.ingresosVentas) != null
            ? { value: delta(data.ingresosVentas, prevData?.ingresosVentas)!, label: tl } : undefined}
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          title="Gastos operativos"
          value={formatSoles(data.gastosTotales)}
          colorClass="text-red-500"
          trend={delta(data.gastosTotales, prevData?.gastosTotales) != null
            ? { value: delta(data.gastosTotales, prevData?.gastosTotales)!, label: tl } : undefined}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Margen bruto"
          value={data.margenBruto != null ? formatPct(data.margenBruto) : '—'}
          colorClass={margenBrutoColor}
          description={formatSoles(data.utilidadBruta)}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          title="Utilidad neta"
          value={data.margenNeto != null ? formatPct(data.margenNeto) : '—'}
          colorClass={margenNetoColor}
          description={formatSoles(data.utilidadNeta)}
        />
      </div>

      {/* Estado de Resultados (cascada) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Estado de Resultados
          </CardTitle>
          <CardDescription>
            {data.ventasCount} venta(s) · período {data.desde} → {data.hasta}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <PLRow label="Ingresos por ventas" value={data.ingresosVentas} colorClass="text-green-600" bold />
            <PLRow label="Costo de ventas" value={data.costoVentas} colorClass="text-red-400" indent
              sub={data.ingresosVentas > 0 ? `${((data.costoVentas / data.ingresosVentas) * 100).toFixed(1)}% de ingresos` : undefined} />
            <PLRow label="Utilidad bruta" value={data.utilidadBruta}
              sub={data.margenBruto != null ? `Margen ${formatPct(data.margenBruto)}` : undefined}
              colorClass={margenBrutoColor} bold separator />
            <PLRow label={`Gastos operativos (${data.gastosCount} registros)`} value={data.gastosTotales}
              colorClass="text-red-400" indent
              sub={data.ingresosVentas > 0 ? `${((data.gastosTotales / data.ingresosVentas) * 100).toFixed(1)}% de ingresos` : undefined} />
            <PLRow label="Utilidad neta" value={data.utilidadNeta}
              sub={data.margenNeto != null ? `Margen ${formatPct(data.margenNeto)}` : undefined}
              colorClass={utilidadNetaColor} bold separator bg />
          </div>
        </CardContent>
      </Card>

      {/* Gastos por categoría */}
      {data.gastosPorCategoria.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gastos por categoría</CardTitle>
              <CardDescription>Distribución de {formatSoles(data.gastosTotales)} en gastos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catChart} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {catChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatSoles(v as number)} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Barras horizontales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle de gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gastosChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" strokeOpacity={0.1} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatYAxisSoles} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip content={<ChartTooltip isSoles />} />
                  <Bar dataKey="monto" name="Monto" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla detalle gastos */}
      {data.gastosPorCategoria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desglose por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-center">Registros</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">% del total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.gastosPorCategoria.map((g) => (
                    <TableRow key={g.categoria}>
                      <TableCell className="font-medium">{GASTO_LABELS[g.categoria] ?? g.categoria}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{g.count}</TableCell>
                      <TableCell className="text-right font-semibold text-red-500">{formatSoles(g.monto)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-red-400" style={{ width: `${g.porcentaje ?? 0}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10">{(g.porcentaje ?? 0).toFixed(0)}%</span>
                        </div>
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

// ─── Clientes tab ─────────────────────────────────────────────────────────────

function ClientesTab({ loading, error, data, onRetry }: {
  loading: boolean; error: string | null;
  data: ClienteReporteDTO[] | null;
  onRetry: () => void;
}) {
  if (loading) return <TabLoading />;
  if (error)   return <TabError message={error} onRetry={onRetry} />;
  if (!data || data.length === 0) return (
    <EmptyState icon={Users} title="Sin datos de clientes"
      description="No hay ventas asociadas a clientes identificados en el período seleccionado." />
  );

  const totalComprado  = data.reduce((s, c) => s + (c.totalComprado ?? 0), 0);
  const totalVentas    = data.reduce((s, c) => s + (c.ventasCount ?? 0), 0);
  const ticketPromGral = totalVentas > 0 ? totalComprado / totalVentas : 0;

  const chartData = data.slice(0, 8).map(c => ({
    nombre: c.clienteNombre.split(' ')[0],  // sólo primer nombre para el eje
    total: c.totalComprado ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} title="Clientes únicos" value={formatNum(data.length)} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} title="Compra total" value={formatSoles(totalComprado)} colorClass="text-green-600" />
        <StatCard icon={<Target className="h-5 w-5" />} title="Ticket promedio" value={formatSoles(ticketPromGral)} />
      </div>

      {/* Gráfico top 8 clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top clientes por monto comprado</CardTitle>
          <CardDescription>Los 8 mejores compradores del período</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" strokeOpacity={0.1} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatYAxisSoles} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={80} />
              <Tooltip content={<ChartTooltip isSoles />} />
              <Bar dataKey="total" name="Total comprado" fill={COLOR_PRIMARY} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla detalle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Compras</TableHead>
                  <TableHead className="text-right">Total gastado</TableHead>
                  <TableHead className="text-right">Ticket prom.</TableHead>
                  <TableHead className="text-right">Última compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c, i) => {
                  const pct = totalComprado > 0 ? ((c.totalComprado ?? 0) / totalComprado) * 100 : 0;
                  return (
                    <TableRow key={c.clienteId}>
                      <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{c.clienteNombre}</p>
                          <div className="h-1 w-full rounded-full bg-muted overflow-hidden mt-1">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{formatNum(c.ventasCount)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{formatSoles(c.totalComprado)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatSoles(c.ticketPromedio)}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {c.ultimaCompra ? new Date(c.ultimaCompra).toLocaleDateString('es-PE') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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

const MAX_DIAS_BASICO = 30;

export function ReportesPage() {
  const { canView } = usePermissions();
  const { isBasico } = usePlan();
  const navigate = useNavigate();
  const hasAccess = canView('REPORTES');

  const minimoFechaBasico = daysAgo(MAX_DIAS_BASICO);

  const [desde, setDesde] = useState<string>(daysAgo(30));
  const [hasta, setHasta] = useState<string>(toDateString(new Date()));
  const [activeTab, setActiveTab] = useState<TabId>('resumen');

  const [resumenLoading, setResumenLoading] = useState(false);
  const [resumenError, setResumenError] = useState<string | null>(null);
  const [resumenData, setResumenData] = useState<ReportesResumenDTO | null>(null);
  const [resumenPrevData, setResumenPrevData] = useState<ReportesResumenDTO | null>(null);
  const [prevDesde, setPrevDesde] = useState('');
  const [prevHasta, setPrevHasta] = useState('');

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

  const [financieroLoading, setFinancieroLoading] = useState(false);
  const [financieroError, setFinancieroError] = useState<string | null>(null);
  const [financieroData, setFinancieroData] = useState<FinancieroDTO | null>(null);
  const [financieroPrevData, setFinancieroPrevData] = useState<FinancieroDTO | null>(null);

  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesError, setClientesError] = useState<string | null>(null);
  const [clientesData, setClientesData] = useState<ClienteReporteDTO[] | null>(null);

  const [exporting, setExporting] = useState(false);

  const fetchResumen = async (d = desde, h = hasta) => {
    try {
      setResumenLoading(true); setResumenError(null);
      const { prevDesde: pd, prevHasta: ph } = calcPrevPeriod(d, h);
      setPrevDesde(pd); setPrevHasta(ph);
      const [current, prev] = await Promise.all([
        reportesService.getResumen(d, h),
        reportesService.getResumen(pd, ph).catch(() => null),
      ]);
      setResumenData(current);
      setResumenPrevData(prev);
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
      const [abc, slowMovers, cobertura, vencimientos] = await Promise.all([
        reportesService.getInventarioABC(desde, hasta),
        reportesService.getInventarioSlowMovers(30),
        reportesService.getInventarioCobertura(desde, hasta),
        reportesService.getVencimientosRiesgo().catch(() => null),
      ]);
      setInventarioData({ abc, slowMovers, cobertura, vencimientos });
    } catch { setInventarioError('Error al cargar datos de inventario.'); toast.error('Error al cargar datos de inventario.');
    } finally { setInventarioLoading(false); }
  };

  const fetchCompras = async () => {
    try { setComprasLoading(true); setComprasError(null);
      setComprasData(await reportesService.getComprasPorProveedor(desde, hasta));
    } catch { setComprasError('Error al cargar datos de compras.'); toast.error('Error al cargar datos de compras.');
    } finally { setComprasLoading(false); }
  };

  const fetchFinanciero = async (d = desde, h = hasta) => {
    try { setFinancieroLoading(true); setFinancieroError(null);
      const { prevDesde: pd, prevHasta: ph } = calcPrevPeriod(d, h);
      const [current, prev] = await Promise.all([
        reportesService.getFinanciero(d, h),
        reportesService.getFinanciero(pd, ph).catch(() => null),
      ]);
      setFinancieroData(current);
      setFinancieroPrevData(prev);
    } catch { setFinancieroError('Error al cargar datos financieros.'); toast.error('Error al cargar datos financieros.');
    } finally { setFinancieroLoading(false); }
  };

  const fetchClientes = async (d = desde, h = hasta) => {
    try { setClientesLoading(true); setClientesError(null);
      setClientesData(await reportesService.getTopClientes(d, h, 30));
    } catch { setClientesError('Error al cargar datos de clientes.'); toast.error('Error al cargar datos de clientes.');
    } finally { setClientesLoading(false); }
  };

  const handleActualizar = (d = desde, h = hasta) => {
    if (!d || !h) { toast.error('Selecciona un rango de fechas'); return; }
    if (d > h) { toast.error('La fecha "Desde" no puede ser mayor a "Hasta"'); return; }
    // Clamp para plan BÁSICO: no se puede ir más atrás de 30 días
    if (isBasico && d < minimoFechaBasico) {
      toast('Plan Básico: el rango máximo es 30 días. Actualiza a Pro para ver historial completo.', {
        icon: '👑',
        style: { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' },
      });
      d = minimoFechaBasico;
      setDesde(d);
    }
    fetchResumen(d, h);
    fetchVentas(d, h, agrupacion, metrica);
    fetchInventario();
    fetchCompras();
    fetchFinanciero(d, h);
    fetchClientes(d, h);
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

  const handleExportExcel = async () => {
    if (!resumenData && !ventasData && !inventarioData && !comprasData) {
      toast.error('No hay datos para exportar. Carga el reporte primero.');
      return;
    }
    setExporting(true);
    try {
      exportarExcel(
        desde, hasta,
        resumenData,
        ventasData ? {
          porVendedor: ventasData.porVendedor,
          porCategoria: ventasData.porCategoria,
          porMetodoPago: ventasData.porMetodoPago,
          topProductos: ventasData.topProductos,
          menosProductos: ventasData.menosProductos,
        } : null,
        inventarioData,
        comprasData,
      );
      toast.success('Excel descargado');
    } catch { toast.error('Error al exportar Excel');
    } finally { setExporting(false); }
  };

  const handleExportPDF = async () => {
    if (!resumenData && !ventasData && !inventarioData && !comprasData) {
      toast.error('No hay datos para exportar. Carga el reporte primero.');
      return;
    }
    setExporting(true);
    try {
      exportarPDF(
        desde, hasta,
        resumenData,
        ventasData ? {
          porVendedor: ventasData.porVendedor,
          porCategoria: ventasData.porCategoria,
          porMetodoPago: ventasData.porMetodoPago,
          topProductos: ventasData.topProductos,
          menosProductos: ventasData.menosProductos,
        } : null,
        inventarioData,
        comprasData,
      );
      toast.success('PDF descargado');
    } catch { toast.error('Error al exportar PDF');
    } finally { setExporting(false); }
  };

  const isAnyLoading = resumenLoading || ventasLoading || inventarioLoading || comprasLoading || financieroLoading || clientesLoading;

  if (!hasAccess) {
    return <EmptyState icon={Lock} title="Sin acceso" description="No tienes permisos para ver el módulo de Reportes." />;
  }

  // Para BÁSICO, solo mostrar rangos de ≤30 días
  const visibleRanges = isBasico
    ? QUICK_RANGES.filter((r) => r.label === '7d' || r.label === '30d')
    : QUICK_RANGES;

  return (
    <div className="space-y-6">
      {/* Banner plan BÁSICO */}
      {isBasico && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3">
          <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            <span className="font-semibold">Plan Básico</span> — los reportes están limitados a los últimos 30 días.
          </p>
          <button
            onClick={() => navigate('/checkout?plan=PRO')}
            className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 shrink-0"
          >
            Actualizar a Pro
          </button>
        </div>
      )}

      {/* Header + filtros integrados */}
      <div className="flex flex-col gap-4">
        {/* Título */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
            <p className="text-muted-foreground">Indicadores clave para la toma de decisiones</p>
          </div>
          {/* Acciones — desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting || isAnyLoading} className="gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting || isAnyLoading} className="gap-2">
              <FileDown className="h-4 w-4 text-red-500" />
              PDF
            </Button>
            <Button onClick={() => handleActualizar()} disabled={isAnyLoading} className="gap-2 h-10 px-5">
              <RefreshCw className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
              {isAnyLoading ? 'Cargando…' : 'Actualizar'}
            </Button>
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border bg-card shadow-sm">
          {/* Atajos rápidos */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">
              Período
            </span>
            {visibleRanges.map((r) => {
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
            {isBasico && (
              <button
                onClick={() => navigate('/checkout?plan=PRO')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all"
              >
                <Crown className="h-3 w-3" />
                90d / Año
              </button>
            )}
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
                min={isBasico ? minimoFechaBasico : undefined}
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

          {/* Botones mobile */}
          <div className="sm:hidden flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting || isAnyLoading} className="flex-1 gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting || isAnyLoading} className="flex-1 gap-1.5">
              <FileDown className="h-4 w-4 text-red-500" />
              PDF
            </Button>
            <Button onClick={() => handleActualizar()} disabled={isAnyLoading} className="flex-1 h-9 gap-1.5">
              <RefreshCw className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
              {isAnyLoading ? 'Cargando…' : 'Actualizar'}
            </Button>
          </div>
        </div>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'resumen' && (
          <ResumenTab
            loading={resumenLoading} error={resumenError} data={resumenData}
            prevData={resumenPrevData} prevDesde={prevDesde} prevHasta={prevHasta}
            onRetry={fetchResumen}
          />
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
        {activeTab === 'financiero' && (
          <FinancieroTab
            loading={financieroLoading} error={financieroError}
            data={financieroData} prevData={financieroPrevData}
            prevDesde={prevDesde} prevHasta={prevHasta}
            onRetry={() => fetchFinanciero()}
          />
        )}
        {activeTab === 'clientes' && (
          <ClientesTab
            loading={clientesLoading} error={clientesError}
            data={clientesData} onRetry={() => fetchClientes()}
          />
        )}
      </div>
    </div>
  );
}
