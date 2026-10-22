import { createPortal } from 'react-dom';
import { useState } from 'react';
import { citaService, type CitaResumenDTO, type EstadoCita } from '../../../services/cita.service';
import { notify } from '../../../lib/notify';

// ── Palette ───────────────────────────────────────────────────────────────────
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
  primaryLine: 'var(--color-primary-line, #cfd4fd)',
  ok:          'var(--color-ok, #059669)',
  okSoft:      'var(--color-ok-soft, #d1fae5)',
  warn:        'var(--color-warn, #d97706)',
  warnSoft:    'var(--color-warn-soft, #fef3c7)',
  bad:         'var(--color-bad, #dc2626)',
  badSoft:     'var(--color-bad-soft, #fee2e2)',
} as const;

const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const IcoShuffle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3h5v5M4 20 21 3"/><path d="m21 16-5 5-5-5"/><path d="M4 4h5l3 3"/>
  </svg>
);

interface Props {
  cita: CitaResumenDTO;
  puedeCancelar: boolean;
  /** true solo para ADMIN y VETERINARIO: pueden marcar EN_ATENCION y ATENDIDA */
  puedeTransicionClinica: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Transiciones válidas por estado actual
const TRANSICIONES: Record<EstadoCita, EstadoCita[]> = {
  PENDIENTE:   ['CONFIRMADA', 'CANCELADA', 'NO_ASISTIO'],
  CONFIRMADA:  ['EN_ATENCION', 'CANCELADA', 'NO_ASISTIO'],
  EN_ATENCION: ['ATENDIDA', 'CANCELADA'],
  ATENDIDA:    [],
  CANCELADA:   ['PENDIENTE'],
  NO_ASISTIO:  ['PENDIENTE'],
};

const ESTADO_LABEL: Record<EstadoCita, string> = {
  PENDIENTE:   'Pendiente',
  CONFIRMADA:  'Confirmada',
  EN_ATENCION: 'En atención',
  ATENDIDA:    'Atendida',
  CANCELADA:   'Cancelada',
  NO_ASISTIO:  'No asistió',
};

const ESTADO_COLOR: Record<EstadoCita, { color: string; bg: string }> = {
  PENDIENTE:   { color: T.text3,   bg: T.surface2 },
  CONFIRMADA:  { color: T.primary, bg: T.primarySoft },
  EN_ATENCION: { color: T.warn,    bg: T.warnSoft },
  ATENDIDA:    { color: T.ok,      bg: T.okSoft },
  CANCELADA:   { color: T.bad,     bg: T.badSoft },
  NO_ASISTIO:  { color: '#c2410c', bg: '#ffedd5' },
};

const inputBase: React.CSSProperties = {
  width: '100%', height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem',
  color: T.text, background: T.surface, border: `1px solid ${T.line}`,
  borderRadius: 10, outline: 'none', padding: '0 14px',
};
const focusIn = (e: React.FocusEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = T.primary;
  e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`;
};
const focusOut = (e: React.FocusEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = T.line;
  e.currentTarget.style.boxShadow = 'none';
};

export function CambiarEstadoModal({ cita, puedeCancelar, puedeTransicionClinica, onClose, onSaved }: Props) {
  const opciones = (TRANSICIONES[cita.estado] ?? []).filter(e => {
    // Cancelar y reabrir requieren permiso específico
    if (e === 'CANCELADA') return puedeCancelar;
    if (e === 'PENDIENTE') return puedeCancelar; // reabrir
    // Transiciones clínicas solo para ADMIN o VETERINARIO asignado
    if (e === 'EN_ATENCION' || e === 'ATENDIDA') return puedeTransicionClinica;
    return true;
  });

  const [nuevoEstado, setNuevoEstado] = useState<EstadoCita | ''>(opciones[0] ?? '');
  const [observaciones, setObs]       = useState('');
  const [saving, setSaving]           = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoEstado) { notify.error('Selecciona un nuevo estado'); return; }

    setSaving(true);
    try {
      await citaService.cambiarEstado(cita.id, {
        nuevoEstado,
        observaciones: observaciones || undefined,
      });
      notify.success(`Estado actualizado a "${ESTADO_LABEL[nuevoEstado]}"`);
      onSaved();
    } catch (err) {
      notify.fromError(err, 'Error al cambiar el estado');
    } finally {
      setSaving(false);
    }
  }

  const estadoActualCfg = ESTADO_COLOR[cita.estado] ?? { color: T.text3, bg: T.surface2 };

  // Si no hay transiciones posibles
  if (opciones.length === 0) {
    return createPortal(
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}` }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Cambiar estado</h2>
              <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>
                La cita en estado <strong>{ESTADO_LABEL[cita.estado]}</strong> no puede cambiar de estado.
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <IcoX />
            </button>
          </div>
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}` }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, width: '100%', height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
              onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
              Cerrar
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.primarySoft, color: T.primary }}>
            <IcoShuffle />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Cambiar estado de cita</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>Selecciona el nuevo estado para esta cita.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 4px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info cita */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, background: T.surface2 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '.875rem', fontWeight: 650 }}>{cita.mascotaNombre}</div>
              <div style={{ fontSize: '.78rem', color: T.text3, marginTop: 2 }}>
                {cita.clienteNombre ?? '—'}
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, color: estadoActualCfg.color, background: estadoActualCfg.bg, flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: estadoActualCfg.color }} />
              {ESTADO_LABEL[cita.estado]}
            </span>
          </div>

          {/* Nuevo estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>
              Nuevo estado <span style={{ color: T.bad }}>*</span>
            </label>
            <select
              value={nuevoEstado}
              onChange={e => setNuevoEstado(e.target.value as EstadoCita)}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer', paddingRight: 14 }}
              onFocus={focusIn} onBlur={focusOut}
            >
              <option value="">— Selecciona —</option>
              {opciones.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </select>
          </div>

          {/* Observaciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>Observaciones (opcional)</label>
            <textarea
              value={observaciones}
              onChange={e => setObs(e.target.value)}
              placeholder="Ej: paciente llegó tarde, se reagenda…"
              rows={2}
              style={{ ...inputBase, height: 'auto', padding: '10px 14px', resize: 'none', lineHeight: 1.5 }}
              onFocus={focusIn} onBlur={focusOut}
            />
          </div>

          <div style={{ height: 4 }} />
        </form>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving || !nuevoEstado}
            style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: (saving || !nuevoEstado) ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}`, opacity: (saving || !nuevoEstado) ? .6 : 1 }}>
            {saving ? 'Guardando…' : 'Cambiar estado'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
