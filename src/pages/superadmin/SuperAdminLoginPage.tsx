import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminService } from '../../services/superAdmin.service';
import { saTokenKey } from '../../api/superAdminApi';

export function SuperAdminLoginPage() {
  const navigate  = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#12121a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg,#6c63ff,#00d4aa)',
            borderRadius: 12,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, marginBottom: 12,
          }}>🛡️</div>
          <h1 style={{ color: '#e8e8f0', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
            Super Admin
          </h1>
          <p style={{ color: '#5a5a72', fontSize: '0.82rem', marginTop: 4 }}>
            Acceso restringido · Fluxus
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: '#9898b0', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              USUARIO
            </label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuario@email.com"
              required
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '0.65rem 0.875rem',
                color: '#e8e8f0', fontSize: '0.9rem', outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ color: '#9898b0', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              CONTRASEÑA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '0.65rem 0.875rem',
                color: '#e8e8f0', fontSize: '0.9rem', outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{
              color: '#ff5050', fontSize: '0.82rem',
              background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)',
              borderRadius: 6, padding: '0.5rem 0.75rem', margin: 0,
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg,#6c63ff,#4a43cc)',
              border: 'none', borderRadius: 8,
              color: '#fff', fontWeight: 600, fontSize: '0.9rem',
              padding: '0.75rem', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 4,
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
