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

const ESTADOS = ['ACTIVA', 'TRIAL', 'VENCIDA', 'PAST_DUE', 'CANCELADA'];
const PLANES  = ['BASICO', 'PRO'];

const estadoColor: Record<string, string> = {
  ACTIVA:    '#00d4aa',
  TRIAL:     '#6c63ff',
  VENCIDA:   '#ff5050',
  PAST_DUE:  '#ffaa00',
  CANCELADA: '#5a5a72',
};

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

const labelSt: React.CSSProperties = {
  color: '#9898b0', fontSize: '0.73rem', fontWeight: 600,
  display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
};
const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '0.55rem 0.75rem',
  color: '#e8e8f0', fontSize: '0.875rem',
};
const sectionTitle: React.CSSProperties = {
  color: '#6c63ff', fontSize: '0.73rem', fontWeight: 700,
  margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em',
};

// ── Modal de edición ──────────────────────────────────────────────────────────

function EditModal({ tenant, onClose, onSaved }: {
  tenant: TenantResumenDTO;
  onClose: () => void;
  onSaved: (updated: TenantResumenDTO) => void;
}) {
  const [tab, setTab] = useState<'sus' | 'ose' | 'cobros'>('sus');

  // Suscripción form
  const [form, setForm] = useState<SuscripcionManualUpdateDTO>({
    planId:            tenant.planId            ?? 'BASICO',
    estado:            tenant.estadoSuscripcion ?? 'ACTIVA',
    precioMensual:     tenant.precioMensual     ?? 0,
    fechaProximoCobro: toInputDate(tenant.fechaProximoCobro),
    trialEndDate:      toInputDate(tenant.trialEndDate),
    currentPeriodEnd:  toInputDate(tenant.currentPeriodEnd),
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // OSE form
  const [oseForm, setOseForm] = useState<OseUpdateDTO>({
    oseUrl:   tenant.oseUrl   ?? '',
    oseToken: tenant.oseToken ?? '',
  });
  const [savingOse, setSavingOse] = useState(false);
  const [oseError,  setOseError]  = useState('');
  const [oseSaved,  setOseSaved]  = useState(false);

  // Cobros
  const [cobros,       setCobros]       = useState<SuscripcionHistorialDTO[]>([]);
  const [loadingCobros,setLoadingCobros] = useState(false);

  // Trial quick-extend
  const [extendingTrial, setExtendingTrial] = useState(false);

  const setF = (k: keyof SuscripcionManualUpdateDTO, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  // Load cobros when tab changes
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
        planId:   form.planId,
        estado:   form.estado,
        precioMensual: form.precioMensual,
        fechaProximoCobro: form.fechaProximoCobro ? form.fechaProximoCobro + ':00' : undefined,
        trialEndDate:      form.trialEndDate      ? form.trialEndDate      + ':00' : undefined,
        currentPeriodEnd:  form.currentPeriodEnd  ? form.currentPeriodEnd  + ':00' : undefined,
      };
      const res = await superAdminService.updateSuscripcion(tenant.tenantId, payload);
      onSaved(res.data);
      onClose();
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleExtenderTrial = async (dias: number) => {
    setExtendingTrial(true); setError('');
    try {
      const res = await superAdminService.extenderTrial(tenant.tenantId, dias);
      onSaved(res.data);
      setForm((p) => ({ ...p, trialEndDate: toInputDate(res.data.trialEndDate), estado: 'TRIAL' }));
    } catch {
      setError('Error al extender trial.');
    } finally {
      setExtendingTrial(false);
    }
  };

  const handleSaveOse = async () => {
    setSavingOse(true); setOseError(''); setOseSaved(false);
    try {
      await superAdminService.updateOse(tenant.tenantId, oseForm);
      setOseSaved(true);
    } catch {
      setOseError('Error al guardar OSE.');
    } finally {
      setSavingOse(false);
    }
  };

  const tabBtn = (id: 'sus' | 'ose' | 'cobros', label: string) => (
    <button onClick={() => setTab(id)} style={{
      background: tab === id ? 'rgba(108,99,255,0.2)' : 'transparent',
      border: 'none', borderBottom: `2px solid ${tab === id ? '#6c63ff' : 'transparent'}`,
      color: tab === id ? '#8b85ff' : '#5a5a72',
      padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ color: '#e8e8f0', fontWeight: 700, fontSize: '1rem', margin: 0 }}>{tenant.nombre}</h2>
              <p style={{ color: '#5a5a72', fontSize: '0.76rem', margin: '2px 0 0' }}>
                {tenant.tenantId} · {tenant.emailContacto ?? '—'}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5a5a72', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
          {/* Info chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {[
              ['RUC', tenant.ruc], ['Rubro', tenant.rubro],
              ['Usuarios', tenant.totalUsuarios], ['Productos', tenant.totalProductos],
              ['Ventas', tenant.totalVentas], ['Comprobantes', tenant.totalComprobantes],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                <span style={{ color: '#5a5a72' }}>{k}: </span>
                <span style={{ color: '#9898b0', fontWeight: 600 }}>{v ?? '—'}</span>
              </div>
            ))}
            <div style={{ background: tenant.activo ? 'rgba(0,212,170,0.1)' : 'rgba(255,80,80,0.1)', border: `1px solid ${tenant.activo ? '#00d4aa40' : '#ff505040'}`, borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: tenant.activo ? '#00d4aa' : '#ff5050', fontWeight: 700 }}>
              {tenant.activo ? '● Activo' : '● Desactivado'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {tabBtn('sus',    'Suscripción')}
          {tabBtn('ose',    'OSE / Lucode')}
          {tabBtn('cobros', 'Historial')}
        </div>

        {/* Tab: Suscripción */}
        {tab === 'sus' && (
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Trial quick-extend */}
            <div>
              <p style={sectionTitle}>Extender trial rápido</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[7, 14, 30].map((d) => (
                  <button key={d} onClick={() => handleExtenderTrial(d)} disabled={extendingTrial}
                    style={{ flex: 1, background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 8, color: '#8b85ff', padding: '0.5rem', cursor: extendingTrial ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600, opacity: extendingTrial ? 0.6 : 1 }}>
                    +{d} días
                  </button>
                ))}
              </div>
              {tenant.trialEndDate && (
                <p style={{ color: '#5a5a72', fontSize: '0.73rem', margin: '6px 0 0' }}>
                  Trial actual hasta: {fmtDate(tenant.trialEndDate)}
                </p>
              )}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
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
            <div>
              <label style={labelSt}>Fin de trial</label>
              <input type="datetime-local" value={form.trialEndDate} onChange={(e) => setF('trialEndDate', e.target.value)} style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Fin período actual</label>
              <input type="datetime-local" value={form.currentPeriodEnd} onChange={(e) => setF('currentPeriodEnd', e.target.value)} style={inputSt} />
            </div>

            {error && <p style={{ color: '#ff5050', fontSize: '0.82rem', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 6, padding: '0.5rem 0.75rem', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#9898b0', padding: '0.65rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: 'linear-gradient(135deg,#6c63ff,#4a43cc)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, padding: '0.65rem', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar suscripción'}
              </button>
            </div>
          </div>
        )}

        {/* Tab: OSE */}
        {tab === 'ose' && (
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ color: '#9898b0', fontSize: '0.82rem', margin: 0 }}>
              Configura el OSE <strong style={{ color: '#e8e8f0' }}>Lucode</strong> para que este tenant pueda emitir boletas y facturas electrónicas ante SUNAT.
            </p>

            <div>
              <label style={labelSt}>URL del OSE (Lucode)</label>
              <input
                type="text"
                placeholder="https://api.lucode.pe/v1/empresas/ruc-del-tenant"
                value={oseForm.oseUrl ?? ''}
                onChange={(e) => setOseForm((p) => ({ ...p, oseUrl: e.target.value }))}
                style={inputSt}
              />
              <p style={{ color: '#5a5a72', fontSize: '0.7rem', margin: '4px 0 0' }}>
                Normalmente incluye el RUC del tenant en la ruta.
              </p>
            </div>

            <div>
              <label style={labelSt}>Token API del OSE</label>
              <input
                type="password"
                placeholder="Token privado de Lucode"
                value={oseForm.oseToken ?? ''}
                onChange={(e) => setOseForm((p) => ({ ...p, oseToken: e.target.value }))}
                style={inputSt}
              />
              <p style={{ color: '#5a5a72', fontSize: '0.7rem', margin: '4px 0 0' }}>
                Se almacena cifrado y nunca se expone al tenant.
              </p>
            </div>

            {tenant.oseToken && (
              <div style={{ background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8, padding: '0.6rem 0.875rem', fontSize: '0.78rem', color: '#00d4aa' }}>
                ✓ OSE ya configurado — los campos muestran el valor actual enmascarado.
              </div>
            )}

            {oseError && <p style={{ color: '#ff5050', fontSize: '0.82rem', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 6, padding: '0.5rem 0.75rem', margin: 0 }}>{oseError}</p>}
            {oseSaved && <p style={{ color: '#00d4aa', fontSize: '0.82rem', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 6, padding: '0.5rem 0.75rem', margin: 0 }}>✓ OSE guardado correctamente</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#9898b0', padding: '0.65rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                Cancelar
              </button>
              <button onClick={handleSaveOse} disabled={savingOse} style={{ flex: 2, background: 'linear-gradient(135deg,#00d4aa,#00a68a)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, padding: '0.65rem', cursor: savingOse ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: savingOse ? 0.7 : 1 }}>
                {savingOse ? 'Guardando...' : 'Guardar configuración OSE'}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Historial cobros */}
        {tab === 'cobros' && (
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {loadingCobros ? (
              <p style={{ color: '#5a5a72', textAlign: 'center', padding: '2rem 0' }}>Cargando historial...</p>
            ) : cobros.length === 0 ? (
              <p style={{ color: '#5a5a72', textAlign: 'center', padding: '2rem 0' }}>Sin historial de cobros</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cobros.map((c) => {
                  const color = estadoColor[c.estado ?? ''] ?? '#5a5a72';
                  return (
                    <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 4, color: '#8b85ff', padding: '0.1rem 0.45rem', fontSize: '0.7rem', fontWeight: 700 }}>
                            {c.planId ?? '—'}
                          </span>
                          <span style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 4, color, padding: '0.1rem 0.45rem', fontSize: '0.7rem', fontWeight: 700 }}>
                            {c.estado ?? '—'}
                          </span>
                        </div>
                        <span style={{ color: '#00d4aa', fontWeight: 700, fontSize: '0.9rem' }}>
                          {c.precioMensual != null ? fmt(c.precioMensual) : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.72rem' }}>
                        <span style={{ color: '#5a5a72' }}>Inicio: <span style={{ color: '#9898b0' }}>{fmtDate(c.fechaInicio)}</span></span>
                        <span style={{ color: '#5a5a72' }}>Próx. cobro: <span style={{ color: '#9898b0' }}>{fmtDate(c.fechaProximoCobro)}</span></span>
                        {c.metodoPago && <span style={{ color: '#5a5a72' }}>Método: <span style={{ color: '#9898b0' }}>{c.metodoPago}{c.ultimos4Digitos ? ` ****${c.ultimos4Digitos}` : ''}</span></span>}
                        {c.preapprovalId && <span style={{ color: '#5a5a72' }}>Preapproval: <span style={{ color: '#9898b0', fontFamily: 'monospace', fontSize: '0.68rem' }}>{c.preapprovalId.slice(0, 18)}…</span></span>}
                        <span style={{ color: '#5a5a72' }}>Creado: <span style={{ color: '#9898b0' }}>{fmtDate(c.createdAt)}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats,    setStats]    = useState<SuperAdminStatsDTO | null>(null);
  const [finanzas, setFinanzas] = useState<SuperAdminFinanzasDTO | null>(null);
  const [tenants,  setTenants]  = useState<TenantResumenDTO[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filtro,   setFiltro]   = useState('TODOS');
  const [editing,  setEditing]  = useState<TenantResumenDTO | null>(null);
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
      setStats(s.data);
      setFinanzas(f.data);
      setTenants(t.data);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(saTokenKey);
    navigate('/superadmin/login');
  };

  const handleSaved = (updated: TenantResumenDTO) => {
    setTenants((prev) => prev.map((t) => t.tenantId === updated.tenantId ? updated : t));
  };

  const handleToggleActivo = async (t: TenantResumenDTO) => {
    setTogglingId(t.tenantId);
    try {
      await superAdminService.toggleActivo(t.tenantId, !t.activo);
      setTenants((prev) => prev.map((x) => x.tenantId === t.tenantId ? { ...x, activo: !x.activo } : x));
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = tenants.filter((t) => {
    const matchSearch = !search ||
      t.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (t.emailContacto ?? '').toLowerCase().includes(search.toLowerCase()) ||
      t.tenantId.toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === 'TODOS' || t.estadoSuscripcion === filtro;
    return matchSearch && matchFiltro;
  });

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#e8e8f0' }}>

      {/* Header */}
      <header style={{ background: '#12121a', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', background: 'linear-gradient(135deg,#8b85ff,#00d4aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fluxus Super Admin
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={load} style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 8, color: '#8b85ff', padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.82rem' }}>
            ↻ Actualizar
          </button>
          <button onClick={handleLogout} style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, color: '#ff5050', padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.82rem' }}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '1.5rem' }}>

        {/* Stats cards — estado tenants */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Total tenants', value: stats.totalTenants, color: '#e8e8f0' },
              { label: 'Activos',       value: stats.activos,      color: '#00d4aa' },
              { label: 'En trial',      value: stats.enTrial,      color: '#6c63ff' },
              { label: 'Vencidos',      value: stats.vencidos,     color: '#ff5050' },
              { label: 'Past Due',      value: stats.pastDue,      color: '#ffaa00' },
              { label: 'Cancelados',    value: stats.cancelados,   color: '#5a5a72' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.875rem 1rem' }}>
                <div style={{ color, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                <div style={{ color: '#5a5a72', fontSize: '0.68rem', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Finanzas row */}
        {finanzas && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'MRR actual',          value: fmt(finanzas.mrrActual),          color: '#00d4aa', big: true },
              { label: 'MRR anual proyectado', value: fmt(finanzas.mrrAnualProyectado), color: '#00d4aa' },
              { label: 'Plan Básico',          value: finanzas.cantBasico,              color: '#9898b0' },
              { label: 'Plan Pro',             value: finanzas.cantPro,                 color: '#8b85ff' },
              { label: 'Con OSE (Lucode)',      value: finanzas.tenantsConOse,           color: '#ffaa00' },
            ].map(({ label, value, color, big }) => (
              <div key={label} style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.12)', borderRadius: 12, padding: '0.875rem 1rem' }}>
                <div style={{ color, fontSize: big ? '1.3rem' : '1.1rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                <div style={{ color: '#5a5a72', fontSize: '0.68rem', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filtros + búsqueda */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Buscar tenant, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.5rem 0.875rem', color: '#e8e8f0', fontSize: '0.85rem', minWidth: 240 }}
          />
          {['TODOS', ...ESTADOS].map((f) => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              background: filtro === f ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filtro === f ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 20, color: filtro === f ? '#8b85ff' : '#5a5a72',
              padding: '0.35rem 0.875rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            }}>
              {f}
            </button>
          ))}
          <span style={{ color: '#5a5a72', fontSize: '0.78rem', marginLeft: 'auto' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tabla */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#5a5a72', padding: '4rem' }}>Cargando...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Negocio', 'Email', 'Rubro', 'Plan', 'Estado', 'Fecha ref.', 'Usuarios', 'Ventas', 'OSE', 'Activo', ''].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.625rem 0.75rem', color: '#5a5a72', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const color    = estadoColor[t.estadoSuscripcion ?? ''] ?? '#5a5a72';
                  const fechaRef = t.estadoSuscripcion === 'TRIAL' ? t.trialEndDate : t.fechaProximoCobro;
                  const toggling = togglingId === t.tenantId;
                  return (
                    <tr key={t.tenantId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, color: '#e8e8f0', whiteSpace: 'nowrap' }}>{t.nombre}</div>
                        <div style={{ color: '#5a5a72', fontSize: '0.68rem', fontFamily: 'monospace' }}>{t.tenantId}</div>
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', color: '#9898b0', whiteSpace: 'nowrap' }}>{t.emailContacto ?? '—'}</td>
                      <td style={{ padding: '0.625rem 0.75rem', color: '#9898b0' }}>{t.rubro ?? '—'}</td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <span style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 4, color: '#8b85ff', padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>
                          {t.planId ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <span style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 4, color, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>
                          {t.estadoSuscripcion ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', color: '#9898b0', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{fmtDate(fechaRef)}</td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', color: '#9898b0', fontVariantNumeric: 'tabular-nums' }}>{t.totalUsuarios}</td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', color: '#9898b0', fontVariantNumeric: 'tabular-nums' }}>{t.totalVentas}</td>
                      <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                        {t.oseToken
                          ? <span style={{ color: '#00d4aa', fontSize: '0.72rem', fontWeight: 700 }}>✓</span>
                          : <span style={{ color: '#5a5a72', fontSize: '0.72rem' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <button
                          onClick={() => handleToggleActivo(t)}
                          disabled={toggling}
                          title={t.activo ? 'Desactivar tenant' : 'Activar tenant'}
                          style={{
                            background: t.activo ? 'rgba(0,212,170,0.1)' : 'rgba(255,80,80,0.1)',
                            border: `1px solid ${t.activo ? 'rgba(0,212,170,0.3)' : 'rgba(255,80,80,0.3)'}`,
                            borderRadius: 20, color: t.activo ? '#00d4aa' : '#ff5050',
                            padding: '0.2rem 0.6rem', cursor: toggling ? 'wait' : 'pointer',
                            fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                            opacity: toggling ? 0.6 : 1,
                          }}>
                          {t.activo ? '● ON' : '○ OFF'}
                        </button>
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <button onClick={() => setEditing(t)} style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 6, color: '#8b85ff', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: '#5a5a72', padding: '3rem' }}>Sin resultados</div>
            )}
          </div>
        )}
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
