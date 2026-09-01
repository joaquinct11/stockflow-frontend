import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import type { PlanId, TipoDocumento } from '../../types';
import './register.css';

interface ApiErrorShape {
  response?: { data?: { mensaje?: string } };
  message?: string;
}

const DOC_RULES: Record<TipoDocumento, { len: number; ph: string; label: string }> = {
  DNI:       { len: 8,  ph: '8 dígitos',   label: 'El DNI debe tener exactamente 8 dígitos' },
  RUC:       { len: 11, ph: '11 dígitos',  label: 'El RUC debe tener exactamente 11 dígitos' },
  CE:        { len: 9,  ph: '9 dígitos',   label: 'El Carné de Extranjería debe tener 9 dígitos' },
  PASAPORTE: { len: 0,  ph: 'Nº documento', label: '' },
};

const RUBRO_HINTS: Record<string, string> = {
  BOTICA:            'Verás lotes, vencimientos, DIGEMID y el reporte OPPF.',
  FARMACIA:          'Verás lotes, vencimientos, DIGEMID y el reporte OPPF.',
  MINIMARKET:        'Verás turnos de caja, merma y control por categorías.',
  FERRETERIA:        'Verás órdenes de compra, recepciones parciales y kardex.',
  RESTAURANTE:       'Verás POS rápido, caja por turno y control de insumos.',
  TIENDA_ROPA:       'Verás variantes por talla y color en el inventario.',
  TIENDA:            'Verás POS rápido, caja diaria y alertas de stock.',
  EMPRESA_SERVICIOS: 'Verás facturación, clientes y reportes de ingresos.',
  OTRO:              'Define los módulos que verás al ingresar.',
};

function pwScore(pass: string): number {
  if (!pass) return 0;
  let s = 0;
  if (pass.length >= 8) s++;
  if (/[a-zA-Z]/.test(pass) && /\d/.test(pass)) s++;
  if (pass.length >= 12 || /[^a-zA-Z0-9]/.test(pass)) s++;
  return Math.min(s, 3);
}

const PW_LABELS = ['', 'Débil', 'Aceptable', 'Fuerte'];
const PW_COLORS = ['#7d7f96', '#ff8079', '#febc2e', '#3fe0c0'];

const BAR_ON: React.CSSProperties  = { flex: 1, height: 3, borderRadius: 3, background: 'linear-gradient(90deg,#6c63ff,#00d4aa)', transition: 'background .3s' };
const BAR_OFF: React.CSSProperties = { flex: 1, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.1)', transition: 'background .3s' };

const STEPS_INFO = [
  { n: '1', bg: 'rgba(108,99,255,.16)', br: 'rgba(108,99,255,.4)', tc: '#a79fff', title: 'Creas tu cuenta',   desc: 'Tus datos y los de tu empresa, dos minutos.' },
  { n: '2', bg: 'rgba(108,99,255,.16)', br: 'rgba(108,99,255,.4)', tc: '#a79fff', title: 'Subes tu catálogo', desc: 'Desde Excel, con validación fila por fila.' },
  { n: '3', bg: 'rgba(0,212,170,.16)',  br: 'rgba(0,212,170,.4)',  tc: '#3fe0c0', title: 'Vendes y facturas',  desc: 'POS, caja y comprobantes a SUNAT el mismo día.' },
];

export function Register() {
  const navigate    = useNavigate();
  const { setUser } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPlan  = searchParams.get('plan')?.toUpperCase();
  const initPlan: PlanId = rawPlan === 'PRO' ? 'PRO' : 'BASICO';

  // ── Step 1: datos personales (→ usuarios) ──
  const [step,     setStep]     = useState<1 | 2>(1);
  const [nombre,   setNombre]   = useState('');
  const [apellido, setApellido] = useState('');
  const [email,    setEmail]    = useState('');
  const [pass,     setPass]     = useState('');
  const [showPass, setShowPass] = useState(false);
  const [tipoDoc,  setTipoDoc]  = useState<TipoDocumento>('DNI');
  const [numDoc,   setNumDoc]   = useState('');
  const [celular,  setCelular]  = useState('');

  // ── Step 2: datos del negocio (→ tenants) ──
  const [empresa,    setEmpresa]    = useState('');
  const [rubro,      setRubro]      = useState('OTRO');
  const [rucEmpresa, setRucEmpresa] = useState('');
  const [plan,       setPlan]       = useState<PlanId>(initPlan);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const score = pwScore(pass);

  function validate1(): string {
    if (!nombre.trim()) return 'Ingresa tu nombre.';
    if (!apellido.trim()) return 'Los apellidos son obligatorios.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'Ingresa un correo electrónico válido (ej: juan@empresa.com).';
    if (pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!numDoc.trim()) return 'El número de documento es obligatorio.';
    const rule = DOC_RULES[tipoDoc];
    if (rule.len && numDoc.length !== rule.len) return rule.label + '.';
    if (!celular.trim()) return 'El número de celular es obligatorio.';
    if (!/^9\d{8}$/.test(celular)) return 'El celular debe tener 9 dígitos y comenzar con 9 (ej: 987654321).';
    return '';
  }

  function validate2(): string {
    if (empresa.trim().length < 3) return 'El nombre de la empresa debe tener al menos 3 caracteres.';
    if (!rucEmpresa.trim()) return 'El RUC de la empresa es obligatorio.';
    if (!/^\d{11}$/.test(rucEmpresa)) return 'El RUC debe tener exactamente 11 dígitos.';
    return '';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (step === 1) {
      const err = validate1();
      if (err) { setError(err); return; }
      setStep(2); setError('');
      return;
    }

    const err = validate2();
    if (err) { setError(err); return; }

    setLoading(true); setError('');
    try {
      const response = await authService.register({
        email:           email.trim(),
        contraseña:      pass,
        nombre:          nombre.trim(),
        apellido:        apellido.trim(),
        nombreFarmacia:  empresa.trim(),
        planId:          plan,
        rubro,
        tipoDocumento:   tipoDoc,
        numeroDocumento: numDoc,
        numeroCelular:   celular,
        rucEmpresa:      rucEmpresa.trim(),
      });
      setUser(response);
      toast.success(`¡Bienvenido! Tu prueba de 14 días del plan ${response.suscripcion?.planId} ha comenzado.`);
      sessionStorage.setItem('checkout_doc', JSON.stringify({ tipoDocumento: tipoDoc, numeroDocumento: numDoc }));
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as ApiErrorShape;
      setError(e.response?.data?.mensaje || e.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  function pwBarBg(i: number) {
    const colors = ['#ff5f57', '#febc2e', '#00d4aa'];
    return score >= i ? colors[score - 1] : 'rgba(255,255,255,.09)';
  }

  function planStyle(id: PlanId): React.CSSProperties {
    const on = plan === id;
    return {
      position: 'relative', textAlign: 'left', padding: '15px 14px',
      borderRadius: 13, cursor: 'pointer', fontFamily: "'Outfit',sans-serif",
      transition: 'all .2s', background: on ? 'rgba(108,99,255,.13)' : '#101118',
      border: on ? '1px solid rgba(108,99,255,.65)' : '1px solid rgba(255,255,255,.1)',
      boxShadow: on ? '0 0 0 3px rgba(108,99,255,.13)' : 'none',
    };
  }

  const submitStyle: React.CSSProperties = {
    flex: 1, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, fontFamily: "'Outfit',sans-serif", fontSize: '.98rem', fontWeight: 600,
    color: '#fff', border: 0, borderRadius: 12,
    background: 'linear-gradient(135deg,#6c63ff,#4a43cc)',
    boxShadow: '0 1px 0 rgba(255,255,255,.25) inset, 0 16px 36px -18px #6c63ff',
    transition: 'filter .18s', cursor: loading ? 'progress' : 'pointer',
    filter: loading ? 'saturate(.7) brightness(.9)' : 'none',
  };

  return (
    <div className="rx" data-r="split" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr 1fr', background: '#08090d' }}>

      {/* ── Brand panel ── */}
      <div data-r="brand" style={{ position: 'relative', overflow: 'hidden', padding: '48px 56px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg,#0b0d14,#08090d 55%)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(108,99,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.05) 1px,transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(90% 70% at 20% 10%,#000 20%,transparent 75%)', WebkitMaskImage: 'radial-gradient(90% 70% at 20% 10%,#000 20%,transparent 75%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -220, left: -140, width: 760, height: 620, background: 'radial-gradient(50% 50% at 50% 50%,rgba(108,99,255,.3),transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -260, right: -180, width: 640, height: 520, background: 'radial-gradient(50% 50% at 50% 50%,rgba(0,212,170,.14),transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        <Link to="/" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <img src="/fluxus.png" alt="Fluxus" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover' }} />
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '1.15rem', fontWeight: 700, background: 'linear-gradient(135deg,#8b85ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Fluxus</span>
        </Link>

        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(0,212,170,.1)', border: '1px solid rgba(0,212,170,.3)', color: '#3fe0c0', padding: '.35rem .9rem', borderRadius: 50, fontFamily: "'Space Mono',monospace", fontSize: '.7rem', letterSpacing: '.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            <span className="rx-dot" />
            14 días gratis · Sin tarjeta
          </div>
          <h2 style={{ fontSize: 'clamp(1.9rem,3.2vw,2.7rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-.03em', margin: '22px 0 0', maxWidth: 470 }}>
            Empieza a operar hoy. Configuramos tu negocio contigo.
          </h2>
          <p style={{ fontSize: '1rem', lineHeight: 1.65, color: '#9898b0', margin: '16px 0 0', maxWidth: 430 }}>
            Creas tu cuenta en dos pasos y entras directo al sistema. Sin instalaciones y sin pagar nada hasta que decidas quedarte.
          </p>
          <div style={{ display: 'grid', gap: 16, marginTop: 34, maxWidth: 430 }}>
            {STEPS_INFO.map(({ n, bg, br, tc, title, desc }) => (
              <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', background: bg, border: `1px solid ${br}`, color: tc, fontFamily: "'Space Mono',monospace", fontSize: '.72rem', fontWeight: 700, display: 'grid', placeItems: 'center' }}>{n}</span>
                <div>
                  <div style={{ fontSize: '.94rem', fontWeight: 600, color: '#e8e8f0' }}>{title}</div>
                  <div style={{ fontSize: '.86rem', color: '#8d90a6', lineHeight: 1.55, marginTop: 3 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 48, display: 'flex', flexWrap: 'wrap', gap: '10px 24px', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', letterSpacing: '.06em', textTransform: 'uppercase', color: '#7d7f96' }}>Conexión segura</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: '#8d90a6' }}>🔒 TLS 1.3</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: '#8d90a6' }}>SUNAT integrado</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: '#8d90a6' }}>Cancela cuando quieras</span>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div data-r="pane" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', background: '#0a0b10', borderLeft: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Mobile logo */}
          <div data-r="mobilelogo" style={{ display: 'none', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 26 }}>
            <img src="/fluxus.png" alt="Fluxus" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,#8b85ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Fluxus</span>
          </div>

          {/* Form card */}
          <div data-r="formpad" style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, background: '#0e0f15', padding: '34px 32px', boxShadow: '0 40px 90px -50px rgba(0,0,0,.9)' }}>

            {/* Progress header */}
            <div style={{ display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: '#8d90a6' }}>
                  {step === 1 ? 'Tus datos' : 'Tu empresa y plan'}
                </span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.68rem', color: '#6a6c82' }}>Paso {step} de 2</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={BAR_ON} />
                <span style={step === 2 ? BAR_ON : BAR_OFF} />
              </div>
            </div>

            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-.025em', margin: '22px 0 0' }}>
              {step === 1 ? 'Crea tu cuenta' : 'Cuéntanos de tu negocio'}
            </h1>
            <p style={{ fontSize: '.92rem', color: '#8d90a6', lineHeight: 1.6, margin: '7px 0 0' }}>
              {step === 1 ? '14 días gratis, sin tarjeta y sin permanencia.' : 'Con esto configuramos los módulos que verás al entrar.'}
            </p>

            {/* Error banner */}
            {error && (
              <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 20, padding: '13px 15px', border: '1px solid rgba(255,95,87,.32)', borderRadius: 12, background: 'rgba(255,95,87,.08)', animation: 'rx-in .25s ease' }}>
                <span style={{ color: '#ff8079', fontSize: '.95rem', lineHeight: 1.4, flexShrink: 0 }}>!</span>
                <div style={{ fontSize: '.88rem', color: '#ffb3ad', lineHeight: 1.55 }}>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 22 }}>

              {/* ══════════════════════════════════════════
                  PASO 1 — Datos personales → tabla usuarios
                  ══════════════════════════════════════════ */}
              {step === 1 && (
                <div style={{ display: 'grid', gap: 16, animation: 'rx-in .3s ease' }}>

                  {/* Nombre + Apellido */}
                  <div data-r="duo" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 7 }}>
                      <label htmlFor="rx-nombre" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Nombre(s) <span style={{ color: '#ff8079' }}>*</span></label>
                      <input id="rx-nombre" type="text" placeholder="Juan Carlos" value={nombre} onChange={e => { setNombre(e.target.value); setError(''); }} className="rx-input" />
                    </div>
                    <div style={{ display: 'grid', gap: 7 }}>
                      <label htmlFor="rx-apellido" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Apellido(s) <span style={{ color: '#ff8079' }}>*</span></label>
                      <input id="rx-apellido" type="text" placeholder="Pérez García" value={apellido} onChange={e => { setApellido(e.target.value); setError(''); }} className="rx-input" />
                    </div>
                  </div>

                  {/* Email */}
                  <div style={{ display: 'grid', gap: 7 }}>
                    <label htmlFor="rx-email" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Correo electrónico <span style={{ color: '#ff8079' }}>*</span></label>
                    <input id="rx-email" type="email" autoComplete="email" placeholder="juan@miempresa.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} className="rx-input" />
                    <span style={{ fontSize: '.78rem', color: '#7d7f96' }}>Recibirás notificaciones y facturas aquí.</span>
                  </div>

                  {/* Contraseña */}
                  <div style={{ display: 'grid', gap: 7 }}>
                    <label htmlFor="rx-pass" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Contraseña <span style={{ color: '#ff8079' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input id="rx-pass" type={showPass ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={pass} onChange={e => { setPass(e.target.value); setError(''); }} className="rx-input rx-input-pass" />
                      <button type="button" onClick={() => setShowPass(v => !v)} aria-label="Mostrar u ocultar contraseña" className="rx-pass-toggle">
                        {showPass
                          ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.2 0 10 7 10 7a17.6 17.6 0 0 1-2.3 3.2" /><path d="M6.6 6.7A17.2 17.2 0 0 0 2 12s3.8 7 10 7a9.7 9.7 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m3 3 18 18" /></svg>
                          : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        }
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                      <div style={{ flex: 1, display: 'flex', gap: 5 }}>
                        {[1, 2, 3].map(i => (
                          <span key={i} style={{ flex: 1, height: 3, borderRadius: 3, transition: 'background .3s', background: pwBarBg(i) }} />
                        ))}
                      </div>
                      {score > 0 && (
                        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.68rem', letterSpacing: '.05em', minWidth: 56, textAlign: 'right', color: PW_COLORS[score] }}>
                          {PW_LABELS[score]}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '.78rem', color: '#7d7f96' }}>Al menos 8 caracteres. Combina letras y números.</span>
                  </div>

                  {/* Tipo doc + Número */}
                  <div data-r="duo" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 7 }}>
                      <label htmlFor="rx-tipodoc" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Tipo de documento <span style={{ color: '#ff8079' }}>*</span></label>
                      <select id="rx-tipodoc" value={tipoDoc} onChange={e => { setTipoDoc(e.target.value as TipoDocumento); setNumDoc(''); setError(''); }} className="rx-select">
                        <option value="DNI">DNI</option>
                        <option value="CE">Carné de Extranjería</option>
                        <option value="RUC">RUC</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gap: 7 }}>
                      <label htmlFor="rx-numdoc" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Número <span style={{ color: '#ff8079' }}>*</span></label>
                      <input
                        id="rx-numdoc" type="text" inputMode="numeric"
                        placeholder={DOC_RULES[tipoDoc].ph} value={numDoc}
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          const len = DOC_RULES[tipoDoc].len;
                          if (len) v = v.slice(0, len);
                          setNumDoc(v); setError('');
                        }}
                        className="rx-input"
                        style={{ fontFamily: "'Space Mono',monospace", letterSpacing: '.04em' }}
                      />
                    </div>
                  </div>

                  {/* Celular */}
                  <div style={{ display: 'grid', gap: 7 }}>
                    <label htmlFor="rx-cel" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Número de celular <span style={{ color: '#ff8079' }}>*</span></label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: 14, fontFamily: "'Space Mono',monospace", fontSize: '.88rem', color: '#6a6c82', pointerEvents: 'none' }}>+51</span>
                      <input id="rx-cel" type="tel" inputMode="numeric" placeholder="987654321" value={celular}
                        onChange={e => { setCelular(e.target.value.replace(/\D/g, '').slice(0, 9)); setError(''); }}
                        className="rx-input" style={{ paddingLeft: 52, fontFamily: "'Space Mono',monospace", letterSpacing: '.04em' }}
                      />
                    </div>
                    <span style={{ fontSize: '.78rem', color: '#7d7f96' }}>9 dígitos, comienza con 9.</span>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════
                  PASO 2 — Datos del negocio → tabla tenants
                  ══════════════════════════════════════════ */}
              {step === 2 && (
                <div style={{ display: 'grid', gap: 16, animation: 'rx-in .3s ease' }}>

                  {/* Nombre empresa */}
                  <div style={{ display: 'grid', gap: 7 }}>
                    <label htmlFor="rx-empresa" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Nombre de la empresa <span style={{ color: '#ff8079' }}>*</span></label>
                    <input id="rx-empresa" type="text" placeholder="Distribuidora Norte S.A.C." value={empresa} onChange={e => { setEmpresa(e.target.value); setError(''); }} className="rx-input" />
                    <span style={{ fontSize: '.78rem', color: '#7d7f96' }}>Razón social o nombre comercial.</span>
                  </div>

                  {/* RUC empresa */}
                  <div style={{ display: 'grid', gap: 7 }}>
                    <label htmlFor="rx-rucempresa" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>
                      RUC de la empresa <span style={{ color: '#ff8079' }}>*</span>
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: 14, fontFamily: "'Space Mono',monospace", fontSize: '.75rem', color: '#6a6c82', pointerEvents: 'none', letterSpacing: '.04em' }}>RUC</span>
                      <input
                        id="rx-rucempresa" type="text" inputMode="numeric"
                        placeholder="11 dígitos" value={rucEmpresa}
                        onChange={e => { setRucEmpresa(e.target.value.replace(/\D/g, '').slice(0, 11)); setError(''); }}
                        className="rx-input"
                        style={{ paddingLeft: 52, fontFamily: "'Space Mono',monospace", letterSpacing: '.06em' }}
                      />
                    </div>
                    <span style={{ fontSize: '.78rem', color: '#7d7f96' }}>Número de RUC con el que emitirás comprobantes.</span>
                  </div>

                  {/* Rubro */}
                  <div style={{ display: 'grid', gap: 7 }}>
                    <label htmlFor="rx-rubro" style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Tipo de negocio (rubro) <span style={{ color: '#ff8079' }}>*</span></label>
                    <select id="rx-rubro" value={rubro} onChange={e => setRubro(e.target.value)} className="rx-select">
                      <option value="BOTICA">Botica</option>
                      <option value="FARMACIA">Farmacia</option>
                      <option value="MINIMARKET">Minimarket</option>
                      <option value="FERRETERIA">Ferretería</option>
                      <option value="RESTAURANTE">Restaurante</option>
                      <option value="TIENDA_ROPA">Tienda de Ropa</option>
                      <option value="TIENDA">Tienda / Bodega</option>
                      <option value="EMPRESA_SERVICIOS">Empresa de Servicios / Dealer</option>
                      <option value="OTRO">Otro</option>
                    </select>
                    <span style={{ fontSize: '.78rem', color: '#7d7f96' }}>{RUBRO_HINTS[rubro] ?? RUBRO_HINTS.OTRO}</span>
                  </div>

                  {/* Plan selector */}
                  <div style={{ display: 'grid', gap: 10, paddingTop: 4 }}>
                    <span style={{ fontSize: '.83rem', fontWeight: 600, color: '#c9cbd8' }}>Elige tu plan <span style={{ color: '#ff8079' }}>*</span></span>
                    <div data-r="plans" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button type="button" onClick={() => { setPlan('BASICO'); setSearchParams({ plan: 'BASICO' }, { replace: true }); }} style={planStyle('BASICO')}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: '.88rem', fontWeight: 700, color: '#e8e8f0' }}>Plan Básico</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.88rem', fontWeight: 700, color: '#a79fff', flexShrink: 0 }}>S/89<span style={{ fontSize: '.66rem', fontWeight: 400, color: '#7d7f96' }}>/mes</span></span>
                        </div>
                        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 4 }}>
                          <li style={{ display: 'flex', gap: 7, fontSize: '.75rem', color: '#8d90a6' }}><span style={{ color: '#00d4aa' }}>✓</span>POS con caja integrada</li>
                          <li style={{ display: 'flex', gap: 7, fontSize: '.75rem', color: '#8d90a6' }}><span style={{ color: '#00d4aa' }}>✓</span>Facturación electrónica</li>
                          <li style={{ display: 'flex', gap: 7, fontSize: '.75rem', color: '#8d90a6' }}><span style={{ color: '#00d4aa' }}>✓</span>Hasta 5 usuarios</li>
                        </ul>
                      </button>
                      <button type="button" onClick={() => { setPlan('PRO'); setSearchParams({ plan: 'PRO' }, { replace: true }); }} style={planStyle('PRO')}>
                        <span style={{ position: 'absolute', top: -9, right: 12, fontFamily: "'Space Mono',monospace", fontSize: '.62rem', fontWeight: 700, letterSpacing: '.06em', color: '#fff', background: 'linear-gradient(135deg,#6c63ff,#00d4aa)', padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>Más popular</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: '.88rem', fontWeight: 700, color: '#e8e8f0' }}>Plan Pro</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.88rem', fontWeight: 700, color: '#a79fff', flexShrink: 0 }}>S/169<span style={{ fontSize: '.66rem', fontWeight: 400, color: '#7d7f96' }}>/mes</span></span>
                        </div>
                        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 4 }}>
                          <li style={{ display: 'flex', gap: 7, fontSize: '.75rem', color: '#8d90a6' }}><span style={{ color: '#00d4aa' }}>✓</span>Todo lo del Básico</li>
                          <li style={{ display: 'flex', gap: 7, fontSize: '.75rem', color: '#8d90a6' }}><span style={{ color: '#00d4aa' }}>✓</span>Hasta 5 sucursales</li>
                          <li style={{ display: 'flex', gap: 7, fontSize: '.75rem', color: '#8d90a6' }}><span style={{ color: '#00d4aa' }}>✓</span>Hasta 15 usuarios</li>
                        </ul>
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', border: '1px solid rgba(0,212,170,.25)', borderRadius: 11, background: 'rgba(0,212,170,.06)' }}>
                      <span style={{ color: '#00d4aa', flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: '.82rem', color: '#b8bcc9', lineHeight: 1.5 }}>Hoy pagas <strong style={{ color: '#e8e8f0', fontWeight: 600 }}>S/ 0</strong>. Tu prueba de 14 días empieza al crear la cuenta.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit row */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {step === 2 && (
                  <button type="button" onClick={() => { setStep(1); setError(''); }} className="rx-back-btn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Atrás
                  </button>
                )}
                <button type="submit" disabled={loading} style={submitStyle}>
                  {loading
                    ? <><span className="rx-spinner" />Creando cuenta...</>
                    : (step === 1 ? 'Continuar' : 'Crear cuenta gratis · 14 días')
                  }
                </button>
              </div>

              {step === 2 && (
                <p style={{ fontSize: '.78rem', color: '#7d7f96', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
                  Al registrarte aceptas nuestros{' '}
                  <Link to="/terminos">Términos y Condiciones</Link>
                  {' y la '}
                  <Link to="/privacidad">Política de Privacidad</Link>.
                </p>
              )}
            </form>

            <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '24px 0 0' }} />
            <p style={{ fontSize: '.86rem', color: '#8d90a6', margin: '18px 0 0', textAlign: 'center' }}>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" style={{ fontWeight: 600 }}>Inicia sesión</Link>
            </p>
          </div>

          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: '.68rem', color: '#6a6c82', textAlign: 'center', margin: '24px 0 0' }}>© 2026 Fluxus · Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}
