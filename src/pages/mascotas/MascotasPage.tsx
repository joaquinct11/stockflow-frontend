import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { notify } from '../../lib/notify';
import { mascotaService } from '../../services/mascota.service';
import type { MascotaDTO, CrearMascotaRequestDTO, MascotaPageResponse } from '../../services/mascota.service';
import { clienteService } from '../../services/cliente.service';
import type { ClienteDTO } from '../../services/cliente.service';
import { usePermissions } from '../../hooks/usePermissions';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';

// ─── Palette ────────────────────────────────────────────────────────────────
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
  primary:     'var(--color-primary, #7c3aed)',
  primarySoft: 'var(--color-primary-soft, #ede9fe)',
  primaryLine: 'var(--color-primary-line, #c4b5fd)',
  ok:          'var(--color-ok, #059669)',
  okSoft:      'var(--color-ok-soft, #d1fae5)',
  warn:        'var(--color-warn, #d97706)',
  warnSoft:    'var(--color-warn-soft, #fef3c7)',
  bad:         'var(--color-bad, #dc2626)',
  badSoft:     'var(--color-bad-soft, #fee2e2)',
  shadow:      '0 1px 3px rgba(0,0,0,.07)',
};

// ─── Icons ───────────────────────────────────────────────────────────────────
const IcoSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IcoEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
  </svg>
);
const IcoEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IcoPaw = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/>
    <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>
  </svg>
);
const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const IcoDeactivate = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </svg>
);
const IcoActivate = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#7c3aed','#ede9fe'],['#0891b2','#e0f2fe'],['#059669','#d1fae5'],
  ['#d97706','#fef3c7'],['#dc2626','#fee2e2'],['#db2777','#fce7f3'],
  ['#2563eb','#dbeafe'],['#65a30d','#ecfccb'],
];

function avatarStyle(name: string, size: number, dim = false): { bg: string; color: string; size: number } {
  const i = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const [color, bg] = AVATAR_COLORS[i];
  return { bg: dim ? '#e5e7eb' : bg, color: dim ? '#9ca3af' : color, size };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const MonoLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: '.69rem', fontWeight: 650, letterSpacing: '.06em', textTransform: 'uppercase', color: T.text3 }}>
    {children}
  </div>
);

// ─── Types ───────────────────────────────────────────────────────────────────
type EstadoFilter = 'TODOS' | 'ACTIVAS' | 'INACTIVAS';

const ESPECIE_OPTIONS = ['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Otro'];
const SEXO_OPTIONS: { value: string; label: string }[] = [
  { value: 'MACHO', label: 'Macho' },
  { value: 'HEMBRA', label: 'Hembra' },
  { value: 'DESCONOCIDO', label: 'Desconocido' },
];

// ─── inputBase / focus helpers (module-level — no cambian entre renders) ─────
const inputBase: React.CSSProperties = {
  width: '100%', height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem',
  color: T.text, background: T.surface, border: `1px solid ${T.line}`,
  borderRadius: 10, outline: 'none', padding: '0 14px',
};
const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = T.primary;
  e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`;
};
const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = T.line;
  e.currentTarget.style.boxShadow = 'none';
};

// ─── LabelInput — módulo level (evita remount al escribir) ───────────────────
// Si se define DENTRO del componente, React crea una nueva referencia en cada
// render, desmonta y remonta el elemento → el input pierde el foco con cada tecla.
const LabelInput = ({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2, fontFamily: 'Inter,sans-serif' }}>{label}</label>
    {children}
    {error && <span style={{ fontSize: '.75rem', color: T.bad }}>{error}</span>}
  </div>
);

const EMPTY_FORM: CrearMascotaRequestDTO & { intento: boolean } = {
  clienteId: 0,
  nombre: '',
  especie: '',
  raza: '',
  sexo: '',
  fechaNacimiento: '',
  color: '',
  pesoKg: undefined,
  microchip: '',
  esterilizado: undefined,
  intento: false,
};

const PAGE_SIZE = 15;

// ─── Component ───────────────────────────────────────────────────────────────
export default function MascotasPage() {
  const { isAdmin, puede } = usePermissions();

  const canVer         = isAdmin || puede('VER_MASCOTAS');
  const canCrear       = isAdmin || puede('CREAR_MASCOTA');
  const canEditar      = isAdmin || puede('EDITAR_MASCOTA');
  const canEstado      = isAdmin || puede('CAMBIAR_ESTADO_MASCOTA');
  const canVerClientes = isAdmin || puede('VER_CLIENTES');

  // ── State ────────────────────────────────────────────────────────────────
  const [pageData, setPageData]           = useState<MascotaPageResponse | null>(null);
  const [clientes, setClientes]           = useState<ClienteDTO[]>([]);
  const [loading, setLoading]             = useState(true);
  const [busqueda, setBusqueda]           = useState('');
  const [debouncedBusqueda, setDebounced] = useState('');
  const [estadoFilter, setEstadoFilter]   = useState<EstadoFilter>('ACTIVAS');
  const [page, setPage]                   = useState(0); // 0-based

  const [modalForm, setModalForm]       = useState<'crear' | 'editar' | null>(null);
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [form, setForm]                 = useState({ ...EMPTY_FORM });
  const [saving, setSaving]             = useState(false);

  const [detalle, setDetalle]           = useState<MascotaDTO | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [confirming, setConfirming]     = useState<{ id: number; accion: 'activar' | 'desactivar' } | null>(null);
  const [confirmando, setConfirmando]   = useState(false);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(busqueda.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchMascotas = useCallback(async () => {
    if (!canVer) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await mascotaService.getAll({
        page,
        size: PAGE_SIZE,
        estado: estadoFilter,
        search: debouncedBusqueda,
      });
      setPageData(data);
    } catch (err) {
      notify.fromError(err, 'No se pudo cargar la lista de mascotas.');
    } finally {
      setLoading(false);
    }
  }, [canVer, page, estadoFilter, debouncedBusqueda]);

  const fetchClientes = useCallback(async () => {
    if (!canVerClientes) { setClientes([]); return; }
    try {
      const data = await clienteService.getActivos();
      setClientes(data);
    } catch {
      // silencioso — la lista sigue siendo opcional
    }
  }, [canVerClientes]);

  useEffect(() => { fetchMascotas(); }, [fetchMascotas]);
  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const resumen    = pageData?.resumen ?? { total: 0, activas: 0, inactivas: 0 };
  const rows       = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 1;
  const totalElem  = pageData?.totalElements ?? 0;

  const estadoCounts: Record<EstadoFilter, number> = {
    TODOS:    resumen.total,
    ACTIVAS:  resumen.activas,
    INACTIVAS: resumen.inactivas,
  };

  const changeEstado = (estado: EstadoFilter) => {
    setEstadoFilter(estado);
    setPage(0);
  };

  const resetFiltros = () => {
    setBusqueda('');
    setDebounced('');
    setEstadoFilter('ACTIVAS');
    setPage(0);
  };

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setModalForm('crear');
  };

  const openEdit = async (id: number) => {
    setEditingId(id);
    setModalForm('editar');
    setSaving(false);
    try {
      const d = await mascotaService.getById(id);
      setForm({
        clienteId: d.clienteId,
        nombre: d.nombre,
        especie: d.especie,
        raza: d.raza ?? '',
        sexo: d.sexo ?? '',
        fechaNacimiento: d.fechaNacimiento ?? '',
        color: d.color ?? '',
        pesoKg: d.pesoKg ?? undefined,
        microchip: d.microchip ?? '',
        esterilizado: d.esterilizado ?? undefined,
        intento: false,
      });
    } catch (err) {
      notify.fromError(err, 'No se pudo cargar los datos de la mascota.');
      setModalForm(null);
    }
  };

  const closeModal = () => { setModalForm(null); setEditingId(null); };

  const setField = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setForm(f => ({ ...f, intento: true }));
    if (!form.nombre.trim() || !form.especie.trim()) return;
    if (modalForm === 'crear' && !form.clienteId) return;
    setSaving(true);
    try {
      if (modalForm === 'crear') {
        await mascotaService.create({
          clienteId: form.clienteId,
          nombre: form.nombre.trim(),
          especie: form.especie.trim(),
          raza: form.raza?.trim() || undefined,
          sexo: form.sexo?.trim() || undefined,
          fechaNacimiento: form.fechaNacimiento?.trim() || undefined,
          color: form.color?.trim() || undefined,
          pesoKg: form.pesoKg ?? undefined,
          microchip: form.microchip?.trim() || undefined,
          esterilizado: form.esterilizado ?? undefined,
        });
        notify.success('Mascota registrada.');
      } else {
        await mascotaService.update(editingId!, {
          nombre: form.nombre.trim(),
          especie: form.especie.trim(),
          raza: form.raza?.trim() || undefined,
          sexo: form.sexo?.trim() || undefined,
          fechaNacimiento: form.fechaNacimiento?.trim() || undefined,
          color: form.color?.trim() || undefined,
          pesoKg: form.pesoKg ?? undefined,
          microchip: form.microchip?.trim() || undefined,
          esterilizado: form.esterilizado ?? undefined,
        });
        notify.success('Mascota actualizada.');
      }
      closeModal();
      fetchMascotas();
    } catch (err) {
      notify.fromError(err, 'No se pudo guardar la mascota.');
    } finally {
      setSaving(false);
    }
  };

  // ── Detail ───────────────────────────────────────────────────────────────
  const openDetalle = async (id: number) => {
    setLoadingDetalle(true);
    setDetalle(null);
    try {
      const d = await mascotaService.getById(id);
      setDetalle(d);
    } catch (err) {
      notify.fromError(err, 'No se pudo cargar el detalle.');
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ── Confirm toggle ───────────────────────────────────────────────────────
  const handleToggle = async () => {
    if (!confirming) return;
    setConfirmando(true);
    try {
      if (confirming.accion === 'activar') {
        await mascotaService.activate(confirming.id);
        notify.success('Mascota activada.');
      } else {
        await mascotaService.deactivate(confirming.id);
        notify.success('Mascota desactivada.');
      }
      setConfirming(null);
      fetchMascotas();
    } catch (err) {
      notify.fromError(err, 'No se pudo cambiar el estado.');
    } finally {
      setConfirmando(false);
    }
  };

  // ── Seg button helper ────────────────────────────────────────────────────
  const seg = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 34, padding: '0 12px', fontFamily: 'Inter,sans-serif',
    fontSize: '.82rem', fontWeight: 600, border: 0, borderRadius: 8,
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    color: on ? T.text : T.text3,
    background: on ? T.surface : 'transparent',
    boxShadow: on ? `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` : undefined,
  });

  // ─────────────────────────────────────────────────────────────────────────
  if (pageData === null && loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Mascotas</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Gestiona tus pacientes y sus datos básicos</p>
        </div>
        {canCrear && (
          <button type="button" onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}` }}>
            <IcoPlus /> Registrar mascota
          </button>
        )}
      </div>

      {!canVer ? (
        <div style={{ padding: '56px 24px', textAlign: 'center', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14 }}>
          <p style={{ color: T.text3 }}>No tienes permisos para ver el listado de mascotas.</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
            {([
              { label: 'Total mascotas', value: resumen.total,     sub: 'Registradas',       color: T.text },
              { label: 'Activas',        value: resumen.activas,   sub: 'Pacientes activos',  color: T.ok },
              { label: 'Inactivas',      value: resumen.inactivas, sub: 'Deshabilitadas',     color: resumen.inactivas ? T.bad : T.text },
            ] as const).map(({ label, value, sub, color }) => (
              <div key={label} style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
                <MonoLabel>{label}</MonoLabel>
                <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color }}>{value}</div>
                <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Main card */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
              <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 0 }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}><IcoSearch /></span>
                <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, especie, raza o propietario…"
                  style={{ width: '100%', height: 40, padding: '0 13px 0 38px', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none', fontFamily: 'Inter,sans-serif' }}
                  onFocus={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                  onBlur={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0 }}>
                {(['TODOS', 'ACTIVAS', 'INACTIVAS'] as EstadoFilter[]).map(k => (
                  <button key={k} type="button" onClick={() => changeEstado(k)} style={seg(estadoFilter === k)}>
                    {k === 'TODOS' ? 'Todos' : k === 'ACTIVAS' ? 'Activos' : 'Inactivos'}
                    <span style={{ fontSize: '.7rem', fontWeight: 700, color: T.text3 }}>{estadoCounts[k]}</span>
                  </button>
                ))}
              </div>
            </div>

            {rows.length === 0 && !loading ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}><IcoPaw /></div>
                <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14 }}>Ninguna mascota coincide</div>
                <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 380 }}>Revisa la búsqueda o quita los filtros para ver todas.</p>
                <button type="button" onClick={resetFiltros}
                  style={{ height: 38, marginTop: 16, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                  Quitar filtros
                </button>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem', minWidth: 780 }}>
                    <thead>
                      <tr style={{ background: T.surface3 }}>
                        {['Mascota', 'Especie', 'Raza', 'Propietario', 'Sexo', 'Peso', 'Estado', 'Acciones'].map((h, i) => (
                          <th key={h} style={{ textAlign: i === 7 ? 'right' : 'left', padding: i === 0 || i === 7 ? '10px 18px' : '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((m) => {
                        const av = avatarStyle(m.nombre, 34, !m.activo);
                        return (
                          <tr key={m.id} style={{ borderTop: `1px solid ${T.lineSoft}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}>
                            {/* Mascota */}
                            <td style={{ padding: '11px 18px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: av.bg, color: av.color, display: 'grid', placeItems: 'center', fontSize: '.75rem', fontWeight: 700, flexShrink: 0 }}>
                                  {initials(m.nombre)}
                                </div>
                                <span style={{ fontWeight: 600, color: m.activo ? T.text : T.text3 }}>{m.nombre}</span>
                              </div>
                            </td>
                            {/* Especie */}
                            <td style={{ padding: '11px 14px', color: T.text2 }}>{m.especie}</td>
                            {/* Raza */}
                            <td style={{ padding: '11px 14px', color: T.text3 }}>{m.raza || <span style={{ color: T.text3, fontStyle: 'italic' }}>—</span>}</td>
                            {/* Propietario */}
                            <td style={{ padding: '11px 14px', color: T.text2 }}>{m.clienteNombre || '—'}</td>
                            {/* Sexo */}
                            <td style={{ padding: '11px 14px', color: T.text3 }}>
                              {m.sexo === 'MACHO' ? 'Macho' : m.sexo === 'HEMBRA' ? 'Hembra' : m.sexo === 'DESCONOCIDO' ? 'Desc.' : <span style={{ fontStyle: 'italic' }}>—</span>}
                            </td>
                            {/* Peso */}
                            <td style={{ padding: '11px 14px', color: T.text3 }}>
                              {m.pesoKg != null ? `${m.pesoKg} kg` : <span style={{ fontStyle: 'italic' }}>—</span>}
                            </td>
                            {/* Estado */}
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, ...(m.activo ? { color: T.ok, background: T.okSoft } : { color: T.text3, background: T.surface2 }) }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.activo ? T.ok : T.text3 }} />
                                {m.activo ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                            {/* Acciones */}
                            <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', gap: 3 }}>
                                <button type="button" title="Ver detalle" onClick={e => { e.stopPropagation(); openDetalle(m.id); }}
                                  style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = T.primarySoft; e.currentTarget.style.color = T.primary; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                  <IcoEye />
                                </button>
                                {canEditar && (
                                  <button type="button" title="Editar" onClick={e => { e.stopPropagation(); openEdit(m.id); }}
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.primarySoft; e.currentTarget.style.color = T.primary; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoEdit />
                                  </button>
                                )}
                                {canEstado && m.activo && (
                                  <button type="button" title="Desactivar"
                                    onClick={e => { e.stopPropagation(); setConfirming({ id: m.id, accion: 'desactivar' }); }}
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.warnSoft; e.currentTarget.style.color = T.warn; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoDeactivate />
                                  </button>
                                )}
                                {canEstado && !m.activo && (
                                  <button type="button" title="Activar"
                                    onClick={e => { e.stopPropagation(); setConfirming({ id: m.id, accion: 'activar' }); }}
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.okSoft; e.currentTarget.style.color = T.ok; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoActivate />
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', borderTop: `1px solid ${T.lineSoft}` }}>
                    <span style={{ fontSize: '.8rem', color: T.text3 }}>
                      Mostrando página {page + 1} de {totalPages} · {totalElem} mascota{totalElem !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}
                        style={{ minWidth: 32, height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.81rem', fontWeight: 600, borderRadius: 8, cursor: page === 0 ? 'not-allowed' : 'pointer', color: T.text2, background: T.surface, border: `1px solid ${T.line}`, opacity: page === 0 ? .5 : 1 }}>
                        Anterior
                      </button>
                      <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                        style={{ minWidth: 32, height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.81rem', fontWeight: 600, borderRadius: 8, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', color: T.text2, background: T.surface, border: `1px solid ${T.line}`, opacity: page >= totalPages - 1 ? .5 : 1 }}>
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Modal Crear / Editar ─────────────────────────────────────────── */}
      {modalForm && createPortal(
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>
                  {modalForm === 'crear' ? 'Registrar mascota' : 'Editar mascota'}
                </h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>
                  {modalForm === 'crear' ? 'Los campos con * son obligatorios.' : 'Actualiza la información de la mascota.'}
                </div>
              </div>
              <button type="button" onClick={closeModal} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <IcoX />
              </button>
            </div>

            {/* Form */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px 4px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Propietario — solo en crear */}
              {modalForm === 'crear' && (
                <LabelInput label="Propietario *" error={form.intento && !form.clienteId ? 'Selecciona un propietario.' : ''}>
                  <select value={form.clienteId || ''} onChange={e => setField('clienteId', Number(e.target.value))}
                    onFocus={focusIn} onBlur={focusOut}
                    style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}>
                    <option value="">— Selecciona un cliente —</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}{c.numeroDocumento ? ` · ${c.numeroDocumento}` : ''}</option>
                    ))}
                  </select>
                </LabelInput>
              )}

              {/* Nombre */}
              <LabelInput label="Nombre *" error={form.intento && !form.nombre.trim() ? 'El nombre es requerido.' : ''}>
                <input value={form.nombre} onChange={e => setField('nombre', e.target.value)}
                  onFocus={focusIn} onBlur={focusOut} placeholder="Ej. Luna"
                  style={inputBase} />
              </LabelInput>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Especie */}
                <LabelInput label="Especie *" error={form.intento && !form.especie.trim() ? 'La especie es requerida.' : ''}>
                  <select value={form.especie} onChange={e => setField('especie', e.target.value)}
                    onFocus={focusIn} onBlur={focusOut}
                    style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}>
                    <option value="">— Selecciona —</option>
                    {ESPECIE_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </LabelInput>

                {/* Raza */}
                <LabelInput label="Raza">
                  <input value={form.raza ?? ''} onChange={e => setField('raza', e.target.value)}
                    onFocus={focusIn} onBlur={focusOut} placeholder="Ej. Golden Retriever"
                    style={inputBase} />
                </LabelInput>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Sexo */}
                <LabelInput label="Sexo">
                  <select value={form.sexo ?? ''} onChange={e => setField('sexo', e.target.value)}
                    onFocus={focusIn} onBlur={focusOut}
                    style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}>
                    <option value="">— No especificado —</option>
                    {SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </LabelInput>

                {/* Peso */}
                <LabelInput label="Peso (kg)">
                  <input type="number" min={0} step={0.1} value={form.pesoKg ?? ''}
                    onChange={e => setField('pesoKg', e.target.value ? Number(e.target.value) : undefined)}
                    onFocus={focusIn} onBlur={focusOut} placeholder="Ej. 5.2"
                    style={inputBase} />
                </LabelInput>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Fecha nacimiento */}
                <LabelInput label="Fecha de nacimiento">
                  <input type="date" value={form.fechaNacimiento ?? ''}
                    onChange={e => setField('fechaNacimiento', e.target.value)}
                    onFocus={focusIn} onBlur={focusOut}
                    style={inputBase} />
                </LabelInput>

                {/* Color */}
                <LabelInput label="Color / pelaje">
                  <input value={form.color ?? ''} onChange={e => setField('color', e.target.value)}
                    onFocus={focusIn} onBlur={focusOut} placeholder="Ej. Marrón con blanco"
                    style={inputBase} />
                </LabelInput>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Microchip */}
                <LabelInput label="Microchip">
                  <input value={form.microchip ?? ''} onChange={e => setField('microchip', e.target.value)}
                    onFocus={focusIn} onBlur={focusOut} placeholder="Nro. de microchip"
                    style={inputBase} />
                </LabelInput>

                {/* Esterilizado */}
                <LabelInput label="Esterilizado/a">
                  <select value={form.esterilizado === true ? 'SI' : form.esterilizado === false ? 'NO' : ''}
                    onChange={e => setField('esterilizado', e.target.value === 'SI' ? true : e.target.value === 'NO' ? false : undefined)}
                    onFocus={focusIn} onBlur={focusOut}
                    style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}>
                    <option value="">— No especificado —</option>
                    <option value="SI">Sí</option>
                    <option value="NO">No</option>
                  </select>
                </LabelInput>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <button type="button" onClick={closeModal}
                style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}`, opacity: saving ? .7 : 1 }}>
                {saving ? 'Guardando…' : modalForm === 'crear' ? 'Registrar mascota' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Detalle ────────────────────────────────────────────────── */}
      {(detalle || loadingDetalle) && createPortal(
        <div onClick={() => setDetalle(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>
                  {loadingDetalle ? 'Cargando…' : detalle?.nombre}
                </h2>
                {!loadingDetalle && detalle && (
                  <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{detalle.especie}{detalle.raza ? ` · ${detalle.raza}` : ''}</div>
                )}
              </div>
              <button type="button" onClick={() => setDetalle(null)} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <IcoX />
              </button>
            </div>

            {loadingDetalle ? (
              <div style={{ padding: 48, textAlign: 'center', color: T.text3 }}>Cargando datos…</div>
            ) : detalle && (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Datos básicos */}
                <div>
                  <MonoLabel>Datos básicos</MonoLabel>
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Especie', detalle.especie],
                      ['Raza', detalle.raza || '—'],
                      ['Sexo', SEXO_OPTIONS.find(o => o.value === detalle.sexo)?.label || '—'],
                      ['Peso', detalle.pesoKg != null ? `${detalle.pesoKg} kg` : '—'],
                      ['Color / pelaje', detalle.color || '—'],
                      ['Fecha nacimiento', detalle.fechaNacimiento || '—'],
                      ['Microchip', detalle.microchip || '—'],
                      ['Esterilizado/a', detalle.esterilizado === true ? 'Sí' : detalle.esterilizado === false ? 'No' : '—'],
                    ].map(([label, val]) => (
                      <div key={label} style={{ background: T.surface2, borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: '.71rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '.04em', color: T.text3 }}>{label}</div>
                        <div style={{ marginTop: 4, fontSize: '.875rem', color: T.text, fontWeight: 500 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secciones futuras */}
                {(['Historia clínica', 'Citas', 'Tratamientos', 'Vacunas'] as const).map(sec => (
                  <div key={sec} style={{ border: `1px dashed ${T.line}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontWeight: 650, fontSize: '.9rem' }}>{sec}</div>
                    <div style={{ fontSize: '.825rem', color: T.text3 }}>Próximamente disponible en esta sección.</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Confirmar Toggle ───────────────────────────────────────── */}
      {confirming && createPortal(
        <div onClick={() => { if (!confirmando) setConfirming(null); }} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: confirming.accion === 'activar' ? T.okSoft : T.warnSoft, color: confirming.accion === 'activar' ? T.ok : T.warn }}>
                {confirming.accion === 'activar' ? <IcoActivate /> : <IcoDeactivate />}
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>
                  {confirming.accion === 'activar' ? 'Activar mascota' : 'Desactivar mascota'}
                </h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>
                  {confirming.accion === 'activar' ? 'Volverá a estar disponible en el sistema.' : 'Puedes volver a activarla cuando quieras.'}
                </div>
              </div>
              <button type="button" onClick={() => setConfirming(null)} aria-label="Cerrar" disabled={confirmando}
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <IcoX />
              </button>
            </div>
            {/* Content */}
            <div style={{ padding: '18px 22px 20px' }}>
              <p style={{ fontSize: '.84rem', lineHeight: 1.55, color: T.text2, margin: 0 }}>
                {confirming.accion === 'activar'
                  ? 'La mascota volverá a estar disponible en el sistema. Podrás registrarle citas y consultas.'
                  : 'La mascota quedará deshabilitada. Su historial de citas y datos clínicos se conservan.'}
              </p>
            </div>
            {/* Footer */}
            <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <button type="button" onClick={() => setConfirming(null)} disabled={confirmando}
                style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                Cancelar
              </button>
              <button type="button" onClick={handleToggle} disabled={confirmando}
                style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: confirming.accion === 'activar' ? T.ok : T.warn, border: 0, borderRadius: 11, cursor: confirmando ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${confirming.accion === 'activar' ? T.ok : T.warn}`, opacity: confirmando ? .7 : 1 }}>
                {confirmando ? 'Procesando…' : confirming.accion === 'activar' ? 'Activar mascota' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
