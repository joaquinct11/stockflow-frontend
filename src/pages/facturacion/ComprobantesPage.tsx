import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { facturacionService } from '../../services/facturacion.service';
import { ventaService } from '../../services/venta.service';
import { clienteService } from '../../services/cliente.service';
import type { ComprobanteDTO, EmitirComprobanteForm, EmitirComprobanteRequest, TipoComprobante, VentaDTO, ItemComprobanteDTO } from '../../types';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { Plus, Search, FileText, Eye, X, Send, FileDown, FileSpreadsheet, Filter, Ban, Printer, Calendar, ChevronDown } from 'lucide-react';
import { exportarComprobantesExcel, exportarComprobantesPDF } from '../../utils/reportes-export';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useSucursalStore } from '../../store/sucursalStore';
import { useOseConfigured } from '../../hooks/useOseConfigured';
import { OseBanner } from '../../components/shared/OseBanner';

const TIPO_OPTIONS: TipoComprobante[] = ['BOLETA', 'FACTURA'];
// const ESTADO_OPTIONS = ['EMITIDO', 'ANULADO'];


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
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;
  const sucursalId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;
  const oseConfigured = useOseConfigured();

  const canView = canAccess('FACTURACION');
  const canEmitir = puede('EMITIR_COMPROBANTE') || canCreate('FACTURACION');
  const canAnular = puede('ANULAR_COMPROBANTE') || canDelete('FACTURACION');
  const canEnviarSunat = puede('ENVIAR_SUNAT');

  const [comprobantes, setComprobantes] = useState<ComprobanteDTO[]>([]);
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const defaultFechaDesde = (() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  })();
  const defaultFechaHasta = new Date().toISOString().slice(0, 10);

  const [fechaDesde, setFechaDesde] = useState(defaultFechaDesde);
  const [fechaHasta, setFechaHasta] = useState(defaultFechaHasta);
  const [appliedFechaDesde, setAppliedFechaDesde] = useState(defaultFechaDesde);
  const [appliedFechaHasta, setAppliedFechaHasta] = useState(defaultFechaHasta);
  const [showFiltrosPanel, setShowFiltrosPanel] = useState(false);
  const [showRangoDropdown, setShowRangoDropdown] = useState(false);
  const [datePreset, setDatePreset] = useState<'hoy'|'ayer'|'7d'|'mes'|'custom'>('mes');
  const [emitirSearch, setEmitirSearch] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [exporting, setExporting] = useState(false);

  // Emit dialog
  const [isEmitirOpen, setIsEmitirOpen] = useState(false);
  const [emitirForm, setEmitirForm] = useState<EmitirComprobanteForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog
  const [selectedComprobante, setSelectedComprobante] = useState<ComprobanteDTO | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Anular confirm
  const [confirmAnular, setConfirmAnular] = useState<{ isOpen: boolean; id: number | null; sunatEstado?: string; tipo?: string; numero?: string; total?: number; receptorNombre?: string; ventaId?: number; ventaFecha?: string }>({
    isOpen: false,
    id: null,
  });

  const [downloadingPdf, setDownloadingPdf]     = useState<number | null>(null);
  const [enviandoSunat, setEnviandoSunat]       = useState<number | null>(null);

  useEffect(() => {
    if (!sucursalLoaded) return;
    if (canView) {
      fetchComprobantes();
      fetchVentas();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalLoaded, canView, filterTipo, filterEstado, appliedFechaDesde, appliedFechaHasta, sucursalId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTipo, filterEstado, appliedFechaDesde, appliedFechaHasta]);

  const fetchVentas = async () => {
    try {
      const inicioISO = new Date(appliedFechaDesde + 'T00:00:00').toISOString().slice(0, 19);
      const finISO    = new Date(appliedFechaHasta + 'T23:59:59').toISOString().slice(0, 19);
      const data = isVendedor && user?.usuarioId
        ? await ventaService.getByVendorAndPeriod(user.usuarioId, inicioISO, finISO)
        : await ventaService.getByPeriod(inicioISO, finISO, sucursalId);
      setVentas(data);
    } catch { /* no bloquear si falla */ }
  };

  const fetchComprobantes = async () => {
    try {
      setLoading(true);
      const data = await facturacionService.listComprobantes({
        tipo: filterTipo || undefined,
        estado: filterEstado || undefined,
        fechaDesde: appliedFechaDesde || undefined,
        fechaHasta: appliedFechaHasta || undefined,
        sucursalId,
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
    if (appliedFechaDesde || appliedFechaHasta) {
      const created = c.createdAt ? new Date(c.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return false;

      const createdTime = created.getTime();

      if (appliedFechaDesde) {
        const [y, m, d] = appliedFechaDesde.split('-').map(Number);
        const from = startOfDay(new Date(y, m - 1, d)).getTime();
        if (createdTime < from) return false;
      }

      if (appliedFechaHasta) {
        const [y, m, d] = appliedFechaHasta.split('-').map(Number);
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

  // KPIs filtrados por rango de fecha (sin search term)
  const statsComprobantes = comprobantesBase.filter((c) => {
    if (!appliedFechaDesde && !appliedFechaHasta) return true;
    const created = c.createdAt ? new Date(c.createdAt) : null;
    if (!created || Number.isNaN(created.getTime())) return false;
    const t = created.getTime();
    if (appliedFechaDesde) {
      const [y, m, d] = appliedFechaDesde.split('-').map(Number);
      if (t < startOfDay(new Date(y, m - 1, d)).getTime()) return false;
    }
    if (appliedFechaHasta) {
      const [y, m, d] = appliedFechaHasta.split('-').map(Number);
      if (t > endOfDay(new Date(y, m - 1, d)).getTime()) return false;
    }
    return true;
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
    // Si tiene URL de ApiSunat, abrir PDF A4 directamente
    if (comprobante.pdfUrl) {
      window.open(comprobante.pdfUrl, '_blank');
      return;
    }
    // Si no, generar PDF local
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

  const handleDownloadTicket = (comprobante: ComprobanteDTO) => {
    if (comprobante.pdfTicketUrl) {
      window.open(comprobante.pdfTicketUrl, '_blank');
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

  const handleDocAutocompletar = async (doc: string) => {
    if (!doc) {
      setEmitirForm(prev => ({ ...prev, receptor: { ...prev.receptor, numeroDocumento: '', razonSocial: '', direccion: '' } }));
      return;
    }
    setEmitirForm(prev => ({ ...prev, receptor: { ...prev.receptor, numeroDocumento: doc } }));
    if (doc.length !== 8 && doc.length !== 11) return;
    try {
      const matches = await clienteService.buscarPorDocumento(doc);
      if (matches.length > 0) {
        const c = matches[0];
        const tipoDoc: 'DNI' | 'RUC' = doc.length === 11 ? 'RUC' : 'DNI';
        setEmitirForm(prev => ({
          ...prev,
          tipo: tipoDoc === 'RUC' ? 'FACTURA' : prev.tipo,
          receptor: {
            tipoDocumento: tipoDoc,
            numeroDocumento: doc,
            razonSocial: c.nombre ?? '',
            direccion: c.direccion ?? '',
          },
        }));
      }
    } catch { /* silenciar error */ }
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

  const handleExportExcel = () => {
    exportarComprobantesExcel(sortedComprobantes, rangoLabel || 'todos');
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      exportarComprobantesPDF(sortedComprobantes, rangoLabel || 'todos');
    } finally {
      setExporting(false);
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

  const limpiarFiltros = () => {
    setFilterTipo('');
    setFilterEstado('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const oseNombre = 'ApiSunat';

  if (!canView) {
    return (
      <EmptyState
        icon={FileText}
        title="Acceso restringido"
        description="No tienes permisos para ver el módulo de Facturación."
      />
    );
  }

  if (loading) return <LoadingSpinner />;

  // ── KPI values ──────────────────────────────────────────────────────
  const vigentes = statsComprobantes.filter(c => c.estado !== 'ANULADO');
  const kpiTotal = vigentes.reduce((s, c) => s + (c.total ?? 0), 0);
  const kpiAceptados = vigentes.filter(c => c.sunatEstado === 'ACEPTADO').length;
  const kpiPorAtender = vigentes.filter(c => c.sunatEstado !== 'ACEPTADO').length;
  const kpiBoletas = statsComprobantes.filter(c => c.tipo === 'BOLETA').length;
  const kpiFacturas = statsComprobantes.filter(c => c.tipo === 'FACTURA').length;

  // ── Date preset helper ───────────────────────────────────────────────
  const fmtL = (s: string) =>new Date(s + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  const aplicarPreset = (preset: 'hoy'|'ayer'|'7d'|'mes') => {
    const h = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    let desde: string, hasta = fmt(h);
    if (preset === 'hoy') { desde = fmt(h); }
    else if (preset === 'ayer') { const a = new Date(h); a.setDate(a.getDate() - 1); desde = hasta = fmt(a); }
    else if (preset === '7d') { const a = new Date(h); a.setDate(a.getDate() - 6); desde = fmt(a); }
    else { desde = fmt(new Date(h.getFullYear(), h.getMonth(), 1)); }
    setFechaDesde(desde); setFechaHasta(hasta);
    setAppliedFechaDesde(desde); setAppliedFechaHasta(hasta);
    setDatePreset(preset); setShowRangoDropdown(false); setCurrentPage(1);
  };

  // ── Range label — igual que VentasList ──────────────────────────────
  const rangoLabel = (() => {
    if (datePreset === 'hoy') return 'Hoy';
    if (datePreset === 'ayer') return 'Ayer';
    if (datePreset === '7d') return 'Últimos 7 días';
    const d1 = appliedFechaDesde ? fmtL(appliedFechaDesde) : '';
    const d2 = appliedFechaHasta ? fmtL(appliedFechaHasta) : '';
    if (!d1 && !d2) return 'Este mes';
    return d1 === d2 ? d1 : `${d1} → ${d2}`;
  })();

  // ── Ventas filtradas para el buscador del dialog de emitir ───────────
  const ventasEmitirFiltradas = ventas
    .filter(v => !ventasYaFacturadas.has(v.id!))
    .filter(v => {
      if (!emitirSearch) return true;
      const q = emitirSearch.toLowerCase();
      return String(v.id).includes(q) || (v.vendedorNombre ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 30);

  return (
    <div className="space-y-5">
      {oseConfigured === false && <OseBanner />}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.6rem] font-bold tracking-tight leading-none">Facturación</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {sortedComprobantes.length} de {statsComprobantes.length} comprobante{statsComprobantes.length !== 1 ? 's' : ''}
            {appliedFechaDesde && <> · {rangoLabel}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedComprobantes.length > 0 && (
            <>
              <button type="button" onClick={handleExportExcel}
                className="flex items-center gap-2 h-[38px] px-[15px] text-[.855rem] font-semibold text-muted-foreground bg-card border border-border rounded-[10px] cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-colors">
                <FileSpreadsheet size={15} />
                Excel
              </button>
              <button type="button" onClick={handleExportPDF} disabled={exporting}
                className="flex items-center gap-2 h-[38px] px-[15px] text-[.855rem] font-semibold text-muted-foreground bg-card border border-border rounded-[10px] cursor-pointer hover:border-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
                <FileDown size={15} />
                {exporting ? 'Exportando...' : 'PDF'}
              </button>
            </>
          )}
          {canEmitir && (
            <Button onClick={() => { setEmitirForm(emptyForm()); setIsEmitirOpen(true); }} className="gap-2 h-9">
              <Plus size={15} />
              Emitir comprobante
            </Button>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Total facturado</p>
          <p className="text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums">
            S/ {kpiTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[.79rem] text-muted-foreground mt-1">Comprobantes no anulados</p>
        </div>
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Comprobantes</p>
          <p className="text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums">{statsComprobantes.length}</p>
          <p className="text-[.79rem] text-muted-foreground mt-1">
            {kpiBoletas} boleta{kpiBoletas !== 1 ? 's' : ''} · {kpiFacturas} factura{kpiFacturas !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Aceptados SUNAT</p>
          <p className="text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums">{kpiAceptados}</p>
          <p className="text-[.79rem] text-muted-foreground mt-1">de {vigentes.length} vigente{vigentes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={`p-[16px_18px] rounded-[14px] shadow-sm border ${kpiPorAtender > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/40' : 'bg-card border-border'}`}>
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Por atender</p>
          <p className={`text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums ${kpiPorAtender > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{kpiPorAtender}</p>
          <p className="text-[.79rem] text-muted-foreground mt-1">Pendientes / sin enviar a SUNAT</p>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">

        {/* Filter toolbar */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2.5 p-3.5 border-b border-border/60">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar número, venta, receptor…"
              className="w-full h-10 pl-9 pr-3 text-sm bg-muted/50 border border-transparent rounded-xl outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setShowRangoDropdown(o => !o)}
              className={`flex items-center justify-center gap-2 h-10 px-[13px] font-mono text-[.8rem] rounded-[10px] cursor-pointer whitespace-nowrap transition-all ${
                showRangoDropdown || datePreset !== 'mes'
                  ? 'text-primary bg-primary/10 border border-primary/30'
                  : 'text-muted-foreground bg-muted border border-transparent hover:bg-muted/80'
              }`}
            >
              <Calendar size={15} className="flex-shrink-0" />
              {rangoLabel}
              <ChevronDown size={14} className={`flex-shrink-0 opacity-70 transition-transform ${showRangoDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showRangoDropdown && (
              <>
                <div className="fixed inset-0 z-[55]" onClick={() => setShowRangoDropdown(false)} />
                <div className="absolute top-[calc(100%+6px)] right-0 z-[60] w-[280px] max-w-[calc(100vw-40px)] bg-card border border-border rounded-[14px] shadow-[0_22px_50px_-22px_rgba(0,0,0,.45)] p-2">
                  {([
                    { key: 'hoy' as const, label: 'Hoy' },
                    { key: 'ayer' as const, label: 'Ayer' },
                    { key: '7d' as const, label: 'Últimos 7 días' },
                    { key: 'mes' as const, label: 'Este mes' },
                  ]).map(p => (
                    <button key={p.key} type="button" onClick={() => aplicarPreset(p.key)}
                      className={`w-full flex items-center h-9 px-[10px] text-[.845rem] border-0 rounded-lg cursor-pointer transition-all text-left ${
                        datePreset === p.key ? 'font-[650] text-primary bg-primary/10' : 'font-medium text-foreground bg-transparent hover:bg-muted'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                  <div className="h-px bg-border/60 my-2 mx-1" />
                  <div className="p-[4px_6px_6px]">
                    <p className="font-mono text-[.66rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-2">Personalizado</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1 text-[.74rem] text-muted-foreground">
                        Desde
                        <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setDatePreset('custom'); }}
                          className="w-full h-9 px-2 text-[.8rem] text-foreground bg-muted border border-border rounded-lg outline-none focus:border-primary" />
                      </label>
                      <label className="grid gap-1 text-[.74rem] text-muted-foreground">
                        Hasta
                        <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setDatePreset('custom'); }}
                          className="w-full h-9 px-2 text-[.8rem] text-foreground bg-muted border border-border rounded-lg outline-none focus:border-primary" />
                      </label>
                    </div>
                    {datePreset === 'custom' && (
                      <button type="button" onClick={() => { setAppliedFechaDesde(fechaDesde); setAppliedFechaHasta(fechaHasta); setShowRangoDropdown(false); setCurrentPage(1); }}
                        className="w-full mt-2 h-8 text-[.8rem] font-semibold text-white bg-primary rounded-lg border-0 cursor-pointer hover:brightness-105">
                        Aplicar
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFiltrosPanel(o => !o)}
            className={`flex items-center gap-2 h-10 px-[14px] text-[.855rem] font-semibold rounded-[10px] cursor-pointer whitespace-nowrap transition-all ${
              showFiltrosPanel || (filterTipo || filterEstado)
                ? 'text-primary bg-primary/10 border border-primary/30'
                : 'text-muted-foreground bg-card border border-border hover:bg-muted'
            }`}
          >
            <Filter size={15} className="flex-shrink-0" />
            Filtros
            {(filterTipo || filterEstado) && (
              <span className="min-w-[18px] h-[18px] px-[5px] grid place-items-center rounded-full text-[.68rem] font-bold text-white bg-primary">
                {[filterTipo, filterEstado].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFiltrosPanel && (
          <div className="grid grid-cols-2 gap-[18px] p-[16px_18px] border-b border-border/60 bg-muted/30">
            <div>
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[9px]">Tipo de comprobante</p>
              <div className="flex flex-wrap gap-[7px]">
                {([
                  { key: '', label: 'Todos' },
                  { key: 'BOLETA', label: 'Boleta' },
                  { key: 'FACTURA', label: 'Factura' },
                ]).map(t => (
                  <button key={t.key || 'all'} type="button" onClick={() => { setFilterTipo(t.key); setCurrentPage(1); }}
                    className={`h-8 px-[13px] text-[.81rem] font-semibold rounded-[9px] cursor-pointer whitespace-nowrap transition-all border ${
                      filterTipo === t.key
                        ? 'text-white bg-primary border-primary'
                        : 'text-muted-foreground bg-card border-border hover:border-primary/40'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[9px]">Estado</p>
              <div className="flex flex-wrap gap-[7px]">
                {([
                  { key: '', label: 'Todos' },
                  { key: 'EMITIDO', label: 'Emitido' },
                  { key: 'ANULADO', label: 'Anulado' },
                ]).map(e => (
                  <button key={e.key || 'all'} type="button" onClick={() => { setFilterEstado(e.key); setCurrentPage(1); }}
                    className={`h-8 px-[13px] text-[.81rem] font-semibold rounded-[9px] cursor-pointer whitespace-nowrap transition-all border ${
                      filterEstado === e.key
                        ? 'text-white bg-primary border-primary'
                        : 'text-muted-foreground bg-card border-border hover:border-primary/40'
                    }`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips — solo tipo/estado, la fecha va en el botón */}
        {(filterTipo || filterEstado || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 px-[18px] py-3 border-b border-border/60">
            <span className="text-[.79rem] text-muted-foreground">Filtros activos:</span>
            {filterTipo && (
              <button type="button" onClick={() => setFilterTipo('')}
                className="flex items-center gap-[7px] h-7 px-[10px] text-[.78rem] font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full cursor-pointer hover:brightness-95">
                Tipo: {filterTipo === 'BOLETA' ? 'Boleta' : 'Factura'}
                <X size={12} className="flex-shrink-0" />
              </button>
            )}
            {filterEstado && (
              <button type="button" onClick={() => setFilterEstado('')}
                className="flex items-center gap-[7px] h-7 px-[10px] text-[.78rem] font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full cursor-pointer hover:brightness-95">
                Estado: {filterEstado === 'EMITIDO' ? 'Emitido' : 'Anulado'}
                <X size={12} className="flex-shrink-0" />
              </button>
            )}
            {(filterTipo || filterEstado) && (
              <button type="button" onClick={limpiarFiltros}
                className="text-[.79rem] text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2">
                Limpiar todo
              </button>
            )}
          </div>
        )}

        {/* Table content */}
        {loading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner /></div>
        ) : sortedComprobantes.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 grid place-items-center rounded-2xl bg-muted text-muted-foreground">
              <FileText size={24} />
            </div>
            <p className="font-semibold">{comprobantesBase.length === 0 ? 'Todavía no hay comprobantes' : 'Ningún comprobante coincide con estos filtros'}</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
              {comprobantesBase.length === 0
                ? 'Los comprobantes electrónicos (boletas y facturas) se generan desde el módulo de Ventas.'
                : 'Prueba con otro rango de fechas o tipo, o quita los filtros para ver todo el periodo.'}
            </p>
            {comprobantesBase.length > 0 && (
              <button onClick={limpiarFiltros} className="mt-4 h-9 px-4 text-sm font-semibold text-primary bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/15 transition-colors">
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Comprobante</th>
                    <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Tipo</th>
                    <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Receptor</th>
                    <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Venta</th>
                    <th className="text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Estado</th>
                    <th className="text-right px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Total</th>
                    <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedComprobantes.map((c) => {
                    const vendedor = ventaById.get(c.ventaId)?.vendedorNombre;
                    const isAnulado = c.estado === 'ANULADO';
                    return (
                      <tr
                        key={c.id}
                        onClick={() => { setSelectedComprobante(c); setIsDetailOpen(true); }}
                        className={`border-t border-border/40 cursor-pointer hover:bg-muted/30 transition-colors ${isAnulado ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-sm">{c.numero ?? '—'}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : '—'}
                            {c.createdAt && <> · {new Date(c.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}</>}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.tipo === 'FACTURA' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {c.tipo === 'FACTURA' ? 'Factura' : 'Boleta'}
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-[200px]">
                          <div className="font-semibold truncate">{c.receptor?.razonSocial || c.receptorNombre || 'Público general'}</div>
                          <div className="font-mono text-xs text-muted-foreground mt-0.5">
                            {(c.receptor?.tipoDocumento || c.receptorDocTipo) && <>{c.receptor?.tipoDocumento || c.receptorDocTipo} </>}
                            {c.receptor?.numeroDocumento || c.receptorDocNumero || '—'}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-mono font-semibold text-sm">#{c.ventaId}</div>
                          {vendedor && <div className="text-xs text-muted-foreground mt-0.5">{vendedor}</div>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {isAnulado ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">Anulado</span>
                          ) : c.sunatEstado === 'ACEPTADO' ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Aceptado</span>
                          ) : c.sunatEstado === 'RECHAZADO' ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">Rechazado</span>
                          ) : c.sunatEstado === 'ERROR' ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">Error envío</span>
                          ) : c.sunatEstado === 'PENDIENTE' ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">Pendiente</span>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">Sin enviar</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap font-bold tabular-nums">
                          {c.total != null ? `S/ ${Number(c.total).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex gap-0.5">
                            <button type="button" onClick={e => { e.stopPropagation(); setSelectedComprobante(c); setIsDetailOpen(true); }} title="Ver detalle" className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                              <Eye size={15} />
                            </button>
                            <button type="button" onClick={e => { e.stopPropagation(); handleDownloadPdf(c); }} title="PDF A4" disabled={downloadingPdf === c.id} className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50">
                              {downloadingPdf === c.id ? <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" /> : <FileDown size={15} />}
                            </button>
                            {c.pdfTicketUrl && (
                              <button type="button" onClick={e => { e.stopPropagation(); handleDownloadTicket(c); }} title="Ticket 80mm" className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                <Printer size={15} />
                              </button>
                            )}
                            {canEnviarSunat && c.estado === 'EMITIDO' && c.sunatEstado !== 'ACEPTADO' && c.sunatEstado !== 'PENDIENTE' && (
                              <button type="button" onClick={e => { e.stopPropagation(); handleEnviarSunat(c); }} title={c.sunatEstado === 'RECHAZADO' ? 'Reenviar a SUNAT' : 'Enviar a SUNAT'} disabled={enviandoSunat === c.id} className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50">
                                {enviandoSunat === c.id ? <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" /> : <Send size={15} />}
                              </button>
                            )}
                            {canAnular && c.estado === 'EMITIDO' && (
                              <button type="button" onClick={e => { e.stopPropagation(); setConfirmAnular({ isOpen: true, id: c.id!, sunatEstado: c.sunatEstado, tipo: c.tipo, numero: c.numero, total: c.total, receptorNombre: c.receptorNombre || c.receptor?.razonSocial, ventaId: c.ventaId, ventaFecha: c.createdAt }); }} title="Anular" className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                                <Ban size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-border/50">
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
      </div>

      {/* ── Detail slide-in panel ── */}
      {isDetailOpen && selectedComprobante && createPortal(
        <div
          className="fixed inset-0 z-[200] flex justify-end"
          style={{ background: 'rgba(9,11,16,.5)', backdropFilter: 'blur(3px)' }}
          onClick={() => { setIsDetailOpen(false); setSelectedComprobante(null); }}
        >
          <style>{`@keyframes slideFromRight { from { transform:translateX(28px); opacity:0; } to { transform:none; opacity:1; } }`}</style>
          <aside
            className="w-full max-w-[520px] h-full flex flex-col bg-card border-l border-border shadow-[_-20px_0_60px_-30px_rgba(0,0,0,.6)]"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideFromRight .24s cubic-bezier(.4,0,.2,1)' }}
          >

            {/* Header */}
            <div className="flex items-start gap-3 p-[20px_22px] border-b border-border/60 flex-shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-mono text-[1.08rem] font-semibold tracking-[-0.01em] m-0">
                    {selectedComprobante.numero ?? `#${selectedComprobante.id}`}
                  </h2>
                  <span className="inline-flex items-center text-[.74rem] font-[650] px-[8px] py-[2.5px] rounded-full bg-primary/10 text-primary">
                    {selectedComprobante.tipo === 'FACTURA' ? 'Factura' : 'Boleta'}
                  </span>
                  <span className={`inline-flex items-center text-[.74rem] font-[650] px-[8px] py-[2.5px] rounded-full ${
                    selectedComprobante.estado === 'ANULADO' ? 'text-destructive bg-destructive/10' :
                    selectedComprobante.sunatEstado === 'ACEPTADO' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' :
                    selectedComprobante.sunatEstado === 'RECHAZADO' ? 'text-destructive bg-destructive/10' :
                    selectedComprobante.sunatEstado === 'PENDIENTE' ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' :
                    'text-muted-foreground bg-muted'
                  }`}>
                    {selectedComprobante.estado === 'ANULADO' ? 'Anulado' :
                     selectedComprobante.sunatEstado === 'ACEPTADO' ? 'Aceptado' :
                     selectedComprobante.sunatEstado === 'RECHAZADO' ? 'Rechazado' :
                     selectedComprobante.sunatEstado === 'PENDIENTE' ? 'Pendiente' :
                     'Sin enviar'}
                  </span>
                </div>
                <p className="font-mono text-[.78rem] text-muted-foreground mt-[6px]">
                  Venta #{selectedComprobante.ventaId}
                  {selectedComprobante.createdAt && <> · {new Date(selectedComprobante.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(selectedComprobante.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</>}
                  {ventaById.get(selectedComprobante.ventaId)?.vendedorNombre && <> · {ventaById.get(selectedComprobante.ventaId)?.vendedorNombre}</>}
                </p>
              </div>
              <button type="button" onClick={() => { setIsDetailOpen(false); setSelectedComprobante(null); }}
                className="w-[30px] h-[30px] flex-shrink-0 grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-muted hover:text-foreground transition-colors">
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-[20px_22px]">

              {/* Receptor */}
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[10px]">Receptor</p>
              <div className="grid gap-px border border-border rounded-xl overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border)' }}>
                  <div className="p-[12px_14px] bg-muted">
                    <p className="text-[.74rem] text-muted-foreground">
                      {selectedComprobante.receptorDocTipo || selectedComprobante.receptor?.tipoDocumento || 'Doc.'}
                    </p>
                    <p className="font-mono text-[.88rem] font-semibold mt-1">
                      {selectedComprobante.receptorDocNumero || selectedComprobante.receptor?.numeroDocumento || '—'}
                    </p>
                  </div>
                  <div className="p-[12px_14px] bg-muted">
                    <p className="text-[.74rem] text-muted-foreground">
                      {selectedComprobante.tipo === 'FACTURA' ? 'Razón Social' : 'Nombre'}
                    </p>
                    <p className="text-[.88rem] font-[650] mt-1 break-words">
                      {selectedComprobante.receptorNombre || selectedComprobante.receptor?.razonSocial || 'Público general'}
                    </p>
                  </div>
                </div>
                <div className="p-[12px_14px] bg-muted">
                  <p className="text-[.74rem] text-muted-foreground">Dirección</p>
                  <p className="text-[.86rem] text-muted-foreground mt-1">
                    {selectedComprobante.receptorDireccion || selectedComprobante.receptor?.direccion || '—'}
                  </p>
                </div>
              </div>

              {/* Detalle */}
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mt-[22px] mb-[10px]">Detalle</p>
              <div className="border border-border rounded-xl overflow-hidden">
                {selectedComprobante.items && selectedComprobante.items.length > 0 ? (
                  selectedComprobante.items.map((item: ItemComprobanteDTO, idx: number) => (
                    <div key={idx} className={`flex items-start gap-[14px] p-[12px_14px] ${idx > 0 ? 'border-t border-border/60' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[.865rem] font-semibold leading-[1.35]">{item.productoNombre ?? `Producto #${item.productoId}`}</p>
                        <p className="font-mono text-[.74rem] text-muted-foreground mt-[3px]">x{item.cantidad} · S/ {Number(item.precioUnitario).toFixed(2)}</p>
                      </div>
                      <p className="flex-shrink-0 text-[.86rem] font-[650] tabular-nums">S/ {Number(item.subtotal).toFixed(2)}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-[12px_14px] text-center text-[.865rem] text-muted-foreground">Sin detalle de productos</div>
                )}
              </div>

              {/* Totales */}
              <div className="grid gap-2 mt-[14px] p-[15px_16px] rounded-xl bg-muted/60 border border-border text-[.87rem]">
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>Op. gravada</span>
                  <span className="tabular-nums">S/ {selectedComprobante.subtotal != null ? Number(selectedComprobante.subtotal).toFixed(2) : '—'}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>IGV ({tenantConfig?.igvPorcentaje ?? 18}%)</span>
                  <span className="tabular-nums">S/ {selectedComprobante.igv != null ? Number(selectedComprobante.igv).toFixed(2) : '—'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-[9px] border-t border-border">
                  <span className="font-[650]">Importe total</span>
                  <span className="text-[1.32rem] font-bold tracking-[-0.03em] tabular-nums">S/ {selectedComprobante.total != null ? Number(selectedComprobante.total).toFixed(2) : '—'}</span>
                </div>
              </div>

              {/* SUNAT */}
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mt-[22px] mb-[10px]">SUNAT</p>
              {(() => {
                const est = selectedComprobante.sunatEstado;
                const anulado = selectedComprobante.estado === 'ANULADO';
                const boxCls = anulado || est === 'RECHAZADO' || est === 'ERROR'
                  ? 'bg-destructive/8 border-destructive/20 text-destructive'
                  : est === 'ACEPTADO'
                  ? 'bg-emerald-500/[.07] border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : est === 'PENDIENTE'
                  ? 'bg-amber-500/[.07] border-amber-500/20 text-amber-700 dark:text-amber-400'
                  : 'bg-muted border-border text-muted-foreground';
                const estadoLabel = anulado ? 'Comprobante anulado'
                  : est === 'ACEPTADO' ? 'Aceptado por SUNAT'
                  : est === 'RECHAZADO' ? 'Rechazado por SUNAT'
                  : est === 'PENDIENTE' ? 'Pendiente de respuesta'
                  : est === 'ERROR' ? 'Error de envío'
                  : 'Aún no enviado';
                const mensaje = selectedComprobante.sunatMensaje || (est !== 'ACEPTADO' && est !== 'PENDIENTE' && !anulado ? 'No se ha enviado a SUNAT. Envíalo para que tenga validez tributaria.' : '');
                return (
                  <div className={`p-[13px_14px] rounded-xl border text-[.86rem] ${boxCls}`}>
                    <div className="flex items-center justify-between gap-[10px] flex-wrap">
                      <span className="font-[650]">{estadoLabel}</span>
                      {(est === 'ACEPTADO' || est === 'PENDIENTE' || est === 'RECHAZADO') && (
                        <span className="font-mono text-[.72rem] text-muted-foreground">vía Nubefact</span>
                      )}
                    </div>
                    {mensaje && <p className="text-[.83rem] leading-[1.55] mt-[7px] opacity-90">{mensaje}</p>}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex flex-wrap gap-[9px] p-[16px_22px] border-t border-border/60 flex-shrink-0">
              {canEnviarSunat && selectedComprobante.estado === 'EMITIDO' && selectedComprobante.sunatEstado !== 'ACEPTADO' && selectedComprobante.sunatEstado !== 'PENDIENTE' && (
                <button type="button" onClick={() => handleEnviarSunat(selectedComprobante)} disabled={enviandoSunat === selectedComprobante.id}
                  className="flex-[1_1_100%] h-11 flex items-center justify-center gap-2 text-[.9rem] font-[650] text-primary-foreground bg-primary border-0 rounded-[11px] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_8px_20px_-10px_var(--primary)]">
                  {enviandoSunat === selectedComprobante.id ? <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : <Send size={15} />}
                  {selectedComprobante.sunatEstado === 'RECHAZADO' ? 'Reenviar a SUNAT' : 'Enviar a SUNAT'}
                </button>
              )}
              <button type="button" onClick={() => handleDownloadPdf(selectedComprobante)} disabled={downloadingPdf === selectedComprobante.id}
                className="flex-1 min-w-[130px] h-11 flex items-center justify-center gap-2 text-[.88rem] font-semibold text-muted-foreground bg-card border border-border rounded-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
                {downloadingPdf === selectedComprobante.id ? <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /> : <FileDown size={15} />}
                PDF A4
              </button>
              {selectedComprobante.pdfTicketUrl && (
                <button type="button" onClick={() => handleDownloadTicket(selectedComprobante)}
                  className="flex-1 min-w-[130px] h-11 flex items-center justify-center gap-2 text-[.88rem] font-semibold text-muted-foreground bg-card border border-border rounded-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors">
                  <Printer size={15} />
                  Ticket 80 mm
                </button>
              )}
              {canAnular && selectedComprobante.estado === 'EMITIDO' && (
                <button type="button" onClick={() => { setConfirmAnular({ isOpen: true, id: selectedComprobante.id!, sunatEstado: selectedComprobante.sunatEstado, tipo: selectedComprobante.tipo, numero: selectedComprobante.numero, total: selectedComprobante.total, receptorNombre: selectedComprobante.receptorNombre || selectedComprobante.receptor?.razonSocial, ventaId: selectedComprobante.ventaId, ventaFecha: selectedComprobante.createdAt }); setIsDetailOpen(false); }}
                  title="Anular comprobante" aria-label="Anular comprobante"
                  className="w-11 h-11 flex-shrink-0 grid place-items-center text-destructive bg-card border border-border rounded-[11px] cursor-pointer hover:bg-destructive/8 hover:border-destructive/40 transition-colors">
                  <Ban size={16} strokeWidth={1.9} />
                </button>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}

      {/* ── Emitir Comprobante Dialog ── */}
      {isEmitirOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5"
          style={{ background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)' }}
          onClick={() => { setIsEmitirOpen(false); setEmitirForm(emptyForm()); setEmitirSearch(''); }}>
          <style>{`@keyframes fx-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>
          <div className="w-full max-w-[580px] max-h-[calc(100vh-40px)] flex flex-col bg-card border border-border rounded-[18px] shadow-[0_30px_80px_-30px_rgba(0,0,0,.55)] overflow-hidden"
            style={{ animation: 'fx-in .2s ease' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start gap-3 px-[22px] pt-5 pb-4 border-b border-border/60 shrink-0">
              <span className="w-[38px] h-[38px] shrink-0 grid place-items-center rounded-[11px] bg-primary/10 text-primary">
                <FileText size={18} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[1.08rem] font-bold tracking-[-0.02em] m-0">Emitir comprobante</h2>
                <p className="font-mono text-[.76rem] text-muted-foreground mt-1">
                  {emitirForm.ventaId > 0
                    ? `Venta #${emitirForm.ventaId} · S/ ${(ventas.find(v => v.id === emitirForm.ventaId)?.total ?? 0).toFixed(2)}`
                    : 'Selecciona una venta sin comprobante'}
                </p>
              </div>
              <button type="button" onClick={() => { setIsEmitirOpen(false); setEmitirForm(emptyForm()); setEmitirSearch(''); }}
                className="w-[30px] h-[30px] shrink-0 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-0 bg-transparent cursor-pointer">
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            {/* Body scrolleable */}
            <form id="emitir-form" onSubmit={handleEmitir} className="flex-1 min-h-0 overflow-y-auto p-[18px_22px_20px]">

              {/* 1 · Venta */}
              <p className="font-mono text-[.68rem] font-semibold uppercase tracking-[.09em] text-muted-foreground mb-[9px]">1 · Venta</p>
              <div className="relative">
                <Search size={15} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={emitirSearch}
                  onChange={e => setEmitirSearch(e.target.value)}
                  placeholder="Buscar venta por ID o vendedor…"
                  className="w-full h-[42px] pr-3 text-[.875rem] text-foreground bg-background border border-border rounded-[10px] outline-none transition-all"
                  style={{ paddingLeft: '36px' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-soft, color-mix(in srgb, var(--primary) 15%, transparent))'; }}
                  onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                />
              </div>
              <div className="grid gap-1.5 mt-2 max-h-[196px] overflow-y-auto">
                {ventasEmitirFiltradas.length === 0 ? (
                  <div className="p-[14px] rounded-[10px] bg-muted text-[.82rem] text-muted-foreground text-center">
                    {emitirSearch ? 'Sin resultados' : 'No hay ventas sin comprobante que coincidan.'}
                  </div>
                ) : (
                  ventasEmitirFiltradas.map((v) => {
                    const selected = emitirForm.ventaId === v.id;
                    const nProd = v.detalles?.length ?? 0;
                    const fechaStr = v.createdAt
                      ? new Date(v.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) + ' · ' + new Date(v.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : '';
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleVentaSelect({ id: v.id! })}
                        className={`w-full flex items-center gap-2.5 px-[14px] py-3 rounded-[11px] text-left border transition-colors cursor-pointer ${
                          selected
                            ? 'border-primary/40 bg-primary/[.07]'
                            : 'border-border hover:border-primary/30 hover:bg-muted/50'
                        }`}
                      >
                        <span className={`w-[14px] h-[14px] shrink-0 rounded-full box-border transition-all ${selected ? 'border-[4.5px] border-primary' : 'border-[1.5px] border-muted-foreground/50'}`} />
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block font-mono text-[.84rem] font-semibold">#{v.id}</span>
                          <span className="block text-[.75rem] text-muted-foreground mt-0.5">
                            {fechaStr}{v.vendedorNombre ? ` · ${v.vendedorNombre}` : ''}{nProd > 0 ? ` · ${nProd} producto${nProd !== 1 ? 's' : ''}` : ''}
                          </span>
                        </span>
                        <span className="text-[.88rem] font-bold tabular-nums shrink-0">S/ {v.total.toFixed(2)}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* 2 · Tipo */}
              <p className="font-mono text-[.68rem] font-semibold uppercase tracking-[.09em] text-muted-foreground mt-[22px] mb-[9px]">2 · Tipo</p>
              <div className="grid grid-cols-2 gap-2.5">
                {TIPO_OPTIONS.map(tipo => {
                  const selected = emitirForm.tipo === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setEmitirForm(prev => ({
                        ...prev,
                        tipo,
                        receptor: tipo === 'BOLETA'
                          ? { tipoDocumento: 'DNI', numeroDocumento: '', razonSocial: '', direccion: '' }
                          : { tipoDocumento: 'RUC', numeroDocumento: '', razonSocial: '', direccion: '' },
                      }))}
                      className={`flex items-center gap-2.5 px-[14px] py-3 rounded-[11px] text-left border transition-all cursor-pointer ${
                        selected ? 'border-primary/40 bg-primary/[.07]' : 'border-border hover:border-primary/30 hover:bg-muted/50'
                      }`}
                    >
                      <span className={`w-[14px] h-[14px] shrink-0 rounded-full box-border transition-all ${selected ? 'border-[4.5px] border-primary' : 'border-[1.5px] border-muted-foreground/50'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[.92rem] font-[650]">{tipo === 'BOLETA' ? 'Boleta' : 'Factura'}</span>
                        <span className="block text-[.75rem] text-muted-foreground mt-0.5">{tipo === 'BOLETA' ? 'Consumidor final · DNI opcional' : 'Empresas · RUC obligatorio'}</span>
                      </span>
                      <span className="font-mono text-[.72rem] font-semibold text-muted-foreground shrink-0">{tipo === 'BOLETA' ? 'B001' : 'F001'}</span>
                    </button>
                  );
                })}
              </div>

              {/* 3 · Receptor */}
              <p className="font-mono text-[.68rem] font-semibold uppercase tracking-[.09em] text-muted-foreground mt-[22px] mb-[9px]">3 · Receptor</p>
              <div className="grid gap-[14px]">
                {emitirForm.tipo === 'FACTURA' ? (
                  <>
                    <div>
                      <label className="block text-[.8rem] font-semibold text-muted-foreground mb-[6px]">RUC <span className="text-destructive">*</span></label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="20xxxxxxxxx (11 dígitos)"
                        maxLength={11}
                        value={emitirForm.receptor?.numeroDocumento ?? ''}
                        onChange={e => handleDocAutocompletar(e.target.value)}
                        required
                        className="w-full h-[42px] px-[13px] text-[.875rem] text-foreground bg-background border border-border rounded-[10px] outline-none font-mono tracking-[.04em] transition-all"
                        onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-soft, color-mix(in srgb, var(--primary) 15%, transparent))'; }}
                        onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      />
                    </div>
                    <div>
                      <label className="block text-[.8rem] font-semibold text-muted-foreground mb-[6px]">Razón Social <span className="text-destructive">*</span></label>
                      <input
                        type="text"
                        placeholder="Nombre de la empresa"
                        value={emitirForm.receptor?.razonSocial ?? ''}
                        onChange={e => setEmitirForm(prev => ({ ...prev, receptor: { ...prev.receptor, razonSocial: e.target.value } }))}
                        required
                        className="w-full h-[42px] px-[13px] text-[.875rem] text-foreground bg-background border border-border rounded-[10px] outline-none transition-all"
                        onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-soft, color-mix(in srgb, var(--primary) 15%, transparent))'; }}
                        onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[.8rem] font-semibold text-muted-foreground mb-[6px]">DNI <span className="text-[.76rem] font-normal">(opcional)</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="8 dígitos"
                      maxLength={8}
                      value={emitirForm.receptor?.numeroDocumento ?? ''}
                      onChange={e => handleDocAutocompletar(e.target.value)}
                      className="w-full h-[42px] px-[13px] text-[.875rem] text-foreground bg-background border border-border rounded-[10px] outline-none font-mono tracking-[.04em] transition-all"
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-soft, color-mix(in srgb, var(--primary) 15%, transparent))'; }}
                      onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                    />
                  </div>
                )}
                {emitirForm.tipo === 'BOLETA' && (
                  <div>
                    <label className="block text-[.8rem] font-semibold text-muted-foreground mb-[6px]">Nombre <span className="text-[.76rem] font-normal">(opcional)</span></label>
                    <input
                      type="text"
                      placeholder="Nombre del cliente"
                      value={emitirForm.receptor?.razonSocial ?? ''}
                      onChange={e => setEmitirForm(prev => ({ ...prev, receptor: { ...prev.receptor, razonSocial: e.target.value } }))}
                      className="w-full h-[42px] px-[13px] text-[.875rem] text-foreground bg-background border border-border rounded-[10px] outline-none transition-all"
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-soft, color-mix(in srgb, var(--primary) 15%, transparent))'; }}
                      onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[.8rem] font-semibold text-muted-foreground mb-[6px]">Dirección <span className="text-[.76rem] font-normal">(opcional)</span></label>
                  <input
                    type="text"
                    placeholder="Av., calle, distrito"
                    value={emitirForm.receptor?.direccion ?? ''}
                    onChange={e => setEmitirForm(prev => ({ ...prev, receptor: { ...prev.receptor, direccion: e.target.value } }))}
                    className="w-full h-[42px] px-[13px] text-[.875rem] text-foreground bg-background border border-border rounded-[10px] outline-none transition-all"
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-soft, color-mix(in srgb, var(--primary) 15%, transparent))'; }}
                    onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                  />
                </div>
              </div>

              {/* Resumen financiero */}
              {emitirForm.ventaId > 0 && (() => {
                const venta = ventas.find(v => v.id === emitirForm.ventaId);
                if (!venta) return null;
                const igvRate = (tenantConfig?.igvPorcentaje ?? 18) / 100;
                const base = venta.total / (1 + igvRate);
                const igv = venta.total - base;
                return (
                  <div className="grid grid-cols-3 gap-px mt-5 bg-border border border-border rounded-[12px] overflow-hidden">
                    {[
                      { label: 'Op. gravada', value: `S/ ${base.toFixed(2)}` },
                      { label: `IGV ${tenantConfig?.igvPorcentaje ?? 18}%`, value: `S/ ${igv.toFixed(2)}` },
                      { label: 'Total', value: `S/ ${venta.total.toFixed(2)}`, bold: true },
                    ].map(col => (
                      <div key={col.label} className="bg-muted/40 px-[13px] py-[11px]">
                        <div className="text-[.72rem] text-muted-foreground">{col.label}</div>
                        <div className={`text-[.9rem] mt-[3px] tabular-nums ${col.bold ? 'font-bold' : 'font-[650]'}`}>{col.value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </form>

            {/* Footer */}
            <div className="flex gap-[9px] px-[22px] py-[14px] border-t border-border/60 shrink-0">
              <button type="button" onClick={() => { setIsEmitirOpen(false); setEmitirForm(emptyForm()); setEmitirSearch(''); }}
                className="flex-none min-w-[110px] h-11 px-[18px] text-[.9rem] font-semibold text-muted-foreground bg-card border border-border rounded-[11px] hover:bg-muted transition-colors cursor-pointer">
                Cancelar
              </button>
              <button type="submit" form="emitir-form" disabled={submitting}
                className="flex-1 h-11 flex items-center justify-center gap-2 text-[.9rem] font-[650] text-primary-foreground bg-primary border-0 rounded-[11px] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ boxShadow: '0 8px 20px -10px var(--primary)' }}>
                {submitting ? 'Emitiendo…' : `Emitir ${emitirForm.tipo === 'FACTURA' ? 'factura' : 'boleta'}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Anular dialog custom ── */}
      {confirmAnular.isOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(9,11,16,.5)', backdropFilter: 'blur(3px)' }}>
          <div className="w-full max-w-[480px] bg-background rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start gap-4 px-6 pt-6 pb-5">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-destructive/10 grid place-items-center">
                <Ban size={22} className="text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[1.05rem] leading-tight">Anular comprobante</h3>
                <p className="font-mono text-sm text-muted-foreground mt-0.5">
                  {confirmAnular.numero} · S/ {confirmAnular.total?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button type="button" onClick={() => setConfirmAnular({ isOpen: false, id: null })} className="w-8 h-8 shrink-0 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {/* Info box */}
              <div className="rounded-xl bg-muted/50 border border-border divide-y divide-border/60 text-sm">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Receptor</span>
                  <span className="font-semibold text-right max-w-[60%] truncate">{confirmAnular.receptorNombre || 'Público general'}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Venta</span>
                  <span className="font-semibold font-mono">
                    #{confirmAnular.ventaId}
                    {confirmAnular.ventaFecha && <> · {new Date(confirmAnular.ventaFecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} · {new Date(confirmAnular.ventaFecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}</>}
                  </span>
                </div>
                {confirmAnular.sunatEstado && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Estado SUNAT</span>
                    <span className={`font-semibold ${confirmAnular.sunatEstado === 'ACEPTADO' ? 'text-emerald-600 dark:text-emerald-400' : confirmAnular.sunatEstado === 'RECHAZADO' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
                      {confirmAnular.sunatEstado.charAt(0) + confirmAnular.sunatEstado.slice(1).toLowerCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Warning si fue enviado a SUNAT */}
              {(confirmAnular.sunatEstado === 'ACEPTADO' || confirmAnular.sunatEstado === 'PENDIENTE') && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-4 py-3">
                  <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                    {confirmAnular.tipo === 'BOLETA' ? 'Se enviará un resumen diario de baja' : 'Se enviará comunicación de baja'}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 leading-snug">
                    {confirmAnular.tipo === 'BOLETA'
                      ? `Esta boleta fue enviada a SUNAT (${confirmAnular.sunatEstado?.toLowerCase()}). SUNAT procesa las bajas de boletas de forma asíncrona, así que el estado quedará pendiente hasta que la confirme.`
                      : `Esta factura fue enviada a SUNAT. Al confirmar se enviará una comunicación de baja electrónica vía ${oseNombre}.`
                    }
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="text-base">📦</span>
                El stock de los productos se repone automáticamente al confirmar.
              </p>

              {/* Botones */}
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setConfirmAnular({ isOpen: false, id: null })}
                  className="flex-1 h-11 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={handleAnular}
                  className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:brightness-110 transition-all">
                  Anular comprobante
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
