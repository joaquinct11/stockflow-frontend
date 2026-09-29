import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { sucursalService } from '../../services/sucursal.service';
import type { SucursalDTO } from '../../services/sucursal.service';
import { useSucursalStore } from '../../store/sucursalStore';
import { notify } from '../../lib/notify';

const T = {
  bg: '#f7f8fa', surface: '#ffffff', surface2: '#f1f3f7', surface3: '#fafbfc',
  line: '#e4e7ec', lineSoft: '#eef0f4',
  text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
  primary: '#3b47ef', primarySoft: '#eef0ff', primaryLine: '#cfd4fd',
  ok: '#0f9d6e', okSoft: '#e7f7f1',
  warn: '#b7791f', warnSoft: '#fdf6e7', warnLine: '#f0dfb4',
  bad: '#d63b3b', badSoft: '#fdeceb',
  shadow: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
} as const;

const MAX = 5;
const PALETA = ['#4F6EF7', '#7C5FE0', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

if (typeof document !== 'undefined' && !document.getElementById('fx-suc-kf')) {
  const s = document.createElement('style');
  s.id = 'fx-suc-kf';
  s.textContent = `@keyframes fx-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`;
  document.head.appendChild(s);
}

function avColor(nombre: string) {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

function ini(nombre: string) {
  return nombre.replace(/^(sucursal|sede)\s+/i, '').trim()
    .split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function avStyle(nombre: string, size: number, inactiva: boolean, bloq: boolean): React.CSSProperties {
  const c = avColor(nombre);
  const r = Math.round(size * 0.28);
  const base: React.CSSProperties = {
    width: size, height: size, flexShrink: 0,
    display: 'grid', placeItems: 'center',
    borderRadius: r,
    fontSize: `${(size * 0.33).toFixed(1)}px`,
    fontWeight: 700, letterSpacing: '.02em',
    fontFamily: "'IBM Plex Mono', monospace",
  };
  if (bloq) return { ...base, color: T.warn, background: T.surface, border: `1px solid ${T.warnLine}` };
  if (inactiva) return { ...base, color: T.text3, background: T.surface2 };
  return { ...base, color: c, background: `color-mix(in oklab, ${c} 15%, ${T.surface})` };
}

// SVG helpers
const IcStore = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="m2 7 1.5-4h17L22 7"/><path d="M4 7v13h16V7"/><path d="M2 7h20"/><path d="M9 20v-6h6v6"/>
  </svg>
);
const IcStar = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/>
  </svg>
);
const IcPlus = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 5v14"/><path d="M5 12h14"/>
  </svg>
);
const IcPin = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IcPhone = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>
  </svg>
);
const IcMail = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>
  </svg>
);
const IcPencil = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);
const IcXCircle = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </svg>
);
const IcSwap = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
  </svg>
);
const IcLock = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IcUsers = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>
  </svg>
);
const IcX = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
const IcCheck = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="m5 12 5 5L20 7"/>
  </svg>
);

// Overlay backdrop
function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', display: 'contents' }}>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Input with left icon
function FieldInput({ icon, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; error?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}>
        {icon}
      </span>
      <input
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: '100%', height: 44, padding: '0 13px 0 38px',
          fontFamily: 'Inter, sans-serif', fontSize: '.9rem', color: T.text,
          background: T.surface,
          border: `1px solid ${error ? T.bad : focused ? T.primary : T.line}`,
          borderRadius: 10, outline: 'none', boxSizing: 'border-box',
          boxShadow: focused ? `0 0 0 3px ${error ? T.badSoft : T.primarySoft}` : 'none',
        }}
      />
    </div>
  );
}

interface FormState {
  id: number | null;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  intento: boolean;
}

type Seg = 'TODAS' | 'ACTIVAS' | 'INACTIVAS';

export function SucursalesPage() {
  const { setSucursales, setSucursalActual, sucursalActual } = useSucursalStore();
  const [sucursales, setSucursalesLocal] = useState<SucursalDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [seg, setSeg] = useState<Seg>('TODAS');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ id: null, nombre: '', direccion: '', telefono: '', email: '', intento: false });
  const [desactivarId, setDesactivarId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await sucursalService.listarConBloqueadas();
      setSucursalesLocal(data);
      setSucursales(data.filter(s => s.activo));
    } catch (e) {
      notify.fromError(e, 'Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const activas   = sucursales.filter(s => s.activo).length;
  const bloq      = sucursales.filter(s => s.bloqueadaPorPlan).length;
  const principal = sucursales.find(s => s.esPrincipal);
  const libres    = Math.max(0, MAX - activas);
  const lleno     = activas >= MAX;

  const ordenadas = [...sucursales].sort((a, b) =>
    Number(!!b.esPrincipal) - Number(!!a.esPrincipal) ||
    Number(!!b.activo) - Number(!!a.activo) ||
    Number(!!a.bloqueadaPorPlan) - Number(!!b.bloqueadaPorPlan)
  );

  const filtradas = ordenadas.filter(s =>
    seg === 'TODAS' ? true : seg === 'ACTIVAS' ? !!s.activo : !s.activo
  );

  const abrirCrear = () => {
    setForm({ id: null, nombre: '', direccion: '', telefono: '', email: '', intento: false });
    setFormOpen(true);
  };

  const abrirEditar = (s: SucursalDTO) => {
    setForm({ id: s.id!, nombre: s.nombre, direccion: s.direccion ?? '', telefono: s.telefono ?? '', email: s.email ?? '', intento: false });
    setFormOpen(true);
  };

  const handleGuardar = async () => {
    const nombre = form.nombre.trim();
    const emailErr = !!form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!nombre || emailErr) { setForm(f => ({ ...f, intento: true })); return; }
    setSaving(true);
    try {
      const dto = { nombre, direccion: form.direccion.trim(), telefono: form.telefono.trim(), email: form.email.trim() };
      if (form.id) {
        await sucursalService.actualizar(form.id, dto);
        notify.success('Sucursal actualizada');
      } else {
        await sucursalService.crear(dto);
        notify.success('Sucursal creada');
      }
      setFormOpen(false);
      cargar();
    } catch (e) {
      notify.fromError(e, 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDesactivar = async () => {
    if (desactivarId == null) return;
    try {
      await sucursalService.desactivar(desactivarId);
      notify.success('Sucursal desactivada');
      if (sucursalActual?.id === desactivarId && principal) setSucursalActual(principal);
      cargar();
    } catch (e) {
      notify.fromError(e, 'No se puede desactivar');
    } finally {
      setDesactivarId(null);
    }
  };

  const handleOperar = (s: SucursalDTO) => {
    setSucursalActual(s);
    notify.success(`Operando en ${s.nombre}`);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, fontFamily: 'Inter,sans-serif' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.line}`, borderTopColor: T.primary, animation: 'fx-spin .7s linear infinite' }} />
      <style>{`@keyframes fx-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Form validation
  const fNombre     = form.nombre.trim();
  const fEmailErr   = !!form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const fNombreErr  = form.intento && !fNombre;
  const esNueva     = form.id == null;
  const editTarget  = sucursales.find(s => s.id === desactivarId);

  // Form modal avatar
  const fAvStyle: React.CSSProperties = fNombre
    ? avStyle(fNombre, 38, false, false)
    : { width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, fontSize: '1.1rem', fontWeight: 600, color: T.primary, background: T.primarySoft };

  /* ── MODALS ──────────────────────────────────────────────────────────── */
  const formModal = formOpen && (
    <Overlay onClose={() => setFormOpen(false)}>
      <div style={{ width: '100%', maxWidth: 540, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'fx-in .2s ease', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <span style={fAvStyle}>
            {fNombre ? ini(fNombre) : <IcPlus size={18} />}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>
              {esNueva ? 'Nueva sucursal' : 'Editar sucursal'}
            </h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>
              {esNueva ? 'Agrega un nuevo local a tu cuenta' : `Modificando "${sucursales.find(s => s.id === form.id)?.nombre ?? ''}"`}
            </div>
          </div>
          <button onClick={() => setFormOpen(false)} aria-label="Cerrar" style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
            <IcX />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px 22px', display: 'grid', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
              Nombre <span style={{ color: T.bad }}>*</span>
            </label>
            <FieldInput
              icon={<IcStore size={15} />}
              error={fNombreErr}
              placeholder="Ej: Sucursal Miraflores"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleGuardar()}
            />
            {fNombreErr && <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>El nombre es requerido.</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Dirección</label>
            <FieldInput
              icon={<IcPin size={15} />}
              placeholder="Ej: Av. Larco 123, Miraflores"
              value={form.direccion}
              onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Teléfono</label>
              <FieldInput
                icon={<IcPhone size={15} />}
                placeholder="Ej: 01 234 5678"
                inputMode="tel"
                value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value.replace(/[^\d\s+()-]/g, '') }))}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Email</label>
              <FieldInput
                icon={<IcMail size={15} />}
                error={fEmailErr && form.intento}
                type="email"
                placeholder="local@negocio.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value.trim() }))}
              />
              {fEmailErr && form.intento && <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>Revisa el formato del email.</div>}
            </div>
          </div>

          {esNueva && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 13px', borderRadius: 11, background: T.primarySoft, fontSize: '.8rem', lineHeight: 1.5, color: T.text2 }}>
              <span style={{ display: 'grid', color: T.primary, marginTop: 1, flexShrink: 0 }}><IcUsers size={15} /></span>
              <span>La sucursal empieza sin stock propio. Luego asigna usuarios y registra el ingreso de productos en <strong style={{ color: T.text }}>Movimientos</strong>.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <button onClick={() => setFormOpen(false)} style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={saving} style={{ flex: 1, height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: saving ? T.primarySoft : T.primary, border: 0, borderRadius: 11, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : `0 8px 20px -10px ${T.primary}` }}>
            {saving ? 'Guardando...' : esNueva ? 'Crear sucursal' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Overlay>
  );

  const desactivarModal = desactivarId != null && editTarget && (
    <Overlay onClose={() => setDesactivarId(null)}>
      <div style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'fx-in .2s ease', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}` }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.badSoft, color: T.bad }}>
            <IcXCircle size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Desactivar sucursal</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>Se puede revertir desde soporte.</div>
          </div>
          <button onClick={() => setDesactivarId(null)} aria-label="Cerrar" style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
            <IcX />
          </button>
        </div>

        <div style={{ padding: '18px 22px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 12, background: T.surface2 }}>
            <span style={avStyle(editTarget.nombre, 38, false, false)}>{ini(editTarget.nombre)}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '.9rem', fontWeight: 650 }}>{editTarget.nombre}</div>
              <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 3 }}>{editTarget.direccion || 'Sin dirección'}</div>
            </div>
          </div>
          <p style={{ fontSize: '.84rem', lineHeight: 1.55, color: T.text2, margin: '14px 0 0' }}>
            Los datos de esta sucursal se conservan, pero el local quedará inactivo: no se podrá vender ni mover stock desde ella.
          </p>
          {sucursalActual?.id === desactivarId && (
            <div style={{ marginTop: 12, padding: '10px 13px', borderRadius: 10, fontSize: '.8rem', lineHeight: 1.5, color: T.warn, background: T.warnSoft }}>
              Estás operando en esta sucursal. Pasarás a la sucursal principal.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}` }}>
          <button onClick={() => setDesactivarId(null)} style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Cancelar
          </button>
          <button onClick={handleDesactivar} style={{ flex: 1, height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.bad, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.bad}` }}>
            Desactivar
          </button>
        </div>
      </div>
    </Overlay>
  );

  /* ── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: 'Inter,sans-serif', color: T.text }}>
      {formModal}
      {desactivarModal}

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Mis sucursales</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Plan Pro · hasta {MAX} locales activos</p>
        </div>
        <button
          onClick={lleno ? undefined : abrirCrear}
          disabled={lleno}
          title={lleno ? `Límite de ${MAX} sucursales alcanzado` : ''}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 650, border: 0, borderRadius: 10, whiteSpace: 'nowrap', cursor: lleno ? 'not-allowed' : 'pointer', color: lleno ? T.text3 : '#fff', background: lleno ? T.surface2 : T.primary, boxShadow: lleno ? 'none' : `0 6px 16px -8px ${T.primary}` }}
        >
          <IcPlus size={15} />
          Nueva sucursal
        </button>
      </div>

      {/* Banner bloqueadas */}
      {bloq > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 16, padding: '12px 16px', borderRadius: 12, background: T.warnSoft, border: `1px solid ${T.warnLine}` }}>
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 9, background: T.surface, color: T.warn }}>
            <IcLock size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: '.88rem', fontWeight: 650 }}>{bloq} sucursal{bloq !== 1 ? 'es' : ''} bloqueada{bloq !== 1 ? 's' : ''} por tu plan actual</div>
            <div style={{ fontSize: '.78rem', color: T.text2, marginTop: 2 }}>Sus datos están intactos. Vuelve al Plan Pro para reactivarlas.</div>
          </div>
          <button style={{ height: 36, padding: '0 14px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 650, color: '#fff', background: T.warn, border: 0, borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Ver planes
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12, marginTop: 20 }}>
        {/* Sucursales activas */}
        <div style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>Sucursales activas</span>
            <span style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, background: T.primarySoft, color: T.primary }}>
              <IcStore size={15} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', fontVariantNumeric: 'tabular-nums' }}>{activas}</span>
            <span style={{ fontSize: '.95rem', fontWeight: 500, color: T.text3 }}>/ {MAX}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            {Array.from({ length: MAX }, (_, i) => (
              <span key={i} style={{ flex: 1, height: 6, borderRadius: 6, background: i < activas ? T.primary : T.surface2 }} />
            ))}
          </div>
        </div>

        {/* Sucursal principal */}
        <div style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>Sucursal principal</span>
            <span style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, background: T.warnSoft, color: T.warn }}>
              <IcStar size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.12rem', fontWeight: 700, letterSpacing: '-.02em', marginTop: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {principal?.nombre ?? '—'}
          </div>
          <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {principal?.direccion ?? 'Sin dirección'}
          </div>
        </div>

        {/* Disponibles */}
        <div style={{ padding: '16px 18px', background: libres > 0 ? T.surface : T.warnSoft, border: `1px solid ${libres > 0 ? T.line : T.warnLine}`, borderRadius: 14, boxShadow: T.shadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>Disponibles</span>
            <span style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, background: libres > 0 ? T.okSoft : T.surface, color: libres > 0 ? T.ok : T.warn }}>
              <IcPlus size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 6, fontVariantNumeric: 'tabular-nums', color: libres > 0 ? T.ok : T.warn }}>
            {libres}
          </div>
          <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>
            {libres > 0 ? `Puedes abrir ${libres} local${libres !== 1 ? 'es' : ''} más` : 'Límite del plan alcanzado'}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '26px 0 12px' }}>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>Locales</span>
        <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10 }}>
          {([['TODAS', 'Todas', sucursales.length], ['ACTIVAS', 'Activas', activas], ['INACTIVAS', 'Inactivas', sucursales.length - activas]] as const).map(([k, label, n]) => (
            <button
              key={k}
              onClick={() => setSeg(k)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                height: 32, padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.8rem', fontWeight: 600,
                border: 0, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .16s',
                color: seg === k ? T.text : T.text3,
                background: seg === k ? T.surface : 'transparent',
                boxShadow: seg === k ? '0 1px 3px rgba(0,0,0,.14),0 0 0 1px ' + T.line : 'none',
              }}
            >
              {label}
              <span style={{ fontSize: '.7rem', fontWeight: 700, color: T.text3 }}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {filtradas.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14 }}>
          <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
            <IcStore size={24} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14 }}>No hay sucursales en esta vista</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
          {filtradas.map(s => {
            const esBloq  = !!s.bloqueadaPorPlan;
            const inactiva = !s.activo;
            const esActual = sucursalActual?.id === s.id && !!s.activo;
            const dirInfo  = s.direccion  ? { v: s.direccion,  st: undefined } : { v: 'Sin dirección', st: { color: T.text3, fontStyle: 'italic' as const } };
            const telInfo  = s.telefono   ? { v: s.telefono,   st: { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.8rem' } as const } : { v: 'Sin teléfono', st: { color: T.text3, fontStyle: 'italic' as const } };
            const emailInfo = s.email     ? { v: s.email,      st: undefined } : { v: 'Sin email',     st: { color: T.text3, fontStyle: 'italic' as const } };

            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', flexDirection: 'column', minHeight: 190,
                  borderRadius: 14, boxShadow: T.shadow, overflow: 'hidden', transition: 'border-color .16s',
                  background: esBloq ? T.warnSoft : T.surface,
                  border: esBloq ? `1px solid ${T.warnLine}` : esActual ? `1.5px solid ${T.primary}` : `1px solid ${T.line}`,
                  opacity: inactiva && !esBloq ? .7 : 1,
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 18px 14px' }}>
                  <span style={avStyle(s.nombre, 44, inactiva && !esBloq, esBloq)}>
                    {esBloq ? <IcLock size={17} /> : ini(s.nombre)}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '.98rem', fontWeight: 700, letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      {/* Estado badge */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.72rem', fontWeight: 650, padding: '3px 9px 3px 8px', borderRadius: 20, color: esBloq ? T.warn : inactiva ? T.text3 : T.ok, background: esBloq ? T.warnSoft : inactiva ? T.surface2 : T.okSoft }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: esBloq ? T.warn : inactiva ? T.text3 : T.ok }} />
                        {esBloq ? 'Bloqueada · Plan Básico' : inactiva ? 'Inactiva' : 'Activa'}
                      </span>
                      {s.esPrincipal && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.72rem', fontWeight: 650, padding: '3px 9px', borderRadius: 20, color: T.warn, background: T.warnSoft }}>
                          <IcStar size={11} />Principal
                        </span>
                      )}
                      {esActual && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.72rem', fontWeight: 650, padding: '3px 9px', borderRadius: 20, color: T.primary, background: T.primarySoft }}>
                          <IcCheck size={11} />Operando aquí
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info rows */}
                <div style={{ display: 'grid', gap: 8, padding: '0 18px 16px' }}>
                  {(['dir', 'tel', 'email'] as const).map((k) => {
                    const info = k === 'dir' ? dirInfo : k === 'tel' ? telInfo : emailInfo;
                    const icon = k === 'dir' ? <IcPin /> : k === 'tel' ? <IcPhone /> : <IcMail />;
                    return (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, fontSize: '.82rem', color: T.text2 }}>
                        <span style={{ display: 'grid', color: T.text3, flexShrink: 0 }}>{icon}</span>
                        <span style={{ minWidth: 0, ...info.st }}>{info.v}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Blocked warning */}
                {esBloq && (
                  <div style={{ margin: '0 18px 16px', padding: '9px 12px', borderRadius: 9, fontSize: '.78rem', lineHeight: 1.45, color: T.warn, background: T.warnSoft }}>
                    Bloqueada por tu plan actual. Vuelve a Plan Pro para reactivarla.
                  </div>
                )}

                {/* Actions */}
                {!esBloq && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', padding: '12px 18px', borderTop: `1px solid ${T.lineSoft}` }}>
                    {!inactiva && !esActual && (
                      <button
                        onClick={() => handleOperar(s)}
                        style={{ flex: 1, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 650, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <IcSwap size={14} />Operar aquí
                      </button>
                    )}
                    <button
                      onClick={() => abrirEditar(s)}
                      style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 14px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap', flex: !inactiva && !esActual ? undefined : 1 }}
                    >
                      <IcPencil size={14} />Editar
                    </button>
                    {!inactiva && !s.esPrincipal && (
                      <button
                        onClick={() => setDesactivarId(s.id!)}
                        title="Desactivar sucursal"
                        aria-label="Desactivar sucursal"
                        style={{ width: 36, height: 36, flexShrink: 0, display: 'grid', placeItems: 'center', color: T.text3, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 9, cursor: 'pointer' }}
                      >
                        <IcXCircle size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Placeholder card */}
          {!lleno && seg !== 'INACTIVAS' && (
            <button
              onClick={abrirCrear}
              style={{ minHeight: 190, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'Inter,sans-serif', color: T.text3, background: 'transparent', border: `1.5px dashed ${T.line}`, borderRadius: 14, cursor: 'pointer', transition: 'all .16s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.primary; (e.currentTarget as HTMLButtonElement).style.color = T.primary; (e.currentTarget as HTMLButtonElement).style.background = T.primarySoft; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.line; (e.currentTarget as HTMLButtonElement).style.color = T.text3; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 12, background: T.surface2 }}>
                <IcPlus size={20} />
              </span>
              <span style={{ fontSize: '.9rem', fontWeight: 650 }}>Agregar sucursal</span>
              <span style={{ fontSize: '.76rem' }}>
                {libres === 1 ? 'Queda 1 espacio en tu plan' : `Quedan ${libres} espacios en tu plan`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
