import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usuarioService } from '../../services/usuario.service';
import type { Usuario } from '../../types';
import { Pagination } from '../../components/ui/Pagination';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { usePlan } from '../../hooks/usePlan';
import { useSucursalStore } from '../../store/sucursalStore';
import { useNavigate } from 'react-router-dom';
import { notify } from '../../lib/notify';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: '#f7f8fa', surface: '#ffffff', surface2: '#f1f3f7', surface3: '#fafbfc',
  line: '#e4e7ec', lineSoft: '#eef0f4',
  text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
  primary: '#3b47ef', primarySoft: '#eef0ff', primaryLine: '#cfd4fd',
  ok: '#0f9d6e', okSoft: '#e7f7f1', okLine: '#a7e9d3',
  bad: '#d63b3b', badSoft: '#fdeceb', badLine: '#f9c9c8',
  warn: '#b7791f', warnSoft: '#fdf6e7', warnLine: '#f0dfb4',
  shadow: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
} as const;

if (typeof document !== 'undefined' && !document.getElementById('fx-usr-kf')) {
  const s = document.createElement('style');
  s.id = 'fx-usr-kf';
  s.textContent = '@keyframes fx-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';
  document.head.appendChild(s);
}

// ─── Segmented button ────────────────────────────────────────────────────────
function seg(on: boolean, compact?: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: compact ? 32 : 34,
    padding: compact ? '0 10px' : '0 12px',
    fontFamily: 'Inter,sans-serif', fontSize: compact ? '.78rem' : '.82rem', fontWeight: 600,
    border: 0, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' as const,
    color: on ? T.text : T.text3,
    background: on ? T.surface : 'transparent',
    boxShadow: on ? `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` : undefined,
  };
}

// ─── MonoLabel ────────────────────────────────────────────────────────────────
function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3 }}>
      {children}
    </div>
  );
}

// ─── Input with icon ──────────────────────────────────────────────────────────
function IconInput({ icon, rightEl, children }: { icon: React.ReactNode; rightEl?: React.ReactNode; children: React.ReactElement }) {
  const child = children as React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
  const origStyle = (child.props.style as React.CSSProperties) ?? {};
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}>{icon}</span>
      {React.cloneElement(child, { style: { ...origStyle, paddingLeft: 38, paddingRight: rightEl ? 38 : origStyle.paddingRight } as React.CSSProperties })}
      {rightEl && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'grid', color: T.text3 }}>{rightEl}</span>}
    </div>
  );
}

function fxInput(extra?: React.CSSProperties): React.CSSProperties {
  return { width: '100%', height: 44, padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box' as const, ...extra };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const OKLCH_HUES = [262, 200, 160, 25, 330, 45, 290, 180];
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31 + s.charCodeAt(i)) >>> 0);
  return h;
}
function avatarStyle(email: string, activo: boolean, size = 34): React.CSSProperties {
  const hue = OKLCH_HUES[hashStr(email || 'u') % OKLCH_HUES.length];
  return {
    width: size, height: size, flexShrink: 0, display: 'grid', placeItems: 'center',
    borderRadius: Math.round(size * 0.28),
    fontSize: (size * 0.35).toFixed(1) + 'px', fontWeight: 700, letterSpacing: '.01em',
    ...(activo
      ? { color: `oklch(0.45 0.13 ${hue})`, background: `oklch(0.93 0.05 ${hue})` }
      : { color: T.text3, background: T.surface2 }),
  };
}
function iniciales(nombre: string, apellido?: string): string {
  const n = (nombre || '').trim();
  const a = (apellido || '').trim();
  return ((n[0] || '') + (a[0] || '')).toUpperCase() || n.slice(0, 2).toUpperCase();
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IcoPlus   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcoX      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const IcoEdit   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
const IcoOn     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>;
const IcoOff    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>;
const IcoTrash  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IcoResend = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
const IcoPhone  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>;
const IcoMail   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>;
const IcoPin    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoPerson = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoMailFull = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>;
const IcoLock   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoId     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h3"/></svg>;
const IcoSearch = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
const IcoInfo   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>;

// ─── Role meta (from HTML spec) ───────────────────────────────────────────────
type Role = 'ADMIN' | 'VENDEDOR' | 'GESTOR_INVENTARIO';
type EstadoFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';
type RolFilter = 'TODOS' | Role;

const ROL_META: Record<string, { label: string; desc: string; tone: string; icon: string }> = {
  ADMIN: {
    label: 'Administrador',
    desc: 'Acceso total: configuración, usuarios, facturación, reportes y todas las sedes.',
    tone: T.primary,
    icon: 'M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1ZM9 12l2 2 4-4',
  },
  VENDEDOR: {
    label: 'Vendedor',
    desc: 'Vende en el POS, abre y cierra caja, emite comprobantes y registra clientes.',
    tone: T.ok,
    icon: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0',
  },
  GESTOR_INVENTARIO: {
    label: 'Gestor de inventario',
    desc: 'Administra productos, movimientos, lotes, compras y proveedores.',
    tone: T.warn,
    icon: 'M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7ZM3.3 7 12 12l8.7-5M12 22V12',
  },
};

const ROL_PILL: Record<string, { color: string; bg: string }> = {
  ADMIN:             { color: T.primary, bg: T.primarySoft },
  VENDEDOR:          { color: T.ok,      bg: T.okSoft      },
  GESTOR_INVENTARIO: { color: T.warn,    bg: T.warnSoft    },
};

const TIPOS_DOC = [
  { key: '', label: 'Ninguno' },
  { key: 'DNI', label: 'DNI' },
  { key: 'CE', label: 'CE' },
  { key: 'PASAPORTE', label: 'Pasaporte' },
];

function fmtTel(t?: string | null) {
  if (!t) return '—';
  const d = t.replace(/\D/g, '');
  return d.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') || t;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function UsuariosList() {
  const tenantId        = useAuthStore(s => s.user?.tenantId);
  const currentUserId   = useAuthStore(s => s.user?.usuarioId);
  const currentUserRole = (useAuthStore(s => s.user?.rol) || 'VENDEDOR') as Role;

  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete, canToggleState, canView } = usePermissions();
  const { isBasico, limites } = usePlan();
  const { sucursales } = useSucursalStore();
  const isMultiLocal    = sucursales.length > 1;
  const hasViewPermission = canView('USUARIOS');

  const [usuarios,    setUsuarios]   = useState<Usuario[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [isFormOpen,  setIsFormOpen] = useState(false);
  const [editingId,   setEditingId]  = useState<number | null>(null);

  const [searchTerm,   setSearchTerm]   = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODOS');
  const [rolFilter,    setRolFilter]    = useState<RolFilter>('TODOS');
  const [currentPage,  setCurrentPage]  = useState(1);
  const POR_PAGINA = 10;

  // Form fields
  const [nombres,   setNombres]   = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fEmail,    setFEmail]    = useState('');
  const [fCel,      setFCel]      = useState('');
  const [fTipoDoc,  setFTipoDoc]  = useState('');
  const [fNumDoc,   setFNumDoc]   = useState('');
  const [fRol,      setFRol]      = useState<Role>('VENDEDOR');
  const [fSucursal, setFSucursal] = useState<number | null>(null);

  // Confirm dialog
  type CfType = 'desactivar' | 'activar' | 'eliminar' | 'reenviar';
  const [cf, setCf] = useState<{
    open: boolean; type: CfType; usuarioId: number | null; typedConfirm: string; running: boolean;
  }>({ open: false, type: 'desactivar', usuarioId: null, typedConfirm: '', running: false });

  useEffect(() => { if (hasViewPermission) fetchUsuarios(); else setLoading(false); }, [hasViewPermission]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, estadoFilter, rolFilter]);

  const fetchUsuarios = async () => {
    try { setLoading(true); setUsuarios(await usuarioService.getAll()); }
    catch (err) { notify.fromError(err, 'No se pudieron cargar los usuarios.'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setNombres(''); setApellidos(''); setFEmail(''); setFCel('');
    setFTipoDoc(''); setFNumDoc(''); setFRol('VENDEDOR'); setFSucursal(null);
    setEditingId(null); setIsFormOpen(false);
  };

  const openEdit = (u: Usuario) => {
    setNombres(u.nombre?.trim().split(' ')[0] || u.nombre || '');
    setApellidos(u.apellido || u.nombre?.trim().split(' ').slice(1).join(' ') || '');
    setFEmail(u.email || '');
    setFCel(u.numeroCelular || '');
    setFTipoDoc(u.tipoDocumento || '');
    setFNumDoc(u.numeroDocumento || '');
    setFRol((u.rolNombre as Role) || 'VENDEDOR');
    setFSucursal(u.sucursalId ?? null);
    setEditingId(u.id!);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombres.trim().length < 2) { notify.error('Ingresa el nombre del usuario.'); return; }
    if (apellidos.trim().length < 2) { notify.error('Ingresa los apellidos.'); return; }
    try {
      if (editingId) {
        await usuarioService.update(editingId, {
          nombre: nombres.trim(), apellido: apellidos.trim(), rolNombre: fRol, activo: true,
          tenantId: tenantId!, tipoDocumento: fTipoDoc || undefined,
          numeroDocumento: fNumDoc || undefined, numeroCelular: fCel || undefined,
          sucursalId: fRol === 'ADMIN' ? null : (fSucursal ?? null),
        } as Usuario);
        notify.success('Usuario actualizado exitosamente');
      } else {
        if (!canCreate('USUARIOS')) { notify.error('No tienes permisos para crear usuarios'); return; }
        await usuarioService.create({
          nombre: nombres.trim(), apellido: apellidos.trim(), email: fEmail, rolNombre: fRol,
          activo: true, tenantId: tenantId!, tipoDocumento: fTipoDoc || undefined,
          numeroDocumento: fNumDoc || undefined, numeroCelular: fCel || undefined,
          sucursalId: fRol === 'ADMIN' ? null : (fSucursal ?? null),
        } as Usuario);
        notify.success('Usuario creado. Se enviará un email de bienvenida.');
      }
      resetForm(); await fetchUsuarios();
    } catch (err: any) {
      notify.fromError(err, editingId ? 'No se pudo actualizar el usuario.' : 'No se pudo crear el usuario.');
    }
  };

  const openCf = (type: CfType, usuarioId: number) =>
    setCf({ open: true, type, usuarioId, typedConfirm: '', running: false });

  const executeCf = async () => {
    if (!cf.usuarioId) return;
    setCf(p => ({ ...p, running: true }));
    try {
      if (cf.type === 'desactivar')  { await usuarioService.deactivate(cf.usuarioId); notify.success('Usuario desactivado'); }
      else if (cf.type === 'activar')  { await usuarioService.activate(cf.usuarioId); notify.success('Usuario activado'); }
      else if (cf.type === 'eliminar') { await usuarioService.delete(cf.usuarioId); notify.success('Usuario eliminado'); }
      else if (cf.type === 'reenviar') { await usuarioService.reenviarActivacion(cf.usuarioId); notify.success('Email de activación reenviado'); }
      setCf(p => ({ ...p, open: false }));
      await fetchUsuarios();
    } catch (err) {
      notify.fromError(err, 'No se pudo completar la operación.');
      setCf(p => ({ ...p, running: false }));
    }
  };

  const { filtered, stats, estadoCounts, rolCounts } = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const matchQ = (u: Usuario) => !q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const base = usuarios.filter(u => matchQ(u) && (rolFilter === 'TODOS' || u.rolNombre === rolFilter));
    return {
      filtered: base.filter(u => estadoFilter === 'TODOS' || (estadoFilter === 'ACTIVOS' ? u.activo : !u.activo)),
      stats: {
        total:     usuarios.length,
        activos:   usuarios.filter(u => u.activo).length,
        inactivos: usuarios.filter(u => !u.activo).length,
        admins:    usuarios.filter(u => u.rolNombre === 'ADMIN').length,
      },
      estadoCounts: {
        TODOS: base.length,
        ACTIVOS: base.filter(u => u.activo).length,
        INACTIVOS: base.filter(u => !u.activo).length,
      },
      rolCounts: {
        ADMIN:             usuarios.filter(u => u.rolNombre === 'ADMIN').length,
        VENDEDOR:          usuarios.filter(u => u.rolNombre === 'VENDEDOR').length,
        GESTOR_INVENTARIO: usuarios.filter(u => u.rolNombre === 'GESTOR_INVENTARIO').length,
      },
    };
  }, [usuarios, searchTerm, estadoFilter, rolFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  const safePage   = Math.min(currentPage, totalPages);
  const desde      = (safePage - 1) * POR_PAGINA;
  const paginated  = filtered.slice(desde, desde + POR_PAGINA);

  const limiteAlcanzado = isBasico && stats.total >= limites.usuarios;
  const pctPlan = isBasico ? Math.min(100, Math.round((stats.total / limites.usuarios) * 100)) : 0;

  // Confirm data
  const cfUsuario = cf.usuarioId ? usuarios.find(u => u.id === cf.usuarioId) ?? null : null;
  const isUnicoAdmin = cf.type === 'eliminar' && cfUsuario?.rolNombre === 'ADMIN' &&
    usuarios.filter(u => u.rolNombre === 'ADMIN' && u.activo).length === 1;
  const canConfirm = !isUnicoAdmin || cf.typedConfirm === 'ELIMINAR';
  const canSubmitForm = nombres.trim().length >= 2 && apellidos.trim().length >= 2 && (editingId ? true : fEmail.includes('@'));

  const CF_DATA: Record<CfType, { iconPath: string; softBg: string; tone: string; titulo: string; sub: string; texto: string; btn: string }> = {
    desactivar: {
      tone: T.warn, softBg: T.warnSoft,
      iconPath: 'M15 9l-6 6M9 9l6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
      titulo: 'Desactivar usuario', sub: 'Puedes volver a activarlo cuando quieras.',
      texto: 'No podrá iniciar sesión. Sus ventas, cierres de caja y movimientos registrados se conservan.',
      btn: 'Desactivar',
    },
    activar: {
      tone: T.ok, softBg: T.okSoft,
      iconPath: 'm8.5 12 2.5 2.5 4.5-5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
      titulo: 'Activar usuario', sub: 'El usuario podrá iniciar sesión nuevamente.',
      texto: 'Podrá volver a iniciar sesión con sus credenciales anteriores.',
      btn: 'Activar',
    },
    eliminar: {
      tone: T.bad, softBg: T.badSoft,
      iconPath: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
      titulo: 'Eliminar usuario', sub: 'Esta acción no se puede deshacer.',
      texto: 'Perderá el acceso de forma permanente. Su historial de ventas y movimientos se conserva a su nombre. Si solo quieres quitarle el acceso por un tiempo, desactívalo.',
      btn: 'Eliminar usuario',
    },
    reenviar: {
      tone: T.primary, softBg: T.primarySoft,
      iconPath: 'm22 2-7 20-4-9-9-4ZM22 2 11 13',
      titulo: 'Reenviar activación', sub: 'El link de activación vence en 48 horas.',
      texto: 'Se enviará un nuevo email con el link para que el usuario establezca su contraseña.',
      btn: 'Reenviar email',
    },
  };
  const cfD    = CF_DATA[cf.type];
  const cfPill = cfUsuario ? (ROL_PILL[cfUsuario.rolNombre] ?? ROL_PILL['VENDEDOR']) : null;
  const cfMeta = cfUsuario ? (ROL_META[cfUsuario.rolNombre]  ?? ROL_META['VENDEDOR'])  : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.line}`, borderTopColor: T.primary, animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ─── Form Modal ───────────────────────────────────────────────────────────────
  const formModal = isFormOpen ? createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) resetForm(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 640, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'fx-in .2s ease', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          {editingId && (
            <span style={avatarStyle(fEmail || '', true, 38)}>{iniciales(nombres, apellidos)}</span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{editingId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{editingId ? fEmail : 'Invita a un colaborador y asígnale un rol'}</div>
          </div>
          <button type="button" onClick={resetForm}
            style={{ width: 30, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 22px' }}>
          <form id="usuario-form" onSubmit={handleSubmit}>

            {/* Sección 1 label */}
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3, marginBottom: 12 }}>1 · Datos del usuario</div>

            {/* Nombres / Apellidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Nombres <span style={{ color: T.bad }}>*</span></label>
                <IconInput icon={<IcoPerson />}>
                  <input type="text" value={nombres} onChange={e => setNombres(e.target.value)}
                    placeholder="Ej: Juan Carlos" required maxLength={80}
                    style={fxInput()}
                    onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }} />
                </IconInput>
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Apellidos <span style={{ color: T.bad }}>*</span></label>
                <input type="text" value={apellidos} onChange={e => setApellidos(e.target.value)}
                  placeholder="Ej: García López" required maxLength={80}
                  style={fxInput()}
                  onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }} />
              </div>
            </div>

            {/* Email / Celular */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 14, marginTop: 14 }}>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Email <span style={{ color: T.bad }}>*</span></label>
                <IconInput icon={<IcoMailFull />} rightEl={editingId ? <IcoLock /> : undefined}>
                  <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)}
                    placeholder="usuario@email.com" disabled={!!editingId} required
                    style={fxInput({ opacity: editingId ? .65 : 1, cursor: editingId ? 'not-allowed' as const : undefined })}
                    onFocus={e => { if (!editingId) { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; } }}
                    onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }} />
                </IconInput>
                {editingId && <div style={{ fontSize: '.74rem', color: T.text3, marginTop: 6 }}>No se puede cambiar al editar</div>}
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Celular <span style={{ fontWeight: 500, color: T.text3 }}>(opcional)</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.8rem', fontWeight: 600, color: T.text3, pointerEvents: 'none' as const }}>+51</span>
                  <input type="tel" inputMode="numeric" value={fCel} onChange={e => setFCel(e.target.value)}
                    placeholder="999 888 777"
                    style={fxInput({ paddingLeft: 46, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem' })}
                    onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }} />
                </div>
              </div>
            </div>

            {/* Documento */}
            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Documento <span style={{ fontWeight: 500, color: T.text3 }}>(opcional)</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 10 }}>
                <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10 }}>
                  {TIPOS_DOC.map(d => (
                    <button key={d.key} type="button"
                      onClick={() => { setFTipoDoc(d.key); if (!d.key) setFNumDoc(''); }}
                      style={seg(fTipoDoc === d.key, true)}>
                      {d.label}
                    </button>
                  ))}
                </div>
                <div style={{ position: 'relative', minWidth: 0 }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' as const, display: 'grid' }}><IcoId /></span>
                  <input type="text" value={fNumDoc} onChange={e => setFNumDoc(e.target.value)}
                    disabled={!fTipoDoc} maxLength={20}
                    placeholder={fTipoDoc ? 'Nro. de documento' : 'Selecciona tipo primero'}
                    style={fxInput({ paddingLeft: 38, opacity: !fTipoDoc ? .45 : 1, cursor: !fTipoDoc ? 'not-allowed' as const : undefined })}
                    onFocus={e => { if (fTipoDoc) { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; } }}
                    onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }} />
                </div>
              </div>
            </div>

            {/* Email notice (crear) */}
            {!editingId && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, padding: '11px 13px', borderRadius: 11, background: T.primarySoft, fontSize: '.8rem', lineHeight: 1.5, color: T.text2 }}>
                <span style={{ display: 'grid', color: T.primary, marginTop: 1, flexShrink: 0 }}><IcoMailFull /></span>
                <span>El usuario recibirá un <strong style={{ color: T.text }}>email de bienvenida</strong> con un link para establecer su propia contraseña. El link vence en 48 horas.</span>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: T.lineSoft, margin: '22px -22px' }} />

            {/* Sección 2 label */}
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3, marginBottom: 12 }}>2 · Rol y acceso</div>

            {currentUserRole === 'ADMIN' ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {(['ADMIN', 'VENDEDOR', 'GESTOR_INVENTARIO'] as Role[]).map(rolKey => {
                  const meta  = ROL_META[rolKey];
                  const selec = fRol === rolKey;
                  return (
                    <button key={rolKey} type="button" onClick={() => setFRol(rolKey)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${selec ? meta.tone : T.line}`, borderRadius: 12, background: selec ? (ROL_PILL[rolKey]?.bg ?? T.surface) : T.surface, cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter,sans-serif', transition: 'border .1s, background .1s' }}>
                      <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0, background: selec ? meta.tone : T.surface2 }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={selec ? '#fff' : T.text3} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={meta.icon}/></svg>
                      </span>
                      <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: '.9rem', fontWeight: 650, color: T.text }}>{meta.label}</span>
                        <span style={{ display: 'block', fontSize: '.76rem', lineHeight: 1.45, color: T.text3, marginTop: 3 }}>{meta.desc}</span>
                      </span>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selec ? meta.tone : T.line}`, display: 'grid', placeItems: 'center', flexShrink: 0, background: selec ? meta.tone : 'transparent' }}>
                        {selec && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '11px 14px', background: T.surface3, borderRadius: 10, fontSize: '.83rem', color: T.text3 }}>
                Tu rol (<strong style={{ color: T.text2 }}>{ROL_META[currentUserRole]?.label ?? currentUserRole}</strong>) no tiene permisos para crear usuarios.
              </div>
            )}

            {/* Sede */}
            {isMultiLocal && fRol !== 'ADMIN' && (
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Sede asignada <span style={{ color: T.bad }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                  {sucursales.map(s => {
                    const sel = fSucursal === s.id;
                    return (
                      <button key={s.id} type="button" onClick={() => setFSucursal(s.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${sel ? T.primary : T.line}`, borderRadius: 10, background: sel ? T.primarySoft : T.surface, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                        <span style={{ color: sel ? T.primary : T.text3, display: 'grid' }}><IcoPin /></span>
                        <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                          <span style={{ display: 'block', fontSize: '.86rem', fontWeight: 600, color: T.text }}>{s.nombre}</span>
                          {s.esPrincipal && <span style={{ display: 'block', fontSize: '.72rem', color: T.text3, marginTop: 1 }}>Sede principal</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {fRol === 'ADMIN' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '.78rem', color: T.text3 }}>
                <IcoInfo />
                Los administradores tienen acceso a todas las sedes automáticamente.
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <button type="button" onClick={resetForm}
            style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
            Cancelar
          </button>
          <button type="submit" form="usuario-form" disabled={!canSubmitForm}
            style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: canSubmitForm ? 'pointer' : 'not-allowed' as const, boxShadow: `0 8px 20px -10px ${T.primary}`, opacity: canSubmitForm ? 1 : 0.45 }}>
            {editingId ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // ─── Confirm Modal ────────────────────────────────────────────────────────────
  const confirmModal = cf.open && cfUsuario ? createPortal(
    <div onClick={e => { if (e.target === e.currentTarget && !cf.running) setCf(p => ({ ...p, open: false })); }}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 500, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'fx-in .2s ease', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}` }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', background: cfD.softBg, color: cfD.tone }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={cfD.iconPath}/></svg>
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{cfD.titulo}</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{cfD.sub}</div>
          </div>
          <button type="button" onClick={() => setCf(p => ({ ...p, open: false }))} disabled={cf.running}
            style={{ width: 30, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px 20px' }}>
          {/* User card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 12, background: T.surface2 }}>
            <span style={avatarStyle(cfUsuario.email || '', cfUsuario.activo ?? true, 36)}>{iniciales(cfUsuario.nombre || '', cfUsuario.apellido)}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '.9rem', fontWeight: 650, lineHeight: 1.35 }}>{cfUsuario.nombre || 'Sin nombre'}</div>
              <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 3, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{cfUsuario.email}</div>
            </div>
            {cfPill && cfMeta && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, color: cfPill.color, background: cfPill.bg, flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfMeta.tone }} />
                {cfMeta.label}
              </span>
            )}
          </div>

          <p style={{ fontSize: '.84rem', lineHeight: 1.55, color: T.text2, margin: '14px 0 0' }}>{cfD.texto}</p>

          {/* Único admin typing confirm */}
          {isUnicoAdmin && (
            <div style={{ marginTop: 14, padding: '13px 15px', borderRadius: 12, background: T.badSoft, border: `1px solid ${T.badLine}` }}>
              <div style={{ fontSize: '.84rem', fontWeight: 650, color: T.bad }}>Se eliminará toda la cuenta del negocio</div>
              <div style={{ fontSize: '.78rem', lineHeight: 1.5, color: T.text2, marginTop: 4 }}>
                Es el único administrador. Escribe <strong style={{ fontFamily: "'IBM Plex Mono',monospace", color: T.text }}>ELIMINAR</strong> para confirmar.
              </div>
              <input type="text" value={cf.typedConfirm} onChange={e => setCf(p => ({ ...p, typedConfirm: e.target.value }))}
                placeholder="ELIMINAR"
                style={{ width: '100%', height: 44, padding: '0 13px', fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '.06em', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', marginTop: 10, boxSizing: 'border-box' as const }}
                onFocus={e => { e.currentTarget.style.borderColor = T.bad; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.badSoft}`; }}
                onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}` }}>
          <button type="button" onClick={() => setCf(p => ({ ...p, open: false }))} disabled={cf.running}
            style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
            Cancelar
          </button>
          <button type="button" onClick={executeCf} disabled={cf.running || !canConfirm}
            style={{ flex: 1, height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: cfD.tone, border: 0, borderRadius: 11, cursor: (cf.running || !canConfirm) ? 'not-allowed' as const : 'pointer', opacity: (cf.running || !canConfirm) ? 0.5 : 1 }}>
            {cf.running ? '…' : cfD.btn}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter,sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Usuarios</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Gestiona quién accede al sistema y con qué permisos</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {isBasico && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '.78rem', color: T.text3, whiteSpace: 'nowrap' as const }}>Plan Básico</span>
              <div style={{ width: 72, height: 5, borderRadius: 3, background: T.surface3, overflow: 'hidden', border: `1px solid ${T.line}` }}>
                <div style={{ width: `${pctPlan}%`, height: '100%', borderRadius: 3, background: pctPlan >= 100 ? T.bad : pctPlan >= 80 ? T.warn : T.primary }} />
              </div>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.75rem', color: T.text3, whiteSpace: 'nowrap' as const }}>{stats.total} / {limites.usuarios}</span>
            </div>
          )}
          {canCreate('USUARIOS') && (
            <button type="button" onClick={() => { if (!limiteAlcanzado) { resetForm(); setIsFormOpen(true); } }} disabled={limiteAlcanzado}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: limiteAlcanzado ? 'not-allowed' as const : 'pointer', whiteSpace: 'nowrap' as const, boxShadow: `0 6px 16px -8px ${T.primary}`, opacity: limiteAlcanzado ? 0.5 : 1 }}>
              <IcoPlus /> Nuevo usuario
            </button>
          )}
        </div>
      </div>

      {/* Plan banner */}
      {limiteAlcanzado && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.primary, display: 'grid', placeItems: 'center', flexShrink: 0, color: '#fff' }}><IcoPlus /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '.875rem', fontWeight: 650, color: T.primary }}>Llegaste al límite de {limites.usuarios} usuarios del plan Básico</div>
            <div style={{ fontSize: '.82rem', color: T.text2, marginTop: 2 }}>Con el plan Pro puedes agregar usuarios ilimitados y asignarlos a varias sedes.</div>
          </div>
          <button type="button" onClick={() => navigate('/dashboard/suscripciones')} style={{ height: 36, padding: '0 16px', fontSize: '.83rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>Ver plan Pro</button>
        </div>
      )}

      {!hasViewPermission ? (
        <div style={{ padding: '56px 24px', textAlign: 'center', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
          <div style={{ width: 52, height: 52, margin: '0 auto 14px', borderRadius: 14, background: T.surface2, display: 'grid', placeItems: 'center', color: T.text3 }}>
            <IcoLock />
          </div>
          <div style={{ fontSize: '.95rem', fontWeight: 650, color: T.text }}>Sin acceso al listado</div>
          <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 360 }}>No tienes permisos para ver el listado de usuarios. Contacta al administrador.</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
            {([
              { label: 'Total usuarios',  value: stats.total,     sub: 'Registrados en el sistema', color: T.text  },
              { label: 'Activos',         value: stats.activos,   sub: 'Pueden iniciar sesión',     color: T.ok   },
              { label: 'Inactivos',       value: stats.inactivos, sub: stats.inactivos ? `Sin acceso · ${stats.inactivos} por activar` : 'Sin acceso', color: stats.inactivos ? T.bad : T.text },
              { label: 'Administradores', value: stats.admins,    sub: 'Control total',             color: T.text  },
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
            {/* Toolbar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 0 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' as const, display: 'grid' }}><IcoSearch /></span>
                <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Buscar por nombre o email…"
                  style={{ width: '100%', height: 40, padding: '0 13px 0 36px', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' as const }}
                  onFocus={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                  onBlur={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }} />
              </div>

              {/* Estado */}
              <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0 }}>
                {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as EstadoFilter[]).map(k => (
                  <button key={k} type="button" onClick={() => { setEstadoFilter(k); setCurrentPage(1); }} style={seg(estadoFilter === k)}>
                    {k === 'TODOS' ? 'Todos' : k === 'ACTIVOS' ? 'Activos' : 'Inactivos'}
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.7rem', color: T.text3 }}>{estadoCounts[k]}</span>
                  </button>
                ))}
              </div>

              {/* Rol */}
              <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0, overflowX: 'auto' }}>
                <button type="button" onClick={() => { setRolFilter('TODOS'); setCurrentPage(1); }} style={seg(rolFilter === 'TODOS')}>Todos los roles</button>
                {(['ADMIN', 'VENDEDOR', 'GESTOR_INVENTARIO'] as Role[]).map(r => (
                  <button key={r} type="button" onClick={() => { setRolFilter(r); setCurrentPage(1); }} style={{ ...seg(rolFilter === r), gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: ROL_META[r].tone, flexShrink: 0 }} />
                    {r === 'ADMIN' ? 'Administrador' : r === 'VENDEDOR' ? 'Vendedor' : 'Inventario'}
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.7rem', color: T.text3 }}>{rolCounts[r]}</span>
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14 }}>{usuarios.length === 0 ? 'Todavía no hay usuarios' : 'Sin resultados'}</div>
                <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 380 }}>
                  {usuarios.length === 0 ? 'Agrega colaboradores y asígnales un rol para que puedan acceder.' : 'No se encontraron usuarios que coincidan con la búsqueda.'}
                </p>
                {(searchTerm || estadoFilter !== 'TODOS' || rolFilter !== 'TODOS') && (
                  <button type="button" onClick={() => { setSearchTerm(''); setEstadoFilter('TODOS'); setRolFilter('TODOS'); setCurrentPage(1); }}
                    style={{ height: 38, marginTop: 16, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                    Quitar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
                    <thead>
                      <tr style={{ background: T.surface3 }}>
                        {['Usuario', 'Contacto', 'Rol', ...(isMultiLocal ? ['Sede'] : []), 'Estado', 'Acciones'].map((h, i, arr) => (
                          <th key={i} style={{ textAlign: i === arr.length - 1 ? 'right' : 'left', padding: (i === 0 || i === arr.length - 1) ? '10px 18px' : '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: T.text3, whiteSpace: 'nowrap' as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(u => {
                        const isSelf = u.id === currentUserId;
                        const pill   = ROL_PILL[u.rolNombre] ?? ROL_PILL['VENDEDOR'];
                        const meta   = ROL_META[u.rolNombre]  ?? ROL_META['VENDEDOR'];
                        return (
                          <tr key={u.id}
                            onClick={() => canEdit('USUARIOS') && openEdit(u)}
                            style={{ borderTop: `1px solid ${T.lineSoft}`, opacity: u.activo ? 1 : .8, cursor: canEdit('USUARIOS') ? 'pointer' : undefined }}
                            onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}>

                            {/* Usuario */}
                            <td style={{ padding: '11px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <div style={avatarStyle(u.email || '', u.activo ?? true, 34)}>{iniciales(u.nombre || '', u.apellido)}</div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.nombre || 'Sin nombre'}</span>
                                    {isSelf && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.62rem', fontWeight: 700, background: T.warnSoft, color: T.warn, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>TÚ</span>}
                                  </div>
                                  {u.numeroDocumento ? (
                                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.73rem', color: T.text3, marginTop: 2 }}>
                                      {u.tipoDocumento && <span style={{ marginRight: 3 }}>{u.tipoDocumento}</span>}{u.numeroDocumento}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '.75rem', color: T.text3, marginTop: 2 }}>Sin documento</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Contacto */}
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' as const }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.82rem', color: T.text2 }}>
                                <span style={{ display: 'grid', color: T.text3 }}><IcoMail /></span>
                                <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{u.email}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.78rem', color: T.text3, marginTop: 3 }}>
                                <span style={{ display: 'grid' }}><IcoPhone /></span>
                                <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{fmtTel(u.numeroCelular)}</span>
                              </div>
                            </td>

                            {/* Rol */}
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' as const }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, color: pill.color, background: pill.bg }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={meta.icon}/></svg>
                                {meta.label}
                              </span>
                            </td>

                            {/* Sede */}
                            {isMultiLocal && (
                              <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' as const }}>
                                {u.sucursalId ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.78rem', color: T.text2 }}>
                                    <span style={{ display: 'grid', color: T.text3 }}><IcoPin /></span>
                                    {sucursales.find(s => s.id === u.sucursalId)?.nombre ?? `Sede #${u.sucursalId}`}
                                  </span>
                                ) : <span style={{ fontSize: '.78rem', color: T.text3 }}>Todas</span>}
                              </td>
                            )}

                            {/* Estado */}
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' as const }}>
                              {u.activo ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, color: T.ok, background: T.okSoft }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.ok }} />Activo
                                </span>
                              ) : (
                                <>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, color: T.warn, background: T.warnSoft }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.warn }} />Por activar
                                  </span>
                                  <div style={{ fontSize: '.7rem', color: T.text3, marginTop: 4 }}>Aún no crea su contraseña</div>
                                </>
                              )}
                            </td>

                            {/* Acciones */}
                            <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' as const }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'inline-flex', gap: 2 }}>
                                {currentUserRole === 'ADMIN' && !u.activo && (
                                  <button type="button" onClick={() => openCf('reenviar', u.id!)} title="Reenviar email de activación"
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.primarySoft; e.currentTarget.style.color = T.primary; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoResend />
                                  </button>
                                )}
                                {canEdit('USUARIOS') && (
                                  <button type="button" onClick={() => openEdit(u)} title="Editar usuario"
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.primarySoft; e.currentTarget.style.color = T.primary; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoEdit />
                                  </button>
                                )}
                                {canToggleState('USUARIOS') && !isSelf && u.activo && (
                                  <button type="button" onClick={() => openCf('desactivar', u.id!)} title="Desactivar"
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.warnSoft; e.currentTarget.style.color = T.warn; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoOff />
                                  </button>
                                )}
                                {canToggleState('USUARIOS') && !isSelf && !u.activo && (
                                  <button type="button" onClick={() => openCf('activar', u.id!)} title="Activar"
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.okSoft; e.currentTarget.style.color = T.ok; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoOn />
                                  </button>
                                )}
                                {canDelete('USUARIOS') && !isSelf && (
                                  <button type="button" onClick={() => openCf('eliminar', u.id!)} title="Eliminar"
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.badSoft; e.currentTarget.style.color = T.bad; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoTrash />
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

                {/* Footer */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', borderTop: `1px solid ${T.lineSoft}`, fontSize: '.8rem', color: T.text3 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {desde + 1}–{Math.min(desde + POR_PAGINA, filtered.length)} de {filtered.length} usuario{filtered.length !== 1 ? 's' : ''}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 10 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Solo los administradores pueden crear otros administradores
                  </span>
                  <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={POR_PAGINA} />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {formModal}
      {confirmModal}
    </div>
  );
}
