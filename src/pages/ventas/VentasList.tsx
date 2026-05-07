import { useEffect, useMemo, useState } from 'react';
import { ventaService } from '../../services/venta.service';
import { productoService } from '../../services/producto.service';
import { facturacionService } from '../../services/facturacion.service';
import type {
  VentaDTO,
  ProductoDTO,
  EmitirComprobanteRequest,
  EmitirComprobanteForm,
  ComprobanteDTO,
} from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import {
  Trash2,
  ShoppingCart,
  Search,
  DollarSign,
  Eye,
  User,
  Calendar,
  FileText,
  TrendingUp,
  Hash,
  X,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { exportarVentasExcel, exportarVentasPDF } from '../../utils/reportes-export';
import { useTenantConfigStore } from '../../store/tenantConfigStore';

const IGV_RATE = 0.18;
type MetodoPagoFilter = 'TODOS' | 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
type RangoFecha = 'HOY' | 'AYER' | '7_DIAS' | '30_DIAS' | 'PERSONALIZADO';

function toYyyyMmDdLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function VentasList() {
  const { userId } = useCurrentUser();
  const { user } = useAuthStore();
  const { canDelete, canViewAll, canViewOwn, rol, puede } = usePermissions();
  const { config: negocioConfig } = useTenantConfigStore();

  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [comprobantes, setComprobantes] = useState<ComprobanteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenta, setSelectedVenta] = useState<VentaDTO | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ filtros
  const [metodoPagoFilter, setMetodoPagoFilter] = useState<MetodoPagoFilter>('TODOS');

  const [rangoFecha, setRangoFecha] = useState<RangoFecha>('HOY');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

  const emptyForm = (): EmitirComprobanteForm => ({
    ventaId: 0,
    tipo: 'BOLETA',
    receptor: {
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      razonSocial: '',
      direccion: '',
    },
  });

  // Emitir comprobante desde detalle de venta
  const canEmitirComprobante = puede('EMITIR_COMPROBANTE') || puede('CREAR_VENTA');
  const [isEmitirComprobanteOpen, setIsEmitirComprobanteOpen] = useState(false);
  const [emitirForm, setEmitirForm] = useState<EmitirComprobanteForm>(emptyForm());
  const [emitirSubmitting, setEmitirSubmitting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, rol]);

  // ✅ aplicar rango rápido a fechas
  useEffect(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    if (rangoFecha === 'HOY') {
      setFechaDesde(toYyyyMmDdLocal(todayStart));
      setFechaHasta(toYyyyMmDdLocal(todayStart));
      return;
    }

    if (rangoFecha === 'AYER') {
      const y = new Date(todayStart);
      y.setDate(y.getDate() - 1);
      setFechaDesde(toYyyyMmDdLocal(y));
      setFechaHasta(toYyyyMmDdLocal(y));
      return;
    }

    if (rangoFecha === '7_DIAS') {
      const from = new Date(todayStart);
      from.setDate(from.getDate() - 6);
      setFechaDesde(toYyyyMmDdLocal(from));
      setFechaHasta(toYyyyMmDdLocal(todayStart));
      return;
    }

    if (rangoFecha === '30_DIAS') {
      const from = new Date(todayStart);
      from.setDate(from.getDate() - 29);
      setFechaDesde(toYyyyMmDdLocal(from));
      setFechaHasta(toYyyyMmDdLocal(todayStart));
      return;
    }

    // PERSONALIZADO: no tocar
  }, [rangoFecha]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fechaDesde, fechaHasta, metodoPagoFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const hasViewPermission = canViewAll('VENTAS') || canViewOwn('VENTAS');

      const ventasPromise = (() => {
        if (canViewAll('VENTAS')) return ventaService.getAll();
        if (canViewOwn('VENTAS')) return ventaService.getByVendor(userId!);
        return Promise.resolve([] as VentaDTO[]);
      })();

      const productosPromise =
        hasViewPermission ? productoService.getAll() : Promise.resolve([] as ProductoDTO[]);

      const comprobantesPromise = facturacionService.listComprobantes().catch(() => [] as ComprobanteDTO[]);

      const [ventasData, productosData, comprobantesData] = await Promise.all([
        ventasPromise,
        productosPromise,
        comprobantesPromise,
      ]);

      setVentas(ventasData);
      setProductos(productosData);
      setComprobantes(comprobantesData);
    } catch (error) {
      toast.error('Error al cargar datos');
      if (import.meta.env.DEV) console.error(error);
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (venta: VentaDTO) => {
    setSelectedVenta(venta);
    setIsDetailDialogOpen(true);
  };

  const closeDetailDialog = () => {
    setSelectedVenta(null);
    setIsDetailDialogOpen(false);
  };

  const handleOpenEmitirComprobante = (venta: VentaDTO) => {
    setEmitirForm({
      ventaId: venta.id!,
      tipo: 'BOLETA',
      receptor: { tipoDocumento: undefined, numeroDocumento: '', razonSocial: '', direccion: '' },
    });
    setIsEmitirComprobanteOpen(true);
  };

  const handleEmitirComprobante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emitirForm.tipo === 'FACTURA') {
      if (!emitirForm.receptor?.numeroDocumento || !emitirForm.receptor?.razonSocial) {
        toast.error('Para FACTURA se requiere RUC y Razón Social');
        return;
      }
    }
    try {
      setEmitirSubmitting(true);
      const payload: EmitirComprobanteRequest = {
        ventaId: emitirForm.ventaId,
        tipo: emitirForm.tipo,
        receptorDocTipo: emitirForm.receptor?.tipoDocumento ?? null,
        receptorDocNumero: emitirForm.receptor?.numeroDocumento?.trim() || null,
        receptorNombre: emitirForm.receptor?.razonSocial?.trim() || null,
        receptorDireccion: emitirForm.receptor?.direccion?.trim() || null,
      };
      const result = await facturacionService.emitirComprobante(payload);
      toast.success(`Comprobante emitido: ${result.numero ?? 'OK'}`);
      setIsEmitirComprobanteOpen(false);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { mensaje?: string } } };
      if (err?.response?.status === 403) toast.error('No tienes permiso para emitir comprobantes');
      else if (err?.response?.status === 409) toast.error(err?.response?.data?.mensaje ?? 'Esta venta ya tiene un comprobante asociado');
      else toast.error(err?.response?.data?.mensaje ?? 'Error al emitir comprobante');
    } finally {
      setEmitirSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Venta',
      description: '⚠️ Estás a punto de eliminar esta venta de forma permanente. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await ventaService.delete(id);
          toast.success('Venta eliminada');
          await fetchData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch {
          toast.error('Error al eliminar venta');
        }
      },
    });
  };

  const filteredVentas = ventas.filter((v) => {
    const matchesSearch =
      String(v.id).includes(searchTerm) ||
      v.metodoPago?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendedorNombre?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (metodoPagoFilter !== 'TODOS' && v.metodoPago !== metodoPagoFilter) return false;

    if (fechaDesde || fechaHasta) {
      const created = v.createdAt ? new Date(v.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return false;

      const createdTime = created.getTime();

      if (fechaDesde) {
        const [y, m, d] = fechaDesde.split('-').map(Number);
        const from = startOfDay(new Date(y, m - 1, d)).getTime();
        if (createdTime < from) return false;
      }

      if (fechaHasta) {
        const [y, m, d] = fechaHasta.split('-').map(Number);
        const to = endOfDay(new Date(y, m - 1, d)).getTime();
        if (createdTime > to) return false;
      }
    }

    return true;
  }).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ?? 0);
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ?? 0);
    return dateB - dateA; // más reciente primero
  });

  const totalPages = Math.ceil(filteredVentas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVentas = filteredVentas.slice(startIndex, endIndex);

  // ✅ Cards solicitados
  const totalVentas = ventas.length;
  const ingresosFiltrads = filteredVentas.reduce((s, v) => s + v.total, 0);
  const ticketPromedio = filteredVentas.length > 0 ? ingresosFiltrads / filteredVentas.length : 0;

  const hoy = new Date();
  const ventasHoy = ventas.filter((v) => {
    if (!v.createdAt) return false;
    const d = new Date(v.createdAt);
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
  });
  const totalVentasHoy = ventasHoy.length;

  // ✅ FIX: Map tipado explícito + lectura con variable tipada (evita "never")
  const productoById = useMemo<Map<number, ProductoDTO>>(() => {
    const m = new Map<number, ProductoDTO>();
    for (const p of productos) {
      if (p.id != null) m.set(Number(p.id), p);
    }
    return m;
  }, [productos]);

  const topProducto = useMemo<{
      productoId: number;
      nombre: string;
      cantidad: number;
    } | null>(() => {
      const counts = new Map<number, { productoId: number; nombre: string; cantidad: number }>();

      for (const v of ventas) {
        for (const d of v.detalles ?? []) {
          const id = Number(d.productoId);
          if (!id) continue;

          const prod: ProductoDTO | undefined = productoById.get(id);

          const nombre = d.productoNombre || prod?.nombre || `Producto #${id}`;

          const prev = counts.get(id);
          if (prev) prev.cantidad += d.cantidad ?? 0;
          else counts.set(id, { productoId: id, nombre, cantidad: d.cantidad ?? 0 });
        }
      }

      let best: { productoId: number; nombre: string; cantidad: number } | null = null;

      counts.forEach((v) => {
        if (!best || v.cantidad > best.cantidad) best = v;
      });

      return best;
  }, [ventas, productoById]);

  const etiquetaFiltro =
    rangoFecha === 'HOY'    ? 'Hoy' :
    rangoFecha === 'AYER'   ? 'Ayer' :
    rangoFecha === '7_DIAS' ? 'Últimos 7 días' :
    rangoFecha === '30_DIAS'? 'Últimos 30 días' :
    fechaDesde && fechaHasta ? `${fechaDesde} al ${fechaHasta}` :
    fechaDesde ? `Desde ${fechaDesde}` : 'Período personalizado';

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = () => {
    try {
      exportarVentasExcel(filteredVentas, etiquetaFiltro);
    } catch { toast.error('Error al exportar Excel'); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      exportarVentasPDF(filteredVentas, etiquetaFiltro, negocioConfig);
    } catch { toast.error('Error al exportar PDF'); }
    finally { setExporting(false); }
  };

  if (loading) return <LoadingSpinner />;

  if (!canViewAll('VENTAS') && !canViewOwn('VENTAS') && !canCreate('VENTAS')) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Sin acceso a ventas"
        description="No tienes permisos para ver ventas. Contacta al administrador para solicitar acceso."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">Gestiona las ventas y transacciones</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(canViewAll('VENTAS') || canViewOwn('VENTAS')) && filteredVentas.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex-1 sm:flex-none">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting} className="flex-1 sm:flex-none">
                <FileDown className="mr-2 h-4 w-4 text-red-500" />
                {exporting ? 'Exportando...' : 'PDF'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Ventas</p>
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="text-violet-600 dark:text-violet-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight">{totalVentas}</div>
            <p className="text-xs text-muted-foreground mt-1">Transacciones registradas</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ventas de hoy</p>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight">{totalVentasHoy}</div>
            <p className="text-xs text-muted-foreground mt-1">Transacciones del día</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto más vendido</p>
            <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="text-orange-600 dark:text-orange-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {topProducto ? (
              <>
                <div className="text-xl font-bold tracking-tight leading-tight">{topProducto.nombre}</div>
                <p className="text-xs text-muted-foreground mt-1">{topProducto.cantidad} unidad(es)</p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold tracking-tight text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground mt-1">Sin datos aún</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingresos del Período</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="text-emerald-600 dark:text-emerald-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight">S/.{ingresosFiltrads.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Ticket prom. S/.{ticketPromedio.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">

            {/* Rangos rápidos — tab bar scrollable (sin wrap) */}
            <div className="rounded-lg border border-input bg-muted p-1">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide" role="tablist">
                {(
                  [
                    { key: 'HOY',          label: 'Hoy' },
                    { key: '7_DIAS',       label: '7 días' },
                    { key: '30_DIAS',      label: '30 días' },
                    { key: 'PERSONALIZADO', label: 'Personalizado' },
                  ] as Array<{ key: RangoFecha; label: string }>
                ).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    role="tab"
                    aria-selected={rangoFecha === r.key}
                    onClick={() => setRangoFecha(r.key)}
                    className={[
                      'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition flex-1',
                      rangoFecha === r.key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                    ].join(' ')}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Buscar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, vendedor, método de pago..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Desde / Hasta / Limpiar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rango de fechas</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setFechaDesde('');
                    setFechaHasta('');
                    setMetodoPagoFilter('TODOS');
                    setRangoFecha('PERSONALIZADO');
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Desde</label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => { setFechaDesde(e.target.value); setRangoFecha('PERSONALIZADO'); }}
                    className="h-9 text-sm w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Hasta</label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => { setFechaHasta(e.target.value); setRangoFecha('PERSONALIZADO'); }}
                    className="h-9 text-sm w-full"
                  />
                </div>
              </div>
            </div>

            {/* Método de pago — tab bar scrollable */}
            <div className="rounded-lg border border-input bg-muted p-1">
              <div
                className="flex gap-1 overflow-x-auto scrollbar-hide"
                role="tablist"
                aria-label="Filtrar por método de pago"
              >
                {(
                  [
                    { key: 'TODOS',     label: 'Todos' },
                    { key: 'EFECTIVO',  label: '💵 Efectivo' },
                    { key: 'TARJETA',   label: '💳 Tarjeta' },
                    { key: 'YAPE_PLIN', label: '📱 Yape/Plin' },
                  ] as Array<{ key: MetodoPagoFilter; label: string }>
                ).map((t) => {
                  const active = metodoPagoFilter === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setMetodoPagoFilter(t.key)}
                      className={[
                        'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition flex-1',
                        active
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                      ].join(' ')}
                      aria-pressed={active}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ventas</CardTitle>
          <CardDescription>{filteredVentas.length} venta(s) — {etiquetaFiltro}</CardDescription>
        </CardHeader>
        <CardContent>
          {!canViewAll('VENTAS') && !canViewOwn('VENTAS') ? (
            <EmptyState title="Sin permisos" description="No tienes permisos para ver ventas" />
          ) : filteredVentas.length === 0 ? (
            <EmptyState title="No hay ventas" description="Comienza registrando tu primera venta" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Método de Pago</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentVentas.map((venta) => (
                      <TableRow key={venta.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            <span className="font-semibold text-foreground">{venta.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {venta.createdAt ? new Date(venta.createdAt).toLocaleDateString('es-PE') : '-'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {venta.createdAt
                              ? new Date(venta.createdAt).toLocaleTimeString('es-PE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{venta.vendedorNombre || 'Sin nombre'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{venta.metodoPago}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">S/.{venta.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              venta.estado === 'COMPLETADA'
                                ? 'success'
                                : venta.estado === 'PENDIENTE'
                                  ? 'warning'
                                  : 'destructive'
                            }
                          >
                            {venta.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{venta.detalles.length} producto(s)</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetail(venta)}
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            {canDelete('VENTAS') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(venta.id!)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredVentas.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog - Detalle de Venta */}
      <Dialog
        isOpen={isDetailDialogOpen}
        onClose={closeDetailDialog}
        title="Detalle de Venta"
        description={selectedVenta ? `Venta #${selectedVenta.id} - ${selectedVenta.estado}` : ''}
        size="lg"
      >
        {selectedVenta &&
          (() => {
            const subtotalVenta = selectedVenta.detalles.reduce((acc, d) => acc + d.cantidad * d.precioUnitario, 0);
            // subtotalVenta = total (precio ya incluye IGV)
            const igvVenta = subtotalVenta * IGV_RATE / (1 + IGV_RATE);
            const baseImponible = subtotalVenta / (1 + IGV_RATE);
            const totalCalculado = subtotalVenta;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">Método de Pago</p>
                    <p className="font-semibold text-sm">{selectedVenta.metodoPago}</p>
                  </div>

                  <div className="space-y-1 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">Estado</p>
                    <Badge
                      variant={
                        selectedVenta.estado === 'COMPLETADA'
                          ? 'success'
                          : selectedVenta.estado === 'PENDIENTE'
                            ? 'warning'
                            : 'destructive'
                      }
                      className="w-fit"
                    >
                      {selectedVenta.estado}
                    </Badge>
                  </div>

                  <div className="space-y-1 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">Vendedor</p>
                    <p className="font-semibold text-sm">{selectedVenta.vendedorNombre || 'Sin nombre'}</p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Precio Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {selectedVenta.detalles.map((detalle, index) => {
                        const productoInfo = productos.find((p) => p.id === detalle.productoId);
                        const subtotalLinea = detalle.cantidad * detalle.precioUnitario;

                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {detalle.productoNombre || productoInfo?.nombre || `Producto #${detalle.productoId}`}
                            </TableCell>
                            <TableCell className="text-center">{detalle.cantidad}</TableCell>
                            <TableCell className="text-right">S/.{detalle.precioUnitario.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              S/.{subtotalLinea.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-primary/10 border border-primary rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Base imponible:</span>
                    <span className="font-semibold">S/.{baseImponible.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">IGV (18%) incl.:</span>
                    <span className="font-semibold">S/.{igvVenta.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t border-primary/20 flex justify-between items-center">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-primary">S/.{totalCalculado.toFixed(2)}</span>
                  </div>
                </div>

                {canEmitirComprobante && selectedVenta.estado === 'COMPLETADA' && (() => {
                  const yaFacturada = comprobantes.some(
                    (c) => c.ventaId === selectedVenta.id && c.estado === 'EMITIDO'
                  );
                  return yaFacturada ? (
                    <div className="w-full flex items-center justify-center gap-2 rounded-md border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 px-4 py-2 text-sm text-green-700 dark:text-green-300 font-medium">
                      <FileText size={16} />
                      Comprobante ya emitido
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2"
                      onClick={() => handleOpenEmitirComprobante(selectedVenta)}
                    >
                      <FileText size={16} />
                      Emitir Comprobante
                    </Button>
                  );
                })()}

                <Button onClick={closeDetailDialog} className="w-full">
                  Cerrar
                </Button>
              </div>
            );
          })()}
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        onConfirm={async () => {
          if (confirmDialog.action) await confirmDialog.action();
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      {/* Dialog - Emitir Comprobante desde Venta */}
      <Dialog
        isOpen={isEmitirComprobanteOpen}
        onClose={() => setIsEmitirComprobanteOpen(false)}
        title="Emitir Comprobante"
        description={emitirForm.ventaId ? `Para Venta #${emitirForm.ventaId}` : ''}
        size="md"
      >
        <form onSubmit={handleEmitirComprobante} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Tipo de Comprobante <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-3">
              {(['BOLETA', 'FACTURA'] as const).map((tipo) => (
                <label
                  key={tipo}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-md border-2 px-4 py-3 cursor-pointer transition-colors ${
                    emitirForm.tipo === tipo
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={emitirForm.tipo === tipo}
                    onChange={() =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        tipo,
                        receptor:
                          tipo === 'BOLETA'
                            ? { tipoDocumento: 'DNI' as const, numeroDocumento: '', razonSocial: '', direccion: '' }
                            : { tipoDocumento: 'RUC' as const, numeroDocumento: '', razonSocial: '', direccion: '' },
                      }))
                    }
                  />
                  {tipo}
                  <span className="text-xs text-muted-foreground font-normal">
                    {tipo === 'BOLETA' ? '(B001)' : '(F001)'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <p className="text-sm font-medium">
              Datos del receptor {emitirForm.tipo === 'FACTURA' && <span className="text-destructive">*</span>}
            </p>
            {emitirForm.tipo === 'FACTURA' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">
                    RUC <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="20xxxxxxxxx (11 dígitos)"
                    maxLength={11}
                    value={emitirForm.receptor?.numeroDocumento ?? ''}
                    onChange={(e) =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        receptor: { ...prev.receptor, tipoDocumento: 'RUC' as const, numeroDocumento: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">
                    Razón Social <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Nombre de la empresa"
                    value={emitirForm.receptor?.razonSocial ?? ''}
                    onChange={(e) =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        receptor: { ...prev.receptor, razonSocial: e.target.value },
                      }))
                    }
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">DNI (opcional)</label>
                  <Input
                    placeholder="DNI del cliente"
                    maxLength={8}
                    value={emitirForm.receptor?.numeroDocumento ?? ''}
                    onChange={(e) =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        receptor: { ...prev.receptor, tipoDocumento: 'DNI' as const, numeroDocumento: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Nombre (opcional)</label>
                  <Input
                    placeholder="Nombre del cliente"
                    value={emitirForm.receptor?.razonSocial ?? ''}
                    onChange={(e) =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        receptor: { ...prev.receptor, razonSocial: e.target.value },
                      }))
                    }
                  />
                </div>
              </>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Dirección (opcional)</label>
              <Input
                placeholder="Dirección del receptor"
                value={emitirForm.receptor?.direccion ?? ''}
                onChange={(e) =>
                  setEmitirForm((prev) => ({
                    ...prev,
                    receptor: { ...prev.receptor, direccion: e.target.value },
                  }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setIsEmitirComprobanteOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={emitirSubmitting}>
              {emitirSubmitting ? 'Emitiendo...' : 'Emitir Comprobante'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}