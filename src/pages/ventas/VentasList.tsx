import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ventaService } from '../../services/venta.service';
import { productoService } from '../../services/producto.service';
import { facturacionService } from '../../services/facturacion.service';
import { clienteService } from '../../services/cliente.service';
import type { ClienteDTO } from '../../services/cliente.service';
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
  RotateCcw,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';
import { exportarVentasExcel, exportarVentasPDF } from '../../utils/reportes-export';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { DevolucionModal } from '../../components/ventas/DevolucionModal';

const IGV_RATE = 0.18;
type MetodoPagoFilter = 'TODOS' | 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
type EstadoVentaFilter = 'TODOS' | 'COMPLETADA' | 'ANULADA' | 'DEVUELTA' | 'DEVUELTA_PARCIAL';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function VentasList() {
  const { userId } = useCurrentUser();
  const navigate = useNavigate();
  const { canDelete, canViewAll, canViewOwn, canCreate, rol, puede } = usePermissions();
  const { config: negocioConfig } = useTenantConfigStore();

  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [comprobantes, setComprobantes] = useState<ComprobanteDTO[]>([]);
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenta, setSelectedVenta] = useState<VentaDTO | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ filtros
  const [metodoPagoFilter, setMetodoPagoFilter] = useState<MetodoPagoFilter>('TODOS');
  const [estadoVentaFilter, setEstadoVentaFilter] = useState<EstadoVentaFilter>('TODOS');

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [devolucionVenta, setDevolucionVenta] = useState<VentaDTO | null>(null);
  const [showDevolucion, setShowDevolucion] = useState(false);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fechaDesde, fechaHasta, metodoPagoFilter, estadoVentaFilter]);

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
      const clientesPromise = clienteService.getAll().catch(() => [] as ClienteDTO[]);

      const [ventasData, productosData, comprobantesData, clientesData] = await Promise.all([
        ventasPromise,
        productosPromise,
        comprobantesPromise,
        clientesPromise,
      ]);

      setVentas(ventasData);
      setProductos(productosData);
      setComprobantes(comprobantesData);
      setClientes(clientesData);
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
    // Si la venta tiene cliente registrado, pre-llenar los datos del receptor
    const cliente = venta.clienteId ? clienteById.get(venta.clienteId) : null;
    setEmitirForm({
      ventaId: venta.id!,
      tipo: 'BOLETA',
      receptor: {
        tipoDocumento: (cliente?.tipoDocumento as 'DNI' | 'RUC' | undefined) ?? 'DNI',
        numeroDocumento: cliente?.numeroDocumento ?? '',
        razonSocial: cliente?.nombre ?? '',
        direccion: cliente?.direccion ?? '',
      },
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

  const handleAnular = (venta: VentaDTO) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Anular Venta',
      description: `¿Seguro que deseas anular la Venta #${venta.id}? El registro se conserva pero quedará marcado como ANULADA.`,
      confirmText: 'Sí, anular',
      action: async () => {
        try {
          await ventaService.anular(venta.id!);
          toast.success(`Venta #${venta.id} anulada`);
          await fetchData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (err: any) {
          toast.error(err?.response?.data?.mensaje || 'Error al anular la venta');
        }
      },
    });
  };

  // Mapa clienteId → ClienteDTO para lookup rápido — debe ir ANTES de filteredVentas
  const clienteById = useMemo<Map<number, ClienteDTO>>(() => {
    const m = new Map<number, ClienteDTO>();
    for (const c of clientes) {
      if (c.id != null) m.set(Number(c.id), c);
    }
    return m;
  }, [clientes]);

  const filteredVentas = ventas.filter((v) => {
    const cliente = v.clienteId ? clienteById.get(v.clienteId) : null;
    const matchesSearch =
      String(v.id).includes(searchTerm) ||
      v.metodoPago?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendedorNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.numeroDocumento?.includes(searchTerm);

    if (!matchesSearch) return false;

    if (metodoPagoFilter !== 'TODOS' && v.metodoPago !== metodoPagoFilter) return false;
    if (estadoVentaFilter !== 'TODOS' && v.estado !== estadoVentaFilter) return false;

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

  // Solo ventas activas (excluye ANULADAS) para el resumen financiero
  const ventasActivas = filteredVentas.filter(v => v.estado !== 'ANULADA');
  const ingresosFiltrads = ventasActivas.reduce((s, v) => s + v.total, 0);
  const ticketPromedio = ventasActivas.length > 0 ? ingresosFiltrads / ventasActivas.length : 0;

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
    fechaDesde && fechaHasta ? `${fechaDesde} al ${fechaHasta}` :
    fechaDesde ? `Desde ${fechaDesde}` :
    fechaHasta ? `Hasta ${fechaHasta}` : 'Todas las fechas';

  const [exporting, setExporting] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Cuenta de filtros activos (excluye search — ese va en barra principal)
  const activeFiltersCount = [
    metodoPagoFilter !== 'TODOS',
    estadoVentaFilter !== 'TODOS',
    !!fechaDesde,
    !!fechaHasta,
  ].filter(Boolean).length;

  const limpiarFiltros = () => {
    setMetodoPagoFilter('TODOS');
    setEstadoVentaFilter('TODOS');
    setFechaDesde('');
    setFechaHasta('');
  };

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

      {/* Barra de búsqueda + botón filtros */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por ID, vendedor, cliente, método..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 pr-9"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Botón Filtros */}
        <button
          type="button"
          onClick={() => setShowFilterDrawer(true)}
          className="relative flex items-center gap-2 h-10 px-4 rounded-lg border border-input bg-background hover:bg-muted transition-colors text-sm font-medium shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Chips de filtros activos */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center -mt-2">
          {metodoPagoFilter !== 'TODOS' && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium">
              Pago: {metodoPagoFilter === 'YAPE_PLIN' ? 'Yape/Plin' : metodoPagoFilter.charAt(0) + metodoPagoFilter.slice(1).toLowerCase()}
              <button type="button" onClick={() => setMetodoPagoFilter('TODOS')} className="hover:text-primary/70"><X className="h-3 w-3" /></button>
            </span>
          )}
          {estadoVentaFilter !== 'TODOS' && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium">
              Estado: {estadoVentaFilter === 'DEVUELTA_PARCIAL' ? 'Dev. parcial' : estadoVentaFilter.charAt(0) + estadoVentaFilter.slice(1).toLowerCase()}
              <button type="button" onClick={() => setEstadoVentaFilter('TODOS')} className="hover:text-primary/70"><X className="h-3 w-3" /></button>
            </span>
          )}
          {fechaDesde && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium">
              Desde: {fechaDesde}
              <button type="button" onClick={() => setFechaDesde('')} className="hover:text-primary/70"><X className="h-3 w-3" /></button>
            </span>
          )}
          {fechaHasta && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-medium">
              Hasta: {fechaHasta}
              <button type="button" onClick={() => setFechaHasta('')} className="hover:text-primary/70"><X className="h-3 w-3" /></button>
            </span>
          )}
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* ── Filter Drawer ─────────────────────────────────────────────────── */}
      {/* Backdrop — cubre desde inset-0; header (z-45) y sidebar (z-40) quedan encima */}
      <div
        className={`fixed inset-0 bg-black/50 z-[35] transition-opacity duration-300 ${showFilterDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowFilterDrawer(false)}
      />
      {/* Panel — arranca en top-16 (bajo el header), oscuro, bordes redondeados a la izq */}
      <div
        className={`fixed right-0 top-16 w-80 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out rounded-l-2xl overflow-hidden
          bg-slate-900 border-l border-t border-b border-slate-700/50
          ${showFilterDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ height: 'calc(100vh - 7rem)', maxHeight: 'calc(100dvh - 7rem)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <h2 className="font-semibold text-sm text-white">Filtros</h2>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilterDrawer(false)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Drawer content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Rango de fechas */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-blue-400" /> Rango de fechas
            </p>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full h-9 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm px-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full h-9 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm px-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>
              {(fechaDesde || fechaHasta) && (
                <button
                  type="button"
                  onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Limpiar fechas
                </button>
              )}
            </div>
          </div>

          {/* Método de pago */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'TODOS',     label: 'Todos' },
                  { key: 'EFECTIVO',  label: 'Efectivo' },
                  { key: 'TARJETA',   label: 'Tarjeta' },
                  { key: 'YAPE_PLIN', label: 'Yape/Plin' },
                ] as Array<{ key: MetodoPagoFilter; label: string }>
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMetodoPagoFilter(t.key)}
                  className={`rounded-lg border py-2 text-xs font-semibold transition-all text-center ${
                    metodoPagoFilter === t.key
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300 shadow-sm shadow-blue-500/10'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estado */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Estado</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'TODOS',            label: 'Todos' },
                  { key: 'COMPLETADA',       label: 'Completada' },
                  { key: 'DEVUELTA_PARCIAL', label: 'Dev. parcial' },
                  { key: 'DEVUELTA',         label: 'Devuelta' },
                  { key: 'ANULADA',          label: 'Anulada' },
                ] as Array<{ key: EstadoVentaFilter; label: string }>
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setEstadoVentaFilter(t.key)}
                  className={`rounded-lg border py-2 text-xs font-semibold transition-all text-center ${
                    estadoVentaFilter === t.key
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300 shadow-sm shadow-blue-500/10'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer footer */}
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/40 shrink-0 flex gap-2">
          <button
            type="button"
            onClick={limpiarFiltros}
            className="flex-1 h-9 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-400 transition-all"
          >
            Limpiar todo
          </button>
          <button
            type="button"
            onClick={() => setShowFilterDrawer(false)}
            className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            Ver {filteredVentas.length} resultado{filteredVentas.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
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
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Cliente</TableHead>
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
                            <p className="font-medium text-sm">{venta.vendedorNombre || 'Sin nombre'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {venta.clienteId && clienteById.get(venta.clienteId) ? (
                            <div>
                              <p className="text-sm font-medium">{clienteById.get(venta.clienteId)!.nombre}</p>
                              {clienteById.get(venta.clienteId)!.numeroDocumento && (
                                <p className="text-xs text-muted-foreground">
                                  {clienteById.get(venta.clienteId)!.tipoDocumento} {clienteById.get(venta.clienteId)!.numeroDocumento}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
                                : venta.estado === 'DEVUELTA_PARCIAL'
                                  ? 'warning'
                                  : venta.estado === 'DEVUELTA'
                                    ? 'secondary'
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
                            {(venta.estado === 'COMPLETADA' || venta.estado === 'DEVUELTA_PARCIAL') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDevolucionVenta(venta);
                                  setShowDevolucion(true);
                                }}
                                title="Registrar devolución"
                              >
                                <RotateCcw className="h-4 w-4 text-amber-600" />
                              </Button>
                            )}
                            {canDelete('VENTAS') && venta.estado !== 'ANULADA' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAnular(venta)}
                                title="Anular venta"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            {venta.estado === 'ANULADA' && canCreate('VENTAS') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate('/pos', { state: { cargarVenta: venta } })}
                                title="Rehacer en POS"
                              >
                                <RefreshCw className="h-4 w-4 text-emerald-600" />
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
            const descuentoNc = selectedVenta.descuentoNotaCredito ?? 0;
            const totalConDescuento = Math.max(0, subtotalVenta - descuentoNc);
            const igvVenta = totalConDescuento * IGV_RATE / (1 + IGV_RATE);
            const baseImponible = totalConDescuento / (1 + IGV_RATE);
            const totalCalculado = totalConDescuento;

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
                          : selectedVenta.estado === 'DEVUELTA_PARCIAL'
                            ? 'warning'
                            : selectedVenta.estado === 'DEVUELTA'
                              ? 'secondary'
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

                {/* Cliente asociado */}
                {(() => {
                  const cliente = selectedVenta.clienteId ? clienteById.get(selectedVenta.clienteId) : null;
                  return (
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${cliente ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-muted border-border'}`}>
                      <User className={`h-4 w-4 flex-shrink-0 ${cliente ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Cliente</p>
                        {cliente ? (
                          <>
                            <p className="font-semibold text-sm">{cliente.nombre}</p>
                            {cliente.numeroDocumento && (
                              <p className="text-xs text-muted-foreground">{cliente.tipoDocumento} {cliente.numeroDocumento}</p>
                            )}
                          </>
                        ) : (
                          <p className="font-semibold text-sm text-muted-foreground">Consumidor final</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
                  {descuentoNc > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Subtotal productos:</span>
                      <span className="font-semibold">S/.{subtotalVenta.toFixed(2)}</span>
                    </div>
                  )}

                  {descuentoNc > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                        🎟 Descuento Nota de Crédito
                        {selectedVenta.notaCreditoId && (
                          <span className="font-mono text-xs text-muted-foreground ml-1">
                            #{selectedVenta.notaCreditoId}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        - S/.{descuentoNc.toFixed(2)}
                      </span>
                    </div>
                  )}

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

      {/* Devolucion Modal */}
      {showDevolucion && devolucionVenta && (
        <DevolucionModal
          venta={devolucionVenta}
          onSuccess={fetchData}
          onClose={() => {
            setShowDevolucion(false);
            setDevolucionVenta(null);
          }}
        />
      )}

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