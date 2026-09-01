import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import './reset.css';

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

const STEPS = [
  { n: '1', bg: 'rgba(108,99,255,.14)', br: 'rgba(108,99,255,.35)', tc: '#a79fff', title: 'Escribe tu correo',          desc: 'El mismo con el que entras al sistema.' },
  { n: '2', bg: 'rgba(108,99,255,.14)', br: 'rgba(108,99,255,.35)', tc: '#a79fff', title: 'Abre el enlace que te llega', desc: 'Válido por tiempo limitado y de un solo uso.' },
  { n: '3', bg: 'rgba(0,212,170,.14)',  br: 'rgba(0,212,170,.35)',  tc: '#3fe0c0', title: 'Crea tu nueva contraseña',    desc: 'Y vuelves a operar donde lo dejaste.' },
];

function EyeOpen() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOff() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.2 0 10 7 10 7a17.6 17.6 0 0 1-2.3 3.2" />
      <path d="M6.6 6.7A17.2 17.2 0 0 0 2 12s3.8 7 10 7a9.7 9.7 0 0 0 4.2-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m3 3 18 18" />
    </svg>
  );
}

/* ── Brand panel (igual al forgot password) ── */
function BrandPanel() {
  return (
    <div data-r="brand" style={{ position: 'relative', overflow: 'hidden', padding: '32px 56px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg,#0b0d14,#08090d 55%)' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(108,99,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.05) 1px,transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(90% 70% at 20% 10%,#000 20%,transparent 75%)', WebkitMaskImage: 'radial-gradient(90% 70% at 20% 10%,#000 20%,transparent 75%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -220, left: -140, width: 760, height: 620, background: 'radial-gradient(50% 50% at 50% 50%,rgba(108,99,255,.3),transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -260, right: -180, width: 640, height: 520, background: 'radial-gradient(50% 50% at 50% 50%,rgba(0,212,170,.14),transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

      <Link to="/" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <img src="/fluxus.png" alt="Fluxus" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover' }} />
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '1.15rem', fontWeight: 700, background: 'linear-gradient(135deg,#8b85ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Fluxus</span>
      </Link>

      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(108,99,255,.1)', border: '1px solid rgba(108,99,255,.3)', color: '#a79fff', padding: '.35rem .9rem', borderRadius: 50, fontFamily: "'Space Mono',monospace", fontSize: '.7rem', letterSpacing: '.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          <span className="rp-dot" />
          Recuperación de acceso
        </div>
        <h2 style={{ fontSize: 'clamp(1.6rem,2.6vw,2.3rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-.03em', margin: '18px 0 0', maxWidth: 460 }}>
          Tu cuenta sigue ahí. Recuperamos el acceso en un minuto.
        </h2>
        <p style={{ fontSize: '1rem', lineHeight: 1.65, color: '#9898b0', margin: '14px 0 0', maxWidth: 420 }}>
          Te enviamos un enlace a tu correo para crear una contraseña nueva. Tus ventas, tu stock y tus comprobantes quedan intactos.
        </p>
        <div style={{ display: 'grid', gap: 14, marginTop: 22, maxWidth: 430 }}>
          {STEPS.map(({ n, bg, br, tc, title, desc }) => (
            <div key={n} style={{ display: 'flex', gap: 14 }}>
              <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: bg, border: `1px solid ${br}`, color: tc, fontFamily: "'Space Mono',monospace", fontSize: '.8rem', fontWeight: 700, display: 'grid', placeItems: 'center' }}>{n}</span>
              <div>
                <div style={{ fontSize: '.95rem', fontWeight: 600, color: '#e8e8f0' }}>{title}</div>
                <div style={{ fontSize: '.86rem', color: '#8d90a6', lineHeight: 1.55, marginTop: 3 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: '10px 24px', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', letterSpacing: '.06em', textTransform: 'uppercase', color: '#7d7f96' }}>Conexión segura</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: '#8d90a6' }}>TLS 1.3</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: '#8d90a6' }}>Enlace de un solo uso</span>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true });
  }, [token, navigate]);

  const score = pwScore(newPass);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (newPass.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (newPass !== confirmPass) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true); setError('');
    try {
      await authService.resetearContraseña({
        token: token!,
        nuevaContraseña:    newPass,
        confirmarContraseña: confirmPass,
      });
      setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const submitStyle: React.CSSProperties = {
    cursor: loading ? 'progress' : 'pointer',
    filter: loading ? 'saturate(.7) brightness(.9)' : 'none',
  };

  const shell = (children: React.ReactNode) => (
    <div className="rp" data-r="split" style={{ height: '100vh', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.05fr 1fr', background: '#08090d' }}>
      <BrandPanel />
      <div data-r="pane" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 40px', background: '#0a0b10', borderLeft: '1px solid rgba(255,255,255,.06)', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 404 }}>
          {/* Mobile logo */}
          <div data-r="mobilelogo" style={{ display: 'none', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
            <img src="/fluxus.png" alt="Fluxus" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,#8b85ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Fluxus</span>
          </div>
          <div data-r="formpad" style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, background: '#0e0f15', padding: '28px 30px', boxShadow: '0 40px 90px -50px rgba(0,0,0,.9)' }}>
            {children}
            <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '18px 0 0' }} />
            <Link to="/login" className="rp-back" style={{ marginTop: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
              Volver a iniciar sesión
            </Link>
          </div>
          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: '.68rem', color: '#6a6c82', textAlign: 'center', margin: '14px 0 0' }}>© 2026 Fluxus · Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );

  /* ── Token inválido (no debería verse — useEffect redirige, pero por si acaso) ── */
  if (!token) return shell(
    <div style={{ animation: 'rp-in .3s ease' }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,95,87,.1)', border: '1px solid rgba(255,95,87,.3)', color: '#ff8079', display: 'grid', placeItems: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
      </div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: '20px 0 0' }}>Enlace inválido</h1>
      <p style={{ fontSize: '.94rem', color: '#8d90a6', lineHeight: 1.6, margin: '8px 0 0' }}>Este enlace de recuperación ya no es válido o ha expirado. Solicita uno nuevo.</p>
      <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
        <Link to="/forgot-password" className="rp-login-btn">Solicitar nuevo enlace</Link>
      </div>
    </div>
  );

  /* ── Contraseña actualizada ── */
  if (done) return shell(
    <div style={{ animation: 'rp-in .3s ease' }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(0,212,170,.12)', border: '1px solid rgba(0,212,170,.32)', color: '#3fe0c0', display: 'grid', placeItems: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: '20px 0 0' }}>¡Contraseña actualizada!</h1>
      <p style={{ fontSize: '.94rem', color: '#8d90a6', lineHeight: 1.6, margin: '8px 0 0' }}>Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.</p>
      <div style={{ display: 'grid', gap: 12, marginTop: 26, padding: 18, border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, background: '#101118' }}>
        <div style={{ display: 'flex', gap: 11, fontSize: '.88rem', color: '#c9cbd8', lineHeight: 1.55 }}><span style={{ color: '#00d4aa', flexShrink: 0 }}>✓</span>Tu cuenta y tus datos siguen intactos</div>
        <div style={{ display: 'flex', gap: 11, fontSize: '.88rem', color: '#c9cbd8', lineHeight: 1.55 }}><span style={{ color: '#00d4aa', flexShrink: 0 }}>✓</span>El enlace usado ya no es válido</div>
      </div>
      <div style={{ marginTop: 24 }}>
        <Link to="/login" className="rp-login-btn">Ir al inicio de sesión</Link>
      </div>
    </div>
  );

  /* ── Formulario ── */
  return shell(
    <div>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(108,99,255,.12)', border: '1px solid rgba(108,99,255,.3)', color: '#a79fff', display: 'grid', placeItems: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
      </div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: '20px 0 0' }}>Nueva contraseña</h1>
      <p style={{ fontSize: '.94rem', color: '#8d90a6', lineHeight: 1.6, margin: '8px 0 0' }}>Elige una contraseña segura de al menos 8 caracteres.</p>

      {/* Error banner */}
      {error && (
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 18, padding: '13px 15px', border: '1px solid rgba(255,95,87,.32)', borderRadius: 12, background: 'rgba(255,95,87,.08)', animation: 'rp-in .25s ease' }}>
          <span style={{ color: '#ff8079', fontSize: '.95rem', lineHeight: 1.4, flexShrink: 0 }}>!</span>
          <div style={{ fontSize: '.88rem', color: '#ffb3ad', lineHeight: 1.55 }}>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 22 }}>
        {/* Nueva contraseña */}
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="rp-new" style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Nueva contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="rp-new" type={showNew ? 'text' : 'password'} autoComplete="new-password"
              placeholder="Mínimo 8 caracteres" value={newPass}
              onChange={e => { setNewPass(e.target.value); setError(''); }}
              className="rp-input rp-input-pass" autoFocus
            />
            <button type="button" onClick={() => setShowNew(v => !v)} className="rp-pass-toggle" aria-label="Mostrar contraseña">
              {showNew ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>
          {/* Fuerza de contraseña */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, display: 'flex', gap: 5 }}>
              {[1, 2, 3].map(i => (
                <span key={i} style={{ flex: 1, height: 3, borderRadius: 3, transition: 'background .3s', background: score >= i ? ['#ff5f57','#febc2e','#00d4aa'][score - 1] : 'rgba(255,255,255,.09)' }} />
              ))}
            </div>
            {score > 0 && (
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.68rem', letterSpacing: '.05em', minWidth: 56, textAlign: 'right', color: PW_COLORS[score] }}>
                {PW_LABELS[score]}
              </span>
            )}
          </div>
        </div>

        {/* Confirmar contraseña */}
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="rp-confirm" style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Confirmar contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="rp-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
              placeholder="Repite tu contraseña" value={confirmPass}
              onChange={e => { setConfirmPass(e.target.value); setError(''); }}
              className="rp-input rp-input-pass"
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="rp-pass-toggle" aria-label="Mostrar contraseña">
              {showConfirm ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>
          {/* Indicador de coincidencia */}
          {confirmPass.length > 0 && (
            <span style={{ fontSize: '.78rem', color: newPass === confirmPass ? '#00d4aa' : '#ff8079' }}>
              {newPass === confirmPass ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
            </span>
          )}
        </div>

        <button type="submit" disabled={loading} className="rp-submit" style={submitStyle}>
          {loading ? <><span className="rp-spinner" />Actualizando...</> : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  );
}
