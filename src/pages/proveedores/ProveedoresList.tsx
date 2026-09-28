import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { proveedorService } from '../../services/proveedor.service';
import { refreshOnboarding } from '../../utils/onboardingEvents';
import type { ProveedorDTO } from '../../types';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useCurrentUser } from '../../hooks/useCurrentUser';

// ─── Tokens Fluxus ────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const HUES = [262, 200, 160, 25, 330, 45, 290, 180];

function avatarStyle(nombre: string, size: number, apagado?: boolean): React.CSSProperties {
  let s = 0;
  for (let i = 0; i < nombre.length; i++) s = ((s * 31 + nombre.charCodeAt(i)) >>> 0);
  const hue = HUES[s % HUES.length];
  return {
    width: size, height: size, flexShrink: 0, display: 'grid', placeItems: 'center',
    borderRadius: Math.round(size * .3),
    fontSize: (size * .36).toFixed(1) + 'px', fontWeight: 700, letterSpacing: '.01em',
    ...(apagado
      ? { color: T.text3, background: T.surface2 }
      : { color: `oklch(0.45 0.13 ${hue})`, background: `oklch(0.94 0.04 ${hue})` }),
  };
}

function iniciales(nombre: string): string {
  return nombre
    .replace(/\b(S\.?A\.?C\.?|E\.?I\.?R\.?L\.?|S\.?R\.?L\.?|S\.?A\.?)\b/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0] || '')
    .join('')
    .toUpperCase();
}

function fmtTel(t: string | undefined): string {
  if (!t) return '—';
  const d = t.replace(/\D/g, '');
  if (d.length === 9) return d.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  if (d.length >= 6) return d.replace(/(\d{2})(\d{3})(\d+)/, '($1) $2 $3');
  return t;
}

function seg(on: boolean, h = 34): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: h, padding: '0 12px', fontFamily: 'Inter,sans-serif',
    fontSize: '.82rem', fontWeight: 600, border: 0, borderRadius: 8,
    cursor: 'pointer', whiteSpace: 'nowrap',
    ...(on
      ? { color: T.text, background: T.surface, boxShadow: `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` }
      : { color: T.text3, background: 'transparent' }),
  };
}

function pagBtn(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    minWidth: 32, height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif',
    fontSize: '.81rem', fontWeight: 600, borderRadius: 8,
    ...(active
      ? { color: '#fff', background: T.primary, border: `1px solid ${T.primary}`, cursor: 'pointer' }
      : disabled
        ? { color: T.text3, background: 'transparent', border: `1px solid ${T.line}`, cursor: 'not-allowed', opacity: .5 }
        : { color: T.text2, background: T.surface, border: `1px solid ${T.line}`, cursor: 'pointer' }),
  };
}

// ─── Confirm config ───────────────────────────────────────────────────────────
const CONFIRM_CFG = {
  activar: {
    tone: T.ok, toneSoft: T.okSoft,
    iconPath: 'M9 12.5 11.5 15 15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    titulo: 'Activar proveedor',
    sub: 'Volverá a estar disponible para compras.',
    texto: 'Podrás seleccionarlo al crear órdenes de compra, recepciones y gastos.',
    btnLabel: 'Activar proveedor',
  },
  desactivar: {
    tone: T.warn, toneSoft: T.warnSoft,
    iconPath: 'M15 9l-6 6M9 9l6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    titulo: 'Desactivar proveedor',
    sub: 'Puedes volver a activarlo cuando quieras.',
    texto: 'No aparecerá al crear órdenes de compra ni recepciones. Su historial de compras se conserva.',
    btnLabel: 'Desactivar',
  },
  eliminar: {
    tone: T.bad, toneSoft: T.badSoft,
    iconPath: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    titulo: 'Eliminar proveedor',
    sub: 'Esta acción no se puede deshacer.',
    texto: 'Se eliminará permanentemente. Si solo quieres ocultarlo de las compras, mejor desactívalo.',
    btnLabel: 'Eliminar permanentemente',
  },
} as const;

type ConfirmTipo = keyof typeof CONFIRM_CFG;
type DocFilter = 'TODOS' | 'CON_RUC' | 'SIN_RUC';

// ─── Form state ───────────────────────────────────────────────────────────────
interface FormState {
  id?: number;
  ruc: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  buscando: boolean;
  encontrado: string;
  intento: boolean;
}

const POR_PAGINA = 10;

export function ProveedoresList() {
  const { canCreate, canEdit, canDelete, canToggleState, canView } = usePermissions();
  const { tenantId } = useCurrentUser();
  const hasViewPermission = canView('PROVEEDORES');

  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  const [docFilter, setDocFilter] = useState<DocFilter>('TODOS');
  const [pagina, setPagina] = useState(1);

  // Modals
  const [modalForm, setModalForm] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [confirmTipo, setConfirmTipo] = useState<ConfirmTipo | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ProveedorDTO | null>(null);
  const [saving, setSaving] = useState(false);

  // Hover rows
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const busandoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load data ──────────────────────────────────────────────────────────────
  const cargar = async () => {
    try {
      setLoading(true);
      const data = await proveedorService.getAll();
      setProveedores(data);
    } catch {
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ─── Computed ───────────────────────────────────────────────────────────────
  const { filtered, total, activos, inactivos, conRuc, estadoCounts } = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const matchDoc = (p: ProveedorDTO) => {
      if (docFilter === 'CON_RUC') return !!p.ruc;
      if (docFilter === 'SIN_RUC') return !p.ruc;
      return true;
    };
    const matchQ = (p: ProveedorDTO) =>
      !q ||
      p.nombre.toLowerCase().includes(q) ||
      (p.ruc || '').includes(q) ||
      (p.contacto || '').toLowerCase().includes(q) ||
      (p.telefono || '').includes(q.replace(/\s/g, '')) ||
      (p.email || '').toLowerCase().includes(q);

    const base = proveedores.filter(p => matchDoc(p) && matchQ(p));
    const filtered = base.filter(p =>
      estadoFilter === 'TODOS' || (estadoFilter === 'ACTIVOS' ? p.activo : !p.activo)
    );
    return {
      filtered,
      total: proveedores.length,
      activos: proveedores.filter(p => p.activo).length,
      inactivos: proveedores.filter(p => !p.activo).length,
      conRuc: proveedores.filter(p => p.ruc && p.activo).length,
      estadoCounts: {
        TODOS: base.length,
        ACTIVOS: base.filter(p => p.activo).length,
        INACTIVOS: base.filter(p => !p.activo).length,
      },
    };
  }, [proveedores, busqueda, estadoFilter, docFilter]);

  const totalPag = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPag);
  const desde = (paginaActual - 1) * POR_PAGINA;
  const pageItems = filtered.slice(desde, desde + POR_PAGINA);

  // ─── Form helpers ────────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setForm({ ruc: '', nombre: '', contacto: '', telefono: '', email: '', direccion: '', buscando: false, encontrado: '', intento: false });
    setModalForm(true);
  };

  const abrirEditar = (p: ProveedorDTO) => {
    setForm({ id: p.id, ruc: p.ruc || '', nombre: p.nombre, contacto: p.contacto || '', telefono: p.telefono || '', email: p.email || '', direccion: p.direccion || '', buscando: false, encontrado: '', intento: false });
    setModalForm(true);
  };

  const closeForm = () => { setModalForm(false); setForm(null); };

  const setF = (patch: Partial<FormState>) =>
    setForm(prev => prev ? { ...prev, ...patch } : null);

  // ─── SUNAT lookup ────────────────────────────────────────────────────────────
  const consultarSunat = () => {
    if (!form || form.ruc.length !== 11) return;
    setF({ buscando: true });
    if (busandoRef.current) clearTimeout(busandoRef.current);
    busandoRef.current = setTimeout(() => {
      setF({ buscando: false, encontrado: '' });
    }, 700);
  };

  // ─── Validations ─────────────────────────────────────────────────────────────
  const rucError = (() => {
    if (!form) return '';
    if (!form.ruc) return '';
    if (form.ruc.length !== 11) return 'El RUC debe tener 11 dígitos.';
    if (!/^(10|20)/.test(form.ruc)) return 'El RUC debe empezar con 10 o 20.';
    const dup = proveedores.find(p => p.ruc === form.ruc && p.id !== form.id);
    if (dup) return 'Ya existe un proveedor con este RUC.';
    return '';
  })();

  const emailError = (() => {
    if (!form?.email) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Revisa el formato del email.';
  })();

  const nombreError = form?.intento && !form?.nombre.trim() ? 'Ingresa el nombre o razón social.' : '';

  const showRucError = !!rucError && (!!form?.intento || (form?.ruc || '').length >= 11);
  const puedeSunat = (form?.ruc || '').length === 11 && !rucError && !form?.buscando;

  const formOk = !!(form?.nombre.trim()) && !rucError && !emailError;

  // ─── CRUD ─────────────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form) return;
    if (!formOk) { setF({ intento: true }); return; }
    setSaving(true);
    try {
      const dto: ProveedorDTO = {
        ...(form.id ? { id: form.id } : {}),
        nombre: form.nombre.trim(),
        ruc: form.ruc || undefined,
        contacto: form.contacto.trim() || undefined,
        telefono: form.telefono || undefined,
        email: form.email.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        activo: true,
        tenantId,
      };
      if (form.id) {
        await proveedorService.update(form.id, dto);
        toast.success('Proveedor actualizado');
      } else {
        await proveedorService.create(dto);
        refreshOnboarding();
        toast.success('Proveedor registrado');
      }
      closeForm();
      cargar();
    } catch {
      toast.error('Error al guardar proveedor');
    } finally {
      setSaving(false);
    }
  };

  const ejecutarConfirm = async () => {
    if (!confirmTipo || !confirmTarget) return;
    try {
      if (confirmTipo === 'activar') await proveedorService.activate(confirmTarget.id!);
      else if (confirmTipo === 'desactivar') await proveedorService.deactivate(confirmTarget.id!);
      else await proveedorService.delete(confirmTarget.id!);
      const msgs = { activar: 'Proveedor activado', desactivar: 'Proveedor desactivado', eliminar: 'Proveedor eliminado' };
      toast.success(msgs[confirmTipo]);
      setConfirmTipo(null);
      setConfirmTarget(null);
      cargar();
    } catch {
      toast.error('Error al procesar la acción');
    }
  };

  // ─── Permission check ────────────────────────────────────────────────────────
  if (!hasViewPermission) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, gap: 12, color: T.text3 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        <span style={{ fontSize: '.9rem', fontWeight: 600 }}>Sin permiso para ver proveedores</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: T.text3 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const fieldBase = (err: boolean, padL = 38): React.CSSProperties => ({
    width: '100%', height: 44, padding: `0 13px 0 ${padL}px`,
    fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text,
    background: T.surface, border: `1px solid ${err ? T.bad : T.line}`,
    borderRadius: 10, outline: 'none',
    ...(err ? { boxShadow: `0 0 0 3px ${T.badSoft}` } : {}),
  });

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Proveedores</h1>
            <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Gestiona los proveedores de tu negocio</p>
          </div>
          {canCreate('PROVEEDORES') && (
            <button
              type="button"
              onClick={abrirNuevo}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}` }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              Nuevo proveedor
            </button>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
          {[
            { label: 'Total proveedores', val: total, sub: 'Registrados', color: undefined },
            { label: 'Activos', val: activos, sub: 'Disponibles para compras', color: T.ok },
            { label: 'Inactivos', val: inactivos, sub: 'Deshabilitados', color: inactivos ? T.bad : undefined },
            { label: 'Con RUC', val: conRuc, sub: 'Pueden emitirte factura', color: undefined },
          ].map(k => (
            <div key={k.label} style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>{k.label}</div>
              <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', ...(k.color ? { color: k.color } : { color: T.text }) }}>{k.val}</div>
              <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
            <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input
                type="text"
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                placeholder="Buscar por nombre, RUC o contacto…"
                style={{ width: '100%', height: 40, padding: '0 13px 0 38px', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.background = T.surface; e.target.style.borderColor = T.primary; e.target.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                onBlur={e => { e.target.style.background = T.surface2; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Estado filter */}
            <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0 }}>
              {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as const).map(k => (
                <button key={k} type="button" onClick={() => { setEstadoFilter(k); setPagina(1); }} style={seg(estadoFilter === k)}>
                  {k === 'TODOS' ? 'Todos' : k === 'ACTIVOS' ? 'Activos' : 'Inactivos'}
                  <span style={{ fontSize: '.7rem', fontWeight: 700, color: T.text3 }}>{estadoCounts[k]}</span>
                </button>
              ))}
            </div>

            {/* RUC filter */}
            <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0 }}>
              {([['TODOS', 'Todos'], ['CON_RUC', 'Con RUC'], ['SIN_RUC', 'Sin RUC']] as [DocFilter, string][]).map(([k, l]) => (
                <button key={k} type="button" onClick={() => { setDocFilter(k); setPagina(1); }} style={seg(docFilter === k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filtered.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem', minWidth: 960 }}>
                  <thead>
                    <tr style={{ background: T.surface3 }}>
                      {['Proveedor', 'RUC', 'Contacto', 'Estado', 'Acciones'].map((h, i) => (
                        <th key={h} style={{ textAlign: i === 4 ? 'right' : 'left', padding: i === 0 || i === 4 ? '10px 18px' : '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(p => {
                      const isHov = hoveredRow === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => abrirEditar(p)}
                          onMouseEnter={() => setHoveredRow(p.id ?? null)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{ borderTop: `1px solid ${T.lineSoft}`, cursor: 'pointer', background: isHov ? T.surface3 : 'transparent', opacity: p.activo ? 1 : .72 }}
                        >
                          {/* Proveedor */}
                          <td style={{ padding: '11px 18px', maxWidth: 340 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                              <span style={avatarStyle(p.nombre, 34, !p.activo)}>{iniciales(p.nombre)}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.text }}>{p.nombre}</div>
                                <div style={{ fontSize: '.75rem', color: T.text3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.direccion || 'Sin dirección'}</div>
                              </div>
                            </div>
                          </td>

                          {/* RUC */}
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {p.ruc && (
                                <span style={{ display: 'inline-flex', minWidth: 34, justifyContent: 'center', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 700, letterSpacing: '.04em', padding: '3px 6px', borderRadius: 6, color: T.primary, background: T.primarySoft }}>RUC</span>
                              )}
                              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.82rem', fontWeight: 600, color: p.ruc ? T.text : T.text3 }}>{p.ruc || 'Sin RUC'}</span>
                            </div>
                          </td>

                          {/* Contacto */}
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: '.84rem', fontWeight: 600, marginBottom: 4, color: T.text }}>{p.contacto || <span style={{ color: T.text3, fontWeight: 400 }}>Sin contacto</span>}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.82rem', color: T.text2 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: T.text3 }}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></svg>
                              <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{fmtTel(p.telefono)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.78rem', color: T.text3, marginTop: 4 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
                              <span>{p.email || '—'}</span>
                            </div>
                          </td>

                          {/* Estado */}
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, ...(p.activo ? { color: T.ok, background: T.okSoft } : { color: T.text3, background: T.surface2 }) }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.activo ? T.ok : T.text3 }} />
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                              {canEdit('PROVEEDORES') && (
                                <ActionBtn
                                  title="Editar proveedor"
                                  hoverColor={T.primary} hoverBg={T.primarySoft}
                                  onClick={() => abrirEditar(p)}
                                  icon={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>}
                                />
                              )}
                              {canToggleState('PROVEEDORES') && (
                                p.activo ? (
                                  <ActionBtn
                                    title="Desactivar proveedor"
                                    hoverColor={T.warn} hoverBg={T.warnSoft}
                                    onClick={() => { setConfirmTipo('desactivar'); setConfirmTarget(p); }}
                                    icon={<><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>}
                                  />
                                ) : (
                                  <ActionBtn
                                    title="Activar proveedor"
                                    hoverColor={T.ok} hoverBg={T.okSoft}
                                    onClick={() => { setConfirmTipo('activar'); setConfirmTarget(p); }}
                                    icon={<><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>}
                                  />
                                )
                              )}
                              {canDelete('PROVEEDORES') && (
                                <ActionBtn
                                  title="Eliminar proveedor"
                                  hoverColor={T.bad} hoverBg={T.badSoft}
                                  onClick={() => { setConfirmTipo('eliminar'); setConfirmTarget(p); }}
                                  icon={<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>}
                                />
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
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', borderTop: `1px solid ${T.lineSoft}` }}>
                <span style={{ fontSize: '.8rem', color: T.text3 }}>
                  Mostrando {desde + 1}–{Math.min(desde + POR_PAGINA, filtered.length)} de {filtered.length} {filtered.length === 1 ? 'proveedor' : 'proveedores'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <button type="button" onClick={() => setPagina(p => Math.max(1, p - 1))} style={pagBtn(false, paginaActual === 1)}>Anterior</button>
                  {Array.from({ length: totalPag }, (_, i) => i + 1).map(n => (
                    <button key={n} type="button" onClick={() => setPagina(n)} style={pagBtn(n === paginaActual, false)}>{n}</button>
                  ))}
                  <button type="button" onClick={() => setPagina(p => Math.min(totalPag, p + 1))} style={pagBtn(false, paginaActual === totalPag)}>Siguiente</button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></svg>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14, color: T.text }}>Ningún proveedor coincide con la búsqueda</div>
              <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 380 }}>
                Revisa el nombre o RUC, o quita los filtros para ver a todos.
              </p>
              <button
                type="button"
                onClick={() => { setBusqueda(''); setEstadoFilter('TODOS'); setDocFilter('TODOS'); setPagina(1); }}
                style={{ height: 38, marginTop: 16, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}
              >
                Quitar filtros
              </button>
            </div>
          )}
        </div>

      {/* ─── Modal Form ─────────────────────────────────────────────────────── */}
      {modalForm && form && createPortal(
        <div
          onClick={closeForm}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 620, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <span style={form.nombre.trim() ? avatarStyle(form.nombre, 38, false) : { width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, fontSize: '1.1rem', fontWeight: 600, color: T.primary, background: T.primarySoft }}>
                {form.nombre.trim() ? iniciales(form.nombre) : '+'}
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: T.text }}>{form.id ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{form.id ? 'Actualiza la información del proveedor.' : 'Los campos con * son obligatorios.'}</div>
              </div>
              <button type="button" onClick={closeForm} aria-label="Cerrar" style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 22px' }}>

              {/* Identificación */}
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, marginBottom: 10 }}>Identificación</div>

              {/* RUC */}
              <div>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>RUC</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M14 10h4" /><path d="M14 14h3" /></svg>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.ruc}
                      onChange={e => setF({ ruc: e.target.value.replace(/\D/g, '').slice(0, 11), encontrado: '' })}
                      placeholder="20123456789"
                      style={{ ...fieldBase(showRucError, 38), fontFamily: "'IBM Plex Mono',monospace", fontSize: '.88rem', letterSpacing: '.04em' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={consultarSunat}
                    disabled={!puedeSunat}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 15px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 650, borderRadius: 10, whiteSpace: 'nowrap', cursor: puedeSunat ? 'pointer' : 'not-allowed', ...(puedeSunat ? { color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}` } : { color: T.text3, background: T.surface2, border: 0 }) }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    {form.buscando ? 'Buscando…' : 'SUNAT'}
                  </button>
                </div>
                {showRucError && <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>{rucError}</div>}
                {form.encontrado && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.76rem', fontWeight: 600, color: T.ok, marginTop: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
                    {form.encontrado}
                  </div>
                )}
              </div>

              {/* Nombre */}
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Nombre o razón social *</label>
                <div style={{ position: 'relative' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></svg>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setF({ nombre: e.target.value })}
                    placeholder="Ej: Droguería Lima SAC"
                    style={fieldBase(!!nombreError, 38)}
                  />
                </div>
                {nombreError && <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>{nombreError}</div>}
              </div>

              {/* Contacto */}
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, margin: '22px 0 10px' }}>Contacto</div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Persona de contacto</label>
                <div style={{ position: 'relative' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <input
                    type="text"
                    value={form.contacto}
                    onChange={e => setF({ contacto: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    style={fieldBase(false, 38)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Teléfono</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.8rem', fontWeight: 600, color: T.text3, pointerEvents: 'none' }}>+51</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={form.telefono}
                      onChange={e => setF({ telefono: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                      placeholder="999 999 999"
                      style={{ ...fieldBase(false, 46), fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setF({ email: e.target.value.trim() })}
                      placeholder="proveedor@ejemplo.com"
                      style={fieldBase(!!emailError && !!form.intento, 38)}
                    />
                  </div>
                  {emailError && form.intento && <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>{emailError}</div>}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Dirección</label>
                <div style={{ position: 'relative' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={e => setF({ direccion: e.target.value })}
                    placeholder="Av. Ejemplo 123, Lima, Perú"
                    style={fieldBase(false, 38)}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <button type="button" onClick={closeForm} style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={guardar} disabled={saving} style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1, boxShadow: `0 8px 20px -10px ${T.primary}` }}>
                {saving ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Registrar proveedor')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Modal Confirm ──────────────────────────────────────────────────── */}
      {confirmTipo && confirmTarget && createPortal(
        (() => {
          const cfg = CONFIRM_CFG[confirmTipo];
          return (
            <div
              onClick={() => { setConfirmTipo(null); setConfirmTarget(null); }}
              style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}` }}>
                  <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: cfg.toneSoft, color: cfg.tone }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={cfg.iconPath} /></svg>
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: T.text }}>{cfg.titulo}</h2>
                    <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{cfg.sub}</div>
                  </div>
                  <button type="button" onClick={() => { setConfirmTipo(null); setConfirmTarget(null); }} aria-label="Cerrar" style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '18px 22px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 12, background: T.surface2 }}>
                    <span style={avatarStyle(confirmTarget.nombre, 38, !confirmTarget.activo)}>
                      {iniciales(confirmTarget.nombre)}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '.9rem', fontWeight: 650, lineHeight: 1.35, color: T.text }}>{confirmTarget.nombre}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.76rem', color: T.text3, marginTop: 3 }}>
                        {confirmTarget.ruc ? `RUC ${confirmTarget.ruc}` : 'Sin RUC'}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '.84rem', lineHeight: 1.55, color: T.text2, margin: '14px 0 0' }}>{cfg.texto}</p>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}` }}>
                  <button type="button" onClick={() => { setConfirmTipo(null); setConfirmTarget(null); }} style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={ejecutarConfirm} style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: cfg.tone, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${cfg.tone}` }}>
                    {cfg.btnLabel}
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}

// ─── ActionBtn helper ─────────────────────────────────────────────────────────
function ActionBtn({ title, hoverColor, hoverBg, onClick, icon }: {
  title: string;
  hoverColor: string;
  hoverBg: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', background: hov ? hoverBg : 'transparent', color: hov ? hoverColor : T.text3, border: 0, borderRadius: 8, cursor: 'pointer' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        {icon}
      </svg>
    </button>
  );
}
