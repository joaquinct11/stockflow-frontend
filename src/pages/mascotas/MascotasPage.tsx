import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { notify } from '../../lib/notify';
import { mascotaService } from '../../services/mascota.service';
import type { MascotaDTO, CrearMascotaRequestDTO, MascotaPageResponse } from '../../services/mascota.service';
import { clienteService } from '../../services/cliente.service';
import type { ClienteDTO } from '../../services/cliente.service';
import { usePermissions } from '../../hooks/usePermissions';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';

// ─── Palette ─────────────────────────────────────────────────────────────────
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
};

// ─── Colores por especie ──────────────────────────────────────────────────────
const ESPECIE_COLORS: Record<string, { color: string; bg: string }> = {
  Perro:  { color: '#7c3aed', bg: '#7c3aed22' },
  Gato:   { color: '#0891b2', bg: '#0891b222' },
  Conejo: { color: '#db2777', bg: '#db277722' },
  Ave:    { color: '#d97706', bg: '#d9770622' },
  Reptil: { color: '#059669', bg: '#05966922' },
  Otro:   { color: '#64748b', bg: '#64748b22' },
};
const espCol = (e: string) => ESPECIE_COLORS[e] ?? ESPECIE_COLORS['Otro'];

// ─── Raza placeholders por especie ────────────────────────────────────────────
const RAZA_PH: Record<string, string> = {
  Perro:  'Ej. Golden Retriever',
  Gato:   'Ej. Siamés',
  Conejo: 'Ej. Mini Lop',
  Ave:    'Ej. Periquito australiano',
  Reptil: 'Ej. Iguana verde',
  Otro:   'Raza o variedad',
};

// ─── Icons ───────────────────────────────────────────────────────────────────
const IcoSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IcoEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);
const IcoEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IcoPaw = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/>
    <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>
  </svg>
);
const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
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
const IcoChip = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9z"/>
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>
  </svg>
);
// ─── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#7c3aed','#ede9fe'],['#0891b2','#e0f2fe'],['#059669','#d1fae5'],
  ['#d97706','#fef3c7'],['#dc2626','#fee2e2'],['#db2777','#fce7f3'],
  ['#2563eb','#dbeafe'],['#65a30d','#ecfccb'],
];

function avatarStyle(name: string, size: number, dim = false) {
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

function fmtPeso(p: number | null | undefined): string {
  if (p == null) return '—';
  if (p < 1) return `${Math.round(p * 1000)} g`;
  return `${String(p).replace('.', ',')} kg`;
}

function fmtEdad(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  let m = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
  if (now.getDate() < d.getDate()) m--;
  if (m < 0) return '';
  if (m < 12) return `${m} ${m === 1 ? 'mes' : 'meses'}`;
  const y = Math.floor(m / 12), r = m % 12;
  return `${y} ${y === 1 ? 'año' : 'años'}${r ? ` ${r} ${r === 1 ? 'mes' : 'meses'}` : ''}`;
}

function fmtFechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, mo, d] = iso.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(mo) - 1]} ${y}`;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type EstadoFilter   = 'TODOS' | 'ACTIVAS' | 'INACTIVAS';
type EspecieFilter  = 'TODAS' | 'PERRO' | 'GATO' | 'OTROS';

const ESPECIE_OPTIONS = ['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Otro'];
const SEXO_OPTIONS = [
  { value: 'MACHO',       label: 'Macho' },
  { value: 'HEMBRA',      label: 'Hembra' },
  { value: 'DESCONOCIDO', label: 'Desconocido' },
];

// ─── inputBase / focus helpers ────────────────────────────────────────────────
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
const LabelInput = ({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2, fontFamily: 'Inter,sans-serif' }}>{label}</label>
    {children}
    {error && <span style={{ fontSize: '.75rem', color: T.bad, fontWeight: 600 }}>{error}</span>}
  </div>
);

const MonoLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>
    {children}
  </div>
);

const EMPTY_FORM: CrearMascotaRequestDTO & { intento: boolean } = {
  clienteId: 0, nombre: '', especie: '', raza: '', sexo: '',
  fechaNacimiento: '', color: '', pesoKg: undefined, microchip: '',
  esterilizado: undefined, intento: false,
};
const PAGE_SIZE = 15;

// ─── Expediente secciones futuras ─────────────────────────────────────────────
const PROX_SECTIONS = [
  { label: 'Historia clínica', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M9 13h6M9 17h4' },
  { label: 'Citas',            icon: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM16 3v4M8 3v4M3 11h18' },
  { label: 'Tratamientos',     icon: 'm10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7ZM8.5 8.5l7 7' },
  { label: 'Vacunas',          icon: 'm18 2 4 4M17 7l3-3M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function MascotasPage() {
  const { isAdmin, puede } = usePermissions();
  const canVer         = isAdmin || puede('VER_MASCOTAS');
  const canCrear       = isAdmin || puede('CREAR_MASCOTA');
  const canEditar      = isAdmin || puede('EDITAR_MASCOTA');
  const canEstado      = isAdmin || puede('CAMBIAR_ESTADO_MASCOTA');
  const canVerClientes = isAdmin || puede('VER_CLIENTES');

  // ── State ────────────────────────────────────────────────────────────────
  const [pageData,      setPageData]      = useState<MascotaPageResponse | null>(null);
  const [clientes,      setClientes]      = useState<ClienteDTO[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [busqueda,      setBusqueda]      = useState('');
  const [debouncedBusqueda, setDebounced] = useState('');
  const [estadoFilter,  setEstadoFilter]  = useState<EstadoFilter>('ACTIVAS');
  const [especieFilter, setEspecieFilter] = useState<EspecieFilter>('TODAS');
  const [page,          setPage]          = useState(0);

  const [modalForm,  setModalForm]  = useState<'crear' | 'editar' | null>(null);
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [ownerBusca, setOwnerBusca] = useState('');

  const [detalle,        setDetalle]        = useState<MascotaDTO | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [confirming,  setConfirming]  = useState<{ id: number; accion: 'activar' | 'desactivar'; mascota?: { nombre: string; especie: string; raza: string | null; clienteNombre: string } } | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(busqueda.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchMascotas = useCallback(async () => {
    if (!canVer) { setLoading(false); return; }
    setLoading(true);
    try {
      // TODO: pasar especie al backend cuando lo soporte; por ahora se filtra en cliente
      const data = await mascotaService.getAll({ page, size: PAGE_SIZE, estado: estadoFilter, search: debouncedBusqueda });
      setPageData(data);
    } catch (err) {
      notify.fromError(err, 'No se pudo cargar la lista de mascotas.');
    } finally { setLoading(false); }
  }, [canVer, page, estadoFilter, debouncedBusqueda]);

  const fetchClientes = useCallback(async () => {
    if (!canVerClientes) { setClientes([]); return; }
    try { const data = await clienteService.getActivos(); setClientes(data); } catch { /* silencioso */ }
  }, [canVerClientes]);

  useEffect(() => { fetchMascotas(); }, [fetchMascotas]);
  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const resumen    = pageData?.resumen ?? { total: 0, activas: 0, inactivas: 0 };
  const allRows    = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 1;
  const totalElem  = pageData?.totalElements ?? 0;

  // Filtro cliente de especie (TODO: mover al backend cuando soporte param especie)
  const rows = especieFilter === 'TODAS' ? allRows
    : especieFilter === 'PERRO'  ? allRows.filter(m => m.especie === 'Perro')
    : especieFilter === 'GATO'   ? allRows.filter(m => m.especie === 'Gato')
    : allRows.filter(m => m.especie !== 'Perro' && m.especie !== 'Gato');

  const estadoCounts: Record<EstadoFilter, number> = {
    TODOS:    resumen.total,
    ACTIVAS:  resumen.activas,
    INACTIVAS: resumen.inactivas,
  };

  const changeEstado = (e: EstadoFilter) => { setEstadoFilter(e); setPage(0); };
  const changeEspecie = (e: EspecieFilter) => { setEspecieFilter(e); setPage(0); };

  const resetFiltros = () => {
    setBusqueda(''); setDebounced('');
    setEstadoFilter('ACTIVAS'); setEspecieFilter('TODAS'); setPage(0);
  };

  // ── Owner search helper ───────────────────────────────────────────────────
  // Conteo de mascotas por cliente desde todos los datos cargados (paginación actual)
  const mascotasPorCliente = React.useMemo(() => {
    const map: Record<number, number> = {};
    (pageData?.content ?? []).forEach(m => { map[m.clienteId] = (map[m.clienteId] ?? 0) + 1; });
    return map;
  }, [pageData]);

  // Teléfono por clienteId desde la lista ya cargada (fallback si el backend no devuelve clienteTelefono)
  const telefonoPorCliente = React.useMemo(() => {
    const map: Record<number, string> = {};
    clientes.forEach(c => { if (c.id != null && c.telefono) map[c.id] = c.telefono; });
    return map;
  }, [clientes]);

  const ownerSeleccionado = form.clienteId ? clientes.find(c => c.id === form.clienteId) ?? null : null;

  // Muestra hasta 6 clientes siempre (filtra si hay texto)
  const ownerResultados = canVerClientes && !ownerSeleccionado
    ? (ownerBusca.trim()
        ? clientes.filter(c =>
            c.nombre.toLowerCase().includes(ownerBusca.toLowerCase()) ||
            ((c as unknown as Record<string, string>).numeroDocumento ?? '').includes(ownerBusca)
          )
        : clientes
      ).slice(0, 6)
    : [];

  // ── Modal helpers ────────────────────────────────────────────────────────
  const openNew = () => { setForm({ ...EMPTY_FORM }); setOwnerBusca(''); setEditingId(null); setModalForm('crear'); };

  const openEdit = async (id: number) => {
    setEditingId(id); setModalForm('editar'); setSaving(false);
    try {
      const d = await mascotaService.getById(id);
      setForm({ clienteId: d.clienteId, nombre: d.nombre, especie: d.especie, raza: d.raza ?? '', sexo: d.sexo ?? '', fechaNacimiento: d.fechaNacimiento ?? '', color: d.color ?? '', pesoKg: d.pesoKg ?? undefined, microchip: d.microchip ?? '', esterilizado: d.esterilizado ?? undefined, intento: false });
    } catch (err) { notify.fromError(err, 'No se pudo cargar los datos de la mascota.'); setModalForm(null); }
  };

  const closeModal = () => { setModalForm(null); setEditingId(null); setOwnerBusca(''); };
  const setField = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setForm(f => ({ ...f, intento: true }));
    if (!form.nombre.trim() || !form.especie.trim()) return;
    if (modalForm === 'crear' && !form.clienteId) return;
    setSaving(true);
    try {
      const payload = {
        clienteId: form.clienteId, nombre: form.nombre.trim(), especie: form.especie.trim(),
        raza: form.raza?.trim() || undefined, sexo: form.sexo?.trim() || undefined,
        fechaNacimiento: form.fechaNacimiento?.trim() || undefined, color: form.color?.trim() || undefined,
        pesoKg: form.pesoKg ?? undefined, microchip: form.microchip?.trim() || undefined,
        esterilizado: form.esterilizado ?? undefined,
      };
      if (modalForm === 'crear') { await mascotaService.create(payload); notify.success('Mascota registrada.'); }
      else { await mascotaService.update(editingId!, payload); notify.success('Mascota actualizada.'); }
      closeModal(); fetchMascotas();
    } catch (err) { notify.fromError(err, 'No se pudo guardar la mascota.'); }
    finally { setSaving(false); }
  };

  // ── Detail ───────────────────────────────────────────────────────────────
  const openDetalle = async (id: number) => {
    setLoadingDetalle(true); setDetalle(null);
    try { const d = await mascotaService.getById(id); setDetalle(d); }
    catch (err) { notify.fromError(err, 'No se pudo cargar el detalle.'); }
    finally { setLoadingDetalle(false); }
  };

  // ── Confirm toggle ───────────────────────────────────────────────────────
  const handleToggle = async () => {
    if (!confirming) return;
    setConfirmando(true);
    try {
      if (confirming.accion === 'activar') { await mascotaService.activate(confirming.id); notify.success('Mascota activada.'); }
      else { await mascotaService.deactivate(confirming.id); notify.success('Mascota desactivada.'); }
      setConfirming(null); fetchMascotas();
    } catch (err) { notify.fromError(err, 'No se pudo cambiar el estado.'); }
    finally { setConfirmando(false); }
  };

  // ── Segmented button helper ───────────────────────────────────────────────
  const seg = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 34, padding: '0 12px', fontFamily: 'Inter,sans-serif',
    fontSize: '.82rem', fontWeight: 600, border: 0, borderRadius: 8,
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    color: on ? T.text : T.text3,
    background: on ? T.surface : 'transparent',
    boxShadow: on ? `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` : undefined,
  });

  const btnIconStyle: React.CSSProperties = {
    width: 30, height: 30, display: 'grid', placeItems: 'center',
    color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer',
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (pageData === null && loading) return <LoadingSpinner />;

  // Conteo por especie: usa datos del backend si los tiene, sino computa desde la página actual
  const porEspecieData = resumen.porEspecie ?? (() => {
    const perro = allRows.filter(m => m.especie === 'Perro').length;
    const gato  = allRows.filter(m => m.especie === 'Gato').length;
    const otros = allRows.filter(m => m.especie !== 'Perro' && m.especie !== 'Gato').length;
    return { perro, gato, otros };
  })();
  const edadDetalle = detalle ? fmtEdad(detalle.fechaNacimiento) : '';
  const ownerDetalle = detalle ? (clientes.find(c => c.id === detalle.clienteId) ?? null) : null;

  // Paginación: números de página
  const pageNums: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (totalPages <= 7 || Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1) pageNums.push(i);
  }

  // Calcular rango visible de registros
  const firstElem = totalElem > 0 ? page * PAGE_SIZE + 1 : 0;
  const lastElem  = Math.min((page + 1) * PAGE_SIZE, totalElem);

  return (
    <>
      <style>{`
        @keyframes fx-slide-in { from { transform: translateX(28px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes fx-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .mp-action-btn:hover { background: var(--color-primary-soft, #eef0ff) !important; color: var(--color-primary, #3b47ef) !important; }
        .mp-action-warn:hover { background: var(--color-warn-soft, #fef3c7) !important; color: var(--color-warn, #d97706) !important; }
        .mp-action-ok:hover { background: var(--color-ok-soft, #d1fae5) !important; color: var(--color-ok, #059669) !important; }
        .mp-row:hover { background: var(--color-surface-3, #f9fafb) !important; cursor: pointer; }
        .mp-seg-owner:hover { border-color: var(--color-primary, #3b47ef) !important; background: var(--color-primary-soft, #eef0ff) !important; }
        @media (max-width: 768px) { .mp-form-g2 { grid-template-columns: minmax(0,1fr) !important; } .mp-modal-pad { padding: 18px !important; } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Mascotas</h1>
            <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Gestiona tus pacientes y sus datos básicos</p>
          </div>
          {canCrear && (
            <button type="button" onClick={openNew} className="page-action-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}` }}>
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
            {/* ── KPI cards ──────────────────────────────────────────────── */}
            <div className="kpi-grid">
              {/* Total */}
              <div style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
                <MonoLabel>Total mascotas</MonoLabel>
                <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color: T.text }}>{resumen.total}</div>
                <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>Registradas</div>
              </div>
              {/* Activas */}
              <div style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
                <MonoLabel>Activas</MonoLabel>
                <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color: T.ok }}>{resumen.activas}</div>
                <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>Pacientes activos</div>
              </div>
              {/* Inactivas */}
              <div style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
                <MonoLabel>Inactivas</MonoLabel>
                <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color: resumen.inactivas > 0 ? T.bad : T.text }}>{resumen.inactivas}</div>
                <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>Deshabilitadas</div>
              </div>
              {/* Por especie — siempre visible */}
              <div style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
                <MonoLabel>Por especie</MonoLabel>
                <div style={{ display: 'flex', height: 8, marginTop: 14, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
                  {([['Perro', porEspecieData.perro], ['Gato', porEspecieData.gato], ['Otro', porEspecieData.otros]] as [string, number][])
                    .filter(([, n]) => n > 0)
                    .map(([esp, n]) => (
                      <span key={esp} style={{ flex: n, background: espCol(esp).color, borderRadius: 3 }} />
                    ))}
                  {porEspecieData.perro === 0 && porEspecieData.gato === 0 && porEspecieData.otros === 0 && (
                    <span style={{ flex: 1, background: T.line, borderRadius: 3 }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 10 }}>
                  {([['Perros', porEspecieData.perro, 'Perro'], ['Gatos', porEspecieData.gato, 'Gato'], ['Otros', porEspecieData.otros, 'Otro']] as [string, number, string][]).map(([label, n, key]) => (
                    <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.76rem', color: T.text2 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: espCol(key).color, flexShrink: 0 }} />
                      {label} <strong style={{ fontWeight: 700, color: T.text }}>{n}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Main card ────────────────────────────────────────────────── */}
            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
              {/* Filters */}
              <div className="filter-bar" style={{ gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
                {/* Buscador */}
                <div style={{ position: 'relative', minWidth: 0 }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}><IcoSearch /></span>
                  <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre, especie, raza o propietario…"
                    style={{ width: '100%', height: 40, padding: '0 13px 0 38px', fontFamily: 'Inter,sans-serif', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                    onBlur={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {/* Especie */}
                <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0, maxWidth: '100%', overflowX: 'auto' }}>
                  {([
                    { k: 'TODAS', label: 'Todas', dot: null },
                    { k: 'PERRO', label: 'Perros', dot: espCol('Perro').color },
                    { k: 'GATO',  label: 'Gatos',  dot: espCol('Gato').color  },
                    { k: 'OTROS', label: 'Otros',  dot: espCol('Otro').color  },
                  ] as { k: EspecieFilter; label: string; dot: string | null }[]).map(({ k, label, dot }) => (
                    <button key={k} type="button" onClick={() => changeEspecie(k)} style={seg(especieFilter === k)}>
                      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
                      {label}
                    </button>
                  ))}
                </div>
                {/* Estado */}
                <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0 }}>
                  {(['TODOS', 'ACTIVAS', 'INACTIVAS'] as EstadoFilter[]).map(k => (
                    <button key={k} type="button" onClick={() => changeEstado(k)} style={seg(estadoFilter === k)}>
                      {k === 'TODOS' ? 'Todos' : k === 'ACTIVAS' ? 'Activos' : 'Inactivos'}
                      <span style={{ fontSize: '.7rem', fontWeight: 700, color: T.text3 }}>{estadoCounts[k]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla */}
              {rows.length === 0 && !loading ? (
                <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}><IcoPaw size={24} /></div>
                  <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14 }}>Ninguna mascota coincide</div>
                  <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 380 }}>Revisa la búsqueda o quita los filtros para ver todas.</p>
                  <button type="button" onClick={resetFiltros}
                    style={{ height: 38, marginTop: 16, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                    Quitar filtros
                  </button>
                </div>
              ) : (
                <>
                  <div data-r="scrollbox" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem', minWidth: 960 }}>
                      <thead>
                        <tr style={{ background: T.surface3 }}>
                          {['Mascota', 'Especie', 'Propietario', 'Sexo', 'Peso', 'Estado', 'Acciones'].map((h, i) => (
                            <th key={h} style={{ textAlign: i === 6 ? 'right' : i === 4 ? 'right' : 'left', padding: (i === 0 || i === 6) ? '10px 18px' : '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(m => {
                          const ec  = espCol(m.especie);
                          const av  = avatarStyle(m.clienteNombre || 'X', 28, !m.activo);
                          const sexoColor = m.sexo === 'MACHO' ? '#2563eb' : m.sexo === 'HEMBRA' ? '#db2777' : T.text3;
                          const sexoLabel = m.sexo === 'MACHO' ? 'Macho' : m.sexo === 'HEMBRA' ? 'Hembra' : m.sexo === 'DESCONOCIDO' ? 'Desc.' : '—';
                          return (
                            <tr key={m.id} className="mp-row" style={{ borderTop: `1px solid ${T.lineSoft}`, opacity: m.activo ? 1 : 0.62 }}
                              onClick={() => openDetalle(m.id)}>
                              {/* Mascota */}
                              <td style={{ padding: '11px 18px', maxWidth: 280 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                                  <span style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center', flexShrink: 0, background: m.activo ? ec.bg : T.surface2, color: m.activo ? ec.color : T.text3 }}>
                                    <IcoPaw size={17} />
                                  </span>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.text }}>{m.nombre}</div>
                                    <div style={{ fontSize: '.75rem', color: T.text3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.raza || 'Sin raza registrada'}</div>
                                  </div>
                                </div>
                              </td>
                              {/* Especie */}
                              <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.78rem', fontWeight: 600, padding: '3px 9px 3px 7px', borderRadius: 20, background: T.surface2, color: T.text2 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: ec.color, flexShrink: 0 }} />
                                  {m.especie}
                                </span>
                              </td>
                              {/* Propietario */}
                              <td style={{ padding: '11px 14px', maxWidth: 240 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: av.bg, color: av.color, display: 'grid', placeItems: 'center', fontSize: '.66rem', fontWeight: 700, flexShrink: 0 }}>
                                    {initials(m.clienteNombre || '??')}
                                  </span>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.clienteNombre || '—'}</div>
                                    {(m.clienteTelefono || telefonoPorCliente[m.clienteId]) && (
                                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.text3, marginTop: 1 }}>{m.clienteTelefono || telefonoPorCliente[m.clienteId]}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {/* Sexo */}
                              <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                <span style={{ color: sexoColor, fontWeight: m.sexo === 'MACHO' || m.sexo === 'HEMBRA' ? 600 : undefined }}>{sexoLabel}</span>
                              </td>
                              {/* Peso */}
                              <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                <span style={{ color: m.pesoKg != null ? T.text2 : T.text3 }}>{fmtPeso(m.pesoKg)}</span>
                              </td>
                              {/* Estado */}
                              <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.75rem', fontWeight: 650, padding: '3px 9px 3px 7px', borderRadius: 20, ...(m.activo ? { color: T.ok, background: T.okSoft } : { color: T.text3, background: T.surface2 }) }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.activo ? T.ok : T.text3 }} />
                                  {m.activo ? 'Activa' : 'Inactiva'}
                                </span>
                              </td>
                              {/* Acciones */}
                              <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                                  <button type="button" title="Ver ficha" className="mp-action-btn" onClick={e => { e.stopPropagation(); openDetalle(m.id); }} style={btnIconStyle}><IcoEye /></button>
                                  {canEditar && (
                                    <button type="button" title="Editar" className="mp-action-btn" onClick={e => { e.stopPropagation(); openEdit(m.id); }} style={btnIconStyle}><IcoEdit /></button>
                                  )}
                                  {canEstado && m.activo && (
                                    <button type="button" title="Desactivar" className="mp-action-warn" onClick={e => { e.stopPropagation(); setConfirming({ id: m.id, accion: 'desactivar', mascota: { nombre: m.nombre, especie: m.especie, raza: m.raza, clienteNombre: m.clienteNombre } }); }} style={btnIconStyle}><IcoDeactivate /></button>
                                  )}
                                  {canEstado && !m.activo && (
                                    <button type="button" title="Activar" className="mp-action-ok" onClick={e => { e.stopPropagation(); setConfirming({ id: m.id, accion: 'activar', mascota: { nombre: m.nombre, especie: m.especie, raza: m.raza, clienteNombre: m.clienteNombre } }); }} style={btnIconStyle}><IcoActivate /></button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', borderTop: `1px solid ${T.lineSoft}` }}>
                    <span style={{ fontSize: '.8rem', color: T.text3 }}>
                      {totalElem > 0 ? `Mostrando ${firstElem}–${lastElem} de ${totalElem} mascota${totalElem !== 1 ? 's' : ''}` : 'Sin resultados'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}
                        style={{ height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.81rem', fontWeight: 600, borderRadius: 8, cursor: page === 0 ? 'not-allowed' : 'pointer', color: T.text2, background: T.surface, border: `1px solid ${T.line}`, opacity: page === 0 ? .5 : 1 }}>
                        Anterior
                      </button>
                      {pageNums.map((n, idx) => {
                        const prev = pageNums[idx - 1];
                        return (
                          <React.Fragment key={n}>
                            {prev !== undefined && n - prev > 1 && <span style={{ color: T.text3, fontSize: '.8rem', padding: '0 2px' }}>…</span>}
                            <button type="button" onClick={() => setPage(n)}
                              style={{ minWidth: 32, height: 32, padding: '0 6px', fontFamily: 'Inter,sans-serif', fontSize: '.81rem', fontWeight: n === page ? 700 : 600, borderRadius: 8, cursor: 'pointer', border: `1px solid ${n === page ? T.primaryLine : T.line}`, background: n === page ? T.primarySoft : T.surface, color: n === page ? T.primary : T.text2 }}>
                              {n + 1}
                            </button>
                          </React.Fragment>
                        );
                      })}
                      <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                        style={{ height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.81rem', fontWeight: 600, borderRadius: 8, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', color: T.text2, background: T.surface, border: `1px solid ${T.line}`, opacity: page >= totalPages - 1 ? .5 : 1 }}>
                        Siguiente
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Drawer Detalle ──────────────────────────────────────────────────── */}
      {(detalle || loadingDetalle) && createPortal(
        <div onClick={() => { setDetalle(null); setLoadingDetalle(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(9,11,16,.5)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'flex-end' }}>
          <aside onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 520, height: '100%', display: 'flex', flexDirection: 'column', background: T.surface, borderLeft: `1px solid ${T.line}`, boxShadow: '-20px 0 60px -30px rgba(0,0,0,.6)', animation: 'fx-slide-in .24s cubic-bezier(.4,0,.2,1)', fontFamily: 'Inter,sans-serif' }}>
            {loadingDetalle ? (
              <div style={{ padding: 48, textAlign: 'center', color: T.text3, flex: 1 }}>Cargando datos…</div>
            ) : detalle && (
              <>
                {/* Header */}
                <div style={{ padding: '20px 22px 18px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <span style={{ width: 52, height: 52, borderRadius: 15, display: 'grid', placeItems: 'center', flexShrink: 0, background: detalle.activo ? espCol(detalle.especie).bg : T.surface2, color: detalle.activo ? espCol(detalle.especie).color : T.text3 }}>
                      <IcoPaw size={24} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{detalle.nombre}</h2>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.75rem', fontWeight: 650, padding: '3px 8px 3px 6px', borderRadius: 20, ...(detalle.activo ? { color: T.ok, background: T.okSoft } : { color: T.text3, background: T.surface2 }) }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: detalle.activo ? T.ok : T.text3 }} />
                          {detalle.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <div style={{ fontSize: '.82rem', color: T.text3, marginTop: 4 }}>{detalle.especie}{detalle.raza ? ` · ${detalle.raza}` : ''}</div>
                    </div>
                    <button type="button" onClick={() => setDetalle(null)} aria-label="Cerrar"
                      style={{ width: 30, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <IcoX />
                    </button>
                  </div>
                  {/* Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                    {[
                      ...(edadDetalle ? [{ k: 'Edad', v: edadDetalle }] : []),
                      ...(detalle.sexo ? [{ k: 'Sexo', v: detalle.sexo === 'MACHO' ? 'Macho' : detalle.sexo === 'HEMBRA' ? 'Hembra' : 'Desc.' }] : []),
                      ...(detalle.pesoKg != null ? [{ k: 'Peso', v: fmtPeso(detalle.pesoKg) }] : []),
                      ...(detalle.esterilizado != null ? [{ k: 'Esterilizado/a', v: detalle.esterilizado ? 'Sí' : 'No' }] : []),
                    ].map(({ k, v }) => (
                      <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', fontSize: '.78rem', fontWeight: 600, color: T.text2, background: T.surface2, borderRadius: 8 }}>
                        <span style={{ fontSize: '.7rem', fontWeight: 500, color: T.text3 }}>{k}</span>{v}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Body */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px' }}>
                  {/* Propietario */}
                  <MonoLabel>Propietario</MonoLabel>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', border: `1px solid ${T.line}`, borderRadius: 12 }}>
                    {(() => { const av2 = avatarStyle(ownerDetalle?.nombre || '??', 40); return (
                      <span style={{ width: 40, height: 40, borderRadius: '50%', background: av2.bg, color: av2.color, display: 'grid', placeItems: 'center', fontSize: '.8rem', fontWeight: 700, flexShrink: 0 }}>
                        {initials(ownerDetalle?.nombre || '??')}
                      </span>
                    ); })()}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '.9rem', fontWeight: 650 }}>{ownerDetalle?.nombre || `Cliente #${detalle.clienteId}`}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', marginTop: 3, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.74rem', color: T.text3 }}>
                        {(ownerDetalle as unknown as Record<string, string>)?.numeroDocumento && <span>{(ownerDetalle as unknown as Record<string, string>).numeroDocumento}</span>}
                        {(ownerDetalle as unknown as Record<string, string>)?.telefono && <span>{(ownerDetalle as unknown as Record<string, string>).telefono}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Datos básicos */}
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, margin: '22px 0 10px' }}>Datos básicos</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 1, background: T.line, border: `1px solid ${T.line}`, borderRadius: 12, overflow: 'hidden' }}>
                    {[
                      ['Especie', detalle.especie],
                      ['Raza', detalle.raza || '—'],
                      ['Color / pelaje', detalle.color || '—'],
                      ['Fecha nacimiento', fmtFechaCorta(detalle.fechaNacimiento)],
                      ['Microchip', detalle.microchip || '—'],
                      ['Esterilizado/a', detalle.esterilizado === true ? 'Sí' : detalle.esterilizado === false ? 'No' : '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ padding: '11px 14px', background: T.surface2 }}>
                        <div style={{ fontSize: '.72rem', color: T.text3 }}>{k}</div>
                        <div style={{ marginTop: 3, fontSize: '.875rem', color: T.text, fontWeight: 500, ...(k === 'Microchip' && v !== '—' ? { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.8rem' } : {}) }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Expediente clínico */}
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, margin: '22px 0 10px' }}>Expediente clínico</div>
                  <div className="form-grid-2col" style={{ gap: 8 }}>
                    {PROX_SECTIONS.map(({ label, icon }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', border: `1px dashed ${T.line}`, borderRadius: 12 }}>
                        <span style={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 9, background: T.surface2, color: T.text3 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '.84rem', fontWeight: 650 }}>{label}</div>
                          <div style={{ fontSize: '.7rem', color: T.text3, marginTop: 1 }}>Próximamente</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: '.76rem', lineHeight: 1.5, color: T.text3 }}>Historia clínica, citas, tratamientos y vacunas se mostrarán aquí cuando estén disponibles.</div>
                </div>
                {/* Footer */}
                <div style={{ display: 'flex', gap: 9, padding: '16px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
                  {canEditar && (
                    <button type="button" onClick={() => { setDetalle(null); openEdit(detalle.id); }}
                      style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}` }}>
                      <IcoEdit /> Editar mascota
                    </button>
                  )}
                  {canEstado && (
                    <button type="button" title={detalle.activo ? 'Desactivar' : 'Activar'}
                      onClick={() => { setDetalle(null); setConfirming({ id: detalle.id, accion: detalle.activo ? 'desactivar' : 'activar', mascota: { nombre: detalle.nombre, especie: detalle.especie, raza: detalle.raza, clienteNombre: ownerDetalle?.nombre || '' } }); }}
                      style={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', border: 0, borderRadius: 11, cursor: 'pointer', background: detalle.activo ? T.warnSoft : T.okSoft, color: detalle.activo ? T.warn : T.ok }}>
                      {detalle.activo ? <IcoDeactivate /> : <IcoActivate />}
                    </button>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>,
        document.body
      )}

      {/* ── Modal Crear / Editar ────────────────────────────────────────────── */}
      {modalForm && createPortal(
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'fx-in .2s ease', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0, background: form.especie ? espCol(form.especie).bg : T.primarySoft, color: form.especie ? espCol(form.especie).color : T.primary }}>
                <IcoPaw size={18} />
              </span>
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
            {/* Form body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px 22px' }}>
              {/* Sección 1 · Propietario */}
              <MonoLabel>1 · Propietario</MonoLabel>
              <div style={{ marginTop: 10 }}>
                {modalForm === 'crear' && !ownerSeleccionado && (
                  <>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}><IcoSearch /></span>
                      <input type="text" value={ownerBusca} onChange={e => setOwnerBusca(e.target.value)}
                        placeholder="Buscar cliente por nombre o documento…"
                        style={{ ...inputBase, paddingLeft: 38, background: T.surface2, border: `1px solid ${T.line}` }}
                        onFocus={focusIn} onBlur={focusOut} />
                    </div>
                    {ownerResultados.length > 0 && (
                      <div style={{ display: 'grid', gap: 5, marginTop: 7, maxHeight: 200, overflowY: 'auto' }}>
                        {ownerResultados.map(c => {
                          const cav = avatarStyle(c.nombre, 32);
                          return (
                            <button key={c.id} type="button" className="mp-seg-owner"
                              onClick={() => { setField('clienteId', c.id); setOwnerBusca(''); }}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', fontFamily: 'Inter,sans-serif', textAlign: 'left', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}>
                              <span style={{ width: 32, height: 32, borderRadius: '50%', background: cav.bg, color: cav.color, display: 'grid', placeItems: 'center', fontSize: '.72rem', fontWeight: 700, flexShrink: 0 }}>{initials(c.nombre)}</span>
                              <span style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ display: 'block', fontSize: '.86rem', fontWeight: 600, color: T.text }}>{c.nombre}</span>
                                <span style={{ display: 'block', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.text3, marginTop: 2 }}>{(c as unknown as Record<string, string>).numeroDocumento || ''}</span>
                              </span>
                              {c.id != null && mascotasPorCliente[c.id] != null && (
                                <span style={{ fontSize: '.75rem', fontWeight: 600, color: T.text3, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {mascotasPorCliente[c.id]} {mascotasPorCliente[c.id] === 1 ? 'mascota' : 'mascotas'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {form.intento && !form.clienteId && (
                      <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>Selecciona un propietario.</div>
                    )}
                  </>
                )}
                {/* Tarjeta owner seleccionado */}
                {ownerSeleccionado && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 12, background: T.primarySoft, border: `1px solid ${T.primaryLine}` }}>
                    {(() => { const cav2 = avatarStyle(ownerSeleccionado.nombre, 32); return (
                      <span style={{ width: 32, height: 32, borderRadius: '50%', background: cav2.bg, color: cav2.color, display: 'grid', placeItems: 'center', fontSize: '.72rem', fontWeight: 700, flexShrink: 0 }}>{initials(ownerSeleccionado.nombre)}</span>
                    ); })()}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '.88rem', fontWeight: 650 }}>{ownerSeleccionado.nombre}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.text3, marginTop: 2 }}>{(ownerSeleccionado as unknown as Record<string, string>).numeroDocumento || ''}</div>
                    </div>
                    {modalForm === 'crear' && (
                      <button type="button" onClick={() => setField('clienteId', 0)}
                        style={{ height: 32, padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 600, color: T.primary, background: T.surface, border: `1px solid ${T.primaryLine}`, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Cambiar
                      </button>
                    )}
                    {modalForm === 'editar' && (
                      <span style={{ fontSize: '.72rem', color: T.text3 }}>No editable</span>
                    )}
                  </div>
                )}
              </div>

              {/* Divisor */}
              <div style={{ height: 1, background: T.lineSoft, margin: '22px -22px' }} />

              {/* Sección 2 · Mascota */}
              <MonoLabel>2 · Mascota</MonoLabel>
              <div className="mp-form-g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginTop: 12 }}>
                <LabelInput label="Nombre *" error={form.intento && !form.nombre.trim() ? 'El nombre es requerido.' : ''}>
                  <input value={form.nombre} onChange={e => setField('nombre', e.target.value)}
                    onFocus={focusIn} onBlur={focusOut} placeholder="Ej. Luna"
                    style={{ ...inputBase, ...(form.intento && !form.nombre.trim() ? { borderColor: T.bad, boxShadow: `0 0 0 3px ${T.badSoft}` } : {}) }} />
                </LabelInput>
                <LabelInput label="Especie *" error={form.intento && !form.especie.trim() ? 'La especie es requerida.' : ''}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center', flexShrink: 0, background: form.especie ? espCol(form.especie).bg : T.surface2, color: form.especie ? espCol(form.especie).color : T.text3, zIndex: 1, pointerEvents: 'none' }}>
                      <IcoPaw size={13} />
                    </span>
                    <select value={form.especie} onChange={e => setField('especie', e.target.value)}
                      onFocus={focusIn} onBlur={focusOut}
                      style={{ ...inputBase, paddingLeft: 42, appearance: 'none', cursor: 'pointer', ...(form.intento && !form.especie.trim() ? { borderColor: T.bad, boxShadow: `0 0 0 3px ${T.badSoft}` } : {}) }}>
                      <option value="">— Selecciona —</option>
                      {ESPECIE_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </LabelInput>
              </div>

              <div style={{ marginTop: 14 }}>
                <LabelInput label={<>Raza <span style={{ fontWeight: 500, color: T.text3 }}>(opcional)</span></> as unknown as string}>
                  <input value={form.raza ?? ''} onChange={e => setField('raza', e.target.value)}
                    onFocus={focusIn} onBlur={focusOut}
                    placeholder={RAZA_PH[form.especie] || 'Raza o variedad'}
                    style={inputBase} />
                </LabelInput>
              </div>

              <div className="mp-form-g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginTop: 14 }}>
                <LabelInput label="Sexo">
                  <div style={{ position: 'relative' }}>
                    <select value={form.sexo ?? ''} onChange={e => setField('sexo', e.target.value)}
                      onFocus={focusIn} onBlur={focusOut}
                      style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}>
                      <option value="">— No especificado —</option>
                      {SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </LabelInput>
                <LabelInput label="Peso">
                  <div style={{ position: 'relative' }}>
                    <input type="text" inputMode="decimal" value={form.pesoKg ?? ''}
                      onChange={e => { const v = e.target.value.replace(',', '.'); setField('pesoKg', v === '' ? undefined : isNaN(Number(v)) ? form.pesoKg : Number(v)); }}
                      onFocus={focusIn} onBlur={focusOut} placeholder="Ej. 5,2"
                      style={{ ...inputBase, paddingRight: 40, fontVariantNumeric: 'tabular-nums' }} />
                    <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.82rem', fontWeight: 600, color: T.text3, pointerEvents: 'none' }}>kg</span>
                  </div>
                </LabelInput>
              </div>

              <div className="mp-form-g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginTop: 14 }}>
                <div>
                  <LabelInput label="Fecha de nacimiento">
                    <input type="date" value={form.fechaNacimiento ?? ''}
                      onChange={e => setField('fechaNacimiento', e.target.value)}
                      onFocus={focusIn} onBlur={focusOut}
                      max={new Date().toISOString().slice(0, 10)}
                      style={inputBase} />
                  </LabelInput>
                  {form.fechaNacimiento && fmtEdad(form.fechaNacimiento) && (
                    <div style={{ fontSize: '.74rem', fontWeight: 600, color: T.primary, marginTop: 6 }}>
                      Tiene {fmtEdad(form.fechaNacimiento)}
                    </div>
                  )}
                </div>
                <LabelInput label="Color / pelaje">
                  <input value={form.color ?? ''} onChange={e => setField('color', e.target.value)}
                    onFocus={focusIn} onBlur={focusOut} placeholder="Ej. Marrón con blanco"
                    style={inputBase} />
                </LabelInput>
              </div>

              <div className="mp-form-g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginTop: 14 }}>
                <LabelInput label="Microchip">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}><IcoChip /></span>
                    <input type="text" inputMode="numeric" value={form.microchip ?? ''}
                      onChange={e => setField('microchip', e.target.value.replace(/\D/g, '').slice(0, 15))}
                      onFocus={focusIn} onBlur={focusOut} placeholder="15 dígitos"
                      style={{ ...inputBase, paddingLeft: 38, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.84rem', letterSpacing: '.03em' }} />
                  </div>
                </LabelInput>
                <LabelInput label="Esterilizado/a">
                  <div style={{ position: 'relative' }}>
                    <select value={form.esterilizado === true ? 'SI' : form.esterilizado === false ? 'NO' : ''}
                      onChange={e => setField('esterilizado', e.target.value === 'SI' ? true : e.target.value === 'NO' ? false : undefined)}
                      onFocus={focusIn} onBlur={focusOut}
                      style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}>
                      <option value="">— No especificado —</option>
                      <option value="SI">Sí</option>
                      <option value="NO">No</option>
                    </select>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><path d="m6 9 6 6 6-6" /></svg>
                  </div>
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

      {/* ── Modal Confirmar ─────────────────────────────────────────────────── */}
      {confirming && createPortal(
        <div onClick={() => { if (!confirmando) setConfirming(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'fx-in .2s ease', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}` }}>
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
              <button type="button" onClick={() => setConfirming(null)} disabled={confirmando} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <IcoX />
              </button>
            </div>
            {/* Body */}
            <div style={{ padding: '18px 22px 20px' }}>
              {/* Resumen mascota */}
              {confirming.mascota && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 12, background: T.surface2, marginBottom: 14 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center', flexShrink: 0, background: espCol(confirming.mascota.especie).bg, color: espCol(confirming.mascota.especie).color }}>
                    <IcoPaw size={18} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '.9rem', fontWeight: 650 }}>{confirming.mascota.nombre}</div>
                    <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 3 }}>
                      {confirming.mascota.especie}{confirming.mascota.raza ? ` · ${confirming.mascota.raza}` : ''}{confirming.mascota.clienteNombre ? ` · ${confirming.mascota.clienteNombre}` : ''}
                    </div>
                  </div>
                </div>
              )}
              <p style={{ fontSize: '.84rem', lineHeight: 1.55, color: T.text2, margin: 0 }}>
                {confirming.accion === 'activar'
                  ? 'La mascota volverá a estar disponible en el sistema. Podrás registrarle citas y consultas.'
                  : 'La mascota quedará deshabilitada. Su historial de citas y datos clínicos se conservan.'}
              </p>
            </div>
            {/* Footer */}
            <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}` }}>
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
    </>
  );
}
