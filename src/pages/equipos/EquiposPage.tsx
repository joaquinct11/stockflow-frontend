import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { notify } from '../../lib/notify';
import { equipoService, type EquipoResumenDTO, type EquipoPageResponseDTO } from '../../services/equipo.service';
import { clienteService, type ClienteDTO } from '../../services/cliente.service';

// ── Design tokens (mismo sistema que ClientesList / Clientes) ─────────────────

const T = {
  bg: '#f7f8fa', surface: '#ffffff', surface2: '#f1f3f7', surface3: '#fafbfc',
  line: '#e4e7ec', lineSoft: '#eef0f4',
  text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
  primary: '#3b47ef', primarySoft: '#eef0ff', primaryLine: '#cfd4fd',
  ok: '#0f9d6e', okSoft: '#e7f7f1',
  warn: '#b7791f', warnSoft: '#fdf6e7',
  bad: '#d63b3b', badSoft: '#fdeceb',
  shadow: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
} as const;

// ── SVG icons inline (mismo estilo que ClientesList) ──────────────────────────

const IcoSearch     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
const IcoPlus       = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
const IcoX          = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IcoEdit       = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
const IcoDeactivate = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>;
const IcoActivate   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>;
const IcoMonitor    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>;
const IcoMonitorLg  = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>;

// ── Tipos ─────────────────────────────────────────────────────────────────────

type EstadoFiltro = 'ACTIVOS' | 'INACTIVOS' | 'TODOS';

interface FormState {
  clienteId: number | '';
  nombre: string;
  tipo: string;
  ubicacion: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  observaciones: string;
  intento: boolean;
}

const FORM_VACIO: FormState = {
  clienteId: '', nombre: '', tipo: '', ubicacion: '',
  marca: '', modelo: '', numeroSerie: '', observaciones: '', intento: false,
};

// ── Sub-componentes ────────────────────────────────────────────────────────────

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3 }}>
      {children}
    </div>
  );
}

function PagBtn({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif',
        fontSize: '.81rem', fontWeight: 600, borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        ...(active
          ? { color: '#fff', background: T.primary, border: `1px solid ${T.primary}` }
          : disabled
            ? { color: T.text3, background: 'transparent', border: `1px solid ${T.line}`, opacity: .5 }
            : { color: T.text2, background: T.surface, border: `1px solid ${T.line}` }),
      }}>
      {children}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeSerial(s: string | undefined | null): string | null {
  if (!s || s.trim() === '') return null;
  return s.trim();
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function EquiposPage() {
  const { isAdmin, puede } = usePermissions();
  const puedeCrear   = isAdmin || puede('CREAR_EQUIPO');
  const puedeEditar  = isAdmin || puede('EDITAR_EQUIPO');
  const puedeCambiar = isAdmin || puede('CAMBIAR_ESTADO_EQUIPO');

  // Datos
  const [data, setData]         = useState<EquipoPageResponseDTO | null>(null);
  const [loading, setLoading]   = useState(false);
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);

  // Filtros
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [estado, setEstado]           = useState<EstadoFiltro>('ACTIVOS');
  const [clienteId, setClienteId]     = useState<number | null>(null);
  const [page, setPage]               = useState(0);

  // Modales
  const [modalOpen, setModalOpen]         = useState(false);
  const [editTarget, setEditTarget]       = useState<EquipoResumenDTO | null>(null);
  const [confirmId, setConfirmId]         = useState<number | null>(null);
  const [confirmActivo, setConfirmActivo] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [form, setForm]                   = useState<FormState>(FORM_VACIO);

  // Debounce de búsqueda
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(0); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => { setPage(0); }, [estado, clienteId]);

  useEffect(() => {
    clienteService.getActivos()
      .then(setClientes)
      .catch(err => notify.fromError(err, 'No se pudieron cargar los clientes'));
  }, []);

  const fetchEquipos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await equipoService.listar({ page, size: 15, estado, search, clienteId });
      setData(result);
    } catch (err) {
      notify.fromError(err, 'No se pudieron cargar los equipos');
    } finally {
      setLoading(false);
    }
  }, [page, estado, search, clienteId]);

  useEffect(() => { fetchEquipos(); }, [fetchEquipos]);

  // ── Handlers de modal ──────────────────────────────────────────────────────

  function abrirCrear() { setEditTarget(null); setForm(FORM_VACIO); setModalOpen(true); }

  function abrirEditar(eq: EquipoResumenDTO) {
    setEditTarget(eq);
    setForm({ clienteId: eq.clienteId, nombre: eq.nombre, tipo: eq.tipo ?? '', ubicacion: eq.ubicacion ?? '', marca: eq.marca ?? '', modelo: eq.modelo ?? '', numeroSerie: eq.numeroSerie ?? '', observaciones: '', intento: false });
    setModalOpen(true);
  }

  function cerrarModal() { setModalOpen(false); setEditTarget(null); setForm(FORM_VACIO); }

  async function handleGuardar() {
    setForm(f => ({ ...f, intento: true }));
    if (!form.nombre.trim()) return;
    if (!editTarget && !form.clienteId) return;
    setSaving(true);
    try {
      const payload = {
        nombre:       form.nombre.trim(),
        tipo:         form.tipo.trim()        || undefined,
        ubicacion:    form.ubicacion.trim()   || undefined,
        marca:        form.marca.trim()       || undefined,
        modelo:       form.modelo.trim()      || undefined,
        numeroSerie:  normalizeSerial(form.numeroSerie) ?? undefined,
        observaciones: form.observaciones.trim() || undefined,
      };
      if (editTarget) {
        await equipoService.update(editTarget.id, payload);
        toast.success('Equipo actualizado correctamente');
      } else {
        await equipoService.create({ ...payload, nombre: payload.nombre, clienteId: form.clienteId as number });
        toast.success('Equipo registrado correctamente');
      }
      cerrarModal();
      fetchEquipos();
    } catch (err) {
      notify.fromError(err, 'No se pudo guardar el equipo');
    } finally {
      setSaving(false);
    }
  }

  // ── Cambio de estado ───────────────────────────────────────────────────────

  function pedirConfirmacion(eq: EquipoResumenDTO) { setConfirmId(eq.id); setConfirmActivo(eq.activo); }

  async function confirmarCambioEstado() {
    if (confirmId == null) return;
    setSaving(true);
    try {
      if (confirmActivo) { await equipoService.deactivate(confirmId); toast.success('Equipo desactivado'); }
      else               { await equipoService.activate(confirmId);   toast.success('Equipo reactivado');  }
      setConfirmId(null);
      fetchEquipos();
    } catch (err) {
      notify.fromError(err, 'No se pudo cambiar el estado del equipo');
    } finally {
      setSaving(false);
    }
  }

  // ── Datos derivados ────────────────────────────────────────────────────────

  const resumen            = data?.resumen;
  const clientesConEquipos = data?.clientesConEquipos ?? 0;
  const items              = data?.content ?? [];
  const totalPages         = data?.totalPages ?? 1;
  const estadoCounts       = { TODOS: resumen?.total ?? 0, ACTIVOS: resumen?.activos ?? 0, INACTIVOS: resumen?.inactivos ?? 0 };

  const pageRange = (() => {
    const delta = 2;
    const start = Math.max(0, page - delta);
    const end   = Math.min(totalPages - 1, page + delta);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  const clienteNombre = (id: number | null) => clientes.find(c => c.id === id)?.nombre ?? '';

  // ── Input helpers ──────────────────────────────────────────────────────────

  const inputBase: React.CSSProperties = {
    width: '100%', height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem',
    color: T.text, background: T.surface, border: `1px solid ${T.line}`,
    borderRadius: 10, outline: 'none', padding: '0 13px', boxSizing: 'border-box',
  };

  const focusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = T.primary;
    e.currentTarget.style.boxShadow   = `0 0 0 3px ${T.primarySoft}`;
  };
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = T.line;
    e.currentTarget.style.boxShadow   = 'none';
  };

  const seg = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 34,
    padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 600,
    border: 0, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' as const,
    color: on ? T.text : T.text3,
    background: on ? T.surface : 'transparent',
    boxShadow: on ? `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` : undefined,
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            Equipos de clientes
          </h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>
            Equipos, activos e instalaciones registrados por cliente
          </p>
        </div>
        {puedeCrear && (
          <button type="button" onClick={abrirCrear} className="page-action-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}` }}>
            <IcoPlus /> Nuevo equipo
          </button>
        )}
      </div>

      {/* KPI cards */}
      {resumen && (
        <div className="kpi-grid">
          {([
            { label: 'Total equipos',        value: resumen.total,       sub: 'Registrados',           color: T.text },
            { label: 'Activos',              value: resumen.activos,     sub: 'En servicio',            color: T.ok   },
            { label: 'Inactivos',            value: resumen.inactivos,   sub: 'Fuera de servicio',      color: resumen.inactivos ? T.bad : T.text },
            { label: 'Clientes con equipos', value: clientesConEquipos,  sub: 'Con al menos 1 equipo',  color: T.text },
          ] as const).map(({ label, value, sub, color }) => (
            <div key={label} style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
              <MonoLabel>{label}</MonoLabel>
              <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color }}>{value}</div>
              <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main card */}
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>

        {/* Filter bar */}
        <div className="filter-bar" style={{ padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 0 }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}>
              <IcoSearch />
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre, marca, modelo o N° serie…"
              style={{ width: '100%', height: 40, padding: '0 13px 0 38px', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none', fontFamily: 'Inter,sans-serif' }}
              onFocus={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
              onBlur={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Estado segmented control */}
          <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0, overflowX: 'auto' }}>
            {(['ACTIVOS', 'INACTIVOS', 'TODOS'] as EstadoFiltro[]).map(k => (
              <button key={k} type="button" onClick={() => { setEstado(k); setPage(0); }} style={seg(estado === k)}>
                {k === 'ACTIVOS' ? 'Activos' : k === 'INACTIVOS' ? 'Inactivos' : 'Todos'}
                <span style={{ fontSize: '.7rem', fontWeight: 700, color: T.text3 }}>{estadoCounts[k]}</span>
              </button>
            ))}
          </div>

          {/* Cliente dropdown */}
          <select
            value={clienteId ?? ''}
            onChange={e => { setClienteId(e.target.value ? Number(e.target.value) : null); setPage(0); }}
            style={{ height: 40, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, cursor: 'pointer', minWidth: 160 }}
            onFocus={focusIn}
            onBlur={focusOut}
          >
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', color: T.text3, fontSize: '.875rem' }}>
            Cargando equipos…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
              <IcoMonitorLg />
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14 }}>Sin equipos registrados</div>
            <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 360 }}>
              {searchInput || clienteId
                ? 'No hay equipos que coincidan con los filtros aplicados.'
                : 'Registra el primer equipo con el botón "Nuevo equipo".'}
            </p>
            {(searchInput || clienteId) && (
              <button type="button" onClick={() => { setSearchInput(''); setClienteId(null); setEstado('ACTIVOS'); }}
                style={{ height: 38, marginTop: 16, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem', minWidth: 860 }}>
                <thead>
                  <tr style={{ background: T.surface3 }}>
                    {['Equipo', 'Cliente', 'Marca / Modelo', 'N° Serie', 'Ubicación', 'Estado', 'Acciones'].map((h, i) => (
                      <th key={h} style={{
                        textAlign: i === 6 ? 'right' : 'left',
                        padding: i === 0 || i === 6 ? '10px 18px' : '10px 14px',
                        fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em',
                        textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(eq => (
                    <tr key={eq.id}
                      style={{ borderTop: `1px solid ${T.lineSoft}`, transition: 'background .14s', opacity: eq.activo ? 1 : .78 }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '11px 18px' }}>
                        <div style={{ fontWeight: 600, color: T.text }}>{eq.nombre}</div>
                        {eq.tipo && <div style={{ fontSize: '.75rem', color: T.text3, marginTop: 2 }}>{eq.tipo}</div>}
                      </td>
                      <td style={{ padding: '11px 14px', color: T.text2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {eq.clienteNombre}
                      </td>
                      <td style={{ padding: '11px 14px', color: T.text2 }}>
                        {[eq.marca, eq.modelo].filter(Boolean).join(' · ') || <span style={{ color: T.text3 }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {eq.numeroSerie
                          ? <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.82rem', fontWeight: 600, color: T.text2 }}>{eq.numeroSerie}</span>
                          : <span style={{ color: T.text3 }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', color: T.text2 }}>
                        {eq.ubicacion || <span style={{ color: T.text3 }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20,
                          ...(eq.activo
                            ? { color: T.ok,    background: T.okSoft  }
                            : { color: T.text3, background: T.surface2 }),
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: eq.activo ? T.ok : T.text3, flexShrink: 0 }} />
                          {eq.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 3 }}>
                          {puedeEditar && (
                            <button type="button" onClick={() => abrirEditar(eq)} title="Editar equipo"
                              style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.background = T.primarySoft; e.currentTarget.style.color = T.primary; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent';  e.currentTarget.style.color = T.text3;   }}>
                              <IcoEdit />
                            </button>
                          )}
                          {puedeCambiar && eq.activo && (
                            <button type="button" onClick={() => pedirConfirmacion(eq)} title="Desactivar equipo"
                              style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.background = T.warnSoft; e.currentTarget.style.color = T.warn; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                              <IcoDeactivate />
                            </button>
                          )}
                          {puedeCambiar && !eq.activo && (
                            <button type="button" onClick={() => pedirConfirmacion(eq)} title="Reactivar equipo"
                              style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.background = T.okSoft; e.currentTarget.style.color = T.ok; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                              <IcoActivate />
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
            {totalPages > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', borderTop: `1px solid ${T.lineSoft}` }}>
                <span style={{ fontSize: '.8rem', color: T.text3 }}>Página {page + 1} de {totalPages}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <PagBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</PagBtn>
                  {pageRange.map(p => (
                    <PagBtn key={p} active={p === page} onClick={() => setPage(p)}>{p + 1}</PagBtn>
                  ))}
                  <PagBtn disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</PagBtn>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal Crear / Editar ───────────────────────────────────────────────── */}
      {modalOpen && createPortal(
        <div onClick={cerrarModal}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 620, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: T.primarySoft, color: T.primary }}>
                <IcoMonitor />
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>
                  {editTarget ? 'Editar equipo' : 'Registrar equipo'}
                </h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>
                  {editTarget ? `Cliente: ${clienteNombre(editTarget.clienteId)}` : 'Los campos con * son obligatorios.'}
                </div>
              </div>
              <button type="button" onClick={cerrarModal} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <IcoX />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 4px' }}>

              {/* Cliente (solo al crear) */}
              {!editTarget && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3, marginBottom: 10 }}>
                    Cliente
                  </div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                    Seleccionar cliente <span style={{ color: T.bad }}>*</span>
                  </label>
                  <select
                    value={form.clienteId}
                    onChange={e => setForm(f => ({ ...f, clienteId: e.target.value ? Number(e.target.value) : '' }))}
                    style={{ ...inputBase, cursor: 'pointer', border: `1px solid ${form.intento && !form.clienteId ? T.bad : T.line}`, boxShadow: form.intento && !form.clienteId ? `0 0 0 3px ${T.badSoft}` : 'none' }}
                    onFocus={focusIn} onBlur={focusOut}
                  >
                    <option value="">Seleccionar cliente…</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  {form.intento && !form.clienteId && (
                    <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>El cliente es requerido</div>
                  )}
                </div>
              )}

              {/* Información del equipo */}
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3, marginBottom: 10 }}>
                Información del equipo
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                  Nombre <span style={{ color: T.bad }}>*</span>
                </label>
                <input
                  type="text" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Impresora HP recepción"
                  style={{ ...inputBase, border: `1px solid ${form.intento && !form.nombre.trim() ? T.bad : T.line}`, boxShadow: form.intento && !form.nombre.trim() ? `0 0 0 3px ${T.badSoft}` : 'none' }}
                  onFocus={focusIn} onBlur={focusOut}
                />
                {form.intento && !form.nombre.trim() && (
                  <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>El nombre es requerido</div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Tipo</label>
                  <input type="text" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} placeholder="Ej: Impresora, Compresor…" style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Ubicación</label>
                  <input type="text" value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} placeholder="Ej: Piso 2, Sala B" style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>

              {/* Identificación */}
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3, margin: '4px 0 10px' }}>
                Identificación
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Marca</label>
                  <input type="text" value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Ej: HP, Canon, Bosch" style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Modelo</label>
                  <input type="text" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ej: LaserJet Pro M404n" style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Número de serie</label>
                <input type="text" value={form.numeroSerie}
                  onChange={e => setForm(f => ({ ...f, numeroSerie: e.target.value }))}
                  placeholder="Ej: SN-ABC12345"
                  style={{ ...inputBase, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem', letterSpacing: '.03em' }}
                  onFocus={focusIn} onBlur={focusOut}
                />
              </div>

              {/* Notas */}
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3, margin: '4px 0 10px' }}>
                Notas
              </div>

              <div style={{ marginBottom: 4 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  rows={3}
                  placeholder="Detalles adicionales del equipo…"
                  style={{ width: '100%', padding: '10px 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                  onFocus={focusIn} onBlur={focusOut}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <button type="button" onClick={cerrarModal}
                style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                Cancelar
              </button>
              <button type="button" onClick={handleGuardar} disabled={saving}
                style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}`, opacity: saving ? .7 : 1 }}>
                {saving ? 'Guardando…' : (editTarget ? 'Guardar cambios' : 'Registrar equipo')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Confirmación estado ──────────────────────────────────────────── */}
      {confirmId != null && createPortal(
        <div onClick={() => setConfirmId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: confirmActivo ? T.warnSoft : T.okSoft, color: confirmActivo ? T.warn : T.ok }}>
                {confirmActivo
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>}
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>
                  {confirmActivo ? 'Desactivar equipo' : 'Reactivar equipo'}
                </h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>
                  {confirmActivo ? 'Puedes reactivarlo cuando quieras.' : 'El equipo volverá a estar activo.'}
                </div>
              </div>
              <button type="button" onClick={() => setConfirmId(null)} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <IcoX />
              </button>
            </div>
            <div style={{ padding: '18px 22px 20px' }}>
              <p style={{ fontSize: '.84rem', lineHeight: 1.55, color: T.text2, margin: 0 }}>
                {confirmActivo
                  ? 'El equipo quedará inactivo y no aparecerá en el listado de activos. Podrás reactivarlo en cualquier momento.'
                  : 'El equipo volverá a aparecer en el listado de activos y estará disponible para asignar órdenes de trabajo.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <button type="button" onClick={() => setConfirmId(null)}
                style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                Cancelar
              </button>
              <button type="button" onClick={confirmarCambioEstado} disabled={saving}
                style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: confirmActivo ? T.warn : T.ok, border: 0, borderRadius: 11, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${confirmActivo ? T.warn : T.ok}`, opacity: saving ? .7 : 1 }}>
                {saving ? 'Procesando…' : confirmActivo ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
