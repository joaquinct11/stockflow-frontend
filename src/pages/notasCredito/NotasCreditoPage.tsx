import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Printer, RefreshCw, Tag, Search, Filter, Calendar, ChevronDown, X, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { notaCreditoService } from '../../services/notaCredito.service';
import { devolucionService } from '../../services/devolucion.service';
import { printNotaCreditoTicket } from '../../utils/printTicket';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useSucursalStore } from '../../store/sucursalStore';
import type { NotaCreditoDTO, DevolucionDTO } from '../../types';

// ── helpers ───────────────────────────────────────────────────────────────────

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function corta(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function cortaSinAnio(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')} ${MESES[d.getMonth()]}`;
}

function horaCorta(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function diasRestantes(iso?: string): number | null {
  if (!iso) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const v = new Date(iso); v.setHours(0,0,0,0);
  return Math.round((v.getTime() - hoy.getTime()) / 86400000);
}

function addDias(iso?: string, n = 0): Date {
  const d = new Date(iso ?? Date.now());
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function claveEstado(nc: NotaCreditoDTO): 'PENDIENTE' | 'USADA' | 'VENCIDA' | 'ANULADA' {
  if (nc.estado === 'PENDIENTE' && nc.fechaVencimiento && new Date(nc.fechaVencimiento) < new Date()) return 'VENCIDA';
  return nc.estado as 'PENDIENTE' | 'USADA' | 'ANULADA';
}

// ── presets de fecha ──────────────────────────────────────────────────────────

const hoy = new Date(); hoy.setHours(0,0,0,0);
const PRESETS = [
  { key: 'hoy',  label: 'Hoy',            desde: hoy,                   hasta: hoy },
  { key: '7d',   label: 'Últimos 7 días', desde: addDias(isoDate(hoy),-6), hasta: hoy },
  { key: 'mes',  label: 'Este mes',       desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: hoy },
  { key: '90d',  label: 'Últimos 90 días',desde: addDias(isoDate(hoy),-89), hasta: hoy },
  { key: 'todo', label: 'Todas las fechas', desde: new Date(2020,0,1), hasta: hoy },
];

function rotulo(desde: Date, hasta: Date): string {
  if (+desde === +hasta) return cortaSinAnio(desde.toISOString());
  return `${cortaSinAnio(desde.toISOString())} → ${cortaSinAnio(hasta.toISOString())}`;
}

// ── estado pills ──────────────────────────────────────────────────────────────

const ESTADO_MAP: Record<string, { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente', cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  USADA:     { label: 'Usada',     cls: 'text-primary bg-primary/10' },
  VENCIDA:   { label: 'Vencida',   cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  ANULADA:   { label: 'Anulada',   cls: 'text-muted-foreground bg-muted' },
};

const ESTADOS_F = [
  { key: 'TODOS', label: 'Todas' },
  { key: 'PENDIENTE', label: 'Pendientes' },
  { key: 'USADA', label: 'Usadas' },
  { key: 'VENCIDA', label: 'Vencidas' },
  { key: 'ANULADA', label: 'Anuladas' },
];

// ── componente ────────────────────────────────────────────────────────────────

const POR_PAGINA = 8;

export function NotasCreditoPage() {
  const { config: negocioConfig } = useTenantConfigStore();
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;
  const sucursalId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;

  // data
  const [notas, setNotas] = useState<NotaCreditoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState<string | null>(null);

  // filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [preset, setPreset] = useState('todo');
  const [fechaDesde, setFechaDesde] = useState<Date>(PRESETS[4].desde);
  const [fechaHasta, setFechaHasta] = useState<Date>(hoy);
  const [rangoOpen, setRangoOpen] = useState(false);
  const [panelFiltros, setPanelFiltros] = useState(false);

  // detail
  const [selectedNota, setSelectedNota] = useState<NotaCreditoDTO | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [devolucionDetalle, setDevolucionDetalle] = useState<DevolucionDTO | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // pagination
  const [pagina, setPagina] = useState(1);

  const fetchNotas = useCallback(async () => {
    try {
      setLoading(true);
      const notas = await notaCreditoService.getAll(sucursalId);
      setNotas(notas);
    } catch {
      toast.error('Error al cargar las notas de crédito');
    } finally {
      setLoading(false);
    }
  }, [sucursalId]);

  useEffect(() => {
    if (!sucursalLoaded) return;
    fetchNotas();
  }, [sucursalLoaded, fetchNotas]);

  // ── computed ──────────────────────────────────────────────────────────────

  const pendientes = useMemo(() => notas.filter(n => claveEstado(n) === 'PENDIENTE'), [notas]);
  const kpiPendientes = pendientes.length;
  const kpiMonto = pendientes.reduce((s, n) => s + (n.montoTotal ?? 0), 0);
  const kpiVence7 = pendientes.filter(n => {
    const r = diasRestantes(n.fechaVencimiento);
    return r !== null && r >= 0 && r <= 7;
  });

  const presetAct = PRESETS.find(p => p.key === preset);
  const rangoLabel = presetAct && preset !== 'todo' ? presetAct.label : (preset === 'todo' ? 'Todas las fechas' : rotulo(fechaDesde, fechaHasta));

  const filtradas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return notas.filter(n => {
      if (n.fechaEmision) {
        const em = new Date(n.fechaEmision); em.setHours(0,0,0,0);
        if (em < fechaDesde || em > fechaHasta) return false;
      }
      const k = claveEstado(n);
      if (filtroEstado !== 'TODOS' && k !== filtroEstado) return false;
      if (q) {
        const hay = (s?: string | number) => String(s ?? '').toLowerCase().includes(q);
        if (!hay(n.codigo) && !hay(n.ventaOrigenId) && !hay(n.ventaUsoId) && !hay(n.clienteNombre) && !hay(n.clienteDocNumero)) return false;
      }
      return true;
    });
  }, [notas, fechaDesde, fechaHasta, filtroEstado, searchTerm]);

  const totalPags = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAct = Math.min(pagina, totalPags);
  const pageSlice = filtradas.slice((paginaAct - 1) * POR_PAGINA, paginaAct * POR_PAGINA);

  // chips activos
  const chips: { label: string; quitar: () => void }[] = [];
  if (preset !== 'todo') chips.push({ label: `Fecha: ${presetAct?.label ?? rangoLabel}`, quitar: () => { setPreset('todo'); setFechaDesde(PRESETS[4].desde); setFechaHasta(hoy); setPagina(1); } });
  if (filtroEstado !== 'TODOS') chips.push({ label: `Estado: ${ESTADOS_F.find(x => x.key === filtroEstado)?.label}`, quitar: () => { setFiltroEstado('TODOS'); setPagina(1); } });
  if (searchTerm.trim()) chips.push({ label: `Búsqueda: ${searchTerm.trim()}`, quitar: () => { setSearchTerm(''); setPagina(1); } });

  const limpiarFiltros = () => {
    setFiltroEstado('TODOS'); setPreset('todo'); setFechaDesde(PRESETS[4].desde); setFechaHasta(hoy);
    setSearchTerm(''); setPagina(1); setPanelFiltros(false);
  };

  // ── acciones ──────────────────────────────────────────────────────────────

  const handleDescargarPdf = async (nc: NotaCreditoDTO) => {
    try {
      setDescargando(`${nc.id}-A4`);
      await notaCreditoService.descargarPdf(nc.id, 'A4');
      toast.success(`PDF de ${nc.codigo} descargado`);
    } catch {
      toast.error('Error al generar el PDF');
    } finally {
      setDescargando(null);
    }
  };

  const handleImprimirTicket = (nc: NotaCreditoDTO) => {
    printNotaCreditoTicket(nc, negocioConfig);
  };

  const handleCopiar = (nc: NotaCreditoDTO) => {
    try { navigator.clipboard?.writeText(nc.codigo); } catch { /* silencioso */ }
    toast.success(`Código ${nc.codigo} copiado`, { description: `Pégalo en el POS para aplicar S/ ${(nc.montoTotal ?? 0).toFixed(2)} a favor del cliente.` } as object);
  };

  const openDetail = async (nc: NotaCreditoDTO) => {
    setSelectedNota(nc);
    setIsDetailOpen(true);
    setDevolucionDetalle(null);
    if (nc.ventaOrigenId && nc.devolucionId) {
      try {
        setLoadingDetalle(true);
        const devs = await devolucionService.getByVenta(nc.ventaOrigenId);
        const dev = devs.find(d => d.id === nc.devolucionId) ?? devs[0] ?? null;
        setDevolucionDetalle(dev);
      } catch {
        // si falla, el panel muestra lo que ya tenemos
      } finally {
        setLoadingDetalle(false);
      }
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedNota(null);
    setDevolucionDetalle(null);
  };

  const pickPreset = (p: typeof PRESETS[number]) => {
    setPreset(p.key);
    setFechaDesde(p.desde);
    setFechaHasta(p.hasta);
    setPagina(1);
    setRangoOpen(false);
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <style>{`@keyframes fx-slide { from { transform:translateX(28px); opacity:0; } to { transform:none; opacity:1; } }
        @keyframes fx-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.6rem] font-bold tracking-tight leading-none">Notas de Crédito</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Notas generadas por devoluciones de venta · {filtradas.length} de {notas.length}
            {isMultiLocal && sucursalActual ? ` · ${sucursalActual.nombre}` : ''}
          </p>
        </div>
        <button type="button" onClick={fetchNotas} disabled={loading}
          className="flex items-center gap-2 h-[38px] px-[15px] text-[.855rem] font-semibold text-muted-foreground bg-card border border-border rounded-[10px] cursor-pointer hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
          <span style={{ display: 'grid', placeItems: 'center', animation: loading ? 'fx-spin .8s linear infinite' : undefined }}>
            <RefreshCw size={15} />
          </span>
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Total emitidas</p>
          <p className="text-[1.72rem] font-bold mt-[9px] tabular-nums" style={{ letterSpacing: '-.032em' }}>{notas.length}</p>
          <p className="text-[.79rem] text-muted-foreground mt-[5px]">Generadas por devoluciones</p>
        </div>
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Pendientes de canje</p>
          <p className="text-[1.72rem] font-bold mt-[9px] tabular-nums text-emerald-600 dark:text-emerald-400" style={{ letterSpacing: '-.032em' }}>{kpiPendientes}</p>
          <p className="text-[.79rem] text-muted-foreground mt-[5px]">Disponibles para usar en POS</p>
        </div>
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Monto por canjear</p>
          <p className="text-[1.72rem] font-bold mt-[9px] tabular-nums" style={{ letterSpacing: '-.032em' }}>S/ {kpiMonto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-[.79rem] text-muted-foreground mt-[5px]">A favor de los clientes</p>
        </div>
        <div className={`p-[16px_18px] rounded-[14px] shadow-sm border ${kpiVence7.length > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/40' : 'bg-card border-border'}`}>
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Vencen en 7 días</p>
          <p className={`text-[1.72rem] font-bold mt-[9px] tabular-nums ${kpiVence7.length > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`} style={{ letterSpacing: '-.032em' }}>{kpiVence7.length}</p>
          <p className="text-[.79rem] text-muted-foreground mt-[5px]">
            {kpiVence7.length > 0 ? `S/ ${kpiVence7.reduce((s,n)=>s+(n.montoTotal??0),0).toFixed(2)} en riesgo de perderse` : 'Ninguna por vencer'}
          </p>
        </div>
      </div>

      {/* Tabla container */}
      <div className="bg-card border border-border rounded-[14px] shadow-sm">

        {/* Barra de filtros */}
        <div className="grid gap-[10px] p-[14px_18px] border-b border-border/60" style={{ gridTemplateColumns: 'minmax(0,1fr) auto auto' }}>
          {/* Search */}
          <div className="relative min-w-0">
            <Search size={16} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPagina(1); }}
              placeholder="Buscar por código, venta origen, cliente…"
              className="w-full h-[40px] pl-[38px] pr-[13px] text-[.875rem] bg-muted border border-transparent rounded-[10px] outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/15 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Rango de fechas */}
          <div className="relative">
            <button type="button" onClick={() => setRangoOpen(o => !o)}
              className={`flex items-center gap-2 h-[40px] px-[13px] text-[.855rem] font-semibold border rounded-[10px] cursor-pointer transition-colors whitespace-nowrap ${rangoOpen || preset !== 'todo' ? 'border-primary/50 bg-primary/8 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
              <Calendar size={15} className="flex-shrink-0" />
              <span className="font-mono text-[.8rem]">{rangoLabel}</span>
              <ChevronDown size={14} className="flex-shrink-0 opacity-70" />
            </button>
            {rangoOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setRangoOpen(false)} />
                <div className="absolute top-[calc(100%+6px)] right-0 z-41 w-[300px] max-w-[calc(100vw-40px)] bg-card border border-border rounded-[14px] shadow-[0_22px_50px_-22px_rgba(0,0,0,.45)] p-2" style={{ animation: 'fx-in .16s ease', zIndex: 41 }}>
                  {PRESETS.map(p => (
                    <button key={p.key} type="button" onClick={() => pickPreset(p)}
                      className={`w-full flex items-center gap-2 px-[11px] py-[9px] text-[.855rem] font-medium rounded-[9px] cursor-pointer transition-colors text-left ${preset === p.key ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>
                      <span className="flex-1">{p.label}</span>
                      <span className="font-mono text-[.72rem] opacity-75">{rotulo(p.desde, p.hasta)}</span>
                    </button>
                  ))}
                  <div className="h-px bg-border/60 mx-1 my-2" />
                  <div className="px-[6px] pb-[6px] pt-1">
                    <p className="font-mono text-[.66rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-2">Personalizado · fecha de emisión</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1 text-[.74rem] text-muted-foreground">
                        Desde
                        <input type="date" value={isoDate(fechaDesde)} onChange={e => { setFechaDesde(new Date(e.target.value+'T00:00:00')); setPreset('custom'); setPagina(1); }}
                          className="h-[34px] rounded-[8px] border border-border bg-muted px-2 text-[.83rem] text-foreground outline-none focus:border-primary" />
                      </label>
                      <label className="grid gap-1 text-[.74rem] text-muted-foreground">
                        Hasta
                        <input type="date" value={isoDate(fechaHasta)} onChange={e => { setFechaHasta(new Date(e.target.value+'T23:59:59')); setPreset('custom'); setPagina(1); }}
                          className="h-[34px] rounded-[8px] border border-border bg-muted px-2 text-[.83rem] text-foreground outline-none focus:border-primary" />
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filtros */}
          <button type="button" onClick={() => setPanelFiltros(o => !o)}
            className={`flex items-center gap-2 h-[40px] px-[13px] text-[.855rem] font-semibold border rounded-[10px] cursor-pointer transition-colors whitespace-nowrap ${panelFiltros || filtroEstado !== 'TODOS' ? 'border-primary/50 bg-primary/8 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
            <Filter size={15} className="flex-shrink-0" />
            Filtros
            {filtroEstado !== 'TODOS' && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[.68rem] font-bold grid place-items-center">1</span>
            )}
          </button>
        </div>

        {/* Panel filtros inline */}
        {panelFiltros && (
          <div className="px-[18px] py-[14px] border-b border-border/60 bg-muted/40" style={{ animation: 'fx-in .18s ease' }}>
            <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[9px]">Estado</p>
            <div className="flex flex-wrap gap-[7px]">
              {ESTADOS_F.map(f => (
                <button key={f.key} type="button" onClick={() => { setFiltroEstado(f.key); setPagina(1); }}
                  className={`h-[32px] px-[13px] text-[.81rem] font-semibold rounded-[9px] border cursor-pointer transition-all ${filtroEstado === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chips activos */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-[18px] py-[11px] border-b border-border/60">
            <span className="text-[.79rem] text-muted-foreground">Filtros activos</span>
            {chips.map((c, i) => (
              <button key={i} type="button" onClick={c.quitar}
                className="flex items-center gap-[7px] h-[28px] px-[10px] text-[.78rem] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full cursor-pointer whitespace-nowrap hover:bg-primary/20 transition-colors">
                {c.label}
                <X size={12} className="flex-shrink-0" />
              </button>
            ))}
            <button type="button" onClick={limpiarFiltros} className="h-[28px] px-[10px] text-[.78rem] font-semibold text-muted-foreground bg-transparent border-0 rounded-full cursor-pointer hover:text-destructive transition-colors">
              Limpiar todo
            </button>
          </div>
        )}

        {/* Contenido */}
        {filtradas.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <div className="w-[52px] h-[52px] mx-auto grid place-items-center rounded-[14px] bg-muted text-muted-foreground">
              <Tag size={24} strokeWidth={1.7} />
            </div>
            <p className="text-[1rem] font-[650] mt-[14px]">
              {notas.length === 0 ? 'Todavía no hay notas de crédito' : 'Ninguna nota de crédito coincide con estos filtros'}
            </p>
            <p className="text-[.865rem] text-muted-foreground leading-[1.55] mt-[7px] max-w-[380px] mx-auto">
              {notas.length === 0
                ? 'Las notas de crédito se generan cuando se anula o devuelve una venta.'
                : 'Prueba con otro rango de fechas o estado, o quita los filtros para ver todas.'}
            </p>
            {chips.length > 0 && (
              <button type="button" onClick={limpiarFiltros}
                className="mt-4 h-[38px] px-4 text-[.855rem] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-[10px] cursor-pointer hover:bg-primary/15 transition-colors">
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[.84rem]" style={{ minWidth: '1060px' }}>
                <thead>
                  <tr className="bg-muted/50">
                    {['Código','Cliente','Estado','Vence','Venta origen','Canjeada en','Monto','Acciones'].map((h, i) => (
                      <th key={h} className={`py-[10px] text-[.72rem] font-[650] tracking-[.04em] uppercase text-muted-foreground whitespace-nowrap ${i >= 6 ? 'text-right' : 'text-left'}`}
                        style={{ paddingLeft: i === 0 ? '18px' : '14px', paddingRight: i === 7 ? '18px' : '14px' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.map(nc => {
                    const k = claveEstado(nc);
                    const ep = ESTADO_MAP[k] ?? ESTADO_MAP.ANULADA;
                    const dr = diasRestantes(nc.fechaVencimiento);
                    const venceNota = k === 'USADA' || k === 'ANULADA' ? '' :
                      k === 'VENCIDA' ? `Venció hace ${Math.abs(dr ?? 0)} día${Math.abs(dr??0)!==1?'s':''}` :
                      dr === 0 ? 'Vence hoy' : dr !== null ? `En ${dr} día${dr!==1?'s':''}` : '';
                    const venceColor = (k === 'VENCIDA' || (dr !== null && dr <= 7 && k === 'PENDIENTE')) ? 'text-amber-600 dark:text-amber-400' : '';

                    return (
                      <tr key={nc.id} onClick={() => openDetail(nc)}
                        className={`border-t border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${k === 'ANULADA' ? 'opacity-60' : ''}`}>
                        {/* Código */}
                        <td className="px-[18px] py-[12px] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={k === 'PENDIENTE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                              <Tag size={14} strokeWidth={1.9} />
                            </span>
                            <span className="font-mono text-[.85rem] font-semibold">{nc.codigo}</span>
                          </div>
                          <p className="text-[.74rem] text-muted-foreground mt-[2px] pl-[22px]">
                            Emitida {cortaSinAnio(nc.fechaEmision)} · {horaCorta(nc.fechaEmision)}
                          </p>
                        </td>
                        {/* Cliente */}
                        <td className="px-[14px] py-[12px]" style={{ maxWidth: '200px' }}>
                          {nc.clienteNombre ? (
                            <>
                              <p className="text-[.84rem] font-[600] truncate">{nc.clienteNombre}</p>
                              {nc.clienteDocNumero && (
                                <p className="text-[.74rem] text-muted-foreground mt-[2px]">
                                  <span className="font-mono">{nc.clienteDocTipo ?? 'DOC'}&nbsp;{nc.clienteDocNumero}</span>
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-[.84rem] text-muted-foreground italic">Público general</span>
                          )}
                        </td>
                        {/* Estado */}
                        <td className="px-[14px] py-[12px] whitespace-nowrap">
                          <span className={`inline-flex items-center text-[.75rem] font-[650] px-[9px] py-[3px] rounded-full ${ep.cls}`}>
                            {ep.label}
                          </span>
                        </td>
                        {/* Vence */}
                        <td className="px-[14px] py-[12px] whitespace-nowrap">
                          <div className={`font-mono text-[.82rem] font-semibold ${venceColor}`}>
                            {k === 'USADA' || k === 'ANULADA' ? <span className="text-muted-foreground">—</span> : cortaSinAnio(nc.fechaVencimiento)}
                          </div>
                          {venceNota && <div className="text-[.74rem] text-muted-foreground mt-[2px]">{venceNota}</div>}
                        </td>
                        {/* Venta origen */}
                        <td className="px-[14px] py-[12px] whitespace-nowrap">
                          {nc.ventaOrigenId ? (
                            <>
                              <span className="font-mono text-[.82rem] font-semibold">#{nc.ventaOrigenId}</span>
                              {nc.ventaOrigenComprobante && (
                                <p className="font-mono text-[.74rem] text-muted-foreground mt-[2px]">{nc.ventaOrigenComprobante}</p>
                              )}
                            </>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        {/* Canjeada en */}
                        <td className="px-[14px] py-[12px] whitespace-nowrap">
                          {nc.ventaUsoId ? (
                            <span className="font-mono text-[.82rem] font-semibold text-primary">Venta #{nc.ventaUsoId}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        {/* Monto */}
                        <td className="px-[14px] py-[12px] text-right whitespace-nowrap font-bold tabular-nums">
                          S/ {(nc.montoTotal ?? 0).toFixed(2)}
                        </td>
                        {/* Acciones */}
                        <td className="px-[18px] py-[12px] text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="inline-flex gap-[3px]">
                            <button type="button" onClick={() => openDetail(nc)} title="Ver detalle"
                              className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-[8px] cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            {k === 'PENDIENTE' && (
                              <button type="button" onClick={() => handleCopiar(nc)} title="Copiar código para canje"
                                className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-[8px] cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors">
                                <Copy size={15} />
                              </button>
                            )}
                            <button type="button" onClick={() => handleDescargarPdf(nc)} disabled={descargando === `${nc.id}-A4`} title="Descargar PDF A4"
                              className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-[8px] cursor-pointer hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50">
                              {descargando === `${nc.id}-A4` ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={15} />}
                            </button>
                            <button type="button" onClick={() => handleImprimirTicket(nc)} title="Imprimir ticket 80 mm"
                              className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-[8px] cursor-pointer hover:bg-muted hover:text-foreground transition-colors">
                              <Printer size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-[13px] border-t border-border/50">
              <span className="text-[.8rem] text-muted-foreground">
                {filtradas.length === 0 ? 'Sin resultados' : `${(paginaAct-1)*POR_PAGINA+1}–${Math.min(paginaAct*POR_PAGINA,filtradas.length)} de ${filtradas.length}`}
              </span>
              <div className="flex items-center gap-[5px]">
                <button type="button" onClick={() => setPagina(p => Math.max(1,p-1))} disabled={paginaAct===1}
                  className="min-w-[32px] h-[32px] px-[10px] text-[.81rem] font-semibold text-muted-foreground bg-card border border-border rounded-[8px] cursor-pointer hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Anterior
                </button>
                {Array.from({length:totalPags},(_,i)=>i+1).map(n=>(
                  <button key={n} type="button" onClick={() => setPagina(n)}
                    className={`min-w-[32px] h-[32px] px-[10px] text-[.81rem] font-semibold rounded-[8px] cursor-pointer border transition-colors ${n===paginaAct ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`}>
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => setPagina(p => Math.min(totalPags,p+1))} disabled={paginaAct===totalPags}
                  className="min-w-[32px] h-[32px] px-[10px] text-[.81rem] font-semibold text-muted-foreground bg-card border border-border rounded-[8px] cursor-pointer hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Detail panel ── */}
      {isDetailOpen && selectedNota && createPortal(
        <div className="fixed inset-0 z-[200] flex justify-end"
          style={{ background: 'rgba(9,11,16,.5)', backdropFilter: 'blur(3px)' }}
          onClick={closeDetail}>
          <aside className="w-full max-w-[520px] h-full flex flex-col bg-card border-l border-border shadow-[_-20px_0_60px_-30px_rgba(0,0,0,.6)]"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'fx-slide .24s cubic-bezier(.4,0,.2,1)' }}>

            {/* Header */}
            <div className="flex items-start gap-3 p-[20px_22px] border-b border-border/60 flex-shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-mono text-[1.08rem] font-semibold tracking-[-0.01em] m-0">{selectedNota.codigo}</h2>
                  {(() => {
                    const k = claveEstado(selectedNota);
                    const ep = ESTADO_MAP[k] ?? ESTADO_MAP.ANULADA;
                    return <span className={`inline-flex items-center text-[.74rem] font-[650] px-[8px] py-[2.5px] rounded-full ${ep.cls}`}>{ep.label}</span>;
                  })()}
                </div>
                <p className="font-mono text-[.78rem] text-muted-foreground mt-[6px]">
                  Emitida {cortaSinAnio(selectedNota.fechaEmision)} · {horaCorta(selectedNota.fechaEmision)}
                  {devolucionDetalle?.usuarioNombre && ` · ${devolucionDetalle.usuarioNombre}`}
                </p>
              </div>
              <button type="button" onClick={closeDetail}
                className="w-[30px] h-[30px] flex-shrink-0 grid place-items-center text-muted-foreground bg-transparent border-0 rounded-[8px] cursor-pointer hover:bg-muted hover:text-foreground transition-colors">
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-[20px_22px]">
              {/* Saldo box */}
              {(() => {
                const k = claveEstado(selectedNota);
                const dr = diasRestantes(selectedNota.fechaVencimiento);
                const boxCls = k === 'PENDIENTE' ? 'bg-emerald-500/[.07] border-emerald-500/20'
                  : k === 'USADA' ? 'bg-primary/[.07] border-primary/20'
                  : k === 'VENCIDA' ? 'bg-amber-500/[.07] border-amber-500/20'
                  : 'bg-muted border-border';
                const label = k === 'PENDIENTE' ? 'Saldo a favor del cliente'
                  : k === 'USADA' ? 'Monto canjeado'
                  : k === 'VENCIDA' ? 'Saldo vencido'
                  : 'Monto anulado';
                const montoColor = k === 'PENDIENTE' ? 'text-emerald-600 dark:text-emerald-400'
                  : k === 'VENCIDA' ? 'text-amber-600 dark:text-amber-400' : '';
                const texto = k === 'PENDIENTE'
                  ? `Se puede usar como medio de pago en el POS hasta el ${cortaSinAnio(selectedNota.fechaVencimiento)}. ${dr !== null && dr >= 0 ? `En ${dr} día${dr!==1?'s':''}` : ''}.`
                  : k === 'USADA' && selectedNota.ventaUsoId
                  ? `Aplicada en la venta #${selectedNota.ventaUsoId}${selectedNota.fechaUso ? ` el ${cortaSinAnio(selectedNota.fechaUso)}` : ''}.`
                  : k === 'VENCIDA' ? 'Pasaron 30 días desde la emisión sin canjearse. Ya no se acepta en el POS.'
                  : 'Esta nota fue anulada y no tiene saldo disponible.';
                return (
                  <div className={`p-[16px_17px] rounded-[12px] border ${boxCls}`}>
                    <p className="text-[.8rem] font-semibold text-foreground/80">{label}</p>
                    <p className={`text-[1.9rem] font-bold tracking-[-0.035em] mt-[6px] tabular-nums ${montoColor}`}>
                      S/ {(selectedNota.montoTotal??0).toFixed(2)}
                    </p>
                    <p className="text-[.82rem] leading-[1.5] text-muted-foreground mt-[6px]">{texto}</p>
                  </div>
                );
              })()}

              {/* Origen */}
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mt-[22px] mb-[10px]">Origen</p>
              <div className="grid gap-px border border-border rounded-[12px] overflow-hidden" style={{ background: 'var(--border)' }}>
                {/* Fila 1: Cliente | Venta origen */}
                <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border)' }}>
                  <div className="p-[12px_14px] bg-muted">
                    <p className="text-[.74rem] text-muted-foreground">Cliente</p>
                    <p className="text-[.88rem] font-[650] mt-1 break-words">
                      {selectedNota.clienteNombre ?? 'Público general'}
                    </p>
                    {selectedNota.clienteDocNumero && (
                      <p className="font-mono text-[.74rem] text-muted-foreground mt-[3px]">
                        {selectedNota.clienteDocTipo ?? 'DOC'} {selectedNota.clienteDocNumero}
                      </p>
                    )}
                  </div>
                  <div className="p-[12px_14px] bg-muted">
                    <p className="text-[.74rem] text-muted-foreground">Venta origen</p>
                    <p className="font-mono text-[.88rem] font-semibold mt-1">
                      {selectedNota.ventaOrigenId ? `#${selectedNota.ventaOrigenId}` : '—'}
                    </p>
                    {selectedNota.ventaOrigenComprobante && (
                      <p className="font-mono text-[.74rem] text-muted-foreground mt-[3px]">{selectedNota.ventaOrigenComprobante}</p>
                    )}
                  </div>
                </div>
                {/* Fila 2: Motivo de la devolución (ancho completo) */}
                <div className="p-[12px_14px] bg-muted" style={{ gridColumn: '1 / -1' }}>
                  <p className="text-[.74rem] text-muted-foreground">Motivo de la devolución</p>
                  {loadingDetalle ? (
                    <div className="h-[14px] w-[60%] rounded-full bg-muted-foreground/15 mt-[6px] animate-pulse" />
                  ) : (
                    <p className="text-[.86rem] text-foreground/80 mt-1 leading-[1.45]">
                      {devolucionDetalle?.motivo ?? '—'}
                    </p>
                  )}
                </div>
              </div>

              {/* Productos devueltos */}
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mt-[22px] mb-[10px]">Productos devueltos</p>
              <div className="border border-border rounded-[12px] overflow-hidden">
                {loadingDetalle ? (
                  <div className="p-[14px_16px] space-y-2 animate-pulse">
                    <div className="h-[14px] w-[55%] rounded-full bg-muted-foreground/15" />
                    <div className="h-[11px] w-[35%] rounded-full bg-muted-foreground/10" />
                  </div>
                ) : devolucionDetalle?.detalles?.length ? (
                  devolucionDetalle.detalles.map((it, i) => (
                    <div key={i} className={`flex items-start gap-3 p-[12px_16px] ${i > 0 ? 'border-t border-border/60' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[.865rem] font-semibold leading-[1.35]">{it.productoNombre}</p>
                        <p className="font-mono text-[.74rem] text-muted-foreground mt-[3px]">
                          x{it.cantidadDevuelta} · S/ {it.precioUnitario.toFixed(2)}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-[.86rem] font-[650] tabular-nums">
                        S/ {it.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-[14px_16px] text-[.84rem] text-muted-foreground">
                    {devolucionDetalle ? 'Sin productos registrados' : '—'}
                  </div>
                )}
              </div>

              {/* Vigencia */}
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mt-[22px] mb-[10px]">Vigencia</p>
              <div className="grid gap-2 p-[15px_16px] rounded-[12px] bg-muted/60 border border-border text-[.86rem]">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Emisión</span>
                  <span className="font-mono text-[.82rem]">{corta(selectedNota.fechaEmision)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Vencimiento</span>
                  {(() => {
                    const k = claveEstado(selectedNota);
                    const color = k === 'VENCIDA' ? 'text-amber-600 dark:text-amber-400' : k === 'PENDIENTE' && (diasRestantes(selectedNota.fechaVencimiento)??99) <= 7 ? 'text-amber-600 dark:text-amber-400' : '';
                    return <span className={`font-mono text-[.82rem] font-semibold ${color}`}>{corta(selectedNota.fechaVencimiento)}</span>;
                  })()}
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Canjeada en</span>
                  <span className="font-mono text-[.82rem]">
                    {selectedNota.ventaUsoId ? `Venta #${selectedNota.ventaUsoId}${selectedNota.fechaUso ? ` · ${cortaSinAnio(selectedNota.fechaUso)}` : ''}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap gap-[9px] p-[16px_22px] border-t border-border/60 flex-shrink-0">
              {claveEstado(selectedNota) === 'PENDIENTE' && (
                <button type="button" onClick={() => handleCopiar(selectedNota)}
                  className="flex-[1_1_100%] h-11 flex items-center justify-center gap-2 text-[.9rem] font-[650] text-primary-foreground bg-primary border-0 rounded-[11px] cursor-pointer hover:opacity-90 transition-opacity shadow-[0_8px_20px_-10px_var(--primary)]">
                  <Copy size={15} />
                  Copiar código para canje
                </button>
              )}
              <button type="button" onClick={() => handleDescargarPdf(selectedNota)} disabled={descargando === `${selectedNota.id}-A4`}
                className="flex-1 min-w-[130px] h-11 flex items-center justify-center gap-2 text-[.88rem] font-semibold text-muted-foreground bg-card border border-border rounded-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
                {descargando === `${selectedNota.id}-A4` ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={15} />}
                PDF A4
              </button>
              <button type="button" onClick={() => handleImprimirTicket(selectedNota)}
                className="flex-1 min-w-[130px] h-11 flex items-center justify-center gap-2 text-[.88rem] font-semibold text-muted-foreground bg-card border border-border rounded-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors">
                <Printer size={15} />
                Ticket 80 mm
              </button>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </div>
  );
}
