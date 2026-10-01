import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { notify } from '../../lib/notify';
import { useThemeStore } from '../../store/themeStore';
import type { DeleteAccountValidationDTO } from '../../types';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  validacion: DeleteAccountValidationDTO;
  usuarioId: number;
  onConfirm: () => Promise<void>;
}

const ROLES: Record<string, string> = {
  ADMIN: 'Admin', VENDEDOR: 'Vendedor', CAJERO: 'Cajero',
  GERENTE: 'Gerente', ALMACENERO: 'Almacenero',
};

export function DeleteAccountModal({ isOpen, onClose, validacion, onConfirm }: DeleteAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();

  if (!isOpen) return null;

  const C = isDark ? {
    surface: '#11141c', surface2: '#1a1f2b', line: '#242a38', lineSoft: '#1e2330',
    text: '#e9ecf2', text2: '#a8b1c2', text3: '#8892a4',
    bad: '#ff6b64', badSoft: 'rgba(255,107,100,.13)',
    primary: '#7b83ff',
    shadow: '0 25px 50px rgba(0,0,0,.5)',
  } : {
    surface: '#ffffff', surface2: '#f1f3f7', line: '#e4e7ec', lineSoft: '#eef0f4',
    text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
    bad: '#d63b3b', badSoft: '#fdeceb',
    primary: '#3b47ef',
    shadow: '0 25px 50px rgba(0,0,0,.18)',
  };

  const isTenantOwner = validacion.tipo === 'TENANT_OWNER';
  const nombre = user?.nombre ?? user?.email ?? '';
  const rolLabel = ROLES[user?.rol ?? ''] ?? (user?.rol ?? '');

  const handleConfirm = async () => {
    if (isTenantOwner && confirmText !== 'ELIMINAR') {
      notify.error('Debes escribir ELIMINAR para confirmar');
      return;
    }
    setLoading(true);
    try {
      await onConfirm();
      notify.success(isTenantOwner ? 'Negocio eliminado' : 'Usuario desactivado');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (err) {
      notify.fromError(err, 'Error al eliminar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const d = validacion.datosAEliminar;
  const stats = isTenantOwner && d ? [
    { label: 'Usuarios', n: d.usuarios },
    { label: 'Productos', n: d.productos },
    { label: 'Ventas', n: d.ventas },
    { label: 'Proveedores', n: d.proveedores },
    { label: 'Suscripciones', n: d.suscripciones },
  ] : [];

  const modal = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: '480px', background: C.surface, borderRadius: '20px', boxShadow: C.shadow, overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '22px 22px 18px', borderBottom: `1px solid ${C.lineSoft}` }}>
          <span style={{ width: '42px', height: '42px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '12px', background: C.badSoft, color: C.bad }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-.015em', color: C.text }}>
              {isTenantOwner ? 'Eliminar negocio completo' : 'Eliminar usuario'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '.82rem', color: C.text3 }}>
              {nombre}{rolLabel ? ` · ${rolLabel}` : ''}
            </p>
          </div>
          <button onClick={onClose} type="button"
            style={{ flexShrink: 0, width: '32px', height: '32px', display: 'grid', placeItems: 'center', borderRadius: '8px', border: 0, background: 'transparent', cursor: 'pointer', color: C.text3 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 22px' }}>
          {isTenantOwner ? (
            <>
              {/* Stats grid */}
              {stats.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {stats.map(({ label, n }) => (
                    <div key={label} style={{ padding: '12px', borderRadius: '12px', background: C.surface2, border: `1px solid ${C.lineSoft}`, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.03em', color: C.text, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
                      <div style={{ fontSize: '.72rem', fontWeight: 500, color: C.text3, marginTop: '2px' }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Warning */}
              <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderRadius: '12px', background: C.badSoft, border: `1px solid ${isDark ? 'rgba(255,107,100,.25)' : 'rgba(214,59,59,.2)'}`, marginBottom: '16px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.bad} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
                  <path d="M12 9v4"/><path d="M12 17h.01"/>
                </svg>
                <p style={{ margin: 0, fontSize: '.84rem', lineHeight: 1.5, color: C.bad, fontWeight: 500 }}>
                  Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminarán permanentemente todos los datos de tu empresa.
                </p>
              </div>

              {/* Confirm input */}
              <div>
                <label style={{ fontSize: '.82rem', fontWeight: 600, color: C.text2, display: 'block', marginBottom: '8px' }}>
                  Escribe{' '}
                  <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, padding: '1px 6px', borderRadius: '5px', background: C.surface2, border: `1px solid ${C.line}`, color: C.bad }}>ELIMINAR</code>
                  {' '}para confirmar:
                </label>
                <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                  placeholder="ELIMINAR"
                  style={{ width: '100%', height: '44px', padding: '0 13px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '.9rem', fontWeight: 600, letterSpacing: '.05em', color: C.text, background: C.surface, border: `1px solid ${confirmText === 'ELIMINAR' ? C.bad : C.line}`, borderRadius: '10px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </>
          ) : (
            /* Info card for normal user */
            <div style={{ display: 'flex', gap: '11px', padding: '14px 16px', borderRadius: '12px', background: isDark ? 'rgba(123,131,255,.1)' : '#eff6ff', border: `1px solid ${isDark ? 'rgba(123,131,255,.25)' : '#bfdbfe'}` }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#7b83ff' : '#2563eb'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
              <p style={{ margin: 0, fontSize: '.86rem', lineHeight: 1.6, color: isDark ? '#a8b1c2' : '#1e40af' }}>
                Tu usuario será desactivado y se cerrará tu sesión. Un administrador de tu negocio puede reactivarlo si es necesario. Tus ventas registradas se conservan.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', padding: '4px 22px 22px' }}>
          <button type="button" onClick={onClose} disabled={loading}
            style={{ height: '46px', padding: '0 20px', fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 600, color: C.text2, background: 'transparent', border: `1px solid ${C.line}`, borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm}
            disabled={loading || (isTenantOwner && confirmText !== 'ELIMINAR')}
            style={{ flex: 1, height: '46px', padding: '0 20px', fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: C.bad, border: 0, borderRadius: '12px', cursor: (loading || (isTenantOwner && confirmText !== 'ELIMINAR')) ? 'not-allowed' : 'pointer', opacity: (loading || (isTenantOwner && confirmText !== 'ELIMINAR')) ? .55 : 1, boxShadow: `0 8px 20px -10px ${C.bad}` }}>
            {loading ? 'Procesando…' : isTenantOwner ? 'Eliminar negocio completo' : 'Desactivar mi usuario'}
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
