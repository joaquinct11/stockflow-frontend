import { useEffect, useState } from 'react';
import { facturacionService } from '../../services/facturacion.service';
import { ventaService } from '../../services/venta.service';
import { clienteService } from '../../services/cliente.service';
import type { ComprobanteDTO, EmitirComprobanteForm, EmitirComprobanteRequest, TipoComprobante, VentaDTO, ItemComprobanteDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { Pagination } from '../../components/ui/Pagination';
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, Eye, DollarSign, Printer, X, Send, Download, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { printTicket } from '../../utils/printTicket';
import { useTenantConfigStore } from '../../store/tenantConfigStore';

const TIPO_OPTIONS: TipoComprobante[] = ['BOLETA', 'FACTURA'];
// const ESTADO_OPTIONS = ['EMITIDO', 'ANULADO'];

function estadoBadgeVariant(estado: string): 'success' | 'destructive' | 'warning' | 'default' {
  if (estado === 'EMITIDO') return 'success';
  if (estado === 'ANULADO') return 'destructive';
  return 'default';
}

function estadoIcon(estado: string) {
  if (estado === 'EMITIDO') return <CheckCircle size={14} className="inline mr-1" />;
  if (estado === 'ANULADO') return <XCircle size={14} className="inline mr-1" />;
  return <Clock size={14} className="inline mr-1" />;
}

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

export function ComprobantesPage() {
  const { canAccess, puede, canCreate, canDelete, isVendedor } = usePermissions();
  const { user } = useAuthStore();
  const { config: tenantConfig } = useTenantConfigStore();

  const canView = canAccess('FACTURACION');
  const canEmitir = puede('EMITIR_COMPROBANTE') || canCreate('FACTURACION');
  const canAnular = puede('ANULAR_COMPROBANTE') || canDelete('FACTURACION');

  const [comprobantes, setComprobantes] = useState<ComprobanteDTO[]>([]);
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Emit dialog
  const [isEmitirOpen, setIsEmitirOpen] = useState(false);
  const [emitirForm, setEmitirForm] = useState<EmitirComprobanteForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog
  const [selectedComprobante, setSelectedComprobante] = useState<ComprobanteDTO | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Anular confirm
  const [confirmAnular, setConfirmAnular] = useState<{ isOpen: boolean; id: number | null; sunatEstado?: string }>({
    isOpen: false,
    id: null,
  });

  const [downloadingPdf, setDownloadingPdf]     = useState<number | null>(null);
  const [enviandoSunat, setEnviandoSunat]       = useState<number | null>(null);

  useEffect(() => {
    if (canView) {
      fetchComprobantes();
      fetchVentas();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, filterTipo, filterEstado, fechaDesde, fechaHasta]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTipo, filterEstado, fechaDesde, fechaHasta]);

  const fetchVentas = async () => {
    try {
      // VENDEDOR solo puede ver sus propias ventas (VER_MIS_VENTAS)
      const data = isVendedor && user?.usuarioId
        ? await ventaService.getByVendor(user.usuarioId)
        : await ventaService.getAll();
      setVentas(data);
    } catch { /* no bloquear si falla */ }
  };

  const fetchComprobantes = async () => {
    try {
      setLoading(true);
      const data = await facturacionService.listComprobantes({
        tipo: filterTipo || undefined,
        estado: filterEstado || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      });
      setComprobantes(data);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para ver comprobantes');
      } else {
        toast.error('Error al cargar comprobantes');
      }
      setComprobantes([]);
    } finally {
      setLoading(false);
    }
  };

  // VENDEDOR solo ve comprobantes de sus propias ventas
  const ventasIds = isVendedor ? new Set(ventas.map(v => v.id)) : null;
  const comprobantesBase = ventasIds
    ? comprobantes.filter(c => ventasIds.has(c.ventaId))
    : comprobantes;

  const filteredComprobantes = comprobantesBase.filter((c) => {
    // ✅ 1) filtro fechas (createdAt)
    if (fechaDesde || fechaHasta) {
      const created = c.createdAt ? new Date(c.createdAt) : null;
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

    // ✅ 2) filtro search
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.numero?.toLowerCase().includes(term) ||
      String(c.ventaId).includes(term) ||
      c.receptor?.razonSocial?.toLowerCase().includes(term) ||
      c.receptor?.numeroDocumento?.toLowerCase().includes(term)
    );
  });

  const sortedComprobantes = [...filteredComprobantes].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ?? 0);
    const db = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ?? 0);
    return db - da;
  });

  const totalPages = Math.ceil(sortedComprobantes.length / itemsPerPage);
  const paginatedComprobantes = sortedComprobantes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function endOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  const handleEnviarSunat = async (comprobante: ComprobanteDTO) => {
    if (!comprobante.id) return;
    try {
      setEnviandoSunat(comprobante.id);
      const updated = await facturacionService.enviarASunat(comprobante.id);
      if (updated.sunatEstado === 'ACEPTADO') {
        const msg = updated.sunatMensaje ?? `Aceptado por SUNAT: ${updated.numero}`;
        toast.success(`✅ ${msg}`);
      } else if (updated.sunatEstado === 'RECHAZADO') {
        const msg = updated.sunatMensaje ?? 'Revisa los datos del comprobante.';
        toast.error(`❌ SUNAT rechazó ${updated.numero}: ${msg}`, { duration: 8000 });
      } else {
        const msg = updated.sunatMensaje ?? 'Verificando con SUNAT…';
        toast(`🏛️ ${msg}`, { duration: 5000 });
      }
      // Si el detalle está abierto para este comprobante, actualizarlo en tiempo real
      if (selectedComprobante?.id === updated.id) {
        setSelectedComprobante(updated);
      }
      fetchComprobantes();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { mensaje?: string; message?: string } } };
      const msg = err?.response?.data?.mensaje
               ?? err?.response?.data?.message
               ?? 'Error enviando a SUNAT';
      toast.error(msg);
    } finally {
      setEnviandoSunat(null);
    }
  };

  const handleDownloadPdf = async (comprobante: ComprobanteDTO) => {
    if (!comprobante.id) return;
    try {
      setDownloadingPdf(comprobante.id);
      const blob = await facturacionService.downloadPdf(comprobante.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${comprobante.numero ?? `comprobante-${comprobante.id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar el PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleVentaSelect = async (opt: { id: number } | null) => {
    const ventaId = opt?.id ? Number(opt.id) : 0;
    setEmitirForm((prev) => ({ ...prev, ventaId }));

    if (!ventaId) return;

    const venta = ventas.find((v) => v.id === ventaId);
    if (!venta?.clienteId) return;

    try {
      const cliente = await clienteService.getById(venta.clienteId);
      const docNumero = cliente.numeroDocumento ?? '';
      const tipoDoc: 'DNI' | 'RUC' =
        docNumero.length === 11 ? 'RUC' :
        docNumero.length === 8  ? 'DNI' :
        (cliente.tipoDocumento === 'RUC' ? 'RUC' : 'DNI'); // fallback al campo guardado
      const esRuc = tipoDoc === 'RUC';
      setEmitirForm((prev) => ({
        ...prev,
        ventaId,
        tipo: esRuc ? 'FACTURA' : prev.tipo,
        receptor: {
          tipoDocumento: tipoDoc,
          numeroDocumento: docNumero,
          razonSocial: cliente.nombre ?? '',
          direccion: cliente.direccion ?? '',
        },
      }));
    } catch {
      // Si falla la búsqueda del cliente, no interrumpir el flujo
    }
  };

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emitirForm.ventaId || emitirForm.ventaId <= 0) {
      toast.error('Ingresa un ID de venta válido');
      return;
    }

    if (emitirForm.tipo === 'FACTURA') {
      if (!emitirForm.receptor?.numeroDocumento || !emitirForm.receptor?.razonSocial) {
        toast.error('Para FACTURA se requiere RUC y Razón Social');
        return;
      }
    }

    try {
      setSubmitting(true);
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
      setIsEmitirOpen(false);
      setEmitirForm(emptyForm());
      fetchComprobantes();
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { mensaje?: string } } };
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para emitir comprobantes');
      } else if (err?.response?.status === 409) {
        toast.error(err?.response?.data?.mensaje ?? 'Esta venta ya tiene un comprobante asociado');
      } else {
        toast.error(err?.response?.data?.mensaje ?? 'Error al emitir comprobante');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnular = async () => {
    if (!confirmAnular.id) return;
    try {
      await facturacionService.anularComprobante(confirmAnular.id);
      toast.success('Comprobante anulado');
      fetchComprobantes();
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { mensaje?: string } } };
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para anular comprobantes');
      } else {
        toast.error(err?.response?.data?.mensaje ?? 'Error al anular comprobante');
      }
    } finally {
      setConfirmAnular({ isOpen: false, id: null });
    }
  };

  // const resetFilters = () => {
  //   setSearchTerm('');
  //   setFilterTipo('');
  //   setFilterEstado('');
  //   setFechaDesde('');
  //   setFechaHasta('');
  // };

  const ventasYaFacturadas = new Set(
    comprobantes.filter((c) => c.estado === 'EMITIDO').map((c) => c.ventaId)
  );

  const ventaById = new Map(ventas.map(v => [v.id, v]));

  const activeFiltersCount = [filterTipo, filterEstado, fechaDesde, fechaHasta].filter(Boolean).length;

  const limpiarFiltros = () => {
    setFilterTipo('');
    setFilterEstado('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const ventasOptions = ventas
    .filter((v) => !ventasYaFacturadas.has(v.id!))
    .map((v) => ({
      id: v.id!,
      label: `Venta #${v.id} · S/.${v.total.toFixed(2)}`,
      subtitle: `${v.vendedorNombre ?? ''} · ${v.metodoPago}${v.createdAt ? ' · ' + new Date(v.createdAt).toLocaleDateString('es-PE') : ''}`,
    }));

  const oseNombre = (() => {
    const url = (tenantConfig?.oseUrl ?? '').toLowerCase();
    if (url.includes('nubefact')) return 'Nubefact';
    if (url.includes('efact'))   return 'Efact';
    if (url.includes('sunat'))   return 'SUNAT SOL';
    return 'tu proveedor OSE';
  })();

  if (!canView) {
    return (
      <EmptyState
        icon={FileText}
        title="Acceso restringido"
        description="No tienes permisos para ver el módulo de Facturación."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
          <p className="text-muted-foreground">Gestión de comprobantes electrónicos</p>
        </div>
        {canEmitir && (
          <Button
            onClick={() => {
              setEmitirForm(emptyForm());
              setIsEmitirOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Emitir comprobante
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Comprobantes</p>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight">{comprobantes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emitidos</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {comprobantes.filter((c) => c.estado === 'EMITIDO').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Válidos y enviados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anulados</p>
            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <XCircle className="text-red-600 dark:text-red-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {comprobantes.filter((c) => c.estado === 'ANULADO').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Anulados</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Facturado</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="text-emerald-600 dark:text-emerald-400" size={18} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              S/.{comprobantes.filter((c) => c.estado === 'EMITIDO').reduce((s, c) => s + (c.total ?? 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">De comprobantes emitidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar número, venta, receptor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <button
            onClick={() => setShowFilterDrawer(true)}
            className={[
              'flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-all shrink-0',
              activeFiltersCount > 0
                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'border-input bg-background text-muted-foreground hover:text-foreground hover:border-primary/40',
            ].join(' ')}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filterTipo && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Tipo: {filterTipo}
                <button onClick={() => setFilterTipo('')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            {filterEstado && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {filterEstado}
                <button onClick={() => setFilterEstado('')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            {fechaDesde && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Desde {fechaDesde}
                <button onClick={() => setFechaDesde('')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            {fechaHasta && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Hasta {fechaHasta}
                <button onClick={() => setFechaHasta('')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            <button onClick={limpiarFiltros} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors px-1">
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Filter drawer backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[35] transition-opacity duration-300 ${showFilterDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowFilterDrawer(false)}
      />

      {/* Filter drawer panel */}
      <div
        className={`fixed right-0 top-16 w-80 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out rounded-l-2xl overflow-hidden bg-slate-900 border-l border-t border-b border-slate-700/50 ${showFilterDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ height: 'calc(100vh - 7rem)', maxHeight: 'calc(100dvh - 7rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <h2 className="font-semibold text-sm text-white">Filtros</h2>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{activeFiltersCount}</span>
            )}
          </div>
          <button onClick={() => setShowFilterDrawer(false)} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Rango de fechas */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rango de fechas</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Desde</label>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm px-3 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm px-3 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* Tipo */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['', 'BOLETA', 'FACTURA'] as const).map((key) => (
                <button
                  key={key || 'ALL'}
                  onClick={() => setFilterTipo(key)}
                  className={[
                    'px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
                    filterTipo === key
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500',
                  ].join(' ')}
                >
                  {key === '' ? 'Todos' : key === 'BOLETA' ? 'Boleta' : 'Factura'}
                </button>
              ))}
            </div>
          </div>

          {/* Estado */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['', 'EMITIDO', 'ANULADO'] as const).map((key) => (
                <button
                  key={key || 'ALL'}
                  onClick={() => setFilterEstado(key)}
                  className={[
                    'px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
                    filterEstado === key
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500',
                  ].join(' ')}
                >
                  {key === '' ? 'Todos' : key === 'EMITIDO' ? 'Emitido' : 'Anulado'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/40 shrink-0 flex gap-2">
          <button onClick={limpiarFiltros} className="flex-1 h-9 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition-all">
            Limpiar todo
          </button>
          <button onClick={() => setShowFilterDrawer(false)} className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all">
            Ver {sortedComprobantes.length} resultado{sortedComprobantes.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Comprobantes</CardTitle>
          <CardDescription>
            {sortedComprobantes.length} comprobante{sortedComprobantes.length !== 1 ? 's' : ''} encontrado
            {sortedComprobantes.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : sortedComprobantes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin comprobantes"
              description="No se encontraron comprobantes con los filtros aplicados."
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Número</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Venta</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Receptor</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedComprobantes.map((c) => {
                      const vendedor = ventaById.get(c.ventaId)?.vendedorNombre;
                      return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-semibold">{c.numero ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={c.tipo === 'FACTURA' ? 'default' : 'secondary'}>{c.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">#{c.ventaId}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">
                          {vendedor ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">
                          {c.receptor?.razonSocial || c.receptor?.numeroDocumento || '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {c.total != null ? `S/.${c.total.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>
                          {c.estado === 'ANULADO' ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle size={12} /> Anulado
                            </Badge>
                          ) : c.sunatEstado === 'ACEPTADO' ? (
                            <Badge variant="success" className="gap-1 text-xs" title={c.sunatMensaje ?? undefined}>
                              <CheckCircle size={12} /> SUNAT Aceptado
                            </Badge>
                          ) : c.sunatEstado === 'RECHAZADO' ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="destructive" className="gap-1 text-xs" title={c.sunatMensaje ?? undefined}>
                                <XCircle size={12} /> SUNAT Rechazado
                              </Badge>
                            </div>
                          ) : c.sunatEstado === 'ERROR' ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="destructive" className="gap-1 text-xs opacity-80" title={c.sunatMensaje ?? undefined}>
                                <AlertTriangle size={12} /> Error SUNAT
                              </Badge>
                            </div>
                          ) : c.sunatEstado === 'PENDIENTE' ? (
                            <Badge variant="warning" className="gap-1 text-xs" title={c.sunatMensaje ?? undefined}>
                              <Clock size={12} /> Pendiente SUNAT
                            </Badge>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge variant="success" className="gap-1 text-xs">
                                <CheckCircle size={12} /> Emitido
                              </Badge>
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400 w-fit">
                                <Clock size={9} /> Sin enviar a SUNAT
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-PE') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedComprobante(c);
                                setIsDetailOpen(true);
                              }}
                              title="Ver"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={downloadingPdf === c.id}
                              title="Descargar PDF A4"
                              onClick={() => handleDownloadPdf(c)}
                            >
                              {downloadingPdf === c.id
                                ? <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />
                                : <Download className="h-4 w-4 text-slate-500" />
                              }
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Imprimir ticket"
                              onClick={() => printTicket(c, tenantConfig)}
                            >
                              <Printer className="h-4 w-4 text-slate-500" />
                            </Button>
                            {c.estado === 'EMITIDO' && c.sunatEstado !== 'ACEPTADO' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={enviandoSunat === c.id}
                                title={c.sunatEstado === 'RECHAZADO' ? 'Reenviar a SUNAT' : 'Enviar a SUNAT'}
                                onClick={() => handleEnviarSunat(c)}
                              >
                                {enviandoSunat === c.id
                                  ? <span className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin inline-block" />
                                  : <Send className={`h-4 w-4 ${c.sunatEstado === 'RECHAZADO' ? 'text-red-500' : 'text-indigo-500'}`} />
                                }
                              </Button>
                            )}
                            {canAnular && c.estado === 'EMITIDO' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmAnular({ isOpen: true, id: c.id!, sunatEstado: c.sunatEstado })}
                              >
                                Anular
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );})}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={sortedComprobantes.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Emitir Comprobante Dialog */}
      <Dialog
        isOpen={isEmitirOpen}
        onClose={() => {
          setIsEmitirOpen(false);
          setEmitirForm(emptyForm());
        }}
        title="Emitir Comprobante"
        description="Genera un comprobante electrónico para una venta"
        size="md"
      >
        <form onSubmit={handleEmitir} className="space-y-4">
          {/* Venta */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Venta <span className="text-destructive">*</span>
            </label>
            <Autocomplete
              options={ventasOptions}
              value={ventasOptions.find((o) => o.id === emitirForm.ventaId) ?? null}
              onChange={(opt) => handleVentaSelect(opt ? { id: Number(opt.id) } : null)}
              placeholder="Buscar venta por ID, vendedor..."
              emptyMessage="No se encontraron ventas"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Tipo de Comprobante <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-3">
              {TIPO_OPTIONS.map((tipo) => (
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
                            ? { tipoDocumento: 'DNI', numeroDocumento: '', razonSocial: '', direccion: '' }
                            : { tipoDocumento: 'RUC', numeroDocumento: '', razonSocial: '', direccion: '' },
                      }))
                    }
                  />
                  {tipo}
                  <span className="text-xs text-muted-foreground font-normal">
                    {tipo === 'BOLETA' ? 'con DNI opcional' : 'requiere RUC'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Receptor */}
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <p className="text-sm font-medium">
              Datos del receptor{' '}
              {emitirForm.tipo === 'FACTURA' && <span className="text-destructive">*</span>}
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
                        receptor: { ...prev.receptor, tipoDocumento: 'RUC', numeroDocumento: e.target.value },
                      }))
                    }
                    required={emitirForm.tipo === 'FACTURA'}
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
                    required={emitirForm.tipo === 'FACTURA'}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">
                    DNI <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <Input
                    placeholder="DNI del cliente"
                    maxLength={8}
                    value={emitirForm.receptor?.numeroDocumento ?? ''}
                    onChange={(e) =>
                      setEmitirForm((prev) => ({
                        ...prev,
                        receptor: { ...prev.receptor, tipoDocumento: 'DNI', numeroDocumento: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">
                    Nombre <span className="text-muted-foreground">(opcional)</span>
                  </label>
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
              <label className="text-xs text-muted-foreground font-medium">
                Dirección <span className="text-muted-foreground">(opcional)</span>
              </label>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEmitirOpen(false);
                setEmitirForm(emptyForm());
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Emitiendo...' : 'Emitir Comprobante'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Detail Dialog — vista tipo comprobante real */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedComprobante(null);
        }}
        title=""
        description=""
        size="lg"
      >
        {selectedComprobante && (
          <div className="space-y-0 text-sm" id="comprobante-print">

            {/* ── Cabecera del comprobante ── */}
            <div className="text-center border-b pb-4 mb-4 space-y-1">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Badge
                  variant={selectedComprobante.tipo === 'FACTURA' ? 'default' : 'secondary'}
                  className="text-base px-3 py-1"
                >
                  {selectedComprobante.tipo === 'BOLETA' ? '🧾 BOLETA DE VENTA' : '🏢 FACTURA ELECTRÓNICA'}
                </Badge>
                <Badge variant={estadoBadgeVariant(selectedComprobante.estado)} className="text-xs">
                  {estadoIcon(selectedComprobante.estado)}
                  {selectedComprobante.estado}
                </Badge>
              </div>
              <p className="text-xl font-bold tracking-wide">{selectedComprobante.numero ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                Fecha de emisión:{' '}
                {selectedComprobante.createdAt
                  ? new Date(selectedComprobante.createdAt).toLocaleString('es-PE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>

            {/* ── Receptor ── */}
            <div className="border rounded-lg p-3 mb-4 space-y-1 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {selectedComprobante.tipo === 'FACTURA' ? 'Razón Social' : 'Cliente'}
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedComprobante.receptorDocTipo ?? selectedComprobante.receptor?.tipoDocumento ?? 'DOC'}
                </span>
                <span className="font-medium">
                  {selectedComprobante.receptorDocNumero
                    ?? selectedComprobante.receptor?.numeroDocumento
                    ?? 'CLIENTES VARIOS'}
                </span>
              </div>
              {(selectedComprobante.receptorNombre ?? selectedComprobante.receptor?.razonSocial) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nombre / Razón Social</span>
                  <span className="font-medium text-right max-w-[60%]">
                    {selectedComprobante.receptorNombre ?? selectedComprobante.receptor?.razonSocial}
                  </span>
                </div>
              )}
              {(selectedComprobante.receptorDireccion ?? selectedComprobante.receptor?.direccion) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dirección</span>
                  <span className="font-medium text-right max-w-[60%]">
                    {selectedComprobante.receptorDireccion ?? selectedComprobante.receptor?.direccion}
                  </span>
                </div>
              )}
            </div>

            {/* ── Detalle de productos ── */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Detalle
              </p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-left">
                      <th className="px-3 py-2 font-semibold text-xs">Producto</th>
                      <th className="px-3 py-2 font-semibold text-xs text-center">Cant.</th>
                      <th className="px-3 py-2 font-semibold text-xs text-right">P. Unit.</th>
                      <th className="px-3 py-2 font-semibold text-xs text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedComprobante.items && selectedComprobante.items.length > 0 ? (
                      selectedComprobante.items.map((item: ItemComprobanteDTO, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">
                            <p className="font-medium leading-tight">{item.productoNombre ?? `Producto #${item.productoId}`}</p>
                            {item.codigoBarras && (
                              <p className="text-xs text-muted-foreground">{item.codigoBarras}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right">S/.{Number(item.precioUnitario).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium">S/.{Number(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-xs">
                          Sin detalle de productos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Resumen financiero ── */}
            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="flex justify-between px-4 py-2 border-b bg-muted/30">
                <span className="text-sm text-muted-foreground">OP. GRAVADA</span>
                <span className="text-sm font-medium">
                  S/.{selectedComprobante.subtotal != null ? Number(selectedComprobante.subtotal).toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2 border-b bg-muted/30">
                <span className="text-sm text-muted-foreground">IGV ({tenantConfig?.igvPorcentaje ?? 18}%)</span>
                <span className="text-sm font-medium">
                  S/.{selectedComprobante.igv != null ? Number(selectedComprobante.igv).toFixed(2) : '—'}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-primary/10">
                <span className="font-bold text-base">IMPORTE TOTAL</span>
                <span className="text-xl font-bold text-primary">
                  S/.{selectedComprobante.total != null ? Number(selectedComprobante.total).toFixed(2) : '—'}
                </span>
              </div>
            </div>

            {/* ── Estado SUNAT ── */}
            {(selectedComprobante.sunatEstado || selectedComprobante.estado === 'EMITIDO') && (
              <div className={[
                'rounded-lg px-4 py-3 mb-4 text-sm',
                selectedComprobante.sunatEstado === 'ACEPTADO'  ? 'bg-emerald-500/10 border border-emerald-500/30' :
                selectedComprobante.sunatEstado === 'RECHAZADO' ? 'bg-red-500/10 border border-red-500/30' :
                selectedComprobante.sunatEstado === 'ERROR'     ? 'bg-red-500/10 border border-red-500/30' :
                selectedComprobante.sunatEstado === 'PENDIENTE' ? 'bg-amber-500/10 border border-amber-500/30' :
                'bg-muted/40 border border-border',
              ].join(' ')}>
                <div className="flex items-center justify-between">
                  <span className={[
                    'font-semibold text-xs uppercase tracking-wide',
                    selectedComprobante.sunatEstado === 'ACEPTADO'  ? 'text-emerald-600 dark:text-emerald-400' :
                    selectedComprobante.sunatEstado === 'RECHAZADO' ? 'text-red-600 dark:text-red-400' :
                    selectedComprobante.sunatEstado === 'ERROR'     ? 'text-red-600 dark:text-red-400' :
                    selectedComprobante.sunatEstado === 'PENDIENTE' ? 'text-amber-600 dark:text-amber-400' :
                    'text-muted-foreground',
                  ].join(' ')}>
                    🏛️ SUNAT:{' '}
                    {selectedComprobante.sunatEstado === 'ACEPTADO'  ? '✓ ACEPTADO' :
                     selectedComprobante.sunatEstado === 'RECHAZADO' ? '✗ RECHAZADO' :
                     selectedComprobante.sunatEstado === 'PENDIENTE' ? '⏳ PENDIENTE' :
                     selectedComprobante.sunatEstado === 'ERROR'     ? '⚠ ERROR' :
                     'Sin enviar'}
                  </span>
                </div>
                {selectedComprobante.sunatMensaje && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedComprobante.sunatMensaje}</p>
                )}
                {!selectedComprobante.sunatEstado && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Aún no se ha enviado a SUNAT. Usa el botón para enviarlo.
                  </p>
                )}
              </div>
            )}

            {/* ── Footer info ── */}
            <div className="text-center text-xs text-muted-foreground border-t pt-3 mb-4">
              <p>Venta #{selectedComprobante.ventaId}</p>
              {selectedComprobante.estado === 'ANULADO' && selectedComprobante.updatedAt && (
                <p className="text-destructive font-medium mt-1">
                  Anulado: {new Date(selectedComprobante.updatedAt).toLocaleString('es-PE')}
                </p>
              )}
            </div>

            {/* ── Acciones ── */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 min-w-[130px]"
                disabled={downloadingPdf === selectedComprobante.id}
                onClick={() => handleDownloadPdf(selectedComprobante)}
              >
                <Download size={15} />
                {downloadingPdf === selectedComprobante.id ? 'Generando...' : 'Descargar PDF'}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => printTicket(selectedComprobante, tenantConfig)}
                title="Imprimir ticket"
              >
                <Printer size={15} />
              </Button>
              {selectedComprobante.estado === 'EMITIDO' && selectedComprobante.sunatEstado !== 'ACEPTADO' && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2 min-w-[130px] border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                  disabled={enviandoSunat === selectedComprobante.id}
                  onClick={() => handleEnviarSunat(selectedComprobante)}
                >
                  {enviandoSunat === selectedComprobante.id
                    ? <span className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin inline-block" />
                    : <Send size={15} />
                  }
                  {selectedComprobante.sunatEstado === 'RECHAZADO' ? 'Reenviar a SUNAT' : 'Enviar a SUNAT'}
                </Button>
              )}
              <Button
                className="flex-1 min-w-[80px]"
                onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedComprobante(null);
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Anular Confirm */}
      <ConfirmDialog
        isOpen={confirmAnular.isOpen}
        type="danger"
        title="Anular Comprobante"
        description={
          (confirmAnular.sunatEstado === 'ACEPTADO' || confirmAnular.sunatEstado === 'PENDIENTE')
            ? `⚠️ Este comprobante ya fue enviado a SUNAT (${confirmAnular.sunatEstado}). La anulación solo se aplica localmente.\n\nPara la baja electrónica ante SUNAT deberás ingresar manualmente a tu panel de ${oseNombre} y registrar la comunicación de baja.`
            : '¿Estás seguro de que deseas anular este comprobante? Esta acción no se puede deshacer.'
        }
        confirmText="Anular Comprobante"
        onConfirm={handleAnular}
        onCancel={() => setConfirmAnular({ isOpen: false, id: null })}
      />

    </div>
  );
}
