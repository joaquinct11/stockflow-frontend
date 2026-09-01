import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import './forgot.css';

const STEPS = [
  { n: '1', bg: 'rgba(108,99,255,.14)', br: 'rgba(108,99,255,.35)', tc: '#a79fff', title: 'Escribe tu correo',          desc: 'El mismo con el que entras al sistema.' },
  { n: '2', bg: 'rgba(108,99,255,.14)', br: 'rgba(108,99,255,.35)', tc: '#a79fff', title: 'Abre el enlace que te llega', desc: 'Válido por tiempo limitado y de un solo uso.' },
  { n: '3', bg: 'rgba(0,212,170,.14)',  br: 'rgba(0,212,170,.35)',  tc: '#3fe0c0', title: 'Crea tu nueva contraseña',    desc: 'Y vuelves a operar donde lo dejaste.' },
];

export function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError(false);
    try {
      await authService.solicitarRecuperacionContraseña({ email });
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const submitStyle: React.CSSProperties = {
    cursor: loading ? 'progress' : 'pointer',
    filter: loading ? 'saturate(.7) brightness(.9)' : 'none',
  };

  return (
    <div className="fp" data-r="split" style={{ height: '100vh', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.05fr 1fr', background: '#08090d' }}>

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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(108,99,255,.1)', border: '1px solid rgba(108,99,255,.3)', color: '#a79fff', padding: '.35rem .9rem', borderRadius: 50, fontFamily: "'Space Mono',monospace", fontSize: '.7rem', letterSpacing: '.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            <span className="fp-dot" style={{ background: '#a79fff' }} />
            Recuperación de acceso
          </div>
          <h2 style={{ fontSize: 'clamp(1.6rem,2.6vw,2.3rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-.03em', margin: '18px 0 0', maxWidth: 460 }}>
            Tu cuenta sigue ahí. Recuperamos el acceso en un minuto.
          </h2>
          <p style={{ fontSize: '1rem', lineHeight: 1.65, color: '#9898b0', margin: '16px 0 0', maxWidth: 420 }}>
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

      {/* ── Form panel ── */}
      <div data-r="pane" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 40px', background: '#0a0b10', borderLeft: '1px solid rgba(255,255,255,.06)', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 404 }}>

          {/* Mobile logo */}
          <div data-r="mobilelogo" style={{ display: 'none', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
            <img src="/fluxus.png" alt="Fluxus" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,#8b85ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Fluxus</span>
          </div>

          {/* Form card */}
          <div data-r="formpad" style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, background: '#0e0f15', padding: '28px 30px', boxShadow: '0 40px 90px -50px rgba(0,0,0,.9)' }}>

            {/* ── Estado formulario ── */}
            {!sent && (
              <div>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(108,99,255,.12)', border: '1px solid rgba(108,99,255,.3)', color: '#a79fff', display: 'grid', placeItems: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
                </div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: '20px 0 0' }}>Recuperar contraseña</h1>
                <p style={{ fontSize: '.94rem', color: '#8d90a6', lineHeight: 1.6, margin: '8px 0 0' }}>
                  Escribe el correo de tu cuenta y te enviamos un enlace para restablecerla.
                </p>

                {/* Error banner */}
                {error && (
                  <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 22, padding: '13px 15px', border: '1px solid rgba(255,95,87,.32)', borderRadius: 12, background: 'rgba(255,95,87,.08)', animation: 'fp-in .25s ease' }}>
                    <span style={{ color: '#ff8079', fontSize: '.95rem', lineHeight: 1.4, flexShrink: 0 }}>!</span>
                    <div style={{ fontSize: '.88rem', color: '#ffb3ad', lineHeight: 1.55 }}>No pudimos enviar el enlace. Revisa el correo e intenta de nuevo.</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18, marginTop: 26 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <label htmlFor="fp-email" style={{ fontSize: '.85rem', fontWeight: 600, color: '#c9cbd8' }}>Correo electrónico</label>
                    <input
                      id="fp-email" type="email" autoComplete="email" placeholder="tu@empresa.com"
                      value={email} onChange={e => { setEmail(e.target.value); setError(false); }}
                      required autoFocus className="fp-input"
                    />
                    <p style={{ fontSize: '.8rem', color: '#7d7f96', lineHeight: 1.55, margin: 0 }}>El mismo con el que inicias sesión en Fluxus.</p>
                  </div>
                  <button type="submit" disabled={loading} className="fp-submit" style={submitStyle}>
                    {loading ? <><span className="fp-spinner" />Enviando...</> : 'Enviar enlace de recuperación'}
                  </button>
                </form>
              </div>
            )}

            {/* ── Estado enviado ── */}
            {sent && (
              <div style={{ animation: 'fp-in .3s ease' }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(0,212,170,.12)', border: '1px solid rgba(0,212,170,.32)', color: '#3fe0c0', display: 'grid', placeItems: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.025em', margin: '20px 0 0' }}>Revisa tu correo</h1>
                <p style={{ fontSize: '.94rem', color: '#8d90a6', lineHeight: 1.6, margin: '8px 0 0' }}>
                  Enviamos un enlace de recuperación a{' '}
                  <strong style={{ color: '#e8e8f0', fontWeight: 600 }}>{email}</strong>.
                  {' '}Si no aparece en unos minutos, busca en la carpeta de spam.
                </p>

                <div style={{ display: 'grid', gap: 12, marginTop: 26, padding: 18, border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, background: '#101118' }}>
                  <div style={{ display: 'flex', gap: 11, fontSize: '.88rem', color: '#c9cbd8', lineHeight: 1.55 }}><span style={{ color: '#00d4aa', flexShrink: 0 }}>✓</span>El enlace es de un solo uso y vence pronto</div>
                  <div style={{ display: 'flex', gap: 11, fontSize: '.88rem', color: '#c9cbd8', lineHeight: 1.55 }}><span style={{ color: '#00d4aa', flexShrink: 0 }}>✓</span>Tus datos y tus comprobantes no se tocan</div>
                </div>

                <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
                  <Link to="/login" className="fp-login-btn">Ir al inicio de sesión</Link>
                  <button type="button" onClick={() => { setSent(false); setEmail(''); setError(false); }} className="fp-ghost">
                    Usar otro correo
                  </button>
                </div>
              </div>
            )}

            <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '18px 0 0' }} />
            <Link to="/login" className="fp-back" style={{ marginTop: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
              Volver a iniciar sesión
            </Link>

            <p style={{ fontSize: '.82rem', color: '#8d90a6', lineHeight: 1.6, margin: '10px 0 0', textAlign: 'center' }}>
              ¿No recuerdas tu correo?{' '}
              <a href="https://wa.me/51994198710" target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>.
            </p>
          </div>

          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: '.68rem', color: '#6a6c82', textAlign: 'center', margin: '14px 0 0' }}>© 2026 Fluxus · Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}
