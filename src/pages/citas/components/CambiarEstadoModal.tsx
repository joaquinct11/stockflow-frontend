import { createPortal } from 'react-dom';
import { useState } from 'react';
import { citaService, type CitaResumenDTO, type EstadoCita } from '../../../services/cita.service';
import { notify } from '../../../lib/notify';
import { ESTADO_CFG, TRANSICIONES } from '../citas.constants';

const T = {
  surface:     'var(--color-surface, #ffffff)',
  surface2:    'var(--color-surface-2, #f3f4f6)',
  line:        'var(--color-border, #e5e7eb)',
  lineSoft:    'var(--color-border-soft, #f3f4f6)',
  text:        'var(--color-text, #111827)',
  text2:       'var(--color-text-2, #374151)',
  text3:       'var(--color-text-3, #6b7280)',
  primary:     'var(--color-primary, #3b47ef)',
  primarySoft: 'var(--color-primary-soft, #eef0ff)',
  bad:         'var(--color-bad, #dc2626)',
} as const;

const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

const focusIn = (e: React.FocusEvent<HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = T.primary;
  e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`;
};
const focusOut = (e: React.FocusEvent<HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = T.line;
  e.currentTarget.style.boxShadow = 'none';
};

interface Props {
  cita:                   CitaResumenDTO;
  puedeCancelar:          boolean;
  puedeTransicionClinica: boolean;
  onClose:                () => void;
  onSaved:                () => void;
}

export function CambiarEstadoModal({ cita, puedeCancelar, puedeTransicionClinica, onClose, onSaved }: Props) {
  const opciones = (TRANSICIONES[cita.estado] ?? []).filter(e => {
    if (e === 'CANCELADA') return puedeCancelar;
    if (e === 'PENDIENTE') return puedeCancelar;
    if (e === 'EN_ATENCION' || e === 'ATENDIDA') return puedeTransicionClinica;
    return true;
  });

  const [nuevoEstado, setNuevoEstado] = useState<EstadoCita | ''>(opciones[0] ?? '');
  const [observaciones, setObs]       = useState('');
  const [saving, setSaving]           = useState(false);

  async function handleSubmit() {
    if (!nuevoEstado) { notify.error('Selecciona un nuevo estado'); return; }
    setSaving(true);
    try {
      await citaService.cambiarEstado(cita.id, {
        nuevoEstado,
        observaciones: observaciones || undefined,
      });
      notify.success(`Estado actualizado a "${ESTADO_CFG[nuevoEstado].label}"`);
      onSaved();
    } catch (err) {
      notify.fromError(err, 'Error al cambiar el estado');
    } finally {
      setSaving(false);
    }
  }

  const estadoActual = ESTADO_CFG[cita.estado];

  const inner = (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Cambiar estado</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 3 }}>
              <span style={{ fontWeight: 600, color: estadoActual.tone }}>{estadoActual.label}</span>
              {' '}→ selecciona el nuevo estado
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ width: 30, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Resumen de la cita */}
          <div style={{ padding: '10px 14px', borderRadius: 10, background: T.surface2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '.875rem', fontWeight: 650, color: T.text }}>{cita.mascotaNombre ?? '—'}</div>
              <div style={{ fontSize: '.78rem', color: T.text3, marginTop: 1 }}>{cita.clienteNombre ?? '—'} · {cita.fechaInicio.slice(0,10)}</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.74rem', fontWeight: 650, padding: '3px 9px 3px 7px', borderRadius: 20, color: estadoActual.tone, background: estadoActual.soft, flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: estadoActual.tone }} />
              {estadoActual.label}
            </span>
          </div>

          {opciones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: T.text3, fontSize: '.88rem' }}>
              Esta cita no tiene transiciones disponibles.
            </div>
          ) : (
            <>
              {/* Cards de estado */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '.78rem', fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Nuevo estado</div>
                {opciones.map(est => {
                  const cfg = ESTADO_CFG[est];
                  const isSelected = nuevoEstado === est;
                  return (
                    <button
                      key={est}
                      type="button"
                      onClick={() => setNuevoEstado(est)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 14px', border: `2px solid ${isSelected ? cfg.tone : T.line}`,
                        borderRadius: 12, background: isSelected ? cfg.soft : T.surface,
                        cursor: 'pointer', textAlign: 'left', transition: 'border-color .12s, background .12s',
                        width: '100%',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = cfg.tone; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = T.line; }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.tone, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.88rem', fontWeight: 650, color: isSelected ? cfg.tone : T.text }}>{cfg.label}</div>
                        <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 1 }}>{cfg.desc}</div>
                      </div>
                      {isSelected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cfg.tone} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Observaciones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '.78rem', fontWeight: 600, color: T.text2 }}>Observaciones <span style={{ color: T.text3, fontWeight: 400 }}>(opcional)</span></label>
                <textarea
                  value={observaciones}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Ej: paciente llegó tarde, se reagenda…"
                  rows={2}
                  style={{
                    width: '100%', fontFamily: 'Inter,sans-serif', fontSize: '.88rem',
                    color: T.text, background: T.surface, border: `1px solid ${T.line}`,
                    borderRadius: 10, outline: 'none', padding: '10px 14px', resize: 'none', lineHeight: 1.5,
                  }}
                  onFocus={focusIn} onBlur={focusOut}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
            Cancelar
          </button>
          {opciones.length > 0 && (
            <button type="button" onClick={handleSubmit} disabled={saving || !nuevoEstado}
              style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: nuevoEstado ? ESTADO_CFG[nuevoEstado].tone : T.primary, border: 0, borderRadius: 11, cursor: (saving || !nuevoEstado) ? 'not-allowed' : 'pointer', opacity: (saving || !nuevoEstado) ? .6 : 1 }}>
              {saving ? 'Guardando…' : 'Confirmar cambio'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(inner, document.body);
}
