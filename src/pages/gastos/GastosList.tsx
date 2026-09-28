import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  gastoService,
  type GastoDTO,
  type CategoriaGasto,
  type MetodoPagoGasto,
  CATEGORIAS_GASTO,
  METODOS_PAGO_GASTO,
} from '../../services/gasto.service';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Plus, TrendingDown } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import toast from 'react-hot-toast';
import { notify } from '../../lib/notify';
import { usePermissions } from '../../hooks/usePermissions';
import { useSucursalStore } from '../../store/sucursalStore';

// ─── tokens ──────────────────────────────────────────────────────────────────

const T = {
  primary:     '#3b47ef',
  primarySoft: '#eef0ff',
  primaryLine: '#cfd4fd',
  bad:         '#d63b3b',
  badSoft:     '#fdeceb',
  surface:     '#ffffff',
  surface2:    '#f1f3f7',
  surface3:    '#fafbfc',
  line:        '#e4e7ec',
  lineSoft:    '#eef0f4',
  text:        '#0d1117',
  text2:       '#525c6b',
  text3:       '#6b7280',
  shadow:      '0 1px 2px rgba(16,24,40,.05),0 1px 3px rgba(16,24,40,.06)',
} as const;

const CAT_COLORS: Record<CategoriaGasto, string> = {
  ALQUILER:         '#8b5cf6',
  SERVICIOS:        '#eab308',
  SUELDOS:          '#3b82f6',
  MANTENIMIENTO:    '#f97316',
  PUBLICIDAD:       '#ec4899',
  TRANSPORTE:       '#06b6d4',
  IMPUESTOS:        '#ef4444',
  COMPRAS_INTERNAS: '#14b8a6',
  COMPRA_PROVEEDOR: '#10b981',
  OTROS:            '#94a3b8',
};

// ─── SVG icons ────────────────────────────────────────────────────────────────


const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>
);

const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);

const IconTrashSm = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:T.text3, pointerEvents:'none' }}>
    <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
  </svg>
);

const IconCal = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
    <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>
  </svg>
);

const IconChevron = ({ open }: { open?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, opacity:.7, transform: open ? 'rotate(180deg)' : undefined, transition:'transform .16s' }}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const IconFilter = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
    <path d="M3 5h18l-7 8v6l-4 2v-8Z"/>
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

// ─── helpers ──────────────────────────────────────────────────────────────────

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function money(n: number): string {
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + dec;
}

function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d} ${MESES[parseInt(m, 10) - 1]}`;
}

function hoyIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function ayerIso(): string {
  const d = new Date(); d.setDate(d.getDate()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function inicioMesIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}

function inicioMesAntIso(): string {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}

function finMesAntIso(): string {
  const d = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

type Preset = 'hoy' | '7d' | 'mes' | 'mesant' | 'todo';

function getPresetRange(key: Preset): { desde: string; hasta: string } {
  const hoy = hoyIso();
  const d7 = new Date(); d7.setDate(d7.getDate()-6);
  const d7s = `${d7.getFullYear()}-${String(d7.getMonth()+1).padStart(2,'0')}-${String(d7.getDate()).padStart(2,'0')}`;
  switch (key) {
    case 'hoy':    return { desde: hoy,             hasta: hoy };
    case '7d':     return { desde: d7s,             hasta: hoy };
    case 'mes':    return { desde: inicioMesIso(),   hasta: hoy };
    case 'mesant': return { desde: inicioMesAntIso(), hasta: finMesAntIso() };
    case 'todo':   return { desde: '2020-01-01',     hasta: hoy };
  }
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'hoy',    label: 'Hoy' },
  { key: '7d',     label: 'Últimos 7 días' },
  { key: 'mes',    label: 'Este mes' },
  { key: 'mesant', label: 'Mes anterior' },
  { key: 'todo',   label: 'Todas las fechas' },
];

function rangoCorto(desde: string, hasta: string): string {
  if (desde === hasta) return fechaCorta(desde);
  return `${fechaCorta(desde)} → ${fechaCorta(hasta)}`;
}

function mesActual(): { inicio: string; fin: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const last = new Date(y, now.getMonth()+1, 0).getDate();
  return { inicio:`${y}-${m}-01`, fin:`${y}-${m}-${String(last).padStart(2,'0')}` };
}

function getCat(value: CategoriaGasto) {
  return CATEGORIAS_GASTO.find(c => c.value === value) ?? CATEGORIAS_GASTO[CATEGORIAS_GASTO.length-1];
}

function metLabel(value?: string): string {
  return METODOS_PAGO_GASTO.find(m => m.value === value)?.label ?? '—';
}

function parseMonto(str: string): number {
  return parseFloat(String(str).replace(/\s/g, '').replace(',', '.')) || 0;
}

function displayUsuario(val?: string): string {
  if (!val) return '';
  return val.includes('@') ? val.split('@')[0] : val;
}

const emptyForm = (): GastoDTO & { montoStr: string } => ({
  concepto: '', categoria: 'OTROS', monto: 0, montoStr: '',
  fechaGasto: hoyIso(), metodoPago: 'EFECTIVO', numeroComprobante: '', notas: '',
});

const POR_PAGINA = 10;

// ─── monospace label ──────────────────────────────────────────────────────────

const MonoLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase' as const, color:T.text3 }}>
    {children}
  </div>
);

// ─── component ────────────────────────────────────────────────────────────────

export function GastosList() {
  const { canCreate, canEdit, canDelete, canView } = usePermissions();
  const hasView = canView('GASTOS');
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const sucursalId = sucursales.length > 1 && sucursalActual ? sucursalActual.id : undefined;

  const [gastos, setGastos]     = useState<GastoDTO[]>([]);
  const [loading, setLoading]   = useState(true);
  const [totalMes, setTotalMes] = useState(0);

  // filtros
  const [busqueda, setBusqueda]   = useState('');
  const [catFil, setCatFil]       = useState<CategoriaGasto | 'TODAS'>('TODAS');
  const [metFil, setMetFil]       = useState<MetodoPagoGasto | 'TODOS'>('TODOS');
  const [preset, setPreset]       = useState<Preset>('mes');
  const [desde, setDesde]         = useState(inicioMesIso());
  const [hasta, setHasta]         = useState(hoyIso());
  const [rangoOpen, setRangoOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pagina, setPagina]       = useState(1);

  // modal form
  const [modalForm, setModalForm]       = useState(false);
  const [modalDel, setModalDel]         = useState(false);
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [form, setForm]                 = useState<GastoDTO & { montoStr: string }>(emptyForm());
  const [intento, setIntento]           = useState(false);
  const [deletingGasto, setDeletingGasto] = useState<GastoDTO | null>(null);

  const rangoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rangoRef.current && !rangoRef.current.contains(e.target as Node)) setRangoOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!sucursalLoaded) return;
    if (hasView) { fetchGastos(); fetchTotalMes(); }
    else setLoading(false);
  }, [sucursalLoaded, hasView, sucursalId]);

  useEffect(() => { setPagina(1); }, [busqueda, catFil, metFil, desde, hasta]);

  const fetchGastos = async () => {
    try { setLoading(true); setGastos(await gastoService.getAll(sucursalId)); }
    catch (err) { notify.fromError(err, 'No se pudieron cargar los gastos. Intenta de nuevo.'); }
    finally { setLoading(false); }
  };

  const fetchTotalMes = async () => {
    try {
      const { inicio, fin } = mesActual();
      setTotalMes(Number(await gastoService.getTotal(inicio, fin, sucursalId)));
    } catch { /* silencioso */ }
  };

  const handleSubmit = async () => {
    setIntento(true);
    const monto = parseMonto(form.montoStr);
    if (!form.concepto.trim() || !(monto > 0)) return;
    try {
      if (editingId) {
        await gastoService.update(editingId, { ...form, monto });
        toast.success('Gasto actualizado');
      } else {
        await gastoService.create({ ...form, monto, sucursalId });
        toast.success('Gasto registrado');
      }
      setModalForm(false);
      fetchGastos(); fetchTotalMes();
    } catch (err) { notify.fromError(err, 'No se pudo guardar el gasto. Verifica los datos e intenta de nuevo.'); }
  };

  const handleConfirmDelete = async () => {
    if (!deletingGasto?.id) return;
    try {
      await gastoService.delete(deletingGasto.id);
      toast.success('Gasto eliminado');
      setModalDel(false); setDeletingGasto(null);
      fetchGastos(); fetchTotalMes();
    } catch (err) { notify.fromError(err, 'No se pudo eliminar el gasto.'); }
  };

  const openCreate = () => {
    const f = emptyForm(); setEditingId(null); setForm(f); setIntento(false); setModalForm(true);
  };
  const openEdit = (g: GastoDTO) => {
    setEditingId(g.id ?? null);
    setForm({ ...g, montoStr: money(Number(g.monto)).replace(/ /g,'') });
    setIntento(false); setModalForm(true);
  };
  const openDelete = (g: GastoDTO) => { setDeletingGasto(g); setModalDel(true); };

  const closeForm = () => { setModalForm(false); setEditingId(null); setIntento(false); };
  const closeDel  = () => { setModalDel(false); setDeletingGasto(null); };

  const applyPreset = (key: Preset) => {
    const r = getPresetRange(key);
    setPreset(key); setDesde(r.desde); setHasta(r.hasta); setRangoOpen(false); setPagina(1);
  };

  const setF = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  // computed
  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return gastos.filter(g => {
      if (g.fechaGasto < desde || g.fechaGasto > hasta) return false;
      if (catFil !== 'TODAS' && g.categoria !== catFil) return false;
      if (metFil !== 'TODOS' && g.metodoPago !== metFil) return false;
      if (q && !g.concepto.toLowerCase().includes(q) &&
          !(g.numeroComprobante ?? '').toLowerCase().includes(q) &&
          !(g.notas ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [gastos, busqueda, catFil, metFil, desde, hasta]);

  const totalFiltered = useMemo(() => filtered.reduce((s,g) => s+Number(g.monto), 0), [filtered]);
  const totalGastos   = gastos.reduce((s,g) => s+Number(g.monto), 0);
  const totalPag      = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  const paginaAct     = Math.min(pagina, totalPag);
  const paginated     = filtered.slice((paginaAct-1)*POR_PAGINA, paginaAct*POR_PAGINA);

  const porCat = useMemo(() => {
    const map = new Map<CategoriaGasto, number>();
    gastos.forEach(g => map.set(g.categoria, (map.get(g.categoria) ?? 0)+Number(g.monto)));
    return [...map.entries()].sort((a,b) => b[1]-a[1]).slice(0,3);
  }, [gastos]);
  const topMax = porCat.length ? porCat[0][1] : 1;

  // chips activos
  const presetAct = PRESETS.find(p => p.key === preset);
  const rLabel = preset === 'todo' ? 'Todas las fechas' : presetAct ? presetAct.label : rangoCorto(desde, hasta);
  const chips: { label: string; clear: () => void }[] = [];
  if (preset !== 'mes') chips.push({ label:`Fecha: ${rLabel}`, clear:() => applyPreset('mes') });
  if (catFil !== 'TODAS') chips.push({ label:`Categoría: ${getCat(catFil as CategoriaGasto).label}`, clear:() => { setCatFil('TODAS'); setPagina(1); } });
  if (metFil !== 'TODOS') chips.push({ label:`Método: ${metLabel(metFil)}`, clear:() => { setMetFil('TODOS'); setPagina(1); } });
  if (busqueda.trim()) chips.push({ label:`Búsqueda: ${busqueda.trim()}`, clear:() => { setBusqueda(''); setPagina(1); } });

  const limpiarFiltros = () => { setCatFil('TODAS'); setMetFil('TODOS'); setBusqueda(''); applyPreset('mes'); };

  const filtrosActivos = catFil !== 'TODAS' || metFil !== 'TODOS';
  const monto = parseMonto(form.montoStr);
  const errConcepto = intento && !form.concepto.trim();
  const errMonto    = intento && !(monto > 0);

  if (loading) return <LoadingSpinner />;
  if (!hasView) return <EmptyState icon={TrendingDown} title="Sin acceso" description="No tienes permiso para ver los gastos." />;

  const btnRangoStyle: React.CSSProperties = {
    width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    height:40, padding:'0 13px', fontFamily:'Inter,sans-serif', borderRadius:10, cursor:'pointer',
    whiteSpace:'nowrap', transition:'all .16s',
    color: rangoOpen || preset !== 'mes' ? T.primary : T.text2,
    background: rangoOpen || preset !== 'mes' ? T.primarySoft : T.surface2,
    border: rangoOpen || preset !== 'mes' ? `1px solid ${T.primaryLine}` : '1px solid transparent',
  };

  const btnFiltrosStyle: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:8, height:40, padding:'0 14px',
    fontFamily:'Inter,sans-serif', fontSize:'.855rem', fontWeight:600, borderRadius:10,
    cursor:'pointer', whiteSpace:'nowrap', transition:'all .16s',
    color: panelOpen || filtrosActivos ? T.primary : T.text2,
    background: panelOpen || filtrosActivos ? T.primarySoft : T.surface,
    border: panelOpen || filtrosActivos ? `1px solid ${T.primaryLine}` : `1px solid ${T.line}`,
  };

  const chipStyle: React.CSSProperties = {
    display:'inline-flex', alignItems:'center', gap:7, height:32, padding:'0 13px',
    fontFamily:'Inter,sans-serif', fontSize:'.81rem', fontWeight:600, borderRadius:9,
    cursor:'pointer', whiteSpace:'nowrap',
  };

  return (
    <div style={{ fontFamily:'Inter,sans-serif', color:T.text }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:22 }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:700, letterSpacing:'-.028em', color:T.text }}>Gastos y Egresos</h1>
          <p style={{ margin:'7px 0 0', fontSize:'.865rem', color:T.text3 }}>
            Registra y controla los gastos operativos del negocio
          </p>
        </div>
        {canCreate('GASTOS') && (
          <button onClick={openCreate} style={{ display:'flex', alignItems:'center', gap:8, height:40, padding:'0 18px', fontFamily:'Inter,sans-serif', fontSize:'.875rem', fontWeight:650, color:'#fff', background:T.primary, border:0, borderRadius:11, cursor:'pointer', whiteSpace:'nowrap', boxShadow:`0 8px 20px -10px ${T.primary}`, flexShrink:0 }}>
            <Plus size={15} strokeWidth={2.5} />
            Nuevo gasto
          </button>
        )}
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {/* Total registrado */}
        <div style={{ padding:'16px 18px', background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>
          <MonoLabel>Total registrado</MonoLabel>
          <p style={{ margin:'9px 0 0', fontSize:'1.72rem', fontWeight:700, letterSpacing:'-.032em', fontVariantNumeric:'tabular-nums', color:T.bad }}>
            S/ {money(totalGastos)}
          </p>
          <p style={{ margin:'5px 0 0', fontSize:'.79rem', color:T.text3 }}>{gastos.length} movimiento{gastos.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Mes en curso */}
        <div style={{ padding:'16px 18px', background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>
          <MonoLabel>Mes en curso</MonoLabel>
          <p style={{ margin:'9px 0 0', fontSize:'1.72rem', fontWeight:700, letterSpacing:'-.032em', fontVariantNumeric:'tabular-nums', color:T.bad }}>
            S/ {money(totalMes)}
          </p>
          <p style={{ margin:'5px 0 0', fontSize:'.79rem', color:T.text3 }}>gastos del mes actual</p>
        </div>

        {/* Vista filtrada */}
        <div style={{ padding:'16px 18px', background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>
          <MonoLabel>Vista filtrada</MonoLabel>
          <p style={{ margin:'9px 0 0', fontSize:'1.72rem', fontWeight:700, letterSpacing:'-.032em', fontVariantNumeric:'tabular-nums', color:T.text }}>
            S/ {money(totalFiltered)}
          </p>
          <p style={{ margin:'5px 0 0', fontSize:'.79rem', color:T.text3 }}>
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} · {rLabel.toLowerCase()}
          </p>
        </div>

        {/* Top categorías */}
        <div style={{ padding:'16px 18px', background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>
          <span style={{ fontSize:'.72rem', fontWeight:600, color:T.text3, textTransform:'uppercase', letterSpacing:'.04em' }}>Top categorías</span>
          {porCat.length === 0 ? (
            <p style={{ margin:'10px 0 0', fontSize:'.8rem', color:T.text3 }}>Sin registros aún</p>
          ) : (
            <div style={{ marginTop:11, display:'grid', gap:9 }}>
              {porCat.map(([k, v]) => {
                const color = CAT_COLORS[k];
                return (
                  <div key={k}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'.8rem' }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }} />
                      <span style={{ flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:T.text2 }}>{getCat(k).label}</span>
                      <span style={{ fontWeight:650, fontVariantNumeric:'tabular-nums' }}>S/ {money(v)}</span>
                    </div>
                    <div style={{ height:4, marginTop:5, borderRadius:4, background:T.surface2, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:4, background:color, width:`${Math.max(6, Math.round(v/topMax*100))}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabla card (filtros + tabla juntos) ─────────────────────────── */}
      <div style={{ background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>

        {/* Filtros row */}
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) auto auto', gap:10, padding:'14px 18px', borderBottom:`1px solid ${T.lineSoft}` }}>
          {/* Búsqueda */}
          <div style={{ position:'relative', minWidth:0 }}>
            <IconSearch />
            <input
              type="text" value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar por concepto, comprobante, notas…"
              style={{ width:'100%', height:40, padding:'0 13px 0 38px', fontFamily:'Inter,sans-serif', fontSize:'.875rem', color:T.text, background:T.surface2, border:'1px solid transparent', borderRadius:10, outline:'none', boxSizing:'border-box' }}
            />
          </div>

          {/* Rango de fechas */}
          <div ref={rangoRef} style={{ position:'relative', minWidth:0 }}>
            <button type="button" onClick={() => setRangoOpen(v => !v)} style={btnRangoStyle}>
              <IconCal />
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.8rem' }}>{rLabel}</span>
              <IconChevron open={rangoOpen} />
            </button>
            {rangoOpen && (
              <>
                <div onClick={() => setRangoOpen(false)} style={{ position:'fixed', inset:0, zIndex:40 }} />
                <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:41, width:300, maxWidth:'calc(100vw - 40px)', background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:'0 22px 50px -22px rgba(0,0,0,.45)', padding:8 }}>
                  {PRESETS.map(p => {
                    const r = getPresetRange(p.key);
                    const rng = p.key === 'todo' ? '' : rangoCorto(r.desde, r.hasta);
                    return (
                      <button key={p.key} type="button" onClick={() => applyPreset(p.key)}
                        style={{ width:'100%', display:'flex', alignItems:'center', height:36, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.845rem', border:0, borderRadius:8, cursor:'pointer', fontWeight: preset===p.key ? 650 : 500, color: preset===p.key ? T.primary : T.text, background: preset===p.key ? T.primarySoft : 'transparent' }}>
                        <span style={{ flex:1, textAlign:'left' }}>{p.label}</span>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.72rem', opacity:.75 }}>{rng}</span>
                      </button>
                    );
                  })}
                  <div style={{ height:1, background:T.lineSoft, margin:'8px 4px' }} />
                  <div style={{ padding:'4px 6px 6px' }}>
                    <MonoLabel>Personalizado</MonoLabel>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, marginTop:8 }}>
                      <label style={{ display:'grid', gap:4, fontSize:'.74rem', color:T.text3 }}>
                        Desde
                        <input type="date" value={desde} onChange={e => { if(e.target.value){ setDesde(e.target.value); setPreset('todo'); } }}
                          style={{ width:'100%', height:36, padding:'0 8px', fontFamily:'Inter,sans-serif', fontSize:'.8rem', color:T.text, background:T.surface2, border:`1px solid ${T.line}`, borderRadius:8, outline:'none' }} />
                      </label>
                      <label style={{ display:'grid', gap:4, fontSize:'.74rem', color:T.text3 }}>
                        Hasta
                        <input type="date" value={hasta} onChange={e => { if(e.target.value){ setHasta(e.target.value); setPreset('todo'); } }}
                          style={{ width:'100%', height:36, padding:'0 8px', fontFamily:'Inter,sans-serif', fontSize:'.8rem', color:T.text, background:T.surface2, border:`1px solid ${T.line}`, borderRadius:8, outline:'none' }} />
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filtros */}
          <button type="button" onClick={() => setPanelOpen(v => !v)} style={btnFiltrosStyle}>
            <IconFilter />
            Filtros
            {filtrosActivos && (
              <span style={{ minWidth:18, height:18, padding:'0 5px', display:'grid', placeItems:'center', borderRadius:20, fontSize:'.68rem', fontWeight:700, color:'#fff', background:T.primary }}>
                {(catFil !== 'TODAS' ? 1 : 0) + (metFil !== 'TODOS' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Panel de filtros expandible */}
        {panelOpen && (
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,3fr) minmax(0,2fr)', gap:18, padding:'16px 18px', borderBottom:`1px solid ${T.lineSoft}`, background:T.surface3 }}>
            <div style={{ minWidth:0 }}>
              <MonoLabel>Categoría</MonoLabel>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:9 }}>
                <button type="button" onClick={() => { setCatFil('TODAS'); setPagina(1); }}
                  style={{ ...chipStyle, color: catFil==='TODAS' ? T.primary : T.text2, background: catFil==='TODAS' ? T.primarySoft : T.surface, border: catFil==='TODAS' ? `1px solid ${T.primary}` : `1px solid ${T.line}` }}>
                  Todas
                </button>
                {CATEGORIAS_GASTO.map(c => (
                  <button key={c.value} type="button" onClick={() => { setCatFil(c.value); setPagina(1); }}
                    style={{ ...chipStyle, color: catFil===c.value ? T.primary : T.text2, background: catFil===c.value ? T.primarySoft : T.surface, border: catFil===c.value ? `1px solid ${T.primary}` : `1px solid ${T.line}` }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:CAT_COLORS[c.value], flexShrink:0 }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ minWidth:0 }}>
              <MonoLabel>Método de pago</MonoLabel>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:9 }}>
                <button type="button" onClick={() => { setMetFil('TODOS'); setPagina(1); }}
                  style={{ ...chipStyle, color: metFil==='TODOS' ? T.primary : T.text2, background: metFil==='TODOS' ? T.primarySoft : T.surface, border: metFil==='TODOS' ? `1px solid ${T.primary}` : `1px solid ${T.line}` }}>
                  Todos
                </button>
                {METODOS_PAGO_GASTO.map(m => (
                  <button key={m.value} type="button" onClick={() => { setMetFil(m.value); setPagina(1); }}
                    style={{ ...chipStyle, color: metFil===m.value ? T.primary : T.text2, background: metFil===m.value ? T.primarySoft : T.surface, border: metFil===m.value ? `1px solid ${T.primary}` : `1px solid ${T.line}` }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chips activos */}
        {chips.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8, padding:'11px 18px', borderBottom:`1px solid ${T.lineSoft}` }}>
            <span style={{ fontSize:'.79rem', color:T.text3 }}>Filtros activos</span>
            {chips.map((chip, i) => (
              <button key={i} type="button" onClick={chip.clear}
                style={{ display:'flex', alignItems:'center', gap:7, height:28, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.78rem', fontWeight:600, color:T.primary, background:T.primarySoft, border:`1px solid ${T.primaryLine}`, borderRadius:20, cursor:'pointer', whiteSpace:'nowrap' }}>
                {chip.label}
                <IconX />
              </button>
            ))}
            <button type="button" onClick={limpiarFiltros}
              style={{ height:28, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.78rem', fontWeight:600, color:T.text3, background:'transparent', border:0, borderRadius:20, cursor:'pointer' }}>
              Limpiar todo
            </button>
          </div>
        )}

        {/* Contenido: tabla o vacío */}
        {filtered.length === 0 ? (
          <div style={{ padding:'56px 24px', textAlign:'center' }}>
            <div style={{ width:52, height:52, margin:'0 auto', display:'grid', placeItems:'center', borderRadius:14, background:T.surface2, color:T.text3 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>
              </svg>
            </div>
            <div style={{ fontSize:'1rem', fontWeight:650, marginTop:14, color:T.text }}>
              {gastos.length === 0 ? 'Todavía no hay gastos registrados' : 'Ningún gasto coincide con estos filtros'}
            </div>
            <p style={{ fontSize:'.865rem', color:T.text3, lineHeight:1.55, margin:'7px auto 0', maxWidth:380 }}>
              {gastos.length === 0
                ? 'Registra tus egresos para tener visibilidad completa de los costos operativos.'
                : 'Prueba con otro rango de fechas o categoría, o quita los filtros para ver todos.'}
            </p>
            {chips.length > 0 && (
              <button type="button" onClick={limpiarFiltros}
                style={{ height:38, marginTop:16, padding:'0 16px', fontFamily:'Inter,sans-serif', fontSize:'.855rem', fontWeight:600, color:T.primary, background:T.primarySoft, border:`1px solid ${T.primaryLine}`, borderRadius:10, cursor:'pointer' }}>
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem', minWidth:980 }}>
                <thead>
                  <tr style={{ background:T.surface3 }}>
                    {[
                      { label:'Fecha',        align:'left',  px:'18px' },
                      { label:'Concepto',     align:'left',  px:'14px' },
                      { label:'Categoría',    align:'left',  px:'14px' },
                      { label:'Método',       align:'left',  px:'14px' },
                      { label:'Comprobante',  align:'left',  px:'14px' },
                      { label:'Monto',        align:'right', px:'14px' },
                      { label:'Acciones',     align:'right', px:'18px' },
                    ].map(h => (
                      <th key={h.label} style={{ textAlign: h.align as 'left' | 'right', padding:`10px ${h.px}`, fontSize:'.72rem', fontWeight:650, letterSpacing:'.04em', textTransform:'uppercase', color:T.text3, whiteSpace:'nowrap' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(g => (
                    <tr key={g.id} onClick={() => openEdit(g)}
                      style={{ borderTop:`1px solid ${T.lineSoft}`, cursor:'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding:'12px 18px', whiteSpace:'nowrap', verticalAlign:'top' }}>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.82rem', fontWeight:600 }}>{fechaCorta(g.fechaGasto)}</div>
                        {g.registradoPor && <div style={{ fontSize:'.74rem', color:T.text3, marginTop:2 }}>{displayUsuario(g.registradoPor)}</div>}
                      </td>
                      <td style={{ padding:'12px 14px', maxWidth:300, verticalAlign:'top' }}>
                        <div style={{ fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.concepto}</div>
                        <div style={{ fontSize:'.76rem', color:T.text3, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.notas || '—'}</div>
                      </td>
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap', verticalAlign:'top' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:'.78rem', fontWeight:600, color:T.text2, background:T.surface2, padding:'3px 10px 3px 8px', borderRadius:20 }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:CAT_COLORS[g.categoria], flexShrink:0 }} />
                          {getCat(g.categoria).label}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap', color:T.text2, verticalAlign:'top' }}>{metLabel(g.metodoPago)}</td>
                      <td style={{ padding:'12px 14px', whiteSpace:'nowrap', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.8rem', color:T.text2, verticalAlign:'top' }}>
                        {g.numeroComprobante || '—'}
                      </td>
                      <td style={{ padding:'12px 14px', textAlign:'right', whiteSpace:'nowrap', fontWeight:700, color:T.bad, fontVariantNumeric:'tabular-nums', verticalAlign:'top' }}>
                        S/ {money(Number(g.monto))}
                      </td>
                      <td style={{ padding:'12px 18px', textAlign:'right', whiteSpace:'nowrap', verticalAlign:'top' }}>
                        <div style={{ display:'inline-flex', gap:3 }}>
                          {canEdit('GASTOS') && (
                            <button type="button" onClick={e => { e.stopPropagation(); openEdit(g); }} title="Editar gasto"
                              style={{ width:30, height:30, display:'grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.primarySoft; (e.currentTarget as HTMLButtonElement).style.color = T.primary; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = T.text3; }}>
                              <IconEdit />
                            </button>
                          )}
                          {canDelete('GASTOS') && (
                            <button type="button" onClick={e => { e.stopPropagation(); openDelete(g); }} title="Eliminar gasto"
                              style={{ width:30, height:30, display:'grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.badSoft; (e.currentTarget as HTMLButtonElement).style.color = T.bad; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = T.text3; }}>
                              <IconTrashSm />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, padding:'13px 18px', borderTop:`1px solid ${T.lineSoft}` }}>
              <span style={{ fontSize:'.8rem', color:T.text3 }}>
                Mostrando {(paginaAct-1)*POR_PAGINA+1}–{Math.min(paginaAct*POR_PAGINA, filtered.length)} de {filtered.length} · Total S/ {money(totalFiltered)}
              </span>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <button type="button" onClick={() => setPagina(p => Math.max(1,p-1))} disabled={paginaAct===1}
                  style={{ minWidth:32, height:32, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.81rem', fontWeight:600, borderRadius:8, cursor: paginaAct===1 ? 'not-allowed' : 'pointer', opacity: paginaAct===1 ? .5 : 1, color:T.text2, background:T.surface, border:`1px solid ${T.line}` }}>
                  Anterior
                </button>
                {Array.from({ length: totalPag }, (_,i) => i+1).map(n => (
                  <button key={n} type="button" onClick={() => setPagina(n)}
                    style={{ minWidth:32, height:32, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.81rem', fontWeight:600, borderRadius:8, cursor:'pointer', color: n===paginaAct ? '#fff' : T.text2, background: n===paginaAct ? T.primary : T.surface, border: n===paginaAct ? `1px solid ${T.primary}` : `1px solid ${T.line}` }}>
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => setPagina(p => Math.min(totalPag,p+1))} disabled={paginaAct===totalPag}
                  style={{ minWidth:32, height:32, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.81rem', fontWeight:600, borderRadius:8, cursor: paginaAct===totalPag ? 'not-allowed' : 'pointer', opacity: paginaAct===totalPag ? .5 : 1, color:T.text2, background:T.surface, border:`1px solid ${T.line}` }}>
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal Crear / Editar ─────────────────────────────────────────── */}
      <Dialog
        isOpen={modalForm}
        onClose={closeForm}
        title={editingId ? 'Editar gasto' : 'Nuevo gasto'}
        description={editingId ? 'Los cambios se reflejan en los totales y reportes.' : 'Se registra como egreso de la sede.'}
        size="lg"
      >
        <div>

              {/* Monto + Fecha — grid separado por 1px */}
              <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.25fr) minmax(0,1fr)', gap:1, background:T.line, border:`1px solid ${T.line}`, borderRadius:14, overflow:'hidden' }}>
                {/* Monto */}
                <div style={{ padding:'14px 16px 15px', background:T.surface3 }}>
                  <MonoLabel>Monto *</MonoLabel>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:8, borderBottom:`2px solid ${errMonto ? T.bad : T.line}` }}>
                    <span style={{ fontSize:'1.35rem', fontWeight:650, color:T.text3 }}>S/</span>
                    <input
                      type="text" inputMode="decimal"
                      value={form.montoStr}
                      onChange={e => setF('montoStr', e.target.value.replace(/[^\d.,]/g,''))}
                      placeholder="0,00"
                      style={{ flex:1, minWidth:0, width:'100%', height:44, padding:0, fontFamily:'Inter,sans-serif', fontSize:'2rem', fontWeight:700, letterSpacing:'-.04em', fontVariantNumeric:'tabular-nums', color:T.text, background:'transparent', border:0, outline:'none', borderRadius:0 }}
                    />
                  </div>
                  {errMonto && <div style={{ fontSize:'.76rem', fontWeight:600, color:T.bad, marginTop:6 }}>Ingresa un monto mayor a 0.</div>}
                </div>
                {/* Fecha */}
                <div style={{ padding:'14px 16px 15px', background:T.surface3 }}>
                  <MonoLabel>Fecha *</MonoLabel>
                  <div style={{ display:'flex', gap:6, marginTop:8 }}>
                    {[{ label:'Hoy', val:hoyIso() }, { label:'Ayer', val:ayerIso() }].map(a => {
                      const on = form.fechaGasto === a.val;
                      return (
                        <button key={a.label} type="button" onClick={() => setF('fechaGasto', a.val)}
                          style={{ height:28, padding:'0 11px', fontFamily:'Inter,sans-serif', fontSize:'.76rem', fontWeight:650, borderRadius:20, cursor:'pointer', color: on ? '#fff' : T.text2, background: on ? T.primary : T.surface, border: on ? `1px solid ${T.primary}` : `1px solid ${T.line}` }}>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                  <input type="date" value={form.fechaGasto}
                    onChange={e => setF('fechaGasto', e.target.value)}
                    style={{ width:'100%', height:36, marginTop:8, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.84rem', color:T.text, background:T.surface, border:`1px solid ${T.line}`, borderRadius:9, outline:'none', boxSizing:'border-box' }}
                  />
                </div>
              </div>

              {/* Concepto */}
              <div style={{ marginTop:18 }}>
                <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:T.text2, marginBottom:6 }}>
                  Concepto <span style={{ color:T.bad }}>*</span>
                </label>
                <input type="text" value={form.concepto}
                  onChange={e => setF('concepto', e.target.value)}
                  placeholder="Ej: Recibo de luz septiembre, sueldo Juan…"
                  style={{ width:'100%', height:44, padding:'0 13px', fontFamily:'Inter,sans-serif', fontSize:'.9rem', color:T.text, background:T.surface, border:`1px solid ${errConcepto ? T.bad : T.line}`, borderRadius:10, outline:'none', boxSizing:'border-box', boxShadow: errConcepto ? `0 0 0 3px ${T.badSoft}` : undefined }}
                />
                {errConcepto && <div style={{ fontSize:'.76rem', fontWeight:600, color:T.bad, marginTop:6 }}>Escribe a qué corresponde el gasto.</div>}
              </div>

              {/* Categoría */}
              <div style={{ marginTop:18 }}>
                <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:T.text2, marginBottom:6 }}>Categoría *</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
                  {CATEGORIAS_GASTO.map(c => {
                    const on = form.categoria === c.value;
                    const color = CAT_COLORS[c.value];
                    return (
                      <button key={c.value} type="button" onClick={() => setF('categoria', c.value)}
                        style={{ display:'flex', alignItems:'center', gap:10, height:44, padding:'0 12px 0 10px', fontFamily:'Inter,sans-serif', borderRadius:11, cursor:'pointer', border: on ? `1.5px solid ${T.primary}` : `1.5px solid ${T.line}`, background: on ? T.primarySoft : T.surface, color: on ? T.text : T.text2 }}>
                        <span style={{ width:24, height:24, flexShrink:0, display:'grid', placeItems:'center', borderRadius:7, background:`${color}26` }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:color }} />
                        </span>
                        <span style={{ flex:1, minWidth:0, fontSize:'.8rem', fontWeight:600, textAlign:'left', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Método de pago */}
              <div style={{ marginTop:18 }}>
                <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:T.text2, marginBottom:6 }}>Método de pago</label>
                <div style={{ display:'flex', gap:6, padding:4, background:T.surface2, borderRadius:11, overflowX:'auto' }}>
                  {METODOS_PAGO_GASTO.map(m => {
                    const on = form.metodoPago === m.value;
                    return (
                      <button key={m.value} type="button" onClick={() => setF('metodoPago', on ? undefined : m.value)}
                        style={{ flex:1, height:34, padding:'0 8px', fontFamily:'Inter,sans-serif', fontSize:'.8rem', fontWeight:600, border:0, borderRadius:8, cursor:'pointer', whiteSpace:'nowrap', color: on ? T.text : T.text3, background: on ? T.surface : 'transparent', boxShadow: on ? `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` : undefined }}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sección Opcional */}
              <div style={{ marginTop:20, paddingTop:16, borderTop:`1px dashed ${T.line}` }}>
                <MonoLabel>Opcional</MonoLabel>
                <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1.4fr)', gap:12, marginTop:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:T.text2, marginBottom:6 }}>N° comprobante</label>
                    <input type="text" value={form.numeroComprobante ?? ''}
                      onChange={e => setF('numeroComprobante', e.target.value.toUpperCase())}
                      placeholder="B001-001234"
                      style={{ width:'100%', height:42, padding:'0 13px', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.84rem', letterSpacing:'.02em', color:T.text, background:T.surface, border:`1px solid ${T.line}`, borderRadius:10, outline:'none', boxSizing:'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:T.text2, marginBottom:6 }}>Notas</label>
                    <input type="text" value={form.notas ?? ''}
                      onChange={e => setF('notas', e.target.value)}
                      placeholder="Observaciones adicionales…"
                      style={{ width:'100%', height:42, padding:'0 13px', fontFamily:'Inter,sans-serif', fontSize:'.875rem', color:T.text, background:T.surface, border:`1px solid ${T.line}`, borderRadius:10, outline:'none', boxSizing:'border-box' }}
                    />
                  </div>
                </div>
              </div>

            {/* Footer */}
            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:'10px 14px', padding:'14px 22px', borderTop:`1px solid ${T.lineSoft}`, flexShrink:0, background:T.surface3 }}>
              <div style={{ flex:'1 1 200px', minWidth:0 }}>
                <div style={{ fontSize:'.74rem', color:T.text3 }}>
                  {getCat(form.categoria).label} · {form.metodoPago ? metLabel(form.metodoPago) : 'Sin método'}{form.fechaGasto ? ` · ${fechaCorta(form.fechaGasto)}` : ''}
                </div>
                <div style={{ fontSize:'1.12rem', fontWeight:700, letterSpacing:'-.025em', marginTop:2, color:T.bad, fontVariantNumeric:'tabular-nums' }}>
                  − S/ {money(monto)}
                </div>
              </div>
              <div style={{ display:'flex', gap:9, flex:'0 1 auto' }}>
                <button type="button" onClick={closeForm}
                  style={{ minWidth:104, height:44, padding:'0 18px', fontFamily:'Inter,sans-serif', fontSize:'.9rem', fontWeight:600, color:T.text2, background:T.surface, border:`1px solid ${T.line}`, borderRadius:11, cursor:'pointer' }}>
                  Cancelar
                </button>
                <button type="button" onClick={handleSubmit}
                  style={{ minWidth:160, height:44, padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'Inter,sans-serif', fontSize:'.9rem', fontWeight:650, color:'#fff', background:T.primary, border:0, borderRadius:11, cursor:'pointer', boxShadow:`0 8px 20px -10px ${T.primary}` }}>
                  {editingId ? 'Guardar cambios' : 'Registrar gasto'}
                </button>
              </div>
            </div>
        </div>
      </Dialog>

      {/* ── Modal Eliminar ──────────────────────────────────────────────── */}
      {modalDel && deletingGasto && createPortal(
        <div onClick={closeDel} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(9,11,16,.55)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:520, maxHeight:'calc(100vh - 40px)', display:'flex', flexDirection:'column', background:T.surface, border:`1px solid ${T.line}`, borderRadius:18, boxShadow:'0 30px 80px -30px rgba(0,0,0,.55)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'20px 22px 16px', borderBottom:`1px solid ${T.lineSoft}`, flexShrink:0 }}>
              <span style={{ width:38, height:38, flexShrink:0, display:'grid', placeItems:'center', borderRadius:11, background:T.badSoft, color:T.bad }}>
                <IconTrash />
              </span>
              <div style={{ minWidth:0 }}>
                <h2 style={{ margin:0, fontSize:'1.08rem', fontWeight:700, letterSpacing:'-.02em', color:T.text }}>Eliminar gasto</h2>
                <div style={{ fontSize:'.8rem', color:T.text3, marginTop:4 }}>Esta acción no se puede deshacer.</div>
              </div>
              <button type="button" onClick={closeDel} style={{ width:30, height:30, flexShrink:0, marginLeft:'auto', display:'grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            {/* Body */}
            <div style={{ padding:'18px 22px 20px' }}>
              <div style={{ display:'grid', gap:8, padding:'13px 15px', borderRadius:12, background:T.surface2, fontSize:'.84rem' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                  <span style={{ flexShrink:0, whiteSpace:'nowrap', color:T.text3 }}>Concepto</span>
                  <span style={{ minWidth:0, fontWeight:600, textAlign:'right', lineHeight:1.4 }}>{deletingGasto.concepto}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <span style={{ flexShrink:0, whiteSpace:'nowrap', color:T.text3 }}>Categoría</span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:7, fontWeight:600 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:CAT_COLORS[deletingGasto.categoria], flexShrink:0 }} />
                    {getCat(deletingGasto.categoria).label}
                  </span>
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                  <span style={{ flexShrink:0, whiteSpace:'nowrap', color:T.text3 }}>Fecha</span>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.8rem' }}>{fechaCorta(deletingGasto.fechaGasto)}</span>
                </div>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:12, paddingTop:9, borderTop:`1px solid ${T.line}` }}>
                  <span style={{ fontWeight:650 }}>Monto</span>
                  <span style={{ fontSize:'1.25rem', fontWeight:700, letterSpacing:'-.03em', color:T.bad, fontVariantNumeric:'tabular-nums' }}>S/ {money(Number(deletingGasto.monto))}</span>
                </div>
              </div>
              <p style={{ fontSize:'.82rem', lineHeight:1.55, color:T.text3, margin:'12px 0 0' }}>
                El gasto se quitará de los totales del mes y de los reportes.
              </p>
            </div>
            {/* Footer */}
            <div style={{ display:'flex', gap:9, padding:'14px 22px', borderTop:`1px solid ${T.lineSoft}`, flexShrink:0 }}>
              <button type="button" onClick={closeDel}
                style={{ flex:'0 0 auto', minWidth:110, height:44, padding:'0 18px', fontFamily:'Inter,sans-serif', fontSize:'.9rem', fontWeight:600, color:T.text2, background:T.surface, border:`1px solid ${T.line}`, borderRadius:11, cursor:'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmDelete}
                style={{ flex:1, height:44, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'Inter,sans-serif', fontSize:'.9rem', fontWeight:650, color:'#fff', background:T.bad, border:0, borderRadius:11, cursor:'pointer', boxShadow:`0 8px 20px -10px ${T.bad}` }}>
                Eliminar gasto
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
