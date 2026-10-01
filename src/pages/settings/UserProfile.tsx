import { useEffect, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import type { UserProfile as UserProfileType } from '../../services/auth.service';
import { usuarioService } from '../../services/usuario.service';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { notify } from '../../lib/notify';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';

// ─── helpers ────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const AVATAR_BG: Record<string, string> = {
  A: '#3b47ef', B: '#7147d4', C: '#0f9d6e', D: '#b7791f', E: '#d63b3b',
  F: '#2563c9', G: '#e64980', H: '#20b2aa', I: '#6d28d9', J: '#3b47ef',
  K: '#7147d4', L: '#0f9d6e', M: '#b7791f', N: '#d63b3b', O: '#2563c9',
  P: '#e64980', Q: '#20b2aa', R: '#6d28d9', S: '#3b47ef', T: '#7147d4',
  U: '#0f9d6e', V: '#b7791f', W: '#d63b3b', X: '#2563c9', Y: '#e64980', Z: '#20b2aa',
};
function avatarBg(name: string) {
  return AVATAR_BG[(name[0] || 'A').toUpperCase()] || '#3b47ef';
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDatetime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function pwdScore(pwd: string) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

const ROLES: Record<string, string> = {
  ADMIN: 'Administrador', VENDEDOR: 'Vendedor', CAJERO: 'Cajero',
  GERENTE: 'Gerente', ALMACENERO: 'Almacenero',
};

// ─── icons ──────────────────────────────────────────────────────────────────
const IcoUser = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoShield = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/></svg>;
const IcoEdit = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
const IcoKey = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>;
const IcoClock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
const IcoX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IcoLock = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoEye = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoEyeOff = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17.9 17.9A10 10 0 0 1 12 19c-7 0-10-7-10-7a17.3 17.3 0 0 1 5.1-6.1M9.9 4.2A9.8 9.8 0 0 1 12 4c7 0 10 7 10 7a17.4 17.4 0 0 1-2.1 3.3"/><path d="m2 2 20 20"/></svg>;
const IcoCheck = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>;
const IcoInfo = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>;
const IcoWarn = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;

// ─── small field icon ────────────────────────────────────────────────────────
const FieldIcons: Record<string, ReactElement> = {
  nombres:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  apellidos:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  doc:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4"/><path d="M14 14h3"/></svg>,
  cel:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>,
  email:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>,
  empresa:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>,
};

// ─── component ───────────────────────────────────────────────────────────────
export function UserProfile() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { isDark } = useThemeStore();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  // edit modal
  const [mEditar, setMEditar] = useState(false);
  const [editNombres,     setEditNombres]     = useState('');
  const [editApellidos,   setEditApellidos]   = useState('');
  const [editTipo,        setEditTipo]        = useState('');
  const [editNum,         setEditNum]         = useState('');
  const [editCel,         setEditCel]         = useState('');
  const [saving, setSaving] = useState(false);
  const [nombresErr, setNombresErr] = useState('');
  const [apellidosErr, setApellidosErr] = useState('');

  // pwd modal
  const [mPwd, setMPwd] = useState(false);
  const [pActual,   setPActual]   = useState('');
  const [pNueva,    setPNueva]    = useState('');
  const [pConfirma, setPConfirma] = useState('');
  const [showAct,   setShowAct]   = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pActualErr,  setPActualErr]  = useState('');
  const [pNuevaErr,   setPNuevaErr]   = useState('');
  const [pConfirmaErr, setPConfirmaErr] = useState('');

  const C = isDark ? {
    bg: '#0d1117', surface: '#11141c', surface2: '#1a1f2b', surface3: '#161b25',
    line: '#242a38', lineSoft: '#1e2330', lineFaint: '#1a1f2b',
    text: '#e9ecf2', text2: '#a8b1c2', text3: '#8892a4',
    primary: '#5c67f5', primarySoft: 'rgba(92,103,245,.15)', primaryLine: 'rgba(92,103,245,.3)',
    ok: '#10b981', okSoft: 'rgba(16,185,129,.12)',
    warn: '#d97706', warnSoft: 'rgba(217,119,6,.1)', warnLine: 'rgba(217,119,6,.25)',
    bad: '#ff6b64', badSoft: 'rgba(255,107,100,.12)',
    info: '#5c67f5', infoSoft: 'rgba(92,103,245,.12)',
    shadow: '0 1px 2px rgba(0,0,0,.4), 0 1px 3px rgba(0,0,0,.35)',
    shadowLg: '0 30px 80px -30px rgba(0,0,0,.7)',
  } : {
    bg: '#f7f8fa', surface: '#ffffff', surface2: '#f1f3f7', surface3: '#fafbfc',
    line: '#e4e7ec', lineSoft: '#eef0f4', lineFaint: '#f3f5f8',
    text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
    primary: '#3b47ef', primarySoft: '#eef0ff', primaryLine: '#cfd4fd',
    ok: '#0f9d6e', okSoft: '#e7f7f1',
    warn: '#b7791f', warnSoft: '#fdf6e7', warnLine: '#f0dfb4',
    bad: '#d63b3b', badSoft: '#fdeceb',
    info: '#2563c9', infoSoft: '#e8f0fd',
    shadow: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
    shadowLg: '0 30px 80px -30px rgba(0,0,0,.45)',
  };

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await authService.obtenerPerfil();
      setProfile(data);
      setEditNombres(data.nombre || '');
      setEditApellidos(data.apellido || '');
      setEditTipo(data.tipoDocumento || '');
      setEditNum(data.numeroDocumento || '');
      setEditCel(data.numeroCelular || '');
    } catch (err) {
      notify.fromError(err, 'Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // ── open edit ─────────────────────────────────────────────────────────────
  const openEditar = () => {
    if (!profile) return;
    setEditNombres(profile.nombre || '');
    setEditApellidos(profile.apellido || '');
    setEditTipo(profile.tipoDocumento || '');
    setEditNum(profile.numeroDocumento || '');
    setEditCel(profile.numeroCelular || '');
    setNombresErr(''); setApellidosErr('');
    setMEditar(true);
  };

  // ── save profile ──────────────────────────────────────────────────────────
  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    let ok = true;
    if (editNombres.trim().length < 2) { setNombresErr('Ingresa tus nombres'); ok = false; } else setNombresErr('');
    if (editApellidos.trim().length < 2) { setApellidosErr('Ingresa tus apellidos'); ok = false; } else setApellidosErr('');
    if (!ok || !profile) return;
    setSaving(true);
    try {
      await usuarioService.update(profile.usuarioId, {
        nombre: editNombres.trim(),
        apellido: editApellidos.trim(),
        rolNombre: profile.rol,
        tenantId: profile.tenantId,
        activo: profile.activo,
        tipoDocumento: editTipo || undefined,
        numeroDocumento: editNum || undefined,
        numeroCelular: editCel || undefined,
      } as any);
      notify.success('Perfil actualizado', { detail: 'Tus datos fueron guardados correctamente.' });
      setMEditar(false);
      await fetchProfile();
    } catch (err: any) {
      const b = err.response?.data;
      const msg = b?.mensaje || b?.message || (b?.mensajes ? Object.values(b.mensajes).join(' • ') : null) || 'Error al actualizar perfil';
      notify.fromError(err, msg);
    } finally {
      setSaving(false);
    }
  };

  // ── change pwd ────────────────────────────────────────────────────────────
  const closePwd = () => {
    setMPwd(false);
    setPActual(''); setPNueva(''); setPConfirma('');
    setPActualErr(''); setPNuevaErr(''); setPConfirmaErr('');
  };
  const cambiarPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    let ok = true;
    if (!pActual) { setPActualErr('Ingresa tu contraseña actual'); ok = false; } else setPActualErr('');
    if (pNueva.length < 8) { setPNuevaErr('Mínimo 8 caracteres'); ok = false; } else setPNuevaErr('');
    if (pNueva !== pConfirma) { setPConfirmaErr('Las contraseñas no coinciden'); ok = false; } else setPConfirmaErr('');
    if (!ok) return;
    setPwdSaving(true);
    try {
      await authService.cambiarContraseña({ contraseñaActual: pActual, nuevaContraseña: pNueva, confirmarContraseña: pConfirma });
      notify.success('Contraseña cambiada', { detail: 'Se cerrará tu sesión para que ingreses de nuevo.' });
      closePwd();
      setTimeout(() => { logout(); navigate('/login'); }, 1600);
    } catch (err) {
      notify.fromError(err, 'Error al cambiar contraseña');
    } finally {
      setPwdSaving(false);
    }
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const inputSt = (err?: string): React.CSSProperties => ({
    width: '100%', height: '44px', padding: '0 13px',
    fontFamily: 'Inter, sans-serif', fontSize: '.9rem', color: C.text,
    background: C.surface, border: `1px solid ${err ? C.bad : C.line}`, borderRadius: '10px',
    outline: 'none', boxSizing: 'border-box',
  });
  const pwdInputSt = (err?: string): React.CSSProperties => ({
    ...inputSt(err), paddingLeft: '42px', paddingRight: '44px',
  });

  const monoLabel: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '.68rem', fontWeight: 600,
    letterSpacing: '.09em', textTransform: 'uppercase', color: C.text3,
    margin: '22px 0 12px',
  };

  // pwd rules
  const sc = pwdScore(pNueva);
  const rules = [
    { label: 'Mínimo 8 caracteres', ok: pNueva.length >= 8 },
    { label: 'Una mayúscula',        ok: /[A-Z]/.test(pNueva) },
    { label: 'Un número',            ok: /[0-9]/.test(pNueva) },
    { label: 'Un símbolo',           ok: /[^A-Za-z0-9]/.test(pNueva) },
  ];
  const pwdBarColors = ['#d63b3b', '#f59e0b', '#f59e0b', '#0f9d6e', '#0f9d6e'];
  const pwdLabels    = ['', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];

  if (loading) return <LoadingSpinner />;
  if (!profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: C.text3, fontFamily: 'Inter, sans-serif' }}>
      No se pudo cargar el perfil
    </div>
  );

  const ini        = getInitials(`${profile.nombre} ${profile.apellido || ''}`);
  const avatarBgColor = avatarBg(profile.nombre || 'U');
  const rolLabel   = ROLES[profile.rol] || profile.rol;
  const completo   = !!(profile.numeroCelular);
  const completoPct = completo ? 100 : 83;

  // ── data fields ───────────────────────────────────────────────────────────
  type FieldDef = { key: string; icon: ReactElement; label: string; value: string; sub?: string; empty?: boolean };
  const dataFields: FieldDef[] = [
    { key: 'nombres',  icon: FieldIcons.nombres,  label: 'Nombres',  value: profile.nombre || '—', empty: !profile.nombre },
    { key: 'apellidos',icon: FieldIcons.apellidos,label: 'Apellidos',value: profile.apellido || '—', empty: !profile.apellido },
    { key: 'doc',      icon: FieldIcons.doc,       label: 'Documento',value: profile.tipoDocumento && profile.numeroDocumento ? `${profile.tipoDocumento} · ${profile.numeroDocumento}` : 'No registrado', empty: !profile.tipoDocumento },
    { key: 'cel',      icon: FieldIcons.cel,       label: 'Celular',  value: profile.numeroCelular ? `+51 ${profile.numeroCelular}` : 'No registrado', empty: !profile.numeroCelular },
    { key: 'email',    icon: FieldIcons.email,     label: 'Email',    value: profile.email, sub: 'Lo usas para iniciar sesión. Solo un administrador puede cambiarlo.' },
    { key: 'empresa',  icon: FieldIcons.empresa,   label: 'Empresa',  value: profile.nombreFarmacia || '—' },
  ];

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.text }}>

      {/* page header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0, color: C.text }}>Mi Perfil</h1>
          <p style={{ fontSize: '.865rem', color: C.text3, margin: '7px 0 0' }}>Gestiona tu información de perfil y seguridad</p>
        </div>
        <button type="button" onClick={openEditar}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 15px', fontFamily: 'Inter, sans-serif', fontSize: '.855rem', fontWeight: 600, color: C.text2, background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <IcoEdit />&nbsp;Editar perfil
        </button>
      </div>

      {/* two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: '18px', marginTop: '22px', alignItems: 'start' }}>

        {/* LEFT column */}
        <div style={{ display: 'grid', gap: '14px', minWidth: 0 }}>

          {/* avatar card */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>
            {/* banner */}
            <div style={{ height: '80px', background: `linear-gradient(135deg, ${avatarBgColor}cc 0%, ${avatarBgColor}55 100%)` }} />
            {/* avatar + info */}
            <div style={{ padding: '0 22px 20px', marginTop: '-44px', textAlign: 'center' }}>
              <span style={{ display: 'inline-grid', placeItems: 'center', width: '88px', height: '88px', borderRadius: '50%', background: avatarBgColor, color: '#fff', fontSize: '1.6rem', fontWeight: 800, border: `4px solid ${C.surface}`, boxShadow: `0 0 0 2px ${C.line}` }}>
                {ini}
              </span>
              <div style={{ fontSize: '1.12rem', fontWeight: 700, letterSpacing: '-.02em', marginTop: '12px', color: C.text }}>{profile.nombre} {profile.apellido || ''}</div>
              <div style={{ fontSize: '.82rem', color: C.text3, marginTop: '3px', wordBreak: 'break-all' }}>{profile.email}</div>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '.74rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: '20px', color: C.primary, background: C.primarySoft, border: `1px solid ${C.primaryLine}` }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/></svg>
                  {rolLabel}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '.74rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: '20px', color: profile.activo ? C.ok : C.bad, background: profile.activo ? C.okSoft : C.badSoft }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: profile.activo ? C.ok : C.bad, flexShrink: 0 }} />
                  {profile.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            {/* stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '1px', background: C.lineSoft, borderTop: `1px solid ${C.lineSoft}` }}>
              <div style={{ padding: '12px 16px', background: C.surface }}>
                <div style={{ fontSize: '.7rem', color: C.text3 }}>Miembro desde</div>
                <div style={{ fontSize: '.86rem', fontWeight: 650, marginTop: '3px', color: C.text }}>{fmtDate(profile.createdAt)}</div>
              </div>
              <div style={{ padding: '12px 16px', background: C.surface }}>
                <div style={{ fontSize: '.7rem', color: C.text3 }}>Último acceso</div>
                <div style={{ fontSize: '.86rem', fontWeight: 650, marginTop: '3px', color: C.text }}>{profile.ultimoLogin ? 'Hoy' : '—'}</div>
              </div>
            </div>
          </div>

          {/* profile completion */}
          {!completo && (
            <div style={{ padding: '16px 18px', background: C.surface, border: `1px solid ${C.warnLine}`, borderRadius: '14px', boxShadow: C.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '.86rem', fontWeight: 650, color: C.text }}>Completa tu perfil</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.78rem', fontWeight: 700, color: C.warn }}>{completoPct}%</span>
              </div>
              <div style={{ height: '6px', marginTop: '10px', borderRadius: '6px', background: C.surface2, overflow: 'hidden' }}>
                <div style={{ width: `${completoPct}%`, height: '100%', borderRadius: '6px', background: C.warn }} />
              </div>
              <div style={{ fontSize: '.78rem', lineHeight: 1.5, color: C.text2, marginTop: '9px' }}>
                Agrega tu celular para que tus compañeros y el administrador puedan contactarte.
              </div>
              <button type="button" onClick={openEditar}
                style={{ marginTop: '12px', height: '34px', padding: '0 13px', fontFamily: 'Inter, sans-serif', fontSize: '.8rem', fontWeight: 650, color: C.warn, background: C.warnSoft, border: 0, borderRadius: '9px', cursor: 'pointer' }}>
                Completar ahora
              </button>
            </div>
          )}
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'grid', gap: '18px', minWidth: 0 }}>

          {/* Información personal */}
          <section style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '18px 20px 16px', borderBottom: `1px solid ${C.lineSoft}` }}>
              <span style={{ width: '40px', height: '40px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '11px', background: C.primarySoft, color: C.primary }}>
                <IcoUser />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: '1.02rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: C.text }}>Información personal</h2>
                <p style={{ fontSize: '.82rem', color: C.text3, margin: '4px 0 0' }}>Datos de tu cuenta y empresa</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '1px', background: C.lineSoft }}>
              {dataFields.map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px 18px', background: C.surface, minWidth: 0 }}>
                  <span style={{ width: '34px', height: '34px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '10px', background: C.surface2, color: C.text3 }}>
                    {f.icon}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '.74rem', color: C.text3 }}>{f.label}</div>
                    <div style={{ fontSize: '.88rem', fontWeight: f.empty ? 400 : 650, marginTop: '3px', color: f.empty ? C.text3 : C.text, fontStyle: f.empty ? 'italic' : 'normal' }}>
                      {f.value}
                    </div>
                    {f.sub && <div style={{ fontSize: '.7rem', color: C.text3, marginTop: '3px', lineHeight: 1.4 }}>{f.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Seguridad */}
          <section style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '18px 20px 16px', borderBottom: `1px solid ${C.lineSoft}` }}>
              <span style={{ width: '40px', height: '40px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '11px', background: C.okSoft, color: C.ok }}>
                <IcoShield />
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.02rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: C.text }}>Seguridad</h2>
                <p style={{ fontSize: '.82rem', color: C.text3, margin: '4px 0 0' }}>Protege tu cuenta cambiando tu contraseña</p>
              </div>
            </div>
            {/* Contraseña row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
              <span style={{ width: '34px', height: '34px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '10px', background: C.surface2, color: C.text3 }}>
                <IcoKey />
              </span>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '.9rem', fontWeight: 650, color: C.text }}>Contraseña</div>
                <div style={{ fontSize: '.8rem', color: C.text3, marginTop: '2px' }}>Última vez cambiada hace más de 6 meses</div>
              </div>
              <button type="button" onClick={() => setMPwd(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 15px', fontFamily: 'Inter, sans-serif', fontSize: '.84rem', fontWeight: 600, color: C.text2, background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Cambiar contraseña
              </button>
            </div>
            {/* Último acceso row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', padding: '16px 20px', borderTop: `1px solid ${C.lineSoft}` }}>
              <span style={{ width: '34px', height: '34px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '10px', background: C.surface2, color: C.text3 }}>
                <IcoClock />
              </span>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '.9rem', fontWeight: 650, color: C.text }}>Último inicio de sesión</div>
                <div style={{ fontSize: '.8rem', color: C.text3, marginTop: '2px' }}>{fmtDatetime(profile.ultimoLogin)} · Chrome en Windows · Lima, Perú</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '.74rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: '20px', color: C.ok, background: C.okSoft }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.ok }} />Sesión actual
              </span>
            </div>
          </section>

        </div>
      </div>

      {/* ── Modal: Editar perfil ─────────────────────────────────────────────── */}
      {mEditar && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setMEditar(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '580px', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: C.surface, border: `1px solid ${C.line}`, borderRadius: '18px', boxShadow: C.shadowLg, overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

            {/* head */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '20px 22px 16px', borderBottom: `1px solid ${C.lineSoft}`, flexShrink: 0 }}>
              <span style={{ width: '38px', height: '38px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', background: avatarBgColor, color: '#fff', fontSize: '.82rem', fontWeight: 800 }}>
                {ini}
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: C.text }}>Editar perfil</h2>
                <div style={{ fontSize: '.8rem', color: C.text3, marginTop: '4px' }}>Actualiza tu información personal</div>
              </div>
              <button type="button" onClick={() => setMEditar(false)} aria-label="Cerrar"
                style={{ width: '30px', height: '30px', flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: C.text3, background: 'transparent', border: 0, borderRadius: '8px', cursor: 'pointer' }}>
                <IcoX />
              </button>
            </div>

            {/* body */}
            <form onSubmit={guardarPerfil} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 22px' }}>
              <div style={{ ...monoLabel, margin: '0 0 12px' }}>Nombre</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Nombres <span style={{ color: C.bad }}>*</span></label>
                  <input type="text" maxLength={80} value={editNombres} onChange={e => { setEditNombres(e.target.value); setNombresErr(''); }}
                    placeholder="Ej: Juan Carlos" style={inputSt(nombresErr)} />
                  {nombresErr && <div style={{ fontSize: '.76rem', fontWeight: 600, color: C.bad, marginTop: '6px' }}>{nombresErr}</div>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Apellidos <span style={{ color: C.bad }}>*</span></label>
                  <input type="text" maxLength={80} value={editApellidos} onChange={e => { setEditApellidos(e.target.value); setApellidosErr(''); }}
                    placeholder="Ej: García López" style={inputSt(apellidosErr)} />
                  {apellidosErr && <div style={{ fontSize: '.76rem', fontWeight: 600, color: C.bad, marginTop: '6px' }}>{apellidosErr}</div>}
                </div>
              </div>

              <div style={monoLabel}>Identificación y contacto</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Tipo de documento</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: C.text3, pointerEvents: 'none' }}>{FieldIcons.doc}</span>
                    <select value={editTipo} onChange={e => setEditTipo(e.target.value)}
                      style={{ width: '100%', height: '44px', padding: '0 34px 0 38px', fontFamily: 'Inter, sans-serif', fontSize: '.9rem', color: C.text, background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                      <option value="">Sin especificar</option>
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de Extranjería</option>
                      <option value="RUC">RUC</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: C.text3, pointerEvents: 'none' }}><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Número de documento</label>
                  <input type="text" value={editNum} onChange={e => setEditNum(e.target.value)}
                    placeholder={editTipo === 'DNI' ? 'Ej: 76910956' : 'Ej: 12345678'} style={inputSt()} />
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Celular</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '.8rem', fontWeight: 600, color: C.text3, pointerEvents: 'none' }}>+51</span>
                  <input type="tel" inputMode="numeric" value={editCel} onChange={e => setEditCel(e.target.value)}
                    placeholder="999 888 777" style={{ ...inputSt(), paddingLeft: '46px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', marginTop: '16px', padding: '11px 13px', borderRadius: '11px', background: C.surface3, border: `1px solid ${C.lineSoft}`, fontSize: '.78rem', lineHeight: 1.5, color: C.text2 }}>
                <span style={{ color: C.text3, marginTop: '1px' }}><IcoInfo /></span>
                <span>El email, el rol y la empresa los gestiona un administrador desde <strong style={{ color: C.text }}>Usuarios</strong>.</span>
              </div>

              {/* footer inside form */}
              <div style={{ display: 'flex', gap: '9px', paddingTop: '20px', marginTop: '4px', borderTop: `1px solid ${C.lineSoft}` }}>
                <button type="button" onClick={() => setMEditar(false)} disabled={saving}
                  style={{ minWidth: '104px', height: '44px', padding: '0 18px', fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 600, color: C.text2, background: C.surface, border: `1px solid ${C.line}`, borderRadius: '11px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, height: '44px', fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: C.primary, border: 0, borderRadius: '11px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .65 : 1 }}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Cambiar contraseña ────────────────────────────────────────── */}
      {mPwd && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={closePwd}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '520px', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: C.surface, border: `1px solid ${C.line}`, borderRadius: '18px', boxShadow: C.shadowLg, overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

            {/* head */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '20px 22px 16px', borderBottom: `1px solid ${C.lineSoft}`, flexShrink: 0 }}>
              <span style={{ width: '38px', height: '38px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '11px', background: C.primarySoft, color: C.primary }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: C.text }}>Cambiar contraseña</h2>
                <div style={{ fontSize: '.8rem', color: C.text3, marginTop: '4px' }}>Introduce tu contraseña actual y la nueva contraseña</div>
              </div>
              <button type="button" onClick={closePwd} aria-label="Cerrar"
                style={{ width: '30px', height: '30px', flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: C.text3, background: 'transparent', border: 0, borderRadius: '8px', cursor: 'pointer' }}>
                <IcoX />
              </button>
            </div>

            {/* body */}
            <form onSubmit={cambiarPwd} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px 22px', display: 'grid', gap: '14px' }}>

              {/* Contraseña actual */}
              <div>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Contraseña actual</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: C.text3, pointerEvents: 'none' }}><IcoLock /></span>
                  <input type={showAct ? 'text' : 'password'} value={pActual} onChange={e => { setPActual(e.target.value); setPActualErr(''); }}
                    placeholder="••••••••" autoComplete="current-password" style={pwdInputSt(pActualErr)} />
                  <button type="button" onClick={() => setShowAct(v => !v)}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', display: 'grid', placeItems: 'center', color: C.text3, background: 'transparent', border: 0, borderRadius: '8px', cursor: 'pointer' }}>
                    {showAct ? <IcoEyeOff /> : <IcoEye />}
                  </button>
                </div>
                {pActualErr && <div style={{ fontSize: '.76rem', fontWeight: 600, color: C.bad, marginTop: '6px' }}>{pActualErr}</div>}
              </div>

              <div style={{ height: '1px', background: C.lineSoft, margin: '2px -22px' }} />

              {/* Nueva contraseña */}
              <div>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: C.text3, pointerEvents: 'none' }}><IcoLock /></span>
                  <input type={showNueva ? 'text' : 'password'} value={pNueva} onChange={e => { setPNueva(e.target.value); setPNuevaErr(''); }}
                    placeholder="••••••••" autoComplete="new-password" style={pwdInputSt(pNuevaErr)} />
                  <button type="button" onClick={() => setShowNueva(v => !v)}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', display: 'grid', placeItems: 'center', color: C.text3, background: 'transparent', border: 0, borderRadius: '8px', cursor: 'pointer' }}>
                    {showNueva ? <IcoEyeOff /> : <IcoEye />}
                  </button>
                </div>
                {pNuevaErr && <div style={{ fontSize: '.76rem', fontWeight: 600, color: C.bad, marginTop: '6px' }}>{pNuevaErr}</div>}

                {pNueva && (
                  <>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                      {[1,2,3,4].map(i => (
                        <span key={i} style={{ flex: 1, height: '4px', borderRadius: '99px', background: i <= sc ? pwdBarColors[sc] : C.line }} />
                      ))}
                    </div>
                    {sc > 0 && <div style={{ fontSize: '.75rem', fontWeight: 600, color: pwdBarColors[sc], marginTop: '6px' }}>{pwdLabels[sc]}</div>}
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '6px 12px', marginTop: '10px' }}>
                  {rules.map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '.76rem', color: r.ok ? C.ok : C.text3 }}>
                      <span style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', background: r.ok ? C.ok : C.surface2, color: r.ok ? '#fff' : C.text3 }}>
                        <IcoCheck />
                      </span>
                      {r.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmar */}
              <div>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: C.text2, marginBottom: '6px' }}>Confirmar nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: C.text3, pointerEvents: 'none' }}><IcoLock /></span>
                  <input type={showConf ? 'text' : 'password'} value={pConfirma} onChange={e => { setPConfirma(e.target.value); setPConfirmaErr(''); }}
                    placeholder="••••••••" autoComplete="new-password" style={pwdInputSt(pConfirmaErr)} />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', display: 'grid', placeItems: 'center', color: C.text3, background: 'transparent', border: 0, borderRadius: '8px', cursor: 'pointer' }}>
                    {showConf ? <IcoEyeOff /> : <IcoEye />}
                  </button>
                </div>
                {pConfirmaErr && <div style={{ fontSize: '.76rem', fontWeight: 600, color: C.bad, marginTop: '6px' }}>{pConfirmaErr}</div>}
                {pConfirma && pNueva === pConfirma && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '.76rem', fontWeight: 600, color: C.ok }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m5 12 5 5L20 7"/></svg>
                    Las contraseñas coinciden
                  </div>
                )}
              </div>

              {/* warning */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '11px 13px', borderRadius: '11px', background: C.warnSoft, border: `1px solid ${C.warnLine}`, fontSize: '.78rem', lineHeight: 1.5, color: C.text }}>
                <span style={{ color: C.warn, marginTop: '1px', flexShrink: 0 }}><IcoWarn /></span>
                Al cambiarla se cerrará tu sesión y tendrás que ingresar de nuevo con la nueva contraseña.
              </div>

              {/* footer */}
              <div style={{ display: 'flex', gap: '9px', paddingTop: '4px', borderTop: `1px solid ${C.lineSoft}` }}>
                <button type="button" onClick={closePwd} disabled={pwdSaving}
                  style={{ minWidth: '104px', height: '44px', padding: '0 18px', fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 600, color: C.text2, background: C.surface, border: `1px solid ${C.line}`, borderRadius: '11px', cursor: pwdSaving ? 'not-allowed' : 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pwdSaving}
                  style={{ flex: 1, height: '44px', fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: C.primary, border: 0, borderRadius: '11px', cursor: pwdSaving ? 'not-allowed' : 'pointer', opacity: pwdSaving ? .65 : 1 }}>
                  {pwdSaving ? 'Cambiando…' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
