import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import type { CrearNegocioRequest } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import type { TenantInfo } from '../../types';
import toast from 'react-hot-toast';
import './login.css';

// Mismas reglas que Register.tsx
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

const RUBROS = [
  { value: 'FARMACIA', label: 'Farmacia' },
  { value: 'BOTICA', label: 'Botica' },
  { value: 'MINIMARKET', label: 'Minimarket' },
  { value: 'FERRETERIA', label: 'Ferretería' },
  { value: 'RESTAURANTE', label: 'Restaurante' },
  { value: 'TIENDA', label: 'Tienda' },
  { value: 'VETERINARIA', label: 'Veterinaria' },
  { value: 'EMPRESA_SERVICIOS', label: 'Empresa de servicios' },
  { value: 'OTRO', label: 'Otro' },
];

function RubroIcon({ rubro }: { rubro: string }) {
  const map: Record<string, string> = {
    FARMACIA: '💊', BOTICA: '💊', FERRETERIA: '🔧', VETERINARIA: '🐾',
    TIENDA: '🛍️', RESTAURANTE: '🍽️', EMPRESA_SERVICIOS: '🏢',
  };
  return <span style={{ fontSize: '1.4rem' }}>{map[rubro?.toUpperCase()] ?? '🏪'}</span>;
}

function TenantCard({
  tenant,
  loading,
  onSelect,
}: {
  tenant: TenantInfo;
  loading: boolean;
  onSelect: (t: TenantInfo) => void;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => onSelect(tenant)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
        background: '#0e0f15',
        border: '1px solid rgba(255,255,255,.10)',
        borderRadius: 14,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'border-color .15s, background .15s',
        opacity: loading ? 0.6 : 1,
        textAlign: 'left',
      }}
      onMouseEnter={e => {
        if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(108,99,255,.6)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.10)';
      }}
    >
      {/* Logo o ícono */}
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: 'rgba(108,99,255,.12)', border: '1px solid rgba(108,99,255,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {tenant.logoUrl
          ? <img src={tenant.logoUrl} alt={tenant.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <RubroIcon rubro={tenant.rubro} />
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#e8e9f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tenant.nombre}
        </div>
        <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'Space Mono',monospace", fontSize: '.65rem', letterSpacing: '.06em',
            textTransform: 'uppercase', color: '#00d4aa',
            background: 'rgba(0,212,170,.1)', border: '1px solid rgba(0,212,170,.2)',
            padding: '.15rem .5rem', borderRadius: 50,
          }}>
            {tenant.rubro}
          </span>
          <span style={{
            fontFamily: "'Space Mono',monospace", fontSize: '.65rem', letterSpacing: '.06em',
            textTransform: 'uppercase', color: '#a79fff',
            background: 'rgba(108,99,255,.1)', border: '1px solid rgba(108,99,255,.2)',
            padding: '.15rem .5rem', borderRadius: 50,
          }}>
            {tenant.rol}
          </span>
        </div>
      </div>

      {/* Flecha */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(108,99,255,.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}

export function SelectTenant() {
  const navigate = useNavigate();
  const { availableTenants, completeTenantSelection, resetPendingSelection } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState<CrearNegocioRequest>({ nombreNegocio: '', rubro: 'OTRO', ruc: '', telefono: '', emailContacto: '', planId: 'BASICO' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processed = value;
    if (name === 'ruc')     processed = value.replace(/\D/g, '').slice(0, 11);
    if (name === 'telefono') processed = value.replace(/\D/g, '').slice(0, 9);
    setForm(prev => ({ ...prev, [name]: processed }));
    setFormErrors(prev => ({ ...prev, [name]: validateNegocioField(name, processed) }));
  };

  const formHasErrors = () => {
    const e = form.emailContacto ? !EMAIL_RE.test(form.emailContacto) : false;
    const r = form.ruc           ? !RUC_RE.test(form.ruc)             : false;
    const t = form.telefono      ? !CEL_RE.test(form.telefono)        : false;
    return e || r || t;
  };

  const handleCrearNegocio = async (e: React.FormEvent) => {
    e.preventDefault();
    // Re-validate all optional fields before submit
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
      useAuthStore.setState(s => ({ availableTenants: [...s.availableTenants, newTenant] }));
      toast.success(`¡Negocio "${newTenant.nombre}" creado! Ahora puedes seleccionarlo.`);
      setShowForm(false);
      setForm({ nombreNegocio: '', rubro: 'OTRO', ruc: '', telefono: '', emailContacto: '', planId: 'BASICO' });
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
        finalUser = { ...data, permisos: profile.permisos || [], rol: profile.rol, tenantId: profile.tenantId, sucursalId: profile.sucursalId ?? null };
      } catch {
        // Usar datos del JWT si falla /me
      }

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

  return (
    <div className="lx">
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08090d', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32, textDecoration: 'none' }}>
            <img src="/fluxus.png" alt="Fluxus" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,#8b85ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Fluxus
            </span>
          </Link>

          {/* Card */}
          <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, background: '#0e0f15', padding: '28px 28px 32px', boxShadow: '0 40px 90px -50px rgba(0,0,0,.9)' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.025em', margin: 0 }}>
                Selecciona tu negocio
              </h1>
              <p style={{ fontSize: '.93rem', color: '#7d7f96', lineHeight: 1.6, margin: '8px 0 0' }}>
                Tu cuenta tiene acceso a múltiples negocios. ¿Desde cuál quieres operar hoy?
              </p>
            </div>

            {availableTenants.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#7d7f96', padding: '24px 0' }}>
                No hay negocios disponibles.{' '}
                <button
                  type="button"
                  onClick={() => { resetPendingSelection(); navigate('/login'); }}
                  style={{ color: '#8b85ff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {availableTenants.map(tenant => (
                  <div key={tenant.tenantId} style={{ position: 'relative' }}>
                    <TenantCard tenant={tenant} loading={loading} onSelect={handleSelect} />
                    {selectingId === tenant.tenantId && (
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 14, background: 'rgba(14,15,21,.7)',
                      }}>
                        <span className="lx-spinner" style={{ width: 20, height: 20 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Agregar negocio */}
            <div style={{ marginTop: 16 }}>
              {!showForm ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  disabled={loading}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '12px 20px', background: 'transparent',
                    border: '1px dashed rgba(108,99,255,.35)', borderRadius: 14,
                    color: '#a79fff', fontSize: '.9rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'border-color .15s, color .15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(108,99,255,.7)'; (e.currentTarget as HTMLButtonElement).style.color = '#c5c1ff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(108,99,255,.35)'; (e.currentTarget as HTMLButtonElement).style.color = '#a79fff'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Agregar negocio
                </button>
              ) : (
                <form onSubmit={handleCrearNegocio} style={{ border: '1px solid rgba(108,99,255,.25)', borderRadius: 14, padding: '20px', background: 'rgba(108,99,255,.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#e8e9f0' }}>Nuevo negocio</span>
                    <button type="button" onClick={() => { setShowForm(false); setFormErrors({}); }} style={{ background: 'none', border: 'none', color: '#7d7f96', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '0 2px' }}>✕</button>
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {/* Nombre del negocio */}
                    <input
                      name="nombreNegocio" value={form.nombreNegocio} onChange={handleFormChange}
                      placeholder="Nombre del negocio *" required autoFocus
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: '#0e0f15', color: '#e8e9f0', fontSize: '.9rem', boxSizing: 'border-box' }}
                    />

                    {/* Rubro */}
                    <select
                      name="rubro" value={form.rubro} onChange={handleFormChange}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: '#0e0f15', color: '#e8e9f0', fontSize: '.9rem', boxSizing: 'border-box' }}
                    >
                      {RUBROS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>

                    {/* Plan */}
                    <select
                      name="planId" value={form.planId} onChange={handleFormChange}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: '#0e0f15', color: '#e8e9f0', fontSize: '.9rem', boxSizing: 'border-box' }}
                    >
                      <option value="BASICO">Plan Básico</option>
                      <option value="PRO">Plan Pro</option>
                    </select>

                    {/* RUC */}
                    <div>
                      <input
                        name="ruc" value={form.ruc} onChange={handleFormChange}
                        placeholder="RUC (opcional — 11 dígitos)" inputMode="numeric"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${formErrors.ruc ? 'rgba(255,95,87,.6)' : 'rgba(255,255,255,.12)'}`, background: '#0e0f15', color: '#e8e9f0', fontSize: '.9rem', boxSizing: 'border-box', fontFamily: "'Space Mono',monospace", letterSpacing: '.04em' }}
                      />
                      {formErrors.ruc && <span style={{ fontSize: '.75rem', color: '#ff8079', marginTop: 3, display: 'block' }}>{formErrors.ruc}</span>}
                    </div>

                    {/* Teléfono */}
                    <div>
                      <input
                        name="telefono" value={form.telefono} onChange={handleFormChange}
                        placeholder="Celular (opcional — 9 dígitos, empieza con 9)" inputMode="numeric"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${formErrors.telefono ? 'rgba(255,95,87,.6)' : 'rgba(255,255,255,.12)'}`, background: '#0e0f15', color: '#e8e9f0', fontSize: '.9rem', boxSizing: 'border-box', fontFamily: "'Space Mono',monospace", letterSpacing: '.04em' }}
                      />
                      {formErrors.telefono && <span style={{ fontSize: '.75rem', color: '#ff8079', marginTop: 3, display: 'block' }}>{formErrors.telefono}</span>}
                    </div>

                    {/* Email de contacto */}
                    <div>
                      <input
                        name="emailContacto" value={form.emailContacto} onChange={handleFormChange}
                        placeholder="Email de contacto (opcional)" type="text"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${formErrors.emailContacto ? 'rgba(255,95,87,.6)' : 'rgba(255,255,255,.12)'}`, background: '#0e0f15', color: '#e8e9f0', fontSize: '.9rem', boxSizing: 'border-box' }}
                      />
                      {formErrors.emailContacto && <span style={{ fontSize: '.75rem', color: '#ff8079', marginTop: 3, display: 'block' }}>{formErrors.emailContacto}</span>}
                    </div>
                  </div>

                  <button
                    type="submit" disabled={formLoading || formHasErrors()}
                    style={{
                      marginTop: 14, width: '100%', padding: '11px 0', borderRadius: 10,
                      background: (formLoading || formHasErrors()) ? 'rgba(108,99,255,.4)' : 'linear-gradient(135deg,#6c63ff,#4ecdc4)',
                      border: 'none', color: '#fff', fontWeight: 700, fontSize: '.9rem',
                      cursor: (formLoading || formHasErrors()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: formHasErrors() && !formLoading ? 0.7 : 1,
                    }}
                  >
                    {formLoading && <span className="lx-spinner" style={{ width: 16, height: 16 }} />}
                    {formLoading ? 'Creando...' : 'Crear negocio'}
                  </button>
                </form>
              )}
            </div>

            {/* Opción de cerrar sesión */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.07)', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { resetPendingSelection(); navigate('/login'); }}
                style={{ fontSize: '.85rem', color: '#7d7f96', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Usar otra cuenta
              </button>
            </div>
          </div>

          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: '.68rem', color: '#6a6c82', textAlign: 'center', margin: '16px 0 0' }}>
            © 2026 Fluxus · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
