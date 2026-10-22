import { useCallback, useEffect, useState } from 'react';
import { citaService, type CitaResumenDTO, type EstadoCita, type ListarCitasParams } from '../../services/cita.service';
import { notify } from '../../lib/notify';
import { usePermissions } from '../../hooks/usePermissions';
import { useSucursalStore } from '../../store/sucursalStore';
import { CitaFormModal } from './components/CitaFormModal';
import { CambiarEstadoModal } from './components/CambiarEstadoModal';

// ── Palette (CSS vars, dark-mode compatible) ──────────────────────────────────
const T = {
  bg:          'var(--color-bg, #f5f5f7)',
  surface:     'var(--color-surface, #ffffff)',
  surface2:    'var(--color-surface-2, #f3f4f6)',
  surface3:    'var(--color-surface-3, #f9fafb)',
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
  badSoft:     'var(--color-bad-soft, #fee2e2)',
  shadow:      '0 1px 3px rgba(0,0,0,.07)',
} as const;

// ── Badges de estado ──────────────────────────────────────────────────────────
const ESTADO_BADGE_STYLE: Record<EstadoCita, { label: string; color: string; bg: string }> = {
  PENDIENTE:   { label: 'Pendiente',   color: T.text3,   bg: T.surface2 },
  CONFIRMADA:  { label: 'Confirmada',  color: T.primary,  bg: T.primarySoft },
  EN_ATENCION: { label: 'En atención', color: T.warn,     bg: T.warnSoft },
  ATENDIDA:    { label: 'Atendida',    color: T.ok,       bg: T.okSoft },
  CANCELADA:   { label: 'Cancelada',   color: T.bad,      bg: T.badSoft },
  NO_ASISTIO:  { label: 'No asistió',  color: '#c2410c',  bg: '#ffedd5' },
};

const TIPO_LABEL: Record<string, string> = {
  CONSULTA:        'Consulta',
  VACUNACION:      'Vacunación',
  DESPARASITACION: 'Desparasitación',
  CONTROL:         'Control',
  PELUQUERIA:      'Peluquería',
  OTRO:            'Otro',
};

type ViewMode = 'lista' | 'dia' | 'semana';

// ── Helpers de fecha ──────────────────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0');
// Extrae fecha/hora local sin conversión UTC (backend usa LocalDateTime sin zona horaria)
function toLocalDT(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function startOfDay(d: Date) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d: Date)   { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }
function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const r = new Date(s);
  r.setDate(r.getDate() + 6);
  r.setHours(23, 59, 59, 999);
  return r;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function formatHora(iso: string) { return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }); }
function formatFechaCorta(d: Date) { return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }); }
function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Iconos SVG inline ─────────────────────────────────────────────────────────
const IcoPlus = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoSearch = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IcoX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const IcoRefresh = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>;
const IcoList = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
const IcoCalendar = ({ size = 14 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const IcoChevLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IcoChevRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

// ── EstadoBadge ───────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: EstadoCita }) {
  const cfg = ESTADO_BADGE_STYLE[estado] ?? { label: estado, color: T.text3, bg: T.surface2 };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' as const }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ── CitaCardCompacta ──────────────────────────────────────────────────────────
function CitaCardCompacta({
  cita,
  onEditar,
  onCambiarEstado,
  puedeCambiarEstado,
}: {
  cita: CitaResumenDTO;
  onEditar: (c: CitaResumenDTO) => void;
  onCambiarEstado: (c: CitaResumenDTO) => void;
  puedeCambiarEstado: boolean;
}) {
  return (
    <div
      onClick={() => onEditar(cita)}
      style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: '8px 12px', fontSize: '.78rem', cursor: 'pointer', transition: 'background .14s', fontFamily: 'Inter,sans-serif' }}
      onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
      onMouseLeave={e => (e.currentTarget.style.background = T.surface)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 650, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatHora(cita.fechaInicio)} – {formatHora(cita.fechaFin)}
          </p>
          <p style={{ margin: '2px 0 0', color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cita.mascotaNombre} · {cita.clienteNombre ?? '—'}
          </p>
          {cita.profesionalNombre && (
            <p style={{ margin: '1px 0 0', color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cita.profesionalNombre}
            </p>
          )}
          <p style={{ margin: '2px 0 0', color: T.text2 }}>{TIPO_LABEL[cita.tipo] ?? cita.tipo}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <EstadoBadge estado={cita.estado} />
          {puedeCambiarEstado && cita.estado !== 'ATENDIDA' && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onCambiarEstado(cita); }}
              style={{ fontSize: '.68rem', padding: '2px 7px', borderRadius: 6, border: `1px solid ${T.line}`, background: 'transparent', cursor: 'pointer', color: T.text3, fontFamily: 'Inter,sans-serif' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Estado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export function CitasPage() {
  const { puede, isAdmin, isVeterinario, isGroomer } = usePermissions();
  const { sucursalActual } = useSucursalStore();

  const puedeCrear             = isAdmin || puede('CREAR_CITA');
  const puedeCambiarEstado     = isAdmin || puede('CAMBIAR_ESTADO_CITA');
  const puedeCancelar          = isAdmin || puede('CANCELAR_CITA');
  // Solo ADMIN y VETERINARIO pueden marcar EN_ATENCION / ATENDIDA
  const puedeTransicionClinica = isAdmin || isVeterinario;

  // ── Vista ──────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode]     = useState<ViewMode>('lista');
  const [diaActual, setDiaActual]   = useState(() => startOfDay(new Date()));
  const [semanaBase, setSemanaBase] = useState(() => startOfWeek(new Date()));

  // ── Estado lista ──────────────────────────────────────────────────────────
  const [citas, setCitas]           = useState<CitaResumenDTO[]>([]);
  const [loading, setLoading]       = useState(false);
  const [totalElements, setTotal]   = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage]             = useState(0);
  const pageSize                    = 15;

  // Filtros
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCita | ''>('');
  const [fechaDesde, setFechaDesde]     = useState('');
  const [fechaHasta, setFechaHasta]     = useState('');
  const [q, setQ]                       = useState('');
  const [qInput, setQInput]             = useState('');

  // Modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [editCita, setEditCita]           = useState<CitaResumenDTO | null>(null);
  const [estadoCita, setEstadoCita]       = useState<CitaResumenDTO | null>(null);

  // ── Carga ─────────────────────────────────────────────────────────────────
  const loadLista = useCallback(async () => {
    setLoading(true);
    setCitas([]); // limpiar antes de cargar para no mostrar citas de la sucursal anterior
    try {
      const params: ListarCitasParams = { page, size: pageSize, q: q || undefined };
      if (estadoFiltro) params.estado = estadoFiltro;
      // Filtros de fecha: enviar hora local sin conversión UTC (backend LocalDateTime)
      if (fechaDesde) params.fechaInicio = fechaDesde + 'T00:00:00';
      if (fechaHasta) params.fechaFin    = fechaHasta + 'T23:59:59';
      // Sucursal activa como fuente de verdad del contexto de trabajo
      if (sucursalActual?.id) params.sucursalId = sucursalActual.id;
      const resp = await citaService.getAll(params);
      setCitas(resp.content);
      setTotal(resp.totalElements);
      setTotalPages(resp.totalPages);
    } catch (err) {
      notify.fromError(err, 'Error al cargar las citas');
    } finally {
      setLoading(false);
    }
  }, [page, estadoFiltro, fechaDesde, fechaHasta, q, sucursalActual]);

  const loadDia = useCallback(async () => {
    setLoading(true);
    setCitas([]);
    try {
      const params: ListarCitasParams = {
        page: 0, size: 100,
        fechaInicio: toLocalDT(startOfDay(diaActual)),
        fechaFin:    toLocalDT(endOfDay(diaActual)),
      };
      if (sucursalActual?.id) params.sucursalId = sucursalActual.id;
      const resp = await citaService.getAll(params);
      setCitas(resp.content);
      setTotal(resp.totalElements);
    } catch (err) {
      notify.fromError(err, 'Error al cargar las citas del día');
    } finally {
      setLoading(false);
    }
  }, [diaActual, sucursalActual]);

  const loadSemana = useCallback(async () => {
    setLoading(true);
    setCitas([]);
    try {
      const params: ListarCitasParams = {
        page: 0, size: 200,
        fechaInicio: toLocalDT(semanaBase),
        fechaFin:    toLocalDT(endOfWeek(semanaBase)),
      };
      if (sucursalActual?.id) params.sucursalId = sucursalActual.id;
      const resp = await citaService.getAll(params);
      setCitas(resp.content);
      setTotal(resp.totalElements);
    } catch (err) {
      notify.fromError(err, 'Error al cargar la agenda semanal');
    } finally {
      setLoading(false);
    }
  }, [semanaBase, sucursalActual]);

  useEffect(() => {
    if (viewMode === 'lista')        loadLista();
    else if (viewMode === 'dia')     loadDia();
    else if (viewMode === 'semana')  loadSemana();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, loadLista, loadDia, loadSemana]);

  // Al cambiar de sucursal: resetear paginación para evitar página fuera de rango
  useEffect(() => {
    setPage(0);
  }, [sucursalActual]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function load() {
    if (viewMode === 'lista')        loadLista();
    else if (viewMode === 'dia')     loadDia();
    else if (viewMode === 'semana')  loadSemana();
  }

  function handleBuscar() { setQ(qInput); setPage(0); }
  function handleLimpiarFiltros() {
    setEstadoFiltro(''); setFechaDesde(''); setFechaHasta('');
    setQ(''); setQInput(''); setPage(0);
  }
  function handleNuevaCita() { setEditCita(null); setShowFormModal(true); }
  function handleEditarCita(cita: CitaResumenDTO) { setEditCita(cita); setShowFormModal(true); }
  function handleCambiarEstado(cita: CitaResumenDTO) { setEstadoCita(cita); }

  // ── Seg helper ────────────────────────────────────────────────────────────
  const seg = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 34,
    padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 600,
    border: 0, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' as const,
    color: on ? T.text : T.text3,
    background: on ? T.surface : 'transparent',
    boxShadow: on ? `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` : undefined,
  });

  // ── Vista Día ─────────────────────────────────────────────────────────────
  function renderDia() {
    const citasOrdenadas = [...citas].sort((a, b) =>
      new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
    );
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
          <button type="button" onClick={() => setDiaActual(d => addDays(d, -1))}
            style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: `1px solid ${T.line}`, borderRadius: 8, background: T.surface, cursor: 'pointer', color: T.text2 }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
            <IcoChevLeft />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 650, margin: 0, fontSize: '.9rem', textTransform: 'capitalize' }}>
              {diaActual.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p style={{ fontSize: '.78rem', color: T.text3, margin: '2px 0 0' }}>
              {citas.length} cita{citas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button type="button" onClick={() => setDiaActual(d => addDays(d, 1))}
            style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: `1px solid ${T.line}`, borderRadius: 8, background: T.surface, cursor: 'pointer', color: T.text2 }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
            <IcoChevRight />
          </button>
        </div>
        {/* Contenido */}
        <div style={{ padding: 18 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: T.text3, fontSize: '.875rem', padding: '32px 0', margin: 0 }}>Cargando...</p>
          ) : citasOrdenadas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
                <IcoCalendar size={24} />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14, color: T.text }}>Sin citas para este día</div>
              <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 320 }}>
                No hay citas programadas para esta fecha.
              </p>
              {puedeCrear && (
                <button type="button" onClick={handleNuevaCita}
                  style={{ height: 38, marginTop: 14, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                  Registrar cita
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {citasOrdenadas.map(cita => (
                <CitaCardCompacta
                  key={cita.id}
                  cita={cita}
                  onEditar={handleEditarCita}
                  onCambiarEstado={handleCambiarEstado}
                  puedeCambiarEstado={puedeCambiarEstado}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista Semana ──────────────────────────────────────────────────────────
  function renderSemana() {
    const dias = Array.from({ length: 7 }, (_, i) => addDays(semanaBase, i));
    function citasDel(dia: Date) {
      const dStr = toLocalDateStr(dia);
      return citas
        .filter(c => c.fechaInicio.slice(0, 10) === dStr)
        .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
    }
    const semanaFin = endOfWeek(semanaBase);
    return (
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
          <button type="button" onClick={() => setSemanaBase(d => addDays(d, -7))}
            style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: `1px solid ${T.line}`, borderRadius: 8, background: T.surface, cursor: 'pointer', color: T.text2 }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
            <IcoChevLeft />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 650, margin: 0, fontSize: '.9rem' }}>
              {semanaBase.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
              {' – '}
              {semanaFin.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p style={{ fontSize: '.78rem', color: T.text3, margin: '2px 0 0' }}>
              {citas.length} cita{citas.length !== 1 ? 's' : ''} esta semana
            </p>
          </div>
          <button type="button" onClick={() => setSemanaBase(d => addDays(d, 7))}
            style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: `1px solid ${T.line}`, borderRadius: 8, background: T.surface, cursor: 'pointer', color: T.text2 }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
            <IcoChevRight />
          </button>
        </div>
        {/* Contenido */}
        {loading ? (
          <p style={{ textAlign: 'center', color: T.text3, fontSize: '.875rem', padding: '32px 0', margin: 0 }}>Cargando...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: 8, padding: 16, minWidth: 840 }}>
              {dias.map(dia => {
                const cc = citasDel(dia);
                const esHoy = toLocalDateStr(dia) === toLocalDateStr(new Date());
                return (
                  <div key={dia.toISOString()} style={{ borderRadius: 10, border: `1px solid ${esHoy ? T.primaryLine : T.line}`, background: esHoy ? T.primarySoft : T.surface3, padding: 8 }}>
                    <p style={{ fontSize: '.72rem', fontWeight: 650, margin: '0 0 6px', textTransform: 'capitalize' as const, color: esHoy ? T.primary : T.text3 }}>
                      {formatFechaCorta(dia)}
                    </p>
                    {cc.length === 0 ? (
                      <p style={{ fontSize: '.7rem', color: T.text3, fontStyle: 'italic', margin: 0 }}>Sin citas</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {cc.map(cita => (
                          <CitaCardCompacta
                            key={cita.id}
                            cita={cita}
                            onEditar={handleEditarCita}
                            onCambiarEstado={handleCambiarEstado}
                            puedeCambiarEstado={puedeCambiarEstado}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Citas y Agenda</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>
            {totalElements} cita{totalElements !== 1 ? 's' : ''} encontrada{totalElements !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Selector de vista */}
          <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10 }}>
            {(['lista', 'dia', 'semana'] as ViewMode[]).map(v => (
              <button key={v} type="button" onClick={() => setViewMode(v)} style={seg(viewMode === v)}>
                {v === 'lista' ? <IcoList /> : <IcoCalendar />}
                {v === 'lista' ? 'Lista' : v === 'dia' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>
          {/* Actualizar */}
          <button type="button" onClick={load} disabled={loading} title="Actualizar"
            style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', color: T.text3, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = T.surface2; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.surface; }}>
            <IcoRefresh />
          </button>
          {/* Nueva cita */}
          {puedeCrear && (
            <button type="button" onClick={handleNuevaCita}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}`, fontFamily: 'Inter,sans-serif' }}>
              <IcoPlus /> Nueva cita
            </button>
          )}
        </div>
      </div>

      {/* ── Vista Lista ─────────────────────────────────────────────── */}
      {viewMode === 'lista' && (
        <>
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
            {/* Filtros */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
              {/* Búsqueda */}
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}>
                  <IcoSearch />
                </span>
                <input
                  type="text"
                  value={qInput}
                  onChange={e => setQInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                  placeholder="Buscar por motivo u observaciones…"
                  style={{ width: '100%', height: 40, padding: '0 88px 0 38px', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none', fontFamily: 'Inter,sans-serif' }}
                  onFocus={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                  onBlur={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                {qInput && (
                  <button type="button" onClick={() => { setQInput(''); setQ(''); setPage(0); }}
                    style={{ position: 'absolute', right: 50, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: T.text3, display: 'grid', padding: 4 }}>
                    <IcoX />
                  </button>
                )}
                <button type="button" onClick={handleBuscar}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', height: 28, padding: '0 8px', fontSize: '.75rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                  Buscar
                </button>
              </div>

              {/* Estado */}
              <select
                value={estadoFiltro}
                onChange={e => { setEstadoFiltro(e.target.value as EstadoCita | ''); setPage(0); }}
                style={{ height: 40, padding: '0 12px', fontSize: '.855rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
              >
                <option value="">Todos los estados</option>
                {(Object.keys(ESTADO_BADGE_STYLE) as EstadoCita[]).map(v => (
                  <option key={v} value={v}>{ESTADO_BADGE_STYLE[v].label}</option>
                ))}
              </select>

              {/* Fecha desde */}
              <input
                type="date"
                value={fechaDesde}
                onChange={e => { setFechaDesde(e.target.value); setPage(0); }}
                title="Fecha desde"
                style={{ height: 40, padding: '0 12px', fontSize: '.855rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', fontFamily: 'Inter,sans-serif' }}
              />
              {/* Fecha hasta */}
              <input
                type="date"
                value={fechaHasta}
                onChange={e => { setFechaHasta(e.target.value); setPage(0); }}
                title="Fecha hasta"
                style={{ height: 40, padding: '0 12px', fontSize: '.855rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', fontFamily: 'Inter,sans-serif' }}
              />

              {(estadoFiltro || fechaDesde || fechaHasta || q) && (
                <button type="button" onClick={handleLimpiarFiltros}
                  style={{ height: 40, padding: '0 14px', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IcoX /> Limpiar filtros
                </button>
              )}
            </div>

            {/* Tabla / vacío / loading */}
            {loading ? (
              <div style={{ padding: '56px 24px', textAlign: 'center', color: T.text3, fontSize: '.9rem' }}>
                Cargando citas...
              </div>
            ) : citas.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
                  <IcoCalendar size={24} />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14 }}>
                  {(isVeterinario || isGroomer) ? 'No tienes citas asignadas' : 'Ninguna cita coincide con los filtros'}
                </div>
                <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 380 }}>
                  {(isVeterinario || isGroomer)
                    ? 'No tienes citas asignadas para este período.'
                    : 'Ajusta los filtros o registra la primera cita del día.'}
                </p>
                {puedeCrear && (
                  <button type="button" onClick={handleNuevaCita}
                    style={{ height: 38, marginTop: 16, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                    Registrar cita
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem', minWidth: 820 }}>
                  <thead>
                    <tr style={{ background: T.surface3 }}>
                      {['Fecha / hora', 'Cliente / Mascota', 'Tipo', 'Profesional', 'Estado', 'Acciones'].map((h, i) => (
                        <th key={h} style={{ textAlign: i === 5 ? 'right' : 'left', padding: i === 0 || i === 5 ? '10px 18px' : '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {citas.map(cita => (
                      <tr key={cita.id}
                        onClick={() => handleEditarCita(cita)}
                        style={{ borderTop: `1px solid ${T.lineSoft}`, cursor: 'pointer', transition: 'background .14s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '11px 18px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600 }}>{formatFecha(cita.fechaInicio)}</div>
                          <div style={{ fontSize: '.75rem', color: T.text3, marginTop: 2 }}>hasta {formatFecha(cita.fechaFin)}</div>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{cita.clienteNombre ?? '—'}</div>
                          <div style={{ fontSize: '.75rem', color: T.text3, marginTop: 2 }}>{cita.mascotaNombre} · {cita.mascotaEspecie}</div>
                        </td>
                        <td style={{ padding: '11px 14px', color: T.text2 }}>{TIPO_LABEL[cita.tipo] ?? cita.tipo}</td>
                        <td style={{ padding: '11px 14px', color: T.text3 }}>{cita.profesionalNombre ?? '—'}</td>
                        <td style={{ padding: '11px 14px' }}><EstadoBadge estado={cita.estado} /></td>
                        <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                            {puedeCambiarEstado && cita.estado !== 'ATENDIDA' && (
                              <button type="button" onClick={() => handleCambiarEstado(cita)}
                                style={{ height: 28, padding: '0 10px', fontSize: '.78rem', fontWeight: 600, color: T.text3, background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 7, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
                                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                Estado
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && !loading && citas.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', borderTop: `1px solid ${T.lineSoft}` }}>
                <span style={{ fontSize: '.8rem', color: T.text3 }}>
                  Página {page + 1} de {totalPages} · {totalElements} resultado{totalElements !== 1 ? 's' : ''}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <button type="button" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                    style={{ minWidth: 32, height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.81rem', fontWeight: 600, borderRadius: 8, cursor: page === 0 ? 'not-allowed' : 'pointer', color: T.text2, background: T.surface, border: `1px solid ${T.line}`, opacity: page === 0 ? .5 : 1 }}>
                    Anterior
                  </button>
                  <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    style={{ minWidth: 32, height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.81rem', fontWeight: 600, borderRadius: 8, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', color: T.text2, background: T.surface, border: `1px solid ${T.line}`, opacity: page >= totalPages - 1 ? .5 : 1 }}>
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Vistas Día y Semana ─────────────────────────────────────── */}
      {viewMode === 'dia'    && renderDia()}
      {viewMode === 'semana' && renderSemana()}

      {/* ── Modales ─────────────────────────────────────────────────── */}
      {showFormModal && (
        <CitaFormModal
          citaInicial={editCita}
          sucursalActivaId={sucursalActual?.id ?? null}
          onClose={() => setShowFormModal(false)}
          onSaved={() => { setShowFormModal(false); load(); }}
        />
      )}

      {estadoCita && (
        <CambiarEstadoModal
          cita={estadoCita}
          puedeCancelar={puedeCancelar}
          puedeTransicionClinica={puedeTransicionClinica}
          onClose={() => setEstadoCita(null)}
          onSaved={() => { setEstadoCita(null); load(); }}
        />
      )}
    </div>
  );
}
