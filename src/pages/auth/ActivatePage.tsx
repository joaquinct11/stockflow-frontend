import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import './activate.css';

const BAR_COLORS = ['#ff5f57', '#febc2e', '#8b85ff', '#00d4aa'];
const PW_LABELS  = ['', 'Muy débil — súmale números o mayúsculas', 'Aceptable — puede ser más larga', 'Buena contraseña', 'Excelente contraseña'];

function pwScore(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 6)  s++;
  if (p.length >= 10) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}

const BULLETS = [
  'Verás solo los módulos que tu administrador habilitó',
  'Tu contraseña es personal: nadie más la conoce',
  'Cada venta y cada movimiento queda registrado a tu nombre',
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

export function ActivatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [pass,        setPass]        = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (!token) navigate('/login', { replace: true });
  }, [token, navigate]);

  const score = pwScore(pass);
  const short = pass.length > 0 && pass.length < 6;
  const ready = pass.length >= 6 && pass === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (pass.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (pass !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true); setError('');
    try {
      await authService.activarCuenta({
        token: token!,
        nuevaContraseña:     pass,
        confirmarContraseña: confirm,
      });
      setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Error al activar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="ac" data-r="split" style={{ height: '100vh', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.05fr 1fr', background: '#08090d' }}>

      {/* ── Brand panel ── */}
      <div data-r="brand" style={{ position: 'relative', overflow: 'hidden', padding: '32px 56px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg,#0b0d14,#08090d 55%)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(108,99,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.05) 1px,transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(90% 70% at 20% 10%,#000 20%,transparent 75%)', WebkitMaskImage: 'radial-gradient(90% 70% at 20% 10%,#000 20%,transparent 75%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -220, left: -140, width: 760, height: 620, background: 'radial-gradient(50% 50% at 50% 50%,rgba(108,99,255,.3),transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -260, right: -180, width: 640, height: 520, background: 'radial-gradient(50% 50% at 50% 50%,rgba(0,212,170,.14),transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        <Link to="/" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <img src="/fluxus.png" alt="Fluxus" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover' }} />
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '1.15rem', fontWeight: 700, background: 'linear-gradient(135deg,#8b85ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Fluxus</span>
        </Link>

        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(0,212,170,.1)', border: '1px solid rgba(0,212,170,.3)', color: '#3fe0c0', padding: '.35rem .9rem', borderRadius: 50, fontFamily: "'Space Mono',monospace", fontSize: '.7rem', letterSpacing: '.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            <span className="ac-dot" />
            Te invitaron a Fluxus
          </div>
          <h2 style={{ fontSize: 'clamp(1.6rem,2.6vw,2.3rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-.03em', margin: '18px 0 0', maxWidth: 460 }}>
            Tu usuario ya está creado. Solo falta tu contraseña.
          </h2>
          <p style={{ fontSize: '1rem', lineHeight: 1.65, color: '#9898b0', margin: '14px 0 0', maxWidth: 420 }}>
            Elígela y entras directo al sistema con los permisos que te asignaron. No necesitas registrarte de nuevo ni pagar nada.
          </p>
          <div style={{ display: 'grid', gap: 14, marginTop: 22, maxWidth: 430 }}>
            {BULLETS.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, fontSize: '.94rem', color: '#d5d6e2', lineHeight: 1.55 }}>
                <span style={{ color: '#00d4aa', flexShrink: 0 }}>✓</span>
                {b}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: '10px 24px', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', letterSpacing: '.06em', textTransform: 'uppercase', color: '#7d7f96' }}>Conexión segura</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: '#8d90a6' }}>TLS 1.3</span>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: '#8d90a6' }}>Invitación de un solo uso</span>
        </div>
      </div>

      {/* ── Form panel ── */}
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
            <Link to="/login" className="ac-back" style={{ marginTop: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
              Volver al inicio de sesión
            </Link>

            <p style={{ fontSize: '.82rem', color: '#8d90a6', lineHeight: 1.6, margin: '10px 0 0', textAlign: 'center' }}>
              ¿No reconoces esta invitación?{' '}
              <a href="https://wa.me/51994198710" target="_blank" rel="noopener noreferrer">Avísanos por WhatsApp</a>.
            </p>
          </div>

          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: '.68rem', color: '#6a6c82', textAlign: 'center', margin: '14px 0 0' }}>© 2026 Fluxus · Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );

  /* ── Token inválido ── */
  if (!token) return shell(
    <div style={{ animation: 'ac-in .3s ease' }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,95,87,.1)', border: '1px solid rgba(255,95,87,.3)', color: '#ff8079', display: 'grid', placeItems: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
      </div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: '20px 0 0' }}>Esta invitación ya no sirve</h1>
      <p style={{ fontSize: '.94rem', color: '#8d90a6', lineHeight: 1.6, margin: '8px 0 0' }}>
        Los enlaces de activación son de un solo uso y vencen pronto. Pídele a tu administrador que te reenvíe la invitación desde Usuarios.
      </p>
      <div style={{ display: 'grid', gap: 10, marginTop: 26 }}>
        <Link to="/login" className="ac-login-btn">Ir al inicio de sesión</Link>
        <a href="https://wa.me/51994198710" target="_blank" rel="noopener noreferrer" className="ac-ghost">Escribir a soporte</a>
      </div>
    </div>
  );

  /* ── Cuenta activada ── */
  if (done) return shell(
    <div style={{ animation: 'ac-in .3s ease' }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(0,212,170,.12)', border: '1px solid rgba(0,212,170,.32)', color: '#3fe0c0', display: 'grid', placeItems: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: '20px 0 0' }}>Cuenta activada</h1>
      <p style={{ fontSize: '.94rem', color: '#8d90a6', lineHeight: 1.6, margin: '8px 0 0' }}>
        Tu contraseña quedó establecida. Ya puedes entrar a Fluxus con tu correo y la contraseña que acabas de crear.
      </p>
      <div style={{ marginTop: 26 }}>
        <Link to="/login" className="ac-login-btn">Ir al inicio de sesión</Link>
      </div>
    </div>
  );

  /* ── Formulario ── */
  return shell(
    <div>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(108,99,255,.12)', border: '1px solid rgba(108,99,255,.3)', color: '#a79fff', display: 'grid', placeItems: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m16 11 2 2 4-4" /></svg>
      </div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: '20px 0 0' }}>Activa tu cuenta</h1>
      <p style={{ fontSize: '.94rem', color: '#8d90a6', lineHeight: 1.6, margin: '8px 0 0' }}>
        Elige una contraseña para acceder al sistema. Será la que uses de aquí en adelante.
      </p>

      {/* Error banner */}
      {error && (
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 18, padding: '13px 15px', border: '1px solid rgba(255,95,87,.32)', borderRadius: 12, background: 'rgba(255,95,87,.08)', animation: 'ac-in .25s ease' }}>
          <span style={{ color: '#ff8079', fontSize: '.95rem', lineHeight: 1.4, flexShrink: 0 }}>!</span>
          <div style={{ fontSize: '.88rem', color: '#ffb3ad', lineHeight: 1.55 }}>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18, marginTop: 22 }}>

        {/* Nueva contraseña */}
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="ac-new" style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Nueva contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="ac-new" type={showPass ? 'text' : 'password'} autoComplete="new-password"
              placeholder="Mínimo 6 caracteres" value={pass}
              onChange={e => { setPass(e.target.value); setError(''); }}
              className="ac-input ac-input-pass" autoFocus
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="ac-pass-toggle" aria-label="Mostrar contraseña">
              {showPass ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>
          {/* Barra de fuerza — 4 segmentos */}
          <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
            {[1, 2, 3, 4].map(i => (
              <span key={i} style={{ flex: 1, height: 4, borderRadius: 99, transition: 'background .25s', background: i <= score && score > 0 ? BAR_COLORS[score - 1] : 'rgba(255,255,255,.09)' }} />
            ))}
          </div>
          <p style={{ fontSize: '.8rem', lineHeight: 1.55, margin: 0, color: short ? '#ff8079' : (pass ? PW_LABELS[score] !== '' ? ['#7d7f96','#ff8079','#f0b429','#a79fff','#3fe0c0'][score] : '#7d7f96' : '#7d7f96') }}>
            {short ? 'Necesita al menos 6 caracteres' : (pass ? PW_LABELS[score] || 'Mínimo 6 caracteres, combina letras y números' : 'Mínimo 6 caracteres, combina letras y números')}
          </p>
        </div>

        {/* Confirmar contraseña */}
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="ac-confirm" style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Confirmar contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="ac-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
              placeholder="Repite la contraseña" value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              className="ac-input ac-input-pass"
              style={{ borderColor: confirm.length > 0 && pass !== confirm ? 'rgba(255,95,87,.45)' : undefined }}
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="ac-pass-toggle" aria-label="Mostrar contraseña">
              {showConfirm ? <EyeOff /> : <EyeOpen />}
            </button>
          </div>
          {confirm.length > 0 && pass !== confirm && (
            <p style={{ fontSize: '.8rem', color: '#ff8079', lineHeight: 1.55, margin: 0 }}>Las contraseñas no coinciden.</p>
          )}
          {confirm.length > 0 && pass === confirm && pass.length >= 6 && (
            <p style={{ fontSize: '.8rem', color: '#3fe0c0', lineHeight: 1.55, margin: 0 }}>Las contraseñas coinciden.</p>
          )}
        </div>

        <button
          type="submit" disabled={loading || !ready} className="ac-submit"
          style={{ cursor: loading ? 'progress' : !ready ? 'not-allowed' : 'pointer', ...((!ready && !loading) ? { background: 'rgba(255,255,255,.07)', color: '#6a6c82', boxShadow: 'none' } : {}) }}
        >
          {loading ? <><span className="ac-spinner" />Activando cuenta...</> : 'Activar cuenta'}
        </button>
      </form>
    </div>
  );
}
