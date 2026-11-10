import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { citaService, type CitaResumenDTO, type EstadoCita, type ListarCitasParams, type ProfesionalElegibleDTO } from '../../services/cita.service';
import { notify } from '../../lib/notify';
import { usePermissions } from '../../hooks/usePermissions';
import { useSucursalStore } from '../../store/sucursalStore';
import { CitaFormModal } from './components/CitaFormModal';
import { CambiarEstadoModal } from './components/CambiarEstadoModal';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { TIPO_CFG, ESTADO_CFG, ESPECIE_COLOR } from './citas.constants';

const T = {
  bg:          'var(--color-bg, #f5f5f7)',
  surface:     'var(--color-surface, #ffffff)',
  surface2:    'var(--color-surface-2, #f3f4f6)',
  line:        'var(--color-border, #e5e7eb)',
  lineSoft:    'var(--color-border-soft, #f3f4f6)',
  text:        'var(--color-text, #111827)',
  text2:       'var(--color-text-2, #374151)',
  text3:       'var(--color-text-3, #6b7280)',
  primary:     'var(--color-primary, #3b47ef)',
  primarySoft: 'var(--color-primary-soft, #eef0ff)',
  primaryLine: 'var(--color-primary-line, #cfd4fd)',
  ok:          'var(--color-ok, #059669)',
  okSoft:      'var(--color-ok-soft, #d1fae5)',
  warn:        'var(--color-warn, #d97706)',
  warnSoft:    'var(--color-warn-soft, #fef3c7)',
  bad:         'var(--color-bad, #dc2626)',
  shadow:      '0 1px 3px rgba(0,0,0,.07)',
} as const;

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };
const startOfWeek = (d: Date) => {
  const r = new Date(d); r.setHours(0,0,0,0);
  const day = r.getDay(); r.setDate(r.getDate()-(day===0?6:day-1)); return r;
};
const buildCalGrid = (mes: Date) => {
  const y=mes.getFullYear(), m=mes.getMonth();
  const first=new Date(y,m,1).getDay(), off=first===0?6:first-1;
  const days=new Date(y,m+1,0).getDate();
  const cells:(number|null)[]=Array(off).fill(null);
  for(let d=1;d<=days;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);
  return cells;
};
const MESES_ES     = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_ES_LOW = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS_CORTOS = ['L','M','X','J','V','S','D'];
const DIAS_SEMANA_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const normEspecie = (e:string|null) => {
  if(!e) return 'Otro';
  const s=e.charAt(0).toUpperCase()+e.slice(1).toLowerCase();
  return ['Perro','Gato','Conejo','Ave','Reptil'].includes(s)?s:'Otro';
};
const formatFechaLarga = (iso:string) => {
  const [y,m,d]=iso.slice(0,10).split('-').map(Number);
  const f=new Date(y,m-1,d);
  return `${DIAS_SEMANA_ES[f.getDay()]} ${d} De ${MESES_ES[m-1]}`;
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoPlus  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoX     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const IcoChevL = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>;
const IcoChevR = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>;
const IcoPaw   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><ellipse cx="6" cy="7" rx="2.5" ry="3" opacity=".85"/><ellipse cx="18" cy="7" rx="2.5" ry="3" opacity=".85"/><ellipse cx="3" cy="13" rx="2" ry="2.5" opacity=".85"/><ellipse cx="21" cy="13" rx="2" ry="2.5" opacity=".85"/><path d="M12 10c-3 0-8 2.5-8 7 0 3 2.5 4.5 5 4.5h6c2.5 0 5-1.5 5-4.5 0-4.5-5-7-8-7z"/></svg>;
const IcoEdit  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoArrow = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IcoCal   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const IcoClock = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
const IcoStethoscope = () => <Stethoscope size={18} strokeWidth={1.8}/>;
const IcoCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>;
const IcoDia   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>;
const IcoSemana= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h8M8 18h5"/></svg>;
const IcoLista = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>;
const IcoProf  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
const IcoNote  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 3H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V7z"/><path d="M10 8h6M10 12h4"/></svg>;
const IcoMsg   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IcoPhone = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;

type FiltroVista = '' | 'porAtender' | 'enAtencion' | 'atendidas' | 'canceladas';

function EstadoPill({ estado }: { estado: EstadoCita }) {
  const cfg = ESTADO_CFG[estado];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px 3px 7px', borderRadius:20, fontSize:'.73rem', fontWeight:650, color:cfg.tone, background:cfg.soft, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.tone, flexShrink:0 }}/>
      {cfg.label}
    </span>
  );
}

export function CitasPage() {
  const { sucursalActual } = useSucursalStore();
  const sucursalActivaId   = sucursalActual?.id ?? null;
  const { isAdmin, canCreate, canEdit } = usePermissions();

  const puedeCrear             = canCreate('CITAS');
  const puedeCambiarEstado     = canEdit('CITAS') || isAdmin;
  const puedeCancelar          = puedeCambiarEstado;
  const puedeTransicionClinica = isAdmin || canEdit('CITAS');

  const [viewMode, setViewMode]       = useState<'dia'|'semana'|'lista'>('dia');
  const [diaActual, setDiaActual]     = useState(() => new Date());
  const [semanaBase, setSemanaBase]   = useState(() => startOfWeek(new Date()));
  const [citas, setCitas]             = useState<CitaResumenDTO[]>([]);
  const [loading, setLoading]         = useState(false);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [filtroVista, setFiltroVista] = useState<FiltroVista>('');

  const [listaCitas, setListaCitas]       = useState<CitaResumenDTO[]>([]);
  const [listaLoading, setListaLoading]   = useState(false);
  const [listaTotalPages, setListaTotalP] = useState(0);
  const [listaPage, setListaPage]         = useState(0);
  const [filtroEstado, setFiltroEstado]   = useState<EstadoCita|''>('');
  const [qInput, setQInput]               = useState('');
  const [q, setQ]                         = useState('');

  const [profesionales, setProfesionales]   = useState<ProfesionalElegibleDTO[]>([]);
  const [visibleProfIds, setVisibleProfIds] = useState<Set<number>>(new Set());
  const [mesCalendario, setMesCal]          = useState(() => { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1); });

  // Ref siempre apunta al sucursal activo en el momento presente, para descartar
  // respuestas en vuelo de un sucursal anterior (race condition).
  const activeSucursalRef = useRef(sucursalActivaId);

  const [showForm, setShowForm]       = useState(false);
  const [editCita, setEditCita]       = useState<CitaResumenDTO|null>(null);
  const [estadoCita, setEstCita]      = useState<CitaResumenDTO|null>(null);
  const [detalleCita, setDetalle]     = useState<CitaResumenDTO|null>(null);
  const [preloadFecha, setPreFecha]   = useState<string|undefined>();
  const [preloadHora, setPreHora]     = useState<string|undefined>();
  const [preloadProf, setPreProf]     = useState<number|undefined>();

  useEffect(() => { const id=setTimeout(()=>setQ(qInput),350); return ()=>clearTimeout(id); }, [qInput]);

  // Mantener el ref sincronizado con el sucursal activo
  useEffect(() => { activeSucursalRef.current = sucursalActivaId; }, [sucursalActivaId]);

  // Limpiar estado inmediatamente al cambiar de sucursal para evitar contaminación cruzada
  useEffect(() => {
    setCitas([]);
    setProfesionales([]);
    setVisibleProfIds(new Set());
  }, [sucursalActivaId]);

  // Recargar profesionales al cambiar sucursal O al guardar una cita (refreshKey)
  useEffect(() => {
    citaService.getProfesionales(sucursalActivaId)
      .then(data => { setProfesionales(data); setVisibleProfIds(new Set(data.map(p=>p.usuarioTenantId))); })
      .catch(err => notify.fromError(err,'Error al cargar profesionales'));
  }, [sucursalActivaId, refreshKey]);

  function mergeOrphanProfs(reqSucursal: number|null, citasData: CitaResumenDTO[]) {
    // Ignorar si el sucursal cambió mientras el request estaba en vuelo
    if (activeSucursalRef.current !== reqSucursal) return;
    setProfesionales(prev => {
      const knownIds = new Set(prev.map(p => p.usuarioTenantId));
      const extras: ProfesionalElegibleDTO[] = [];
      citasData.forEach(c => {
        if (c.usuarioTenantId && !knownIds.has(c.usuarioTenantId)) {
          knownIds.add(c.usuarioTenantId);
          extras.push({ usuarioTenantId: c.usuarioTenantId, nombre: c.profesionalNombre ?? `Prof. ${c.usuarioTenantId}`, rolNombre: '', sucursalId: reqSucursal ?? 0 });
        }
      });
      if (extras.length === 0) return prev;
      setVisibleProfIds(ids => { const n = new Set(ids); extras.forEach(p => n.add(p.usuarioTenantId)); return n; });
      return [...prev, ...extras];
    });
  }

  const loadSemana = useCallback((base:Date) => {
    const reqSucursal = sucursalActivaId;
    const dom=addDays(base,6); setLoading(true);
    const params:ListarCitasParams={ fechaInicio:`${toLocalDateStr(base)}T00:00:00`, fechaFin:`${toLocalDateStr(dom)}T23:59:59`, size:500 };
    if(reqSucursal) params.sucursalId=reqSucursal;
    citaService.getAll(params)
      .then(r=>{ if(activeSucursalRef.current!==reqSucursal) return; setCitas(r.content); mergeOrphanProfs(reqSucursal, r.content); })
      .catch(err=>notify.fromError(err,'Error al cargar citas')).finally(()=>setLoading(false));
  }, [sucursalActivaId]);

  const loadDia = useCallback((dia:Date) => {
    const reqSucursal = sucursalActivaId;
    const f=toLocalDateStr(dia); setLoading(true);
    const params:ListarCitasParams={ fechaInicio:`${f}T00:00:00`, fechaFin:`${f}T23:59:59`, size:500 };
    if(reqSucursal) params.sucursalId=reqSucursal;
    citaService.getAll(params)
      .then(r=>{ if(activeSucursalRef.current!==reqSucursal) return; setCitas(r.content); mergeOrphanProfs(reqSucursal, r.content); })
      .catch(err=>notify.fromError(err,'Error al cargar citas')).finally(()=>setLoading(false));
  }, [sucursalActivaId]);

  useEffect(() => {
    if(viewMode==='semana') loadSemana(semanaBase);
    else if(viewMode==='dia') loadDia(diaActual);
  }, [viewMode, semanaBase, diaActual, refreshKey, loadSemana, loadDia]);

  useEffect(() => {
    if(viewMode!=='lista') return;
    setListaLoading(true);
    const params:ListarCitasParams={ page:0, size:15 };
    if(filtroEstado) params.estado=filtroEstado;
    if(q.trim()) params.q=q.trim();
    if(sucursalActivaId) params.sucursalId=sucursalActivaId;
    citaService.getAll(params)
      .then(r=>{setListaCitas(r.content);setListaTotalP(r.totalPages);setListaPage(0);})
      .catch(err=>notify.fromError(err,'Error al cargar citas')).finally(()=>setListaLoading(false));
  }, [viewMode, filtroEstado, q, refreshKey, sucursalActivaId]);

  const kpis = useMemo(() => {
    const dStr=toLocalDateStr(diaActual);
    const hoy=citas.filter(c=>c.fechaInicio.slice(0,10)===dStr);
    const sinCanc=hoy.filter(c=>c.estado!=='CANCELADA'&&c.estado!=='NO_ASISTIO');
    const atendidas=hoy.filter(c=>c.estado==='ATENDIDA').length;
    const confirmadas=hoy.filter(c=>c.estado==='CONFIRMADA').length;
    return {
      total:      sinCanc.length,
      porAtender: hoy.filter(c=>c.estado==='PENDIENTE'||c.estado==='CONFIRMADA').length,
      confirmadas,
      enAtencion: hoy.filter(c=>c.estado==='EN_ATENCION').length,
      atendidas,
      pct:        sinCanc.length>0 ? Math.round(atendidas/sinCanc.length*100) : 0,
    };
  }, [citas, diaActual]);

  const citasFiltradas = useMemo(() => {
    switch(filtroVista) {
      case 'porAtender': return citas.filter(c=>c.estado==='PENDIENTE'||c.estado==='CONFIRMADA');
      case 'enAtencion': return citas.filter(c=>c.estado==='EN_ATENCION');
      case 'atendidas':  return citas.filter(c=>c.estado==='ATENDIDA');
      case 'canceladas': return citas.filter(c=>c.estado==='CANCELADA'||c.estado==='NO_ASISTIO');
      default:           return citas;
    }
  }, [citas, filtroVista]);

  const historialMascota = useMemo(() => {
    if(!detalleCita) return [];
    return citas
      .filter(c=>c.mascotaId===detalleCita.mascotaId&&c.id!==detalleCita.id)
      .sort((a,b)=>b.fechaInicio.localeCompare(a.fechaInicio))
      .slice(0,6);
  }, [citas, detalleCita]);

  function handleSaved() {
    setShowForm(false); setEditCita(null); setEstCita(null); setDetalle(null);
    setPreFecha(undefined); setPreHora(undefined); setPreProf(undefined);
    setRefreshKey(k=>k+1);
  }
  function handleSlotClick(dia:Date, hora:string, profId?:number) {
    setPreFecha(toLocalDateStr(dia)); setPreHora(hora); setPreProf(profId);
    setEditCita(null); setShowForm(true);
  }
  function handleDiaClick(d:Date) {
    setDiaActual(d);
    if(viewMode==='semana') setViewMode('dia');
  }
  function handleEventClick(c:CitaResumenDTO) { setDetalle(c); }

  function loadListaPage(p:number) {
    setListaLoading(true);
    const params:ListarCitasParams={ page:p, size:15 };
    if(filtroEstado) params.estado=filtroEstado;
    if(q.trim()) params.q=q.trim();
    if(sucursalActivaId) params.sucursalId=sucursalActivaId;
    citaService.getAll(params)
      .then(r=>{setListaCitas(r.content);setListaTotalP(r.totalPages);setListaPage(r.page);})
      .catch(err=>notify.fromError(err,'Error al cargar citas')).finally(()=>setListaLoading(false));
  }

  function toggleProf(id:number) {
    setVisibleProfIds(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  }

  const todayStr  = toLocalDateStr(new Date());
  const calCells  = buildCalGrid(mesCalendario);
  const calYear   = mesCalendario.getFullYear();
  const calMonth  = mesCalendario.getMonth();
  const navLabel  = viewMode==='dia'
    ? `${DIAS_SEMANA_ES[diaActual.getDay()]} ${diaActual.getDate()} de ${MESES_ES_LOW[diaActual.getMonth()]}`
    : `${addDays(semanaBase,0).getDate()} – ${addDays(semanaBase,6).getDate()} de ${MESES_ES_LOW[addDays(semanaBase,6).getMonth()]} ${addDays(semanaBase,6).getFullYear()}`;
  const isDiaHoy  = toLocalDateStr(diaActual) === todayStr;
  const navCount  = viewMode==='dia'
    ? `${citas.filter(c=>c.fechaInicio.slice(0,10)===toLocalDateStr(diaActual)).length} citas${isDiaHoy?' · hoy':''}`
    : `${citas.length} citas en la semana`;

  // ── Sidebar ────────────────────────────────────────────────────────────────
  function renderSidebar() {
    return (
      <aside style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto', paddingBottom:20, minWidth:0 }}>
        {/* Mini-cal */}
        <div style={{ background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, padding:'16px', boxShadow:T.shadow }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'.92rem',fontWeight:650,textTransform:'capitalize' }}>{MESES_ES[calMonth]} {calYear}</span>
            <div style={{ display:'flex',gap:2 }}>
              <button onClick={()=>setMesCal(new Date(calYear,calMonth-1,1))} style={{ width:28,height:28,display:'grid',placeItems:'center',border:0,background:'transparent',borderRadius:7,cursor:'pointer',color:T.text2 }}><IcoChevL/></button>
              <button onClick={()=>setMesCal(new Date(calYear,calMonth+1,1))} style={{ width:28,height:28,display:'grid',placeItems:'center',border:0,background:'transparent',borderRadius:7,cursor:'pointer',color:T.text2 }}><IcoChevR/></button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:2, textAlign:'center', marginTop:12 }}>
            {DIAS_CORTOS.map(d=><div key={d} style={{ fontSize:'.66rem',color:T.text3,fontWeight:650,padding:'0 0 4px' }}>{d}</div>)}
            {calCells.map((day,i)=>{
              if(!day) return <div key={i} style={{ height:34 }}/>;
              const ds=`${calYear}-${pad(calMonth+1)}-${pad(day)}`;
              const isT=ds===todayStr, isSel=ds===toLocalDateStr(diaActual);
              const n=citas.filter(c=>c.fechaInicio.slice(0,10)===ds).length;
              const barW=Math.min(14,4+n*1.5);
              return (
                <div key={i} onClick={()=>{ const d=new Date(calYear,calMonth,day); setDiaActual(d); if(viewMode!=='lista'){setSemanaBase(startOfWeek(d));setViewMode('dia');} }} style={{ height:34,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                  <div style={{ width:28,height:24,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.78rem',fontWeight:isSel||isT?700:400,background:isSel?T.primary:isT?T.primarySoft:'transparent',color:isSel?'#fff':isT?T.primary:T.text }}>{day}</div>
                  <div style={{ width:barW,height:3,borderRadius:2,background:n>0?(isSel?'#fff':T.primary):'transparent',marginTop:1 }}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profesionales */}
        {profesionales.length>0&&(
          <div style={{ background:T.surface,border:`1px solid ${T.line}`,borderRadius:14,padding:'14px 12px',boxShadow:T.shadow }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:'.68rem',fontWeight:600,letterSpacing:'.09em',textTransform:'uppercase',color:T.text3,marginBottom:10 }}>Profesionales</div>
            <div style={{ display:'grid',gap:4 }}>
              {profesionales.map(p=>{
                const vis=visibleProfIds.has(p.usuarioTenantId);
                const cnt=citas.filter(c=>c.usuarioTenantId===p.usuarioTenantId).length;
                const hue=(p.usuarioTenantId*137)%360;
                const ini=p.nombre.replace(/^Dr[a]?\.\s*/i,'').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase();
                return (
                  <button key={p.usuarioTenantId} onClick={()=>toggleProf(p.usuarioTenantId)}
                    style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'7px 8px',fontFamily:'Inter,sans-serif',textAlign:'left',background:'transparent',border:0,borderRadius:9,cursor:'pointer' }}>
                    <span style={{ width:16,height:16,borderRadius:5,flexShrink:0,border:vis?`1.5px solid ${T.primary}`:`1.5px solid ${T.line}`,background:vis?T.primary:T.surface,display:'grid',placeItems:'center' }}>
                      {vis&&<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>}
                    </span>
                    <span style={{ width:26,height:26,borderRadius:'50%',background:`oklch(0.94 0.04 ${hue})`,color:`oklch(0.45 0.13 ${hue})`,display:'grid',placeItems:'center',fontSize:'.65rem',fontWeight:700,flexShrink:0 }}>{ini}</span>
                    <span style={{ minWidth:0,flex:1 }}>
                      <span style={{ display:'block',fontSize:'.84rem',fontWeight:600,color:T.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.nombre}</span>
                      <span style={{ display:'block',fontSize:'.7rem',color:T.text3 }}>{p.rolNombre}</span>
                    </span>
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:'.72rem',fontWeight:600,color:T.text3 }}>{cnt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tipos */}
        <div style={{ background:T.surface,border:`1px solid ${T.line}`,borderRadius:14,padding:'14px 12px',boxShadow:T.shadow }}>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:'.68rem',fontWeight:600,letterSpacing:'.09em',textTransform:'uppercase',color:T.text3,marginBottom:10 }}>Tipos de cita</div>
          <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
            {(Object.entries(TIPO_CFG) as [string, typeof TIPO_CFG[keyof typeof TIPO_CFG]][]).map(([k,cfg])=>(
              <div key={k} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ width:10,height:10,borderRadius:3,background:cfg.color,flexShrink:0 }}/>
                <span style={{ fontSize:'.8rem',color:T.text2,flex:1 }}>{cfg.label}</span>
                <span style={{ fontSize:'.72rem',color:T.text3 }}>{cfg.durMin} min</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  // ── Panel sub-header ───────────────────────────────────────────────────────
  function renderPanelHeader() {
    const FILTROS_CAL: {v:FiltroVista;label:string;col:string}[] = [
      { v:'',           label:'Todas',       col:T.text3 },
      { v:'porAtender', label:'Por atender', col:ESTADO_CFG.PENDIENTE.tone },
      { v:'enAtencion', label:'En atención', col:ESTADO_CFG.EN_ATENCION.tone },
      { v:'atendidas',  label:'Atendidas',   col:ESTADO_CFG.ATENDIDA.tone },
      { v:'canceladas', label:'Canceladas',  col:ESTADO_CFG.CANCELADA.tone },
    ];
    const FILTROS_LIST: {v:EstadoCita|'';label:string;col:string}[] = [
      { v:'',           label:'Todas',       col:T.text3 },
      { v:'PENDIENTE',  label:'Pendiente',   col:ESTADO_CFG.PENDIENTE.tone },
      { v:'CONFIRMADA', label:'Confirmada',  col:ESTADO_CFG.CONFIRMADA.tone },
      { v:'EN_ATENCION',label:'En atención', col:ESTADO_CFG.EN_ATENCION.tone },
      { v:'ATENDIDA',   label:'Atendida',    col:ESTADO_CFG.ATENDIDA.tone },
      { v:'CANCELADA',  label:'Cancelada',   col:ESTADO_CFG.CANCELADA.tone },
    ];

    const handlePrev = () => {
      if(viewMode==='semana') setSemanaBase(addDays(semanaBase,-7));
      else if(viewMode==='dia') setDiaActual(addDays(diaActual,-1));
      else setSemanaBase(addDays(semanaBase,-7));
    };
    const handleNext = () => {
      if(viewMode==='semana') setSemanaBase(addDays(semanaBase,7));
      else if(viewMode==='dia') setDiaActual(addDays(diaActual,1));
      else setSemanaBase(addDays(semanaBase,7));
    };
    const listaLabel = `${addDays(semanaBase,0).getDate()} – ${addDays(semanaBase,6).getDate()} de ${MESES_ES_LOW[addDays(semanaBase,6).getMonth()]} ${addDays(semanaBase,6).getFullYear()}`;

    return (
      <div style={{ padding:'10px 16px', borderBottom:`1px solid ${T.lineSoft}`, display:'flex', alignItems:'center', gap:10, flexShrink:0, flexWrap:'wrap' }}>
        <div style={{ display:'flex',alignItems:'center',gap:4 }}>
          <button onClick={handlePrev} style={{ width:34,height:34,display:'grid',placeItems:'center',border:`1px solid ${T.line}`,borderRadius:9,cursor:'pointer',background:T.surface,color:T.text2 }}><IcoChevL/></button>
          <button onClick={()=>{ const t=new Date(); setDiaActual(t); setSemanaBase(startOfWeek(t)); }} style={{ height:34,padding:'0 13px',fontSize:'.82rem',fontWeight:650,border:`1px solid ${T.line}`,borderRadius:9,cursor:'pointer',background:T.surface,color:T.text,fontFamily:'Inter,sans-serif' }}>Hoy</button>
          <button onClick={handleNext} style={{ width:34,height:34,display:'grid',placeItems:'center',border:`1px solid ${T.line}`,borderRadius:9,cursor:'pointer',background:T.surface,color:T.text2 }}><IcoChevR/></button>
        </div>
        <div style={{ minWidth:0,flex:1 }}>
          <div style={{ fontSize:'1.02rem',fontWeight:700,color:T.text,letterSpacing:'-.015em',textTransform:'capitalize' }}>{viewMode==='lista'?listaLabel:navLabel}</div>
          {viewMode!=='lista'&&<div style={{ fontSize:'.74rem',color:T.text3,marginTop:1 }}>{navCount}</div>}
        </div>
        {viewMode==='lista'&&(
          <div style={{ position:'relative',flex:'0 1 280px',minWidth:180 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.text3,pointerEvents:'none' }}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input value={qInput} onChange={e=>setQInput(e.target.value)} placeholder="Buscar mascota, cliente o motivo…"
              style={{ width:'100%',height:36,padding:'0 12px 0 32px',fontFamily:'Inter,sans-serif',fontSize:'.84rem',border:`1px solid transparent`,borderRadius:9,outline:'none',background:T.surface2,color:T.text }}/>
          </div>
        )}
        <div style={{ display:'flex',gap:3,padding:3,background:T.surface2,borderRadius:9,maxWidth:'100%',overflowX:'auto' }}>
          {viewMode==='lista'
            ? FILTROS_LIST.map(f=>{
                const active=filtroEstado===f.v;
                return (
                  <button key={f.v||'todas'} onClick={()=>setFiltroEstado(f.v)}
                    style={{ height:30,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'Inter,sans-serif',fontSize:'.75rem',fontWeight:600,borderRadius:7,border:0,background:active?T.surface:'transparent',color:active?T.text:T.text3,boxShadow:active?'0 1px 3px rgba(0,0,0,.14), 0 0 0 1px var(--color-border,#e5e7eb)':'none',cursor:'pointer',whiteSpace:'nowrap' }}>
                    {f.v!==''&&<span style={{ width:6,height:6,borderRadius:'50%',background:active?f.col:T.text3,flexShrink:0 }}/>}
                    {f.label}
                  </button>
                );
              })
            : FILTROS_CAL.map(f=>{
                const active=filtroVista===f.v;
                return (
                  <button key={f.v||'todas'} onClick={()=>setFiltroVista(f.v)}
                    style={{ height:30,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'Inter,sans-serif',fontSize:'.75rem',fontWeight:600,borderRadius:7,border:0,background:active?T.surface:'transparent',color:active?T.text:T.text3,boxShadow:active?'0 1px 3px rgba(0,0,0,.14), 0 0 0 1px var(--color-border,#e5e7eb)':'none',cursor:'pointer',whiteSpace:'nowrap' }}>
                    {f.v!==''&&<span style={{ width:6,height:6,borderRadius:'50%',background:active?f.col:T.text3,flexShrink:0 }}/>}
                    {f.label}
                  </button>
                );
              })
          }
        </div>
      </div>
    );
  }

  // ── Lista ──────────────────────────────────────────────────────────────────
  function renderLista() {
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:0,flex:1,minHeight:0,overflowY:'auto' }}>
        <div style={{ flex:1,overflowX:'auto',overflowY:'hidden' }}>
          {listaLoading?(
            <div style={{ padding:56,textAlign:'center',color:T.text3,fontSize:'.88rem' }}>Cargando…</div>
          ):listaCitas.length===0?(
            <div style={{ padding:'56px 24px',textAlign:'center' }}>
              <div style={{ width:52,height:52,margin:'0 auto',display:'grid',placeItems:'center',borderRadius:14,background:T.surface2,color:T.text3 }}><IcoCal/></div>
              <div style={{ fontSize:'1rem',fontWeight:650,marginTop:14 }}>Sin citas para estos filtros</div>
              <p style={{ fontSize:'.865rem',color:T.text3,margin:'7px 0 0' }}>Cambia la semana o el estado, o agenda una nueva cita.</p>
            </div>
          ):(
            <table style={{ width:'100%',borderCollapse:'collapse',fontFamily:'Inter,sans-serif',fontSize:'.84rem',minWidth:900 }}>
              <thead>
                <tr style={{ background:T.surface2 }}>
                  {[{h:'Fecha / hora',l:true},{h:'Mascota / cliente',l:false},{h:'Tipo',l:false},{h:'Profesional',l:false},{h:'Estado',l:false},{h:'Acciones',l:false,r:true}].map(({h,r},i)=>(
                    <th key={i} style={{ padding:`10px ${i===0||r?'18px':'14px'}`,textAlign:r?'right':'left',fontSize:'.72rem',fontWeight:650,color:T.text3,textTransform:'uppercase',letterSpacing:'.04em',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listaCitas.map((c)=>{
                  const tipCfg=TIPO_CFG[c.tipo];
                  const ecolor=ESPECIE_COLOR[normEspecie(c.mascotaEspecie)];
                  const fObj=new Date(c.fechaInicio.slice(0,10).replace(/-/g,'/'));
                  const mesCorto=MESES_ES[fObj.getMonth()].slice(0,3).toUpperCase();
                  const diaCorto=DIAS_SEMANA_ES[fObj.getDay()].slice(0,3);
                  return (
                    <tr key={c.id} onClick={()=>setDetalle(c)}
                      style={{ borderBottom:`1px solid ${T.lineSoft}`,cursor:'pointer' }}
                      onMouseEnter={e=>(e.currentTarget.style.background=T.surface2)}
                      onMouseLeave={e=>(e.currentTarget.style.background='')}>
                      <td style={{ padding:'11px 18px',whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:11 }}>
                          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRadius:8,background:T.surface2,padding:'5px 9px',textAlign:'center',minWidth:40 }}>
                            <span style={{ fontSize:'.6rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',color:T.primary }}>{mesCorto}</span>
                            <span style={{ fontSize:'1rem',fontWeight:750,lineHeight:1,color:T.text }}>{fObj.getDate()}</span>
                          </div>
                          <div>
                            <div style={{ fontWeight:600,textTransform:'capitalize' }}>{diaCorto}</div>
                            <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:'.74rem',color:T.text3,marginTop:2 }}>{c.fechaInicio.slice(11,16)} – {c.fechaFin.slice(11,16)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'11px 14px',maxWidth:260 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:10,minWidth:0 }}>
                          <span style={{ width:32,height:32,borderRadius:9,background:`color-mix(in oklab, ${ecolor} 15%, white)`,display:'grid',placeItems:'center',color:ecolor,flexShrink:0 }}><IcoPaw/></span>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:650,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{c.mascotaNombre??'—'}</div>
                            <div style={{ fontSize:'.74rem',color:T.text3,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{c.clienteNombre??'—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'11px 14px',whiteSpace:'nowrap' }}>
                        <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px 3px 7px',borderRadius:20,fontSize:'.73rem',fontWeight:650,color:tipCfg.color,background:`color-mix(in oklab, ${tipCfg.color} 12%, white)`,whiteSpace:'nowrap' }}>
                          <span style={{ width:6,height:6,borderRadius:2,background:tipCfg.color,flexShrink:0 }}/>{tipCfg.label}
                        </span>
                        {c.motivo&&<div style={{ fontSize:'.72rem',color:T.text3,marginTop:4,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis' }}>{c.motivo}</div>}
                      </td>
                      <td style={{ padding:'11px 14px',whiteSpace:'nowrap' }}>
                        {c.profesionalNombre?(()=>{
                          const profHue=(c.usuarioTenantId??0)*137%360;
                          return (
                            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                              <span style={{ width:28,height:28,borderRadius:'50%',background:`oklch(0.94 0.04 ${profHue})`,color:`oklch(0.45 0.13 ${profHue})`,display:'grid',placeItems:'center',fontSize:'.65rem',fontWeight:700,flexShrink:0 }}>{c.profesionalNombre.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}</span>
                              <span style={{ color:T.text2 }}>{c.profesionalNombre}</span>
                            </div>
                          );
                        })():<span style={{ color:T.text3 }}>—</span>}
                      </td>
                      <td style={{ padding:'11px 14px',whiteSpace:'nowrap' }}><EstadoPill estado={c.estado}/></td>
                      <td style={{ padding:'11px 18px',textAlign:'right',whiteSpace:'nowrap' }}>
                        <div style={{ display:'inline-flex',gap:3 }}>
                          <button onClick={e=>{e.stopPropagation();setEditCita(c);setShowForm(true);}}
                            style={{ width:30,height:30,display:'grid',placeItems:'center',color:T.text3,background:'transparent',border:0,borderRadius:8,cursor:'pointer' }} title="Editar cita"><IcoEdit/></button>
                          {puedeCambiarEstado&&<button onClick={e=>{e.stopPropagation();setEstCita(c);}}
                            style={{ width:30,height:30,display:'grid',placeItems:'center',color:T.text3,background:'transparent',border:0,borderRadius:8,cursor:'pointer' }} title="Cambiar estado"><IcoArrow/></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {listaTotalPages>1&&(
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'12px 18px',borderTop:`1px solid ${T.lineSoft}`,flexShrink:0 }}>
            <button disabled={listaPage===0} onClick={()=>loadListaPage(listaPage-1)} style={{ height:32,padding:'0 12px',fontSize:'.82rem',border:`1px solid ${T.line}`,borderRadius:8,cursor:'pointer',background:T.surface,color:T.text2,opacity:listaPage===0?0.5:1,fontFamily:'Inter,sans-serif' }}>← Anterior</button>
            <span style={{ fontSize:'.82rem',color:T.text3 }}>Pág {listaPage+1} de {listaTotalPages}</span>
            <button disabled={listaPage>=listaTotalPages-1} onClick={()=>loadListaPage(listaPage+1)} style={{ height:32,padding:'0 12px',fontSize:'.82rem',border:`1px solid ${T.line}`,borderRadius:8,cursor:'pointer',background:T.surface,color:T.text2,opacity:listaPage>=listaTotalPages-1?0.5:1,fontFamily:'Inter,sans-serif' }}>Siguiente →</button>
          </div>
        )}
      </div>
    );
  }

  // ── Detalle drawer ─────────────────────────────────────────────────────────
  function renderDetalle() {
    if(!detalleCita) return null;
    const c=detalleCita;
    const tipCfg=TIPO_CFG[c.tipo], estCfg=ESTADO_CFG[c.estado];
    const ecolor=ESPECIE_COLOR[normEspecie(c.mascotaEspecie)];
    const FLOW:EstadoCita[]=['PENDIENTE','CONFIRMADA','EN_ATENCION','ATENDIDA'];
    const FLOW_LABELS=['Pendiente','Confirmada','En atención','Atendida'];
    const currentStep=FLOW.indexOf(c.estado);
    const isCancelled=c.estado==='CANCELADA'||c.estado==='NO_ASISTIO';
    const [h1,m1]=c.fechaInicio.slice(11,16).split(':').map(Number);
    const [h2,m2]=c.fechaFin.slice(11,16).split(':').map(Number);
    const durMin=(h2*60+m2)-(h1*60+m1);
    const obs = (c as CitaResumenDTO & { observaciones?: string|null }).observaciones;

    return (
      <>
        <div onClick={()=>setDetalle(null)} style={{ position:'fixed',inset:0,zIndex:150,background:'rgba(0,0,0,.25)' }}/>
        <div style={{ position:'fixed',top:0,right:0,bottom:0,zIndex:151,width:'min(480px,100vw)',background:T.surface,borderLeft:`1px solid ${T.line}`,boxShadow:'-20px 0 60px -30px rgba(0,0,0,.6)',display:'flex',flexDirection:'column',fontFamily:'Inter,sans-serif',overflow:'hidden' }}>

          {/* Header del drawer */}
          <div style={{ padding:'20px 22px',borderBottom:`1px solid ${T.lineSoft}`,flexShrink:0 }}>
            {/* Badges + close */}
            <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
              <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px 3px 8px',borderRadius:20,fontSize:'.73rem',fontWeight:650,color:tipCfg.color,background:`color-mix(in oklab, ${tipCfg.color} 12%, white)`,whiteSpace:'nowrap' }}>
                <span style={{ width:6,height:6,borderRadius:2,background:tipCfg.color,flexShrink:0 }}/>{tipCfg.label}
              </span>
              <EstadoPill estado={c.estado}/>
              <button onClick={()=>setDetalle(null)} style={{ width:30,height:30,flexShrink:0,marginLeft:'auto',display:'grid',placeItems:'center',border:0,background:'transparent',borderRadius:8,cursor:'pointer',color:T.text3 }}><IcoX/></button>
            </div>
            {/* Mascota */}
            <div style={{ display:'flex',alignItems:'center',gap:14,marginTop:16 }}>
              <div style={{ width:52,height:52,borderRadius:15,background:`color-mix(in oklab, ${ecolor} 15%, white)`,display:'grid',placeItems:'center',color:ecolor,flexShrink:0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><ellipse cx="6" cy="7" rx="2.5" ry="3" opacity=".85"/><ellipse cx="18" cy="7" rx="2.5" ry="3" opacity=".85"/><ellipse cx="3" cy="13" rx="2" ry="2.5" opacity=".85"/><ellipse cx="21" cy="13" rx="2" ry="2.5" opacity=".85"/><path d="M12 10c-3 0-8 2.5-8 7 0 3 2.5 4.5 5 4.5h6c2.5 0 5-1.5 5-4.5 0-4.5-5-7-8-7z"/></svg>
              </div>
              <div style={{ minWidth:0 }}>
                <h2 style={{ fontSize:'1.25rem',fontWeight:700,letterSpacing:'-.02em',margin:0,color:T.text }}>{c.mascotaNombre??'—'}</h2>
                <div style={{ fontSize:'.82rem',color:T.text2,marginTop:3 }}>{normEspecie(c.mascotaEspecie)} · {c.clienteNombre??'—'}</div>
              </div>
            </div>
            {/* Date + time chips */}
            <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginTop:16 }}>
              <span style={{ display:'inline-flex',alignItems:'center',gap:7,height:32,padding:'0 11px',fontSize:'.82rem',fontWeight:600,background:T.surface,border:`1px solid ${T.line}`,borderRadius:9,textTransform:'capitalize' }}>
                <IcoCal/>{formatFechaLarga(c.fechaInicio)}
              </span>
              <span style={{ display:'inline-flex',alignItems:'center',gap:7,height:32,padding:'0 11px',fontFamily:"'IBM Plex Mono',monospace",fontSize:'.8rem',fontWeight:600,background:T.surface,border:`1px solid ${T.line}`,borderRadius:9 }}>
                <IcoClock/>{c.fechaInicio.slice(11,16)} – {c.fechaFin.slice(11,16)}<span style={{ fontFamily:'Inter,sans-serif',fontWeight:500,color:T.text3 }}> · {durMin} min</span>
              </span>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex:1,minHeight:0,overflowY:'auto',padding:'20px 22px',display:'flex',flexDirection:'column',gap:20 }}>

            {/* Progreso stepper */}
            {!isCancelled&&(
              <div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:'.68rem',fontWeight:600,letterSpacing:'.09em',textTransform:'uppercase',color:T.text3,marginBottom:12 }}>Progreso</div>
                <div style={{ display:'flex',alignItems:'flex-start' }}>
                  {FLOW.map((estado,idx)=>{
                    const isActive=idx<=currentStep, isLast=idx===FLOW.length-1;
                    const dot_color=ESTADO_CFG[estado].tone;
                    return (
                      <div key={estado} style={{ display:'flex',alignItems:'flex-start',flex:isLast?0:1 }}>
                        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:5 }}>
                          <div style={{ width:22,height:22,borderRadius:'50%',background:isActive?dot_color:T.line,border:`2px solid ${isActive?dot_color:T.line}`,display:'grid',placeItems:'center',flexShrink:0 }}>
                            {isActive&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>}
                          </div>
                          <span style={{ fontSize:'.63rem',color:isActive?dot_color:T.text3,fontWeight:idx===currentStep?700:400,textAlign:'center',whiteSpace:'nowrap' }}>{FLOW_LABELS[idx]}</span>
                        </div>
                        {!isLast&&<div style={{ flex:1,height:2,background:idx<currentStep?ESTADO_CFG[FLOW[idx+1]].tone:T.line,margin:'10px 4px 0' }}/>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {isCancelled&&(
              <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:10,background:estCfg.soft,border:`1px solid ${estCfg.tone}22` }}>
                <span style={{ width:8,height:8,borderRadius:'50%',background:estCfg.tone,flexShrink:0 }}/>
                <span style={{ fontSize:'.85rem',fontWeight:600,color:estCfg.tone }}>{estCfg.label}</span>
                <span style={{ fontSize:'.8rem',color:T.text3 }}>· {estCfg.desc}</span>
              </div>
            )}

            {/* Detalle */}
            <div style={{ marginTop:4 }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:'.68rem',fontWeight:600,letterSpacing:'.09em',textTransform:'uppercase',color:T.text3,marginBottom:10 }}>Detalle</div>
              <div style={{ display:'grid',gap:1,background:T.line,border:`1px solid ${T.line}`,borderRadius:12,overflow:'hidden' }}>
                {[
                  { ico:<IcoProf/>, label:'Profesional', val:c.profesionalNombre??'—' },
                  { ico:<IcoNote/>, label:'Motivo',       val:c.motivo||'—' },
                  { ico:<IcoMsg/>,  label:'Observaciones',val:obs||'—' },
                  { ico:<IcoPhone/>,label:'Contacto del cliente', val:c.clienteNombre??'—' },
                ].map(row=>(
                  <div key={row.label} style={{ display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',background:T.surface2 }}>
                    <div style={{ width:28,height:28,flexShrink:0,display:'grid',placeItems:'center',borderRadius:8,background:T.surface,color:T.text3 }}>{row.ico}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'.72rem',color:T.text3 }}>{row.label}</div>
                      <div style={{ fontSize:'.88rem',fontWeight:600,marginTop:2,lineHeight:1.45,color:T.text }}>{row.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historial mascota */}
            <div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:'.68rem',fontWeight:600,letterSpacing:'.09em',textTransform:'uppercase',color:T.text3,marginBottom:10 }}>Historial de la mascota</div>
              {historialMascota.length===0?(
                <div style={{ padding:12,textAlign:'center',fontSize:'.8rem',color:T.text3,border:`1px dashed ${T.line}`,borderRadius:10 }}>Primera cita de esta mascota.</div>
              ):(
                <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                  {historialMascota.map(h=>{
                    const tH=TIPO_CFG[h.tipo], eH=ESTADO_CFG[h.estado];
                    const dH=new Date(h.fechaInicio.slice(0,10).replace(/-/g,'/'));
                    const mH=MESES_ES[dH.getMonth()].slice(0,3).toLowerCase();
                    return (
                      <div key={h.id} onClick={()=>setDetalle(h)}
                        style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 12px',borderRadius:9,cursor:'pointer',border:`1px solid ${T.lineSoft}`,background:T.surface }}
                        onMouseEnter={e=>(e.currentTarget.style.background=T.surface2)}
                        onMouseLeave={e=>(e.currentTarget.style.background=T.surface)}>
                        <span style={{ width:8,height:8,borderRadius:'50%',background:tH.color,flexShrink:0 }}/>
                        <span style={{ fontSize:'.77rem',color:T.text3,fontFamily:"'IBM Plex Mono',monospace",minWidth:54 }}>{dH.getDate()} {mH}</span>
                        <span style={{ fontSize:'.82rem',color:T.text2,flex:1 }}>{tH.label}</span>
                        <span style={{ fontSize:'.72rem',fontWeight:600,color:eH.tone }}>{eH.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding:'16px 22px',borderTop:`1px solid ${T.lineSoft}`,display:'flex',gap:8,flexShrink:0 }}>
            {canEdit('CITAS')&&(
              <button onClick={()=>{setEditCita(c);setDetalle(null);setShowForm(true);}}
                style={{ flex:1,height:42,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:'Inter,sans-serif',fontSize:'.86rem',fontWeight:600,color:T.text2,background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,cursor:'pointer' }}>
                <IcoEdit/> Editar / reprogramar
              </button>
            )}
            {puedeCambiarEstado&&(
              <button onClick={()=>{setEstCita(c);setDetalle(null);}}
                style={{ flex:1,height:42,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:'Inter,sans-serif',fontSize:'.86rem',fontWeight:600,color:T.text2,background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,cursor:'pointer' }}>
                <IcoArrow/> Cambiar estado
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="citas-outer" style={{ display:'flex',flexDirection:'column',height:'100%',fontFamily:'Inter,sans-serif',overflow:'hidden' }}>

      {/* Page header */}
      <div style={{ paddingBottom:16,flexShrink:0,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:'1.875rem',fontWeight:700,margin:0,letterSpacing:'-.03em',lineHeight:1.2 }}>Citas y Agenda</h1>
          <div style={{ fontSize:'.875rem',color:T.text3,marginTop:4 }}>Agenda de la clínica · {sucursalActual?.nombre??'Sucursal'}</div>
        </div>
        <div style={{ display:'flex',gap:2,padding:3,background:T.surface2,borderRadius:10,border:`1px solid ${T.line}` }}>
          {([
            { vm:'dia'    as const, ico:<IcoDia/>,    label:'Día'    },
            { vm:'semana' as const, ico:<IcoSemana/>, label:'Semana' },
            { vm:'lista'  as const, ico:<IcoLista/>,  label:'Lista'  },
          ]).map(({vm,ico,label})=>(
            <button key={vm} onClick={()=>setViewMode(vm)}
              style={{ height:32,padding:'0 12px',fontFamily:'Inter,sans-serif',fontSize:'.82rem',fontWeight:600,borderRadius:8,border:0,cursor:'pointer',background:viewMode===vm?T.surface:'transparent',color:viewMode===vm?T.text:T.text3,boxShadow:viewMode===vm?'0 1px 3px rgba(0,0,0,.14), 0 0 0 1px var(--color-border,#e5e7eb)':'none',display:'flex',alignItems:'center',gap:5 }}>
              {ico}{label}
            </button>
          ))}
        </div>
        {puedeCrear&&(
          <button onClick={()=>{setEditCita(null);setPreFecha(undefined);setPreHora(undefined);setShowForm(true);}}
            className="page-action-btn"
            style={{ height:38,padding:'0 16px',display:'flex',alignItems:'center',gap:7,fontFamily:'Inter,sans-serif',fontSize:'.88rem',fontWeight:650,color:'#fff',background:T.primary,border:0,borderRadius:10,cursor:'pointer',boxShadow:`0 4px 14px -6px ${T.primary}` }}>
            <IcoPlus/> Nueva cita
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ paddingBottom:12, gap:10, flexShrink:0 }}>
        {([
          { label:'CITAS DE HOY', val:kpis.total,      sub:`sin cancelaciones`,                    valColor:T.text,                                    tileColor:T.primarySoft, icoColor:T.primary,  ico:<IcoCal/>          },
          { label:'POR ATENDER',  val:kpis.porAtender,  sub:`${kpis.confirmadas} confirmadas`,       valColor:T.text,                                    tileColor:T.surface2,    icoColor:T.text2,    ico:<IcoClock/>        },
          { label:'EN ATENCIÓN',  val:kpis.enAtencion,  sub:`ahora mismo`,                           valColor:kpis.enAtencion>0?T.warn:T.text,           tileColor:T.warnSoft,    icoColor:T.warn,     ico:<IcoStethoscope/>  },
          { label:'ATENDIDAS',    val:kpis.atendidas,   sub:`de ${kpis.total} · ${kpis.pct}%`,       valColor:T.ok,                                      tileColor:T.okSoft,      icoColor:T.ok,       ico:<IcoCheck/>        },
        ] as const).map(k=>(
          <div key={k.label} style={{ background:T.surface,border:`1px solid ${T.line}`,borderRadius:14,padding:'15px 16px',boxShadow:T.shadow,display:'flex',alignItems:'center',gap:13 }}>
            <div style={{ width:42,height:42,borderRadius:11,background:k.tileColor,display:'grid',placeItems:'center',color:k.icoColor,flexShrink:0 }}>{k.ico}</div>
            <div>
              <div style={{ fontSize:'.67rem',fontWeight:700,color:T.text3,fontFamily:"'IBM Plex Mono',monospace",textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4 }}>{k.label}</div>
              <div style={{ display:'flex',alignItems:'baseline',gap:8 }}>
                <span style={{ fontSize:'1.6rem',fontWeight:700,color:k.valColor,fontVariantNumeric:'tabular-nums',lineHeight:1.1 }}>{k.val}</span>
                <span style={{ fontSize:'.76rem',color:T.text3 }}>{k.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="citas-grid" style={{ flex:1,minHeight:0,paddingBottom:4,overflow:'hidden' }}>
        {renderSidebar()}
        <div className="citas-calendar-wrap" style={{ flex:1,minWidth:0,background:T.surface,border:`1px solid ${T.line}`,borderRadius:14,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:T.shadow,position:'relative' }}>
          {loading&&<div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:T.primary,zIndex:5 }}/>}
          {renderPanelHeader()}
          {viewMode==='semana'&&(
            <WeekView citas={citasFiltradas} semanaBase={semanaBase} diaActual={diaActual}
              onDiaClick={handleDiaClick} onEventClick={handleEventClick} onSlotClick={handleSlotClick}
              visibleProfIds={visibleProfIds} profesionales={profesionales}/>
          )}
          {viewMode==='dia'&&(
            <DayView citas={citasFiltradas} dia={diaActual} profesionales={profesionales}
              visibleProfIds={visibleProfIds} onEventClick={handleEventClick} onSlotClick={handleSlotClick}/>
          )}
          {viewMode==='lista'&&renderLista()}
        </div>
      </div>

      {renderDetalle()}

      {showForm&&(
        <CitaFormModal citaInicial={editCita} sucursalActivaId={sucursalActivaId}
          preloadFecha={preloadFecha} preloadHora={preloadHora} preloadProfId={preloadProf}
          onClose={()=>{setShowForm(false);setEditCita(null);setPreFecha(undefined);setPreHora(undefined);setPreProf(undefined);}}
          onSaved={handleSaved}/>
      )}
      {estadoCita&&(
        <CambiarEstadoModal cita={estadoCita} puedeCancelar={puedeCancelar}
          puedeTransicionClinica={puedeTransicionClinica}
          onClose={()=>setEstCita(null)} onSaved={handleSaved}/>
      )}
    </div>
  );
}
