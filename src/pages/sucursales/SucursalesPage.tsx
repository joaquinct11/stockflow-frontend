import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { sucursalService, type SucursalDTO } from '../../services/sucursal.service';
import { useSucursalStore } from '../../store/sucursalStore';
import toast from 'react-hot-toast';

const T = {
  bg: '#F6F7F9', surface: '#FFFFFF', surface2: '#F1F3F6', surface3: '#EDF0F4',
  text: '#0F1623', text2: '#4A5568', text3: '#8896A5',
  primary: '#4F6EF7', primarySoft: '#EEF1FE', primaryLine: '#C7D2FC',
  line: '#E4E8EF', lineSoft: '#F0F2F5',
  ok: '#16A34A', okSoft: '#DCFCE7',
  bad: '#DC2626', badSoft: '#FEE2E2',
  warn: '#D97706', warnSoft: '#FEF3C7', warnLine: '#FDE68A',
  shadow: '0 2px 8px -2px rgba(15,22,35,.08)',
};

if (typeof document !== 'undefined' && !document.getElementById('fx-suc-kf')) {
  const s = document.createElement('style');
  s.id = 'fx-suc-kf';
  s.textContent = `@keyframes fx-in{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}`;
  document.head.appendChild(s);
}

const FxInput = ({ style: s, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...p}
    style={{ width: '100%', height: 44, padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', ...s }}
    onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; if (p.onFocus) (p.onFocus as React.FocusEventHandler<HTMLInputElement>)(e); }}
    onBlur={e => { e.currentTarget.style.borderColor = (s as React.CSSProperties)?.borderColor ?? T.line; e.currentTarget.style.boxShadow = 'none'; if (p.onBlur) (p.onBlur as React.FocusEventHandler<HTMLInputElement>)(e); }}
  />
);

const MAX_SUCURSALES = 5;

const emptyForm: Omit<SucursalDTO, 'id'> = {
  nombre: '',
  direccion: '',
  telefono: '',
  email: '',
};

function avatarColor(nombre: string) {
  const palette = ['#4F6EF7','#7C5FE0','#0EA5E9','#10B981','#F59E0B','#EF4444','#EC4899','#14B8A6'];
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function iniciales(nombre: string) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export function SucursalesPage() {
  const { setSucursales } = useSucursalStore();
  const [sucursales, setSucursalesLocal] = useState<SucursalDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<SucursalDTO | null>(null);
  const [form, setForm] = useState<Omit<SucursalDTO, 'id'>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await sucursalService.listarConBloqueadas();
      setSucursalesLocal(data);
      setSucursales(data.filter((s) => s.activo));
    } catch {
      toast.error('Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const abrirEditar = (s: SucursalDTO) => {
    setEditando(s);
    setForm({ nombre: s.nombre, direccion: s.direccion ?? '', telefono: s.telefono ?? '', email: s.email ?? '' });
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      if (editando) {
        await sucursalService.actualizar(editando.id, form);
        toast.success('Sucursal actualizada');
      } else {
        await sucursalService.crear(form);
        toast.success('Sucursal creada');
      }
      setDialogOpen(false);
      cargar();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDesactivar = async () => {
    if (confirmId == null) return;
    try {
      await sucursalService.desactivar(confirmId);
      toast.success('Sucursal desactivada');
      cargar();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se puede desactivar');
    } finally {
      setConfirmId(null);
    }
  };

  const activas    = sucursales.filter((s) => s.activo).length;
  const bloqueadas = sucursales.filter((s) => s.bloqueadaPorPlan).length;
  const principal  = sucursales.find((s) => s.esPrincipal);
  const restantes  = MAX_SUCURSALES - activas;

  /* ── Loading ─────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, fontFamily: 'Inter,sans-serif' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.line}`, borderTopColor: T.primary, animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Modal ────────────────────────────────────────────────────────────────── */
  const modal = dialogOpen && createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) setDialogOpen(false); }}
    >
      <div style={{ background: T.surface, borderRadius: 18, boxShadow: '0 8px 40px -4px rgba(15,22,35,.22)', width: '100%', maxWidth: 480, animation: 'fx-in .2s ease both' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          <div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '1.05rem', fontWeight: 700, color: T.text }}>
              {editando ? 'Editar sucursal' : 'Nueva sucursal'}
            </div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '.82rem', color: T.text3, marginTop: 2 }}>
              {editando ? `Modificando "${editando.nombre}"` : 'Agrega un nuevo local a tu cuenta'}
            </div>
          </div>
          <button
            onClick={() => setDialogOpen(false)}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text3 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
              Nombre <span style={{ color: T.bad }}>*</span>
            </div>
            <FxInput
              placeholder="Ej: Sucursal Miraflores"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleGuardar()}
            />
          </div>
          <div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Dirección</div>
            <FxInput
              placeholder="Ej: Av. Larco 123, Miraflores"
              value={form.direccion ?? ''}
              onChange={e => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Teléfono</div>
              <FxInput
                placeholder="Ej: 01 234 5678"
                value={form.telefono ?? ''}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div>
              <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Email</div>
              <FxInput
                type="email"
                placeholder="local@negocio.com"
                value={form.email ?? ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              onClick={() => setDialogOpen(false)}
              style={{ flex: 1, height: 42, borderRadius: 11, border: `1px solid ${T.line}`, background: T.surface2, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={saving}
              style={{ flex: 1, height: 42, borderRadius: 11, border: 'none', background: saving ? T.primarySoft : T.primary, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: saving ? T.primary : '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear sucursal'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  /* ── Confirm modal ────────────────────────────────────────────────────────── */
  const confirmModal = confirmId != null && createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) setConfirmId(null); }}
    >
      <div style={{ background: T.surface, borderRadius: 18, boxShadow: '0 8px 40px -4px rgba(15,22,35,.22)', width: '100%', maxWidth: 400, padding: 28, animation: 'fx-in .2s ease both' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.badSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.bad} strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </div>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '1.05rem', fontWeight: 700, color: T.text, marginBottom: 8 }}>¿Desactivar sucursal?</div>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '.88rem', color: T.text2, lineHeight: 1.5, marginBottom: 24 }}>
          Los datos de esta sucursal se conservan pero el local quedará inactivo. Esta acción se puede revertir desde soporte.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setConfirmId(null)}
            style={{ flex: 1, height: 42, borderRadius: 11, border: `1px solid ${T.line}`, background: T.surface2, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDesactivar}
            style={{ flex: 1, height: 42, borderRadius: 11, border: 'none', background: T.bad, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
          >
            Desactivar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: 'Inter,sans-serif', color: T.text, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {modal}
      {confirmModal}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-.025em', color: T.text, margin: 0 }}>
            Mis Sucursales
          </h1>
          <p style={{ fontSize: '.84rem', color: T.text3, marginTop: 3 }}>
            Plan Pro · hasta {MAX_SUCURSALES} locales activos
          </p>
        </div>
        <button
          onClick={abrirCrear}
          disabled={activas >= MAX_SUCURSALES}
          title={activas >= MAX_SUCURSALES ? `Límite de ${MAX_SUCURSALES} sucursales alcanzado` : ''}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 18px', borderRadius: 11, border: 'none', background: activas >= MAX_SUCURSALES ? T.surface3 : T.primary, color: activas >= MAX_SUCURSALES ? T.text3 : '#fff', fontFamily: 'Inter,sans-serif', fontSize: '.88rem', fontWeight: 600, cursor: activas >= MAX_SUCURSALES ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Nueva sucursal
        </button>
      </div>

      {/* Banner bloqueadas */}
      {bloqueadas > 0 && (
        <div style={{ borderRadius: 12, border: `1px solid ${T.warnLine}`, background: T.warnSoft, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.warn} strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div style={{ fontSize: '.84rem', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: T.warn }}>{bloqueadas} sucursal{bloqueadas !== 1 ? 'es' : ''} bloqueada{bloqueadas !== 1 ? 's' : ''}</span>
            <span style={{ color: T.warn }}>{' '}por tu plan actual. Sus datos están intactos. Vuelve al Plan Pro para reactivarlas.</span>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {/* Activas */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: T.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.65rem', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T.text3 }}>Activas</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.03em', color: T.text, lineHeight: 1.1 }}>
              {activas}<span style={{ fontSize: '.9rem', fontWeight: 400, color: T.text3 }}>/{MAX_SUCURSALES}</span>
            </div>
          </div>
        </div>

        {/* Principal */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: '#FEF9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.65rem', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T.text3 }}>Principal</div>
            <div style={{ fontSize: '.95rem', fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{principal?.nombre ?? '—'}</div>
          </div>
        </div>

        {/* Disponibles */}
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: restantes > 0 ? T.okSoft : T.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={restantes > 0 ? T.ok : T.text3} strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.65rem', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: T.text3 }}>Disponibles</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.03em', color: T.text, lineHeight: 1.1 }}>
              {restantes > 0 ? restantes : 0}<span style={{ fontSize: '.8rem', fontWeight: 400, color: T.text3, marginLeft: 4 }}>local{restantes !== 1 ? 'es' : ''} más</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid sucursales */}
      {sucursales.length === 0 ? (
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, padding: 64, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          </div>
          <div style={{ fontSize: '.95rem', fontWeight: 600, color: T.text2 }}>Aún no tienes sucursales configuradas</div>
          <div style={{ fontSize: '.84rem', color: T.text3, marginTop: 6 }}>Tu sucursal principal se crea automáticamente. Si no aparece, recarga la página.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {sucursales.map((s) => {
            const esBloqueada = s.bloqueadaPorPlan === true;
            const color = avatarColor(s.nombre);
            return (
              <div
                key={s.id}
                style={{
                  background: esBloqueada ? '#FFFBEB' : s.esPrincipal ? T.primarySoft : T.surface,
                  border: `1px solid ${esBloqueada ? T.warnLine : s.esPrincipal ? T.primaryLine : T.line}`,
                  borderRadius: 14,
                  boxShadow: T.shadow,
                  padding: '18px 18px 16px',
                  opacity: esBloqueada ? .75 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: esBloqueada ? '#FEF3C7' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.7rem', fontWeight: 700, color: esBloqueada ? T.warn : '#fff', letterSpacing: '.04em' }}>
                      {esBloqueada
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.warn} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        : iniciales(s.nombre)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '.92rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre}</div>
                      {esBloqueada
                        ? <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.62rem', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: T.warn }}>Bloqueada · Plan Básico</div>
                        : s.esPrincipal
                        ? <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.62rem', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: T.primary }}>Principal</div>
                        : null}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {esBloqueada
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.warnSoft, border: `1px solid ${T.warnLine}`, borderRadius: 20, padding: '2px 8px', fontSize: '.73rem', fontWeight: 600, color: T.warn }}>Bloqueada</span>
                      : s.activo
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 20, padding: '2px 8px', fontSize: '.73rem', fontWeight: 600, color: T.ok }}>
                          <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill={T.ok}/></svg>Activa
                        </span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.surface3, border: `1px solid ${T.line}`, borderRadius: 20, padding: '2px 8px', fontSize: '.73rem', fontWeight: 600, color: T.text3 }}>Inactiva</span>}
                  </div>
                </div>

                {/* Info */}
                {esBloqueada && (
                  <div style={{ fontSize: '.8rem', color: T.warn, background: '#FEF3C7', border: `1px solid ${T.warnLine}`, borderRadius: 8, padding: '7px 10px', lineHeight: 1.4 }}>
                    Bloqueada por tu plan actual. Vuelve a Plan Pro para reactivarla.
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {s.direccion && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem', color: T.text2 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {s.direccion}
                    </div>
                  )}
                  {s.telefono && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem', color: T.text2 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {s.telefono}
                    </div>
                  )}
                  {s.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem', color: T.text2 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      {s.email}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                {!esBloqueada && (
                  <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: `1px solid ${T.lineSoft}` }}>
                    <button
                      onClick={() => abrirEditar(s)}
                      style={{ flex: 1, height: 34, borderRadius: 9, border: `1px solid ${T.line}`, background: T.surface2, fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 600, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Editar
                    </button>
                    {!s.esPrincipal && (
                      <button
                        onClick={() => setConfirmId(s.id)}
                        title="Desactivar sucursal"
                        style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid #FECACA`, background: '#FEF2F2', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', color: T.bad, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
