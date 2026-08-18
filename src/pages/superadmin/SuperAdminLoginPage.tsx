import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminService } from '../../services/superAdmin.service';
import { saTokenKey } from '../../api/superAdminApi';

const C = {
  page:         '#F1F5F9',
  card:         '#FFFFFF',
  border:       '#E2E8F0',
  text:         '#0F172A',
  textSub:      '#475569',
  textMuted:    '#94A3B8',
  accent:       '#4F46E5',
  accentLight:  '#EEF2FF',
  danger:       '#DC2626',
  dangerBg:     '#FEF2F2',
  dangerBorder: '#FECACA',
  inputBorder:  '#CBD5E1',
};

export function SuperAdminLoginPage() {
  const navigate  = useNavigate();
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await superAdminService.login(username, password);
      localStorage.setItem(saTokenKey, res.data.token);
      navigate('/superadmin');
    } catch {
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (focused = false): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: C.card,
    border: `1.5px solid ${focused ? C.accent : C.inputBorder}`,
    borderRadius: 8, padding: '0.65rem 0.875rem',
    color: C.text, fontSize: '0.9rem', outline: 'none',
    transition: 'border-color 0.15s',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: C.page,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      padding: 16,
    }}>
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 4px 24px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 54, height: 54,
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            borderRadius: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, marginBottom: 14,
            boxShadow: '0 4px 16px rgba(79,70,229,0.28)',
          }}>🛡️</div>
          <h1 style={{ color: C.text, fontSize: '1.375rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Super Admin
          </h1>
          <p style={{ color: C.textMuted, fontSize: '0.82rem', marginTop: 4, margin: '4px 0 0' }}>
            Acceso restringido · Fluxus
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ color: C.textSub, fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Usuario
            </label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@fluxus.pe"
              required
              autoFocus
              style={inputStyle()}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e)  => (e.target.style.borderColor = C.inputBorder)}
            />
          </div>

          {/* Password + ojito */}
          <div>
            <label style={{ color: C.textSub, fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ ...inputStyle(), paddingRight: '2.75rem' }}
                onFocus={(e) => (e.target.style.borderColor = C.accent)}
                onBlur={(e)  => (e.target.style.borderColor = C.inputBorder)}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.textMuted, padding: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={showPass ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              color: C.danger, fontSize: '0.82rem',
              background: C.dangerBg, border: `1px solid ${C.dangerBorder}`,
              borderRadius: 8, padding: '0.6rem 0.875rem',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              border: 'none', borderRadius: 8,
              color: '#fff', fontWeight: 600, fontSize: '0.9rem',
              padding: '0.75rem', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              marginTop: 4, letterSpacing: '-0.01em',
              boxShadow: loading ? 'none' : '0 2px 10px rgba(79,70,229,0.28)',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Ingresando…' : 'Ingresar al panel'}
          </button>
        </form>
      </div>
    </div>
  );
}
