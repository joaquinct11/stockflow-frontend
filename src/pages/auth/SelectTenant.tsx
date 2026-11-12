import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import type { CrearNegocioRequest, PlanCatalogoDTO } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import type { TenantInfo } from '../../types';
import toast from 'react-hot-toast';
import { IC, RUBROS_CATALOG } from '../../constants/rubros';

// ── Validación ────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RUC_RE   = /^\d{11}$/;
const CEL_RE   = /^9\d{8}$/;

function validateNegocioField(name: string, value: string): string {
  if (name === 'emailContacto' && value && !EMAIL_RE.test(value))
    return 'Ingresa un correo electrónico válido (ej: juan@empresa.com).';
  if (name === 'ruc' && value && !RUC_RE.test(value))
    return 'El RUC debe tener exactamente 11 dígitos.';
  if (name === 'telefono' && value && !CEL_RE.test(value))
    return 'El celular debe tener 9 dígitos y comenzar con 9 (ej: 987654321).';
  return '';
}


const RUBRO_TO_SEGMENTO: Record<string, string> = {
  FARMACIA:          'FARMACIA_BOTICA',
  BOTICA:            'FARMACIA_BOTICA',
  VETERINARIA:       'VETERINARIA',
  TIENDA_ROPA:       'TIENDA_ROPA',
  TIENDA:            'TIENDA_BODEGA',
  FERRETERIA:        'FERRETERIA',
  MINIMARKET:        'MINIMARKET',
  RESTAURANTE:       'RESTAURANTE',
  EMPRESA_SERVICIOS: 'EMPRESA_SERVICIOS',
  OTRO:              'OTRO',
};

const ROLES_COLOR: Record<string, string> = {
  ADMIN:   '#a79fff',
  GERENTE: '#00d4aa',
  VENDEDOR: '#00d4aa',
  CAJERO:  '#f5a524',
};

// ── Helpers visuales ──────────────────────────────────────────────────────────
function tileStyle(rubro: string, size: number): React.CSSProperties {
  const c = (IC[rubro.toUpperCase()] ?? IC.OTRO)[1];
  return {
    width: size, height: size, flexShrink: 0,
    display: 'grid', placeItems: 'center',
    borderRadius: Math.round(size * 0.28),
    color: c,
    background: `color-mix(in oklab, ${c} 14%, #101118)`,
    border: `1px solid color-mix(in oklab, ${c} 28%, transparent)`,
  };
}

function RubroSvg({ rubro, size = 20 }: { rubro: string; size?: number }) {
  const d = (IC[rubro.toUpperCase()] ?? IC.OTRO)[0];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function decodeEmailFromToken(token: string | null): string {
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || payload.email || '';
  } catch {
    return '';
  }
}

// ── Tenant card ───────────────────────────────────────────────────────────────
function TenantCard({
  tenant, loading, isSelecting, onSelect,
}: {
  tenant: TenantInfo; loading: boolean; isSelecting: boolean; onSelect: (t: TenantInfo) => void;
}) {
  const rubroKey = tenant.rubro?.toUpperCase() ?? 'OTRO';
  const rolColor = ROLES_COLOR[tenant.rol?.toUpperCase() ?? ''] ?? '#7d7f96';

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => onSelect(tenant)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        background: isSelecting ? 'rgba(108,99,255,.08)' : '#101118',
        border: `1px solid ${isSelecting ? 'rgba(108,99,255,.55)' : 'rgba(255,255,255,.08)'}`,
        borderRadius: 14,
        cursor: loading ? 'default' : 'pointer',
        transition: 'all .18s',
        opacity: loading && !isSelecting ? 0.4 : 1,
        textAlign: 'left',
      }}
      onMouseEnter={e => {
        if (!loading) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = 'rgba(108,99,255,.5)';
          el.style.background = '#12131c';
          el.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = isSelecting ? 'rgba(108,99,255,.55)' : 'rgba(255,255,255,.08)';
        el.style.background = isSelecting ? 'rgba(108,99,255,.08)' : '#101118';
        el.style.transform = '';
      }}
    >
      {/* Ícono */}
      <span style={tileStyle(rubroKey, 46)}>
        {tenant.logoUrl
          ? <img src={tenant.logoUrl} alt={tenant.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          : <RubroSvg rubro={rubroKey} size={20} />
        }
      </span>

      {/* Info */}
      <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#e8e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tenant.nombre}
          </span>
        </span>
        <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px', marginTop: 6, fontSize: '.78rem', color: '#7d7f96' }}>
          <span>{RUBROS_CATALOG.find(r => r.value === tenant.rubro)?.label ?? tenant.rubro}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#4a4b60', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: rolColor }}>{tenant.rol}</span>
        </span>
      </span>

      {/* Spinner o flecha */}
      {isSelecting ? (
        <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: '50%', border: '2px solid rgba(139,133,255,.25)', borderTopColor: '#8b85ff', animation: 'fx-spin .7s linear infinite' }} />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: '#5a5a72' }}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      )}
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function SelectTenant() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { availableTenants, completeTenantSelection, resetPendingSelection, selectionToken } = useAuthStore();
  const { setRubro } = useTenantConfigStore();

  const userEmail = decodeEmailFromToken(selectionToken);
  const initials  = userEmail ? userEmail.slice(0, 2).toUpperCase() : '??';

  const openAdd = !!(location.state as { openAdd?: boolean } | null)?.openAdd;

  const [loading,     setLoading]     = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const [showForm,    setShowForm]    = useState(openAdd);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState<CrearNegocioRequest>({ nombreNegocio: '', rubro: 'FARMACIA', ruc: '', telefono: '', emailContacto: '', planId: 'BASICO' });
  const [formErrors, setFormErrors]   = useState<Record<string, string>>({});
  const [formTried,  setFormTried]    = useState(false);
  const [planes,        setPlanes]        = useState<PlanCatalogoDTO[]>([]);
  const [planesLoading, setPlanesLoading] = useState(false);
  const [planesError,   setPlanesError]   = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processed = value;
    if (name === 'ruc')      processed = value.replace(/\D/g, '').slice(0, 11);
    if (name === 'telefono') processed = value.replace(/\D/g, '').slice(0, 9);
    setForm(prev => ({ ...prev, [name]: processed }));
    setFormErrors(prev => ({ ...prev, [name]: validateNegocioField(name, processed) }));
  };


  useEffect(() => {
    const segmento = RUBRO_TO_SEGMENTO[form.rubro?.toUpperCase() ?? 'OTRO'] ?? 'OTRO';
    let cancelled = false;
    setPlanesLoading(true);
    setPlanesError(false);
    authService.getPlanesSegmento(segmento)
      .then(data => {
        if (cancelled) return;
        setPlanes(data);
        const basico = data.find(p => p.nivel === 'BASICO');
        if (basico) setForm(prev => ({ ...prev, planId: 'BASICO', planCodigo: basico.codigo }));
      })
      .catch(() => {
        if (cancelled) return;
        setPlanes([]);
        setPlanesError(true);
      })
      .finally(() => { if (!cancelled) setPlanesLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rubro]);

  const handleCrearNegocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreNegocio.trim()) { setFormTried(true); return; }
    const errs: Record<string, string> = {
      emailContacto: validateNegocioField('emailContacto', form.emailContacto ?? ''),
      ruc:           validateNegocioField('ruc',           form.ruc ?? ''),
      telefono:      validateNegocioField('telefono',      form.telefono ?? ''),
    };
    setFormErrors(errs);
    if (Object.values(errs).some(v => v)) return;
    setFormLoading(true);
    try {
      const newTenant = await authService.crearNegocio(form);
      useAuthStore.setState(s => ({
        availableTenants: [...s.availableTenants, newTenant],
        knownTenants: s.knownTenants !== null ? [...s.knownTenants, newTenant] : null,
      }));
      toast.success(`¡Negocio "${newTenant.nombre}" creado! Ahora puedes seleccionarlo.`);
      setShowForm(false);
      setFormTried(false);
      setForm({ nombreNegocio: '', rubro: 'FARMACIA', ruc: '', telefono: '', emailContacto: '', planId: 'BASICO', planCodigo: undefined });
      setFormErrors({});
    } catch {
      toast.error('Error al crear el negocio. Verifica los datos e intenta de nuevo.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSelect = async (tenant: TenantInfo) => {
    setLoading(true);
    setSelectingId(tenant.tenantId);
    try {
      const data = await authService.selectTenant(tenant.tenantId);
      let finalUser = data;
      try {
        const profile = await authService.obtenerPerfil();
        finalUser = {
          ...data,
          permisos: profile.permisos || [],
          rol: profile.rol,
          tenantId: profile.tenantId,
          sucursalId: profile.sucursalId ?? null,
          tenantNombre: profile.nombreFarmacia,
        };
      } catch {
        // Usar datos del JWT si falla /me
      }
      setRubro(tenant.rubro ?? null);
      completeTenantSelection(finalUser);
      toast.success(`¡Bienvenido a ${tenant.nombre}!`);
      navigate('/dashboard');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        resetPendingSelection();
        toast.error('La sesión de selección expiró. Inicia sesión nuevamente.');
        navigate('/login');
      } else {
        toast.error('Error al seleccionar el negocio. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
      setSelectingId(null);
    }
  };

  const rubroIcon = IC[(form.rubro?.toUpperCase()) ?? 'OTRO'] ?? IC.OTRO;
  const nomErr    = formTried && !form.nombreNegocio.trim();

  const INP: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 15px', fontSize: '.95rem',
    color: '#e8e8f0', background: '#101118',
    border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        .st-root { margin:0; background:#08090d; color:#e8e8f0; font-family:'Outfit',sans-serif; -webkit-font-smoothing:antialiased; }
        .st-root *, .st-root *::before, .st-root *::after { box-sizing:border-box; }
        @keyframes fx-spin { to { transform: rotate(360deg); } }
        @keyframes fx-in   { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .st-card-anim { animation: fx-in .3s ease; }
        .st-form-anim { animation: fx-in .22s ease; }
        .st-inp:focus  { border-color: rgba(108,99,255,.7) !important; box-shadow: 0 0 0 4px rgba(108,99,255,.14); }
        .st-plan:hover { filter: brightness(1.06); }
      `}</style>

      <div className="st-root" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 18px 28px', background: 'linear-gradient(160deg,#0b0d14,#08090d 55%)' }}>

        {/* Fondo: grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(108,99,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.05) 1px,transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(70% 60% at 50% 0%,#000 20%,transparent 75%)', WebkitMaskImage: 'radial-gradient(70% 60% at 50% 0%,#000 20%,transparent 75%)', pointerEvents: 'none' }} />
        {/* Glow top */}
        <div style={{ position: 'absolute', top: -260, left: '50%', transform: 'translateX(-60%)', width: 820, height: 600, background: 'radial-gradient(50% 50% at 50% 50%,rgba(108,99,255,.26),transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        {/* Glow bottom */}
        <div style={{ position: 'absolute', bottom: -280, right: -160, width: 640, height: 520, background: 'radial-gradient(50% 50% at 50% 50%,rgba(0,212,170,.12),transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        {/* Logo */}
        <Link to="/" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/fluxus.png" alt="Fluxus" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover' }} />
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '1.15rem', fontWeight: 700, background: 'linear-gradient(135deg,#8b85ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Fluxus
          </span>
        </Link>

        {/* Card */}
        <div className="st-card-anim" style={{ position: 'relative', width: '100%', maxWidth: 540, marginTop: 28, border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, background: '#0e0f15', padding: '32px 30px', boxShadow: '0 40px 90px -50px rgba(0,0,0,.9)' }}>

          {/* Chip usuario */}
          {userEmail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px 7px 7px', width: 'max-content', maxWidth: '100%', border: '1px solid rgba(255,255,255,.08)', borderRadius: 40, background: '#101118' }}>
              <span style={{ width: 26, height: 26, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', fontSize: '.7rem', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#6c63ff,#4a43cc)' }}>
                {initials}
              </span>
              <span style={{ fontSize: '.82rem', color: '#c9cbd8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userEmail}
              </span>
            </div>
          )}

          {/* ── Vista lista ── */}
          {!showForm && (
            <>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: `${userEmail ? 20 : 0}px 0 0`, color: '#e8e8f0' }}>
                ¿En qué negocio vas a trabajar?
              </h1>
              <p style={{ fontSize: '.93rem', color: '#7d7f96', lineHeight: 1.6, margin: '8px 0 0' }}>
                {availableTenants.length === 0
                  ? 'No hay negocios disponibles para esta cuenta.'
                  : `Tu cuenta tiene acceso a ${availableTenants.length} negocio${availableTenants.length !== 1 ? 's' : ''}. Elige uno; puedes cambiar luego desde el menú de usuario.`}
              </p>

              {availableTenants.length === 0 ? (
                <div style={{ marginTop: 24, textAlign: 'center', color: '#7d7f96', fontSize: '.9rem' }}>
                  <button type="button" onClick={() => { resetPendingSelection(); navigate('/login'); }} style={{ color: '#8b85ff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem', textDecoration: 'underline' }}>
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
                  {availableTenants.map(tenant => (
                    <TenantCard
                      key={tenant.tenantId}
                      tenant={tenant}
                      loading={loading}
                      isSelecting={selectingId === tenant.tenantId}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}

              {/* Agregar negocio */}
              <button
                type="button"
                onClick={() => { setShowForm(true); setFormTried(false); }}
                disabled={loading}
                style={{ width: '100%', marginTop: 12, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textAlign: 'left', background: 'transparent', border: '1.5px dashed rgba(108,99,255,.35)', borderRadius: 14, cursor: 'pointer', transition: 'all .18s' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(108,99,255,.07)'; el.style.borderColor = 'rgba(108,99,255,.6)'; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.borderColor = 'rgba(108,99,255,.35)'; }}
              >
                <span style={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 12, color: '#a79fff', background: 'rgba(108,99,255,.12)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '.95rem', fontWeight: 650, color: '#c9cbd8' }}>Agregar negocio</span>
                  <span style={{ display: 'block', fontSize: '.78rem', color: '#7d7f96', marginTop: 2 }}>Crea otro local con su propio inventario y facturación</span>
                </span>
              </button>
            </>
          )}

          {/* ── Vista crear ── */}
          {showForm && (
            <div className="st-form-anim" style={{ display: 'grid', gap: 16, marginTop: userEmail ? 20 : 0 }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: 0, color: '#e8e8f0' }}>Nuevo negocio</h1>
                <p style={{ fontSize: '.93rem', color: '#7d7f96', lineHeight: 1.6, margin: '8px 0 0' }}>Tendrá su propio inventario, usuarios y facturación. Tú quedarás como administrador.</p>
              </div>

              {/* Nombre */}
              <div style={{ display: 'grid', gap: 7 }}>
                <label style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Nombre del negocio *</label>
                <input
                  className="st-inp"
                  name="nombreNegocio" value={form.nombreNegocio} onChange={handleFormChange}
                  placeholder="Ej: Botica San Martín" autoFocus
                  style={{ ...INP, border: `1px solid ${nomErr ? 'rgba(255,95,87,.6)' : 'rgba(255,255,255,.1)'}` }}
                />
                {nomErr && <span style={{ fontSize: '.78rem', color: '#ff8079' }}>Ingresa el nombre del negocio.</span>}
              </div>

              {/* Rubro */}
              <div style={{ display: 'grid', gap: 7 }}>
                <label style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Tipo de negocio *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1, ...tileStyle(form.rubro?.toUpperCase() ?? 'OTRO', 32) }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={rubroIcon[0]} /></svg>
                  </span>
                  <select
                    className="st-inp"
                    name="rubro" value={form.rubro} onChange={handleFormChange}
                    style={{ ...INP, padding: '0 40px 0 52px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    {RUBROS_CATALOG.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', color: '#5a5a72', pointerEvents: 'none' }}><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>

              {/* Plan */}
              <div style={{ display: 'grid', gap: 7 }}>
                <label style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Plan</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                  {planesLoading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '18px 0', color: '#7d7f96', fontSize: '.82rem' }}>
                      Cargando planes…
                    </div>
                  ) : planesError || planes.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '18px 0', color: '#ff8079', fontSize: '.82rem' }}>
                      No se pudieron cargar los planes. Intenta más tarde.
                    </div>
                  ) : planes.map(plan => {
                    const on = form.planId === plan.nivel;
                    const nombre = plan.nivel === 'BASICO' ? 'Básico' : 'Pro';
                    const desc = plan.nivel === 'BASICO'
                      ? `POS, inventario, facturación SUNAT · ${plan.maxUsuarios} usuarios`
                      : `Multi-sucursal (hasta ${plan.maxSucursales}), reportes y ${plan.maxUsuarios} usuarios`;
                    return (
                      <button
                        key={plan.codigo} type="button" className="st-plan"
                        onClick={() => setForm(prev => ({ ...prev, planId: plan.nivel, planCodigo: plan.codigo }))}
                        style={{ display: 'block', textAlign: 'left', padding: '13px 14px', borderRadius: 13, cursor: 'pointer', transition: 'all .16s', background: on ? 'rgba(108,99,255,.1)' : '#101118', border: `1.5px solid ${on ? '#6c63ff' : 'rgba(255,255,255,.08)'}` }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: '.92rem', fontWeight: 700, color: '#e8e8f0' }}>{nombre}</span>
                          <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: '50%', background: '#101118', border: on ? '5px solid #6c63ff' : '1.5px solid rgba(255,255,255,.2)', boxSizing: 'border-box' }} />
                        </span>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-.02em', color: '#e8e8f0' }}>S/ {plan.precioMensual}</span>
                          <span style={{ fontSize: '.76rem', color: '#7d7f96' }}>/mes</span>
                        </span>
                        <span style={{ display: 'block', fontSize: '.74rem', lineHeight: 1.45, color: '#7d7f96', marginTop: 4 }}>{desc}</span>
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: '.76rem', color: '#7d7f96' }}>14 días de prueba gratis en el negocio nuevo. Sin tarjeta.</span>
              </div>

              {/* Separador */}
              <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '2px 0' }} />
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: '.66rem', letterSpacing: '.08em', textTransform: 'uppercase', color: '#7d7f96' }}>Datos de contacto · opcional</div>

              {/* RUC */}
              <div style={{ display: 'grid', gap: 7 }}>
                <label style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>RUC</label>
                <input
                  className="st-inp"
                  name="ruc" value={form.ruc} onChange={handleFormChange}
                  placeholder="11 dígitos" inputMode="numeric"
                  style={{ ...INP, border: `1px solid ${formErrors.ruc ? 'rgba(255,95,87,.6)' : 'rgba(255,255,255,.1)'}`, fontFamily: "'Space Mono',monospace", fontSize: '.88rem', letterSpacing: '.04em' }}
                />
                {formErrors.ruc && <span style={{ fontSize: '.78rem', color: '#ff8079' }}>{formErrors.ruc}</span>}
              </div>

              {/* Celular + Email en 2 cols */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
                <div style={{ display: 'grid', gap: 7 }}>
                  <label style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Celular</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: "'Space Mono',monospace", fontSize: '.8rem', color: '#7d7f96', pointerEvents: 'none' }}>+51</span>
                    <input
                      className="st-inp"
                      name="telefono" value={form.telefono} onChange={handleFormChange}
                      placeholder="9XX XXX XXX" inputMode="numeric"
                      style={{ ...INP, paddingLeft: 48, border: `1px solid ${formErrors.telefono ? 'rgba(255,95,87,.6)' : 'rgba(255,255,255,.1)'}`, fontFamily: "'Space Mono',monospace", fontSize: '.88rem' }}
                    />
                  </div>
                  {formErrors.telefono && <span style={{ fontSize: '.78rem', color: '#ff8079' }}>Debe tener 9 dígitos y empezar con 9.</span>}
                </div>
                <div style={{ display: 'grid', gap: 7 }}>
                  <label style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Email de contacto</label>
                  <input
                    className="st-inp"
                    name="emailContacto" value={form.emailContacto} onChange={handleFormChange}
                    placeholder="negocio@correo.com" type="email"
                    style={{ ...INP, border: `1px solid ${formErrors.emailContacto ? 'rgba(255,95,87,.6)' : 'rgba(255,255,255,.1)'}` }}
                  />
                  {formErrors.emailContacto && <span style={{ fontSize: '.78rem', color: '#ff8079' }}>{formErrors.emailContacto}</span>}
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormErrors({}); setFormTried(false); }}
                  style={{ height: 50, padding: '0 20px', fontSize: '.95rem', fontWeight: 600, color: '#c9cbd8', background: 'transparent', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, cursor: 'pointer', transition: 'background .18s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleCrearNegocio as unknown as React.MouseEventHandler}
                  disabled={formLoading}
                  style={{ flex: 1, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: '.98rem', fontWeight: 600, color: '#fff', border: 0, borderRadius: 12, background: 'linear-gradient(135deg,#6c63ff,#4a43cc)', boxShadow: '0 1px 0 rgba(255,255,255,.25) inset, 0 16px 36px -18px #6c63ff', transition: 'filter .18s', cursor: formLoading ? 'progress' : 'pointer', filter: formLoading ? 'saturate(.7) brightness(.9)' : undefined }}
                >
                  {formLoading && <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'fx-spin .7s linear infinite', flexShrink: 0 }} />}
                  {formLoading ? 'Creando negocio…' : 'Crear negocio'}
                </button>
              </div>
            </div>
          )}

          {/* Footer: ¿No es tu cuenta? */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: '.82rem', color: '#7d7f96' }}>¿No es tu cuenta?</span>
            <button
              type="button"
              onClick={() => { resetPendingSelection(); navigate('/login'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.86rem', fontWeight: 600, color: '#c9cbd8', background: 'none', border: 'none', cursor: 'pointer', transition: 'color .15s', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8b85ff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#c9cbd8')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <path d="m16 17 5-5-5-5"/>
                <path d="M21 12H9"/>
              </svg>
              Usar otra cuenta
            </button>
          </div>
        </div>

        {/* Copyright */}
        <div style={{ position: 'relative', marginTop: 22, fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: '#4a4b60' }}>
          © 2026 Fluxus · Todos los derechos reservados
        </div>
      </div>
    </>
  );
}
