import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  superAdminService,
  type TenantResumenDTO,
  type SuperAdminStatsDTO,
  type SuperAdminFinanzasDTO,
  type SuscripcionHistorialDTO,
  type SuscripcionManualUpdateDTO,
  type OseUpdateDTO,
} from '../../services/superAdmin.service';
import { saTokenKey } from '../../api/superAdminApi';

// ── Colores ────────────────────────────────────────────────────────────────────
const C = {
  page:          '#F1F5F9',
  card:          '#FFFFFF',
  border:        '#E2E8F0',
  borderLight:   '#F1F5F9',
  text:          '#0F172A',
  textSub:       '#475569',
  textMuted:     '#94A3B8',
  accent:        '#4F46E5',
  accentLight:   '#EEF2FF',
  accentBorder:  '#C7D2FE',
  success:       '#059669',
  successLight:  '#ECFDF5',
  successBorder: '#A7F3D0',
  danger:        '#DC2626',
  dangerLight:   '#FEF2F2',
  dangerBorder:  '#FECACA',
  warning:       '#D97706',
  warningLight:  '#FFFBEB',
  warningBorder: '#FDE68A',
  purple:        '#7C3AED',
  purpleLight:   '#F5F3FF',
  purpleBorder:  '#DDD6FE',
  gray:          '#6B7280',
  grayLight:     '#F9FAFB',
  grayBorder:    '#E5E7EB',
  inputBorder:   '#CBD5E1',
};

const ESTADOS = ['ACTIVA', 'TRIAL', 'VENCIDA', 'PAST_DUE', 'CANCELADA'];
const PLANES  = ['BASICO', 'PRO'];

type EstadoKey = 'ACTIVA' | 'TRIAL' | 'VENCIDA' | 'PAST_DUE' | 'CANCELADA';

const estadoBadge: Record<EstadoKey, { text: string; bg: string; border: string; dot: string }> = {
  ACTIVA:    { text: C.success,  bg: C.successLight,  border: C.successBorder,  dot: C.success  },
  TRIAL:     { text: C.accent,   bg: C.accentLight,   border: C.accentBorder,   dot: C.accent   },
  VENCIDA:   { text: C.danger,   bg: C.dangerLight,   border: C.dangerBorder,   dot: C.danger   },
  PAST_DUE:  { text: C.warning,  bg: C.warningLight,  border: C.warningBorder,  dot: C.warning  },
  CANCELADA: { text: C.gray,     bg: C.grayLight,     border: C.grayBorder,     dot: C.gray     },
};

const rowBg: Partial<Record<EstadoKey, string>> = {
  VENCIDA:  '#FEF2F2',
  PAST_DUE: '#FFFBEB',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function toInputDate(s: string | null) {
  if (!s) return '';
  return s.slice(0, 16);
}
function daysFromNow(s: string | null): number | null {
  if (!s) return null;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86_400_000);
}
function daysLabel(s: string | null, prefix: string) {
  const d = daysFromNow(s);
  if (d === null) return '—';
  if (d < 0)  return `Venció hace ${Math.abs(d)}d`;
  if (d === 0) return 'Vence hoy';
  return `${prefix} ${d}d`;
}

// ── Estilos compartidos ────────────────────────────────────────────────────────
const labelSt: React.CSSProperties = {
  color: C.textSub, fontSize: '0.73rem', fontWeight: 600,
  display: 'block', marginBottom: 5, letterSpacing: '0.01em',
};
const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: C.card, border: `1.5px solid ${C.inputBorder}`,
  borderRadius: 8, padding: '0.55rem 0.75rem',
  color: C.text, fontSize: '0.875rem', outline: 'none',
};
const sectionTitle: React.CSSProperties = {
  color: C.textMuted, fontSize: '0.68rem', fontWeight: 700,
  margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.09em',
};

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Badge de estado ────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado?: string | null }) {
  const s = (estado ?? '') as EstadoKey;
  const b = estadoBadge[s] ?? { text: C.gray, bg: C.grayLight, border: C.grayBorder, dot: C.gray };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: b.bg, border: `1px solid ${b.border}`,
      borderRadius: 20, color: b.text,
      padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: b.dot, flexShrink: 0 }} />
      {estado ?? '—'}
    </span>
  );
}

// ── Modal de edición ──────────────────────────────────────────────────────────
function EditModal({ tenant, onClose, onSaved }: {
  tenant: TenantResumenDTO;
  onClose: () => void;
  onSaved: (updated: TenantResumenDTO) => void;
}) {
  const [tab, setTab] = useState<'sus' | 'ose' | 'cobros'>('sus');

  const [form, setForm] = useState<SuscripcionManualUpdateDTO>({
    planId:            tenant.planId            ?? 'BASICO',
    estado:            tenant.estadoSuscripcion ?? 'ACTIVA',
    precioMensual:     tenant.precioMensual     ?? 0,
    fechaProximoCobro: toInputDate(tenant.fechaProximoCobro),
    trialEndDate:      toInputDate(tenant.trialEndDate),
    currentPeriodEnd:  toInputDate(tenant.currentPeriodEnd),
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const [oseForm,    setOseForm]    = useState<OseUpdateDTO>({ oseUrl: tenant.oseUrl ?? '', oseToken: tenant.oseToken ?? '' });
  const [savingOse,  setSavingOse]  = useState(false);
  const [oseError,   setOseError]   = useState('');
  const [oseSaved,   setOseSaved]   = useState(false);
  const [showToken,  setShowToken]  = useState(false);

  const [cobros,        setCobros]        = useState<SuscripcionHistorialDTO[]>([]);
  const [loadingCobros, setLoadingCobros] = useState(false);
  const [extendingTrial,setExtendingTrial] = useState(false);

  const setF = (k: keyof SuscripcionManualUpdateDTO, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (tab === 'cobros' && cobros.length === 0) {
      setLoadingCobros(true);
      superAdminService.getCobros(tenant.tenantId)
        .then((r) => setCobros(r.data))
        .finally(() => setLoadingCobros(false));
    }
  }, [tab]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload: SuscripcionManualUpdateDTO = {
        planId: form.planId, estado: form.estado, precioMensual: form.precioMensual,
        fechaProximoCobro: form.fechaProximoCobro ? form.fechaProximoCobro + ':00' : undefined,
        trialEndDate:      form.trialEndDate      ? form.trialEndDate      + ':00' : undefined,
        currentPeriodEnd:  form.currentPeriodEnd  ? form.currentPeriodEnd  + ':00' : undefined,
      };
      const res = await superAdminService.updateSuscripcion(tenant.tenantId, payload);
      onSaved(res.data); onClose();
    } catch { setError('Error al guardar. Intenta de nuevo.'); }
    finally { setSaving(false); }
  };

  const handleExtenderTrial = async (dias: number) => {
    setExtendingTrial(true); setError('');
    try {
      const res = await superAdminService.extenderTrial(tenant.tenantId, dias);
      onSaved(res.data);
      setForm((p) => ({ ...p, trialEndDate: toInputDate(res.data.trialEndDate), estado: 'TRIAL' }));
    } catch { setError('Error al extender trial.'); }
    finally { setExtendingTrial(false); }
  };

  const handleSaveOse = async () => {
    setSavingOse(true); setOseError(''); setOseSaved(false);
    try {
      await superAdminService.updateOse(tenant.tenantId, oseForm);
      setOseSaved(true);
    } catch { setOseError('Error al guardar OSE.'); }
    finally { setSavingOse(false); }
  };

  const tabBtn = (id: 'sus' | 'ose' | 'cobros', label: string) => (
    <button key={id} onClick={() => setTab(id)} style={{
      background: 'none',
      border: 'none',
      borderBottom: `2px solid ${tab === id ? C.accent : 'transparent'}`,
      color: tab === id ? C.accent : C.textMuted,
      padding: '0.625rem 1.125rem',
      cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
      transition: 'color 0.15s, border-color 0.15s',
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(15,23,42,0.2)' }}>

        {/* Header del modal */}
        <div style={{ padding: '1.375rem 1.5rem', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ color: C.text, fontWeight: 700, fontSize: '1rem', margin: 0, letterSpacing: '-0.01em' }}>
                {tenant.nombre}
              </h2>
              <p style={{ color: C.textMuted, fontSize: '0.74rem', margin: '3px 0 0', fontFamily: 'monospace' }}>
                {tenant.tenantId}
                {tenant.emailContacto && <span style={{ fontFamily: 'system-ui', color: C.textSub }}> · {tenant.emailContacto}</span>}
              </p>
            </div>
            <button onClick={onClose} style={{ background: C.grayLight, border: `1px solid ${C.grayBorder}`, borderRadius: 8, color: C.textSub, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* Chips informativos */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {[
              ['RUC', tenant.ruc],
              ['Rubro', tenant.rubro],
              [`👥 ${tenant.totalUsuarios}`, 'usuarios'],
              [`📦 ${tenant.totalProductos}`, 'productos'],
              [`🛒 ${tenant.totalVentas}`, 'ventas'],
              [`📄 ${tenant.totalComprobantes}`, 'comprobantes'],
            ].filter(([v]) => v !== undefined && v !== null && v !== '').map(([v, label]) => (
              <span key={String(label)} style={{ background: C.borderLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.72rem', color: C.textSub }}>
                <span style={{ fontWeight: 600, color: C.text }}>{v}</span>
                {!String(v).includes('👥') && !String(v).includes('📦') && !String(v).includes('🛒') && !String(v).includes('📄') ? '' : ` ${label}`}
              </span>
            ))}
            <span style={{
              background: tenant.activo ? C.successLight : C.dangerLight,
              border: `1px solid ${tenant.activo ? C.successBorder : C.dangerBorder}`,
              borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.72rem',
              color: tenant.activo ? C.success : C.danger, fontWeight: 700,
            }}>
              {tenant.activo ? '● Activo' : '● Desactivado'}
            </span>
            <EstadoBadge estado={tenant.estadoSuscripcion} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, paddingLeft: 8 }}>
          {tabBtn('sus',    'Suscripción')}
          {tabBtn('ose',    'OSE / Lucode')}
          {tabBtn('cobros', 'Historial')}
        </div>

        {/* Tab: Suscripción */}
        {tab === 'sus' && (
          <div style={{ padding: '1.375rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <p style={sectionTitle}>Extender trial rápido</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[7, 14, 30].map((d) => (
                  <button key={d} onClick={() => handleExtenderTrial(d)} disabled={extendingTrial}
                    style={{ flex: 1, background: C.accentLight, border: `1px solid ${C.accentBorder}`, borderRadius: 8, color: C.accent, padding: '0.5rem', cursor: extendingTrial ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 700, opacity: extendingTrial ? 0.6 : 1 }}>
                    +{d} días
                  </button>
                ))}
              </div>
              {tenant.trialEndDate && (
                <p style={{ color: C.textMuted, fontSize: '0.72rem', margin: '6px 0 0' }}>
                  Trial actual hasta: {fmtDate(tenant.trialEndDate)}
                </p>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <p style={sectionTitle}>Editar suscripción</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelSt}>Plan</label>
                <select value={form.planId} onChange={(e) => setF('planId', e.target.value)} style={inputSt}>
                  {PLANES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Estado</label>
                <select value={form.estado} onChange={(e) => setF('estado', e.target.value)} style={inputSt}>
                  {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={labelSt}>Precio mensual (S/)</label>
              <input type="number" step="0.01" value={form.precioMensual} onChange={(e) => setF('precioMensual', Number(e.target.value))} style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Próximo cobro</label>
              <input type="datetime-local" value={form.fechaProximoCobro} onChange={(e) => setF('fechaProximoCobro', e.target.value)} style={inputSt} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelSt}>Fin de trial</label>
                <input type="datetime-local" value={form.trialEndDate} onChange={(e) => setF('trialEndDate', e.target.value)} style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Fin período actual</label>
                <input type="datetime-local" value={form.currentPeriodEnd} onChange={(e) => setF('currentPeriodEnd', e.target.value)} style={inputSt} />
              </div>
            </div>

            {error && (
              <div style={{ color: C.danger, fontSize: '0.82rem', background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={onClose} style={{ flex: 1, background: C.grayLight, border: `1px solid ${C.grayBorder}`, borderRadius: 8, color: C.textSub, padding: '0.65rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: C.accent, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, padding: '0.65rem', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : 'Guardar suscripción'}
              </button>
            </div>
          </div>
        )}

        {/* Tab: OSE */}
        {tab === 'ose' && (
          <div style={{ padding: '1.375rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: C.textSub, fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
              Configura el OSE <strong style={{ color: C.text }}>Lucode</strong> para que este tenant pueda emitir comprobantes ante SUNAT.
            </p>

            {tenant.oseToken && (
              <div style={{ background: C.successLight, border: `1px solid ${C.successBorder}`, borderRadius: 8, padding: '0.6rem 0.875rem', fontSize: '0.78rem', color: C.success, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconCheck /> OSE ya configurado — puedes reemplazar los valores.
              </div>
            )}

            <div>
              <label style={labelSt}>URL del OSE (Lucode)</label>
              <input
                type="text"
                placeholder="https://api.lucode.pe/v1/empresas/ruc"
                value={oseForm.oseUrl ?? ''}
                onChange={(e) => setOseForm((p) => ({ ...p, oseUrl: e.target.value }))}
                style={inputSt}
              />
              <p style={{ color: C.textMuted, fontSize: '0.7rem', margin: '4px 0 0' }}>Normalmente incluye el RUC del tenant en la ruta.</p>
            </div>

            <div>
              <label style={labelSt}>Token API del OSE</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Token privado de Lucode"
                  value={oseForm.oseToken ?? ''}
                  onChange={(e) => setOseForm((p) => ({ ...p, oseToken: e.target.value }))}
                  style={{ ...inputSt, paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowToken((v) => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, display: 'flex', alignItems: 'center' }}>
                  {showToken ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              <p style={{ color: C.textMuted, fontSize: '0.7rem', margin: '4px 0 0' }}>Se almacena cifrado y nunca se expone al tenant.</p>
            </div>

            {oseError && <div style={{ color: C.danger, fontSize: '0.82rem', background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 8, padding: '0.5rem 0.75rem' }}>{oseError}</div>}
            {oseSaved && (
              <div style={{ color: C.success, fontSize: '0.82rem', background: C.successLight, border: `1px solid ${C.successBorder}`, borderRadius: 8, padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconCheck /> OSE guardado correctamente
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, background: C.grayLight, border: `1px solid ${C.grayBorder}`, borderRadius: 8, color: C.textSub, padding: '0.65rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                Cancelar
              </button>
              <button onClick={handleSaveOse} disabled={savingOse} style={{ flex: 2, background: C.success, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, padding: '0.65rem', cursor: savingOse ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: savingOse ? 0.7 : 1 }}>
                {savingOse ? 'Guardando…' : 'Guardar configuración OSE'}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Historial cobros */}
        {tab === 'cobros' && (
          <div style={{ padding: '1.375rem 1.5rem' }}>
            {loadingCobros ? (
              <p style={{ color: C.textMuted, textAlign: 'center', padding: '2.5rem 0' }}>Cargando historial…</p>
            ) : cobros.length === 0 ? (
              <p style={{ color: C.textMuted, textAlign: 'center', padding: '2.5rem 0' }}>Sin historial de cobros</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cobros.map((c) => (
                  <div key={c.id} style={{ background: C.borderLight, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ background: C.accentLight, border: `1px solid ${C.accentBorder}`, borderRadius: 4, color: C.accent, padding: '0.1rem 0.45rem', fontSize: '0.7rem', fontWeight: 700 }}>
                          {c.planId ?? '—'}
                        </span>
                        <EstadoBadge estado={c.estado} />
                      </div>
                      <span style={{ color: C.success, fontWeight: 700, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                        {c.precioMensual != null ? fmt(c.precioMensual) : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.72rem', color: C.textSub }}>
                      <span>Inicio: <strong style={{ color: C.text }}>{fmtDate(c.fechaInicio)}</strong></span>
                      <span>Próx. cobro: <strong style={{ color: C.text }}>{fmtDate(c.fechaProximoCobro)}</strong></span>
                      {c.metodoPago && <span>Pago: <strong style={{ color: C.text }}>{c.metodoPago}{c.ultimos4Digitos ? ` ****${c.ultimos4Digitos}` : ''}</strong></span>}
                      {c.preapprovalId && <span>ID: <strong style={{ color: C.text, fontFamily: 'monospace', fontSize: '0.68rem' }}>{c.preapprovalId.slice(0, 16)}…</strong></span>}
                      <span>Creado: <strong style={{ color: C.text }}>{fmtDate(c.createdAt)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard principal ────────────────────────────────────────────────────────
export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats,      setStats]      = useState<SuperAdminStatsDTO | null>(null);
  const [finanzas,   setFinanzas]   = useState<SuperAdminFinanzasDTO | null>(null);
  const [tenants,    setTenants]    = useState<TenantResumenDTO[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filtro,     setFiltro]     = useState('TODOS');
  const [editing,    setEditing]    = useState<TenantResumenDTO | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(saTokenKey);
    if (!token) { navigate('/superadmin/login'); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [s, f, t] = await Promise.all([
        superAdminService.getStats(),
        superAdminService.getFinanzas(),
        superAdminService.getTenants(),
      ]);
      setStats(s.data); setFinanzas(f.data); setTenants(t.data);
    } finally { setLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem(saTokenKey); navigate('/superadmin/login'); };
  const handleSaved  = (updated: TenantResumenDTO) =>
    setTenants((prev) => prev.map((t) => t.tenantId === updated.tenantId ? updated : t));

  const handleToggleActivo = async (t: TenantResumenDTO) => {
    setTogglingId(t.tenantId);
    try {
      await superAdminService.toggleActivo(t.tenantId, !t.activo);
      setTenants((prev) => prev.map((x) => x.tenantId === t.tenantId ? { ...x, activo: !x.activo } : x));
    } finally { setTogglingId(null); }
  };

  const filtered = tenants.filter((t) => {
    const matchSearch = !search
      || t.nombre.toLowerCase().includes(search.toLowerCase())
      || (t.emailContacto ?? '').toLowerCase().includes(search.toLowerCase())
      || t.tenantId.toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === 'TODOS' || t.estadoSuscripcion === filtro;
    return matchSearch && matchFiltro;
  });

  // Contadores para filtros
  const contadores = tenants.reduce<Record<string, number>>((acc, t) => {
    acc['TODOS'] = (acc['TODOS'] ?? 0) + 1;
    acc[t.estadoSuscripcion ?? ''] = (acc[t.estadoSuscripcion ?? ''] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ background: C.page, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', color: C.text }}>

      {/* Header */}
      <header style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛡️</div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, letterSpacing: '-0.01em' }}>
            Fluxus <span style={{ color: C.accent }}>Admin</span>
          </span>
          {stats && (
            <span style={{ background: C.accentLight, border: `1px solid ${C.accentBorder}`, color: C.accent, borderRadius: 20, padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 700 }}>
              {stats.totalTenants} tenants
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.grayLight, border: `1px solid ${C.grayBorder}`, borderRadius: 8, color: C.textSub, padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500 }}>
            <IconRefresh /> Actualizar
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.dangerLight, border: `1px solid ${C.dangerBorder}`, borderRadius: 8, color: C.danger, padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500 }}>
            <IconLogout /> Cerrar sesión
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '1.5rem' }}>

        {/* KPIs estado tenants */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 10 }}>
            {[
              { label: 'Total',      value: stats.totalTenants, color: C.text,    bg: C.card,         border: C.border         },
              { label: 'Activos',    value: stats.activos,      color: C.success,  bg: C.successLight,  border: C.successBorder  },
              { label: 'En Trial',   value: stats.enTrial,      color: C.accent,   bg: C.accentLight,   border: C.accentBorder   },
              { label: 'Vencidos',   value: stats.vencidos,     color: C.danger,   bg: C.dangerLight,   border: C.dangerBorder   },
              { label: 'Past Due',   value: stats.pastDue,      color: C.warning,  bg: C.warningLight,  border: C.warningBorder  },
              { label: 'Cancelados', value: stats.cancelados,   color: C.gray,     bg: C.grayLight,     border: C.grayBorder     },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} onClick={() => { if (label !== 'Total') setFiltro(label.toUpperCase().replace(' ', '_').replace('EN_', '').replace('TRIAL', 'TRIAL')); else setFiltro('TODOS'); }}
                style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '0.875rem 1rem', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ color, fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                <div style={{ color, fontSize: '0.7rem', marginTop: 4, fontWeight: 600, opacity: 0.8 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Métricas financieras */}
        {finanzas && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 20 }}>
            {/* MRR — más prominente */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem 1.125rem', gridColumn: 'span 1', borderLeft: `4px solid ${C.success}` }}>
              <div style={{ color: C.textMuted, fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>MRR Actual</div>
              <div style={{ color: C.success, fontSize: '1.6rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmt(finanzas.mrrActual)}</div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem 1.125rem', borderLeft: `4px solid ${C.accent}` }}>
              <div style={{ color: C.textMuted, fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Proyección anual</div>
              <div style={{ color: C.accent, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmt(finanzas.mrrAnualProyectado)}</div>
            </div>
            {[
              { label: 'Plan Básico',    value: finanzas.cantBasico,     color: C.gray    },
              { label: 'Plan Pro',       value: finanzas.cantPro,        color: C.purple  },
              { label: 'Con OSE activo', value: finanzas.tenantsConOse,  color: C.warning },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem 1.125rem' }}>
                <div style={{ color: C.textMuted, fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                <div style={{ color, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Barra de búsqueda y filtros */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0.875rem 1rem', marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, email o ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputSt, paddingLeft: '2rem', minWidth: 240, borderColor: C.border }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['TODOS', ...ESTADOS] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)} style={{
                background: filtro === f ? C.accentLight : 'transparent',
                border: `1px solid ${filtro === f ? C.accentBorder : C.border}`,
                borderRadius: 20, color: filtro === f ? C.accent : C.textSub,
                padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                transition: 'all 0.12s',
              }}>
                {f}{contadores[f === 'TODOS' ? 'TODOS' : f] ? ` (${contadores[f === 'TODOS' ? 'TODOS' : f]})` : ''}
              </button>
            ))}
          </div>

          <span style={{ color: C.textMuted, fontSize: '0.75rem', marginLeft: 'auto' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tabla */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: C.textMuted, padding: '4rem' }}>Cargando…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: C.borderLight, borderBottom: `1px solid ${C.border}` }}>
                    {['Negocio', 'Contacto', 'Rubro', 'Plan', 'Estado', 'Fecha clave', 'Usuarios', 'Ventas', 'OSE', 'Activo', ''].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.7rem 0.875rem', color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.63rem', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const estado   = (t.estadoSuscripcion ?? '') as EstadoKey;
                    const bg       = rowBg[estado] ?? 'transparent';
                    const toggling = togglingId === t.tenantId;
                    const fechaRef = estado === 'TRIAL' ? t.trialEndDate : t.fechaProximoCobro;
                    const days     = daysFromNow(fechaRef);
                    const daysStr  = estado === 'TRIAL'
                      ? daysLabel(t.trialEndDate, 'Trial:')
                      : daysLabel(t.fechaProximoCobro, 'Cobro:');
                    const urgentDays = days !== null && days >= 0 && days <= 5;

                    return (
                      <tr key={t.tenantId}
                        style={{ borderBottom: `1px solid ${C.border}`, background: bg, transition: 'background 0.1s' }}
                        onMouseEnter={(e) => !bg && (e.currentTarget.style.background = C.borderLight)}
                        onMouseLeave={(e) => !bg && (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Negocio */}
                        <td style={{ padding: '0.75rem 0.875rem', minWidth: 160 }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{t.nombre}</div>
                          <div style={{ color: C.textMuted, fontSize: '0.67rem', fontFamily: 'monospace', marginTop: 1 }}>{t.tenantId}</div>
                        </td>
                        {/* Contacto */}
                        <td style={{ padding: '0.75rem 0.875rem', color: C.textSub, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {t.emailContacto ?? '—'}
                        </td>
                        {/* Rubro */}
                        <td style={{ padding: '0.75rem 0.875rem', color: C.textSub, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {t.rubro ?? '—'}
                        </td>
                        {/* Plan */}
                        <td style={{ padding: '0.75rem 0.875rem' }}>
                          <span style={{
                            background: t.planId === 'PRO' ? C.purpleLight : C.grayLight,
                            border: `1px solid ${t.planId === 'PRO' ? C.purpleBorder : C.grayBorder}`,
                            borderRadius: 4, color: t.planId === 'PRO' ? C.purple : C.gray,
                            padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700,
                          }}>
                            {t.planId ?? '—'}
                          </span>
                        </td>
                        {/* Estado */}
                        <td style={{ padding: '0.75rem 0.875rem' }}>
                          <EstadoBadge estado={t.estadoSuscripcion} />
                        </td>
                        {/* Fecha clave */}
                        <td style={{ padding: '0.75rem 0.875rem', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                          <div style={{ color: urgentDays ? C.danger : C.textSub, fontWeight: urgentDays ? 700 : 400 }}>
                            {daysStr}
                          </div>
                          <div style={{ color: C.textMuted, fontSize: '0.68rem', marginTop: 1 }}>
                            {fmtDate(fechaRef)}
                          </div>
                        </td>
                        {/* Usuarios */}
                        <td style={{ padding: '0.75rem 0.875rem', textAlign: 'center', color: C.textSub, fontVariantNumeric: 'tabular-nums' }}>
                          {t.totalUsuarios}
                        </td>
                        {/* Ventas */}
                        <td style={{ padding: '0.75rem 0.875rem', textAlign: 'center', color: C.textSub, fontVariantNumeric: 'tabular-nums' }}>
                          {t.totalVentas}
                        </td>
                        {/* OSE */}
                        <td style={{ padding: '0.75rem 0.875rem', textAlign: 'center' }}>
                          {t.oseToken
                            ? <span style={{ color: C.success, display: 'inline-flex' }}><IconCheck /></span>
                            : <span style={{ color: C.textMuted, fontSize: '0.75rem' }}>—</span>}
                        </td>
                        {/* Toggle Activo */}
                        <td style={{ padding: '0.75rem 0.875rem' }}>
                          <button
                            onClick={() => handleToggleActivo(t)}
                            disabled={toggling}
                            title={t.activo ? 'Desactivar' : 'Activar'}
                            style={{
                              background: t.activo ? C.successLight : C.dangerLight,
                              border: `1px solid ${t.activo ? C.successBorder : C.dangerBorder}`,
                              borderRadius: 20,
                              color: t.activo ? C.success : C.danger,
                              padding: '0.2rem 0.65rem',
                              cursor: toggling ? 'wait' : 'pointer',
                              fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                              opacity: toggling ? 0.6 : 1, transition: 'opacity 0.15s',
                            }}>
                            {t.activo ? '● ON' : '○ OFF'}
                          </button>
                        </td>
                        {/* Editar */}
                        <td style={{ padding: '0.75rem 0.875rem' }}>
                          <button onClick={() => setEditing(t)} style={{ background: C.accentLight, border: `1px solid ${C.accentBorder}`, borderRadius: 7, color: C.accent, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: C.textMuted, padding: '3.5rem', fontSize: '0.875rem' }}>
                  Sin resultados para los filtros aplicados
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {editing && (
        <EditModal
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => { handleSaved(u); setEditing(null); }}
        />
      )}
    </div>
  );
}
