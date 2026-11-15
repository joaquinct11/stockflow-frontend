import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import {
  citaService,
  type CitaResumenDTO,
  type TipoCita,
  type ProfesionalElegibleDTO,
} from '../../../services/cita.service';
import { clienteService } from '../../../services/cliente.service';
import { mascotaService } from '../../../services/mascota.service';
import { usePermissions } from '../../../hooks/usePermissions';
import { notify } from '../../../lib/notify';
import { TIPO_CFG, HORAS_15, DUR_CHIPS } from '../citas.constants';

const T = {
  surface:     'var(--color-surface, #ffffff)',
  surface2:    'var(--color-surface-2, #f3f4f6)',
  surface3:    'var(--color-surface-3, #f9fafb)',
  line:        'var(--color-border, #e5e7eb)',
  lineSoft:    'var(--color-border-soft, #f3f4f6)',
  text:        'var(--color-text, #111827)',
  text2:       'var(--color-text-2, #374151)',
  text3:       'var(--color-text-3, #6b7280)',
  primary:     'var(--color-primary, #3b47ef)',
  primarySoft: 'var(--color-primary-soft, #eef0ff)',
  primaryLine: 'var(--color-primary-line, #cfd4fd)',
  bad:         'var(--color-bad, #dc2626)',
} as const;

const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

const IcoChev = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const inputSt: React.CSSProperties = {
  width: '100%', height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem',
  color: T.text, background: T.surface, border: `1px solid ${T.line}`,
  borderRadius: 10, outline: 'none', padding: '0 14px',
};

const fi = (e: React.FocusEvent<HTMLElement>) => {
  (e.currentTarget as HTMLElement).style.borderColor = T.primary;
  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${T.primarySoft}`;
};
const fo = (e: React.FocusEvent<HTMLElement>) => {
  (e.currentTarget as HTMLElement).style.borderColor = T.line;
  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
};

function Section({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ height: 1, background: 'var(--color-border,#e5e7eb)', margin: '0 -22px 14px' }} />
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 700, color: 'var(--color-text-3,#6b7280)', letterSpacing: '.09em', textTransform: 'uppercase' }}>{n} · {label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, optional, error, children }: { label: string; required?: boolean; optional?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>
        {label}
        {required && <span style={{ color: T.bad, marginLeft: 3 }}>*</span>}
        {optional && <span style={{ fontWeight: 400, color: T.text3, marginLeft: 5, fontSize: '.76rem' }}>(opcional)</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: '.75rem', color: T.bad }}>{error}</span>}
    </div>
  );
}

function addMinToHora(hora: string, mins: number): string {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function parseDurMin(start: string, end: string): number {
  const [sh, sm] = start.slice(11, 16).split(':').map(Number);
  const [eh, em] = end.slice(11, 16).split(':').map(Number);
  const d = (eh * 60 + em) - (sh * 60 + sm);
  return d > 0 ? d : 30;
}

interface Props {
  citaInicial:      CitaResumenDTO | null;
  sucursalActivaId: number | null;
  preloadFecha?:    string;
  preloadHora?:     string;
  preloadProfId?:   number;
  onClose:          () => void;
  onSaved:          () => void;
}

export function CitaFormModal({ citaInicial, sucursalActivaId, preloadFecha, preloadHora, preloadProfId, onClose, onSaved }: Props) {
  const esEdicion = citaInicial !== null;
  const { canCreate, canEdit } = usePermissions();
  const puedeElegirProfesional = canCreate('CITAS') || canEdit('CITAS');

  const initFecha    = citaInicial?.fechaInicio.slice(0, 10)   ?? preloadFecha   ?? '';
  const initHora     = citaInicial?.fechaInicio.slice(11, 16)  ?? preloadHora    ?? '08:00';
  const initDurMin   = citaInicial ? parseDurMin(citaInicial.fechaInicio, citaInicial.fechaFin) : TIPO_CFG['CONSULTA'].durMin;

  const [clienteId,       setClienteId]   = useState<number | ''>(citaInicial?.clienteId ?? '');
  const [mascotaId,       setMascotaId]   = useState<number | ''>(citaInicial?.mascotaId ?? '');
  const [usuarioTenantId, setProf]        = useState<number | ''>(preloadProfId ?? citaInicial?.usuarioTenantId ?? '');
  const [tipo,            setTipo]        = useState<TipoCita>(citaInicial?.tipo ?? 'CONSULTA');
  const [fecha,           setFecha]       = useState(initFecha);
  const [hora,            setHora]        = useState(initHora);
  const [durMin,          setDurMin]      = useState(initDurMin);
  const [motivo,          setMotivo]      = useState(citaInicial?.motivo ?? '');
  const [observaciones,   setObs]         = useState('');

  const [clientes,      setClientes]    = useState<{ id: number; nombre: string }[]>([]);
  const [mascotas,      setMascotas]    = useState<{ id: number; nombre: string; especie: string }[]>([]);
  const [profesionales, setProfs]       = useState<ProfesionalElegibleDTO[]>([]);
  const [lCli,  setLCli]  = useState(false);
  const [lMas,  setLMas]  = useState(false);
  const [lProf, setLProf] = useState(false);
  const [saving, setSaving]  = useState(false);
  const [intento, setIntento] = useState(false);

  useEffect(() => {
    setLCli(true);
    clienteService.getActivos()
      .then(data => setClientes(data.filter(c => c.id !== undefined).map(c => ({ id: c.id as number, nombre: c.nombre }))))
      .catch(err => notify.fromError(err, 'Error al cargar clientes'))
      .finally(() => setLCli(false));
  }, []);

  useEffect(() => {
    if (!clienteId) { setMascotas([]); return; }
    setLMas(true);
    mascotaService.porCliente(Number(clienteId))
      .then(data => setMascotas(data.map(m => ({ id: m.id, nombre: m.nombre, especie: m.especie }))))
      .catch(err => notify.fromError(err, 'Error al cargar mascotas'))
      .finally(() => setLMas(false));
  }, [clienteId]);

  useEffect(() => {
    if (!puedeElegirProfesional) return;
    setLProf(true);
    citaService.getProfesionales(sucursalActivaId, tipo)
      .then(data => {
        setProfs(data);
        if (usuarioTenantId && !data.some(p => p.usuarioTenantId === Number(usuarioTenantId))) {
          setProf('');
        }
      })
      .catch(err => notify.fromError(err, 'Error al cargar profesionales'))
      .finally(() => setLProf(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, sucursalActivaId, puedeElegirProfesional]);

  // Actualizar duración cuando cambia el tipo (solo si el usuario no la ha cambiado)
  useEffect(() => {
    if (!esEdicion) setDurMin(TIPO_CFG[tipo].durMin);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  async function handleSubmit() {
    setIntento(true);
    if (!fecha || !hora) { notify.error('Completa la fecha y hora'); return; }
    if (!esEdicion && (!clienteId || !mascotaId)) { notify.error('Selecciona cliente y mascota'); return; }

    const inicio  = `${fecha}T${hora}:00`;
    const horaFin = addMinToHora(hora, durMin);
    const fin     = `${fecha}T${horaFin}:00`;

    setSaving(true);
    try {
      if (esEdicion && citaInicial) {
        await citaService.update(citaInicial.id, {
          fechaInicio: inicio, fechaFin: fin, tipo,
          motivo: motivo || undefined,
          observaciones: observaciones || undefined,
          sucursalId: sucursalActivaId ?? undefined,
          usuarioTenantId: usuarioTenantId ? Number(usuarioTenantId) : undefined,
        });
        notify.success('Cita actualizada');
      } else {
        await citaService.create({
          clienteId: Number(clienteId), mascotaId: Number(mascotaId),
          fechaInicio: inicio, fechaFin: fin, tipo,
          motivo: motivo || undefined,
          observaciones: observaciones || undefined,
          sucursalId: sucursalActivaId ?? undefined,
          usuarioTenantId: usuarioTenantId ? Number(usuarioTenantId) : undefined,
        });
        notify.success('Cita registrada');
      }
      onSaved();
    } catch (err) {
      notify.fromError(err, 'Error al guardar la cita');
    } finally {
      setSaving(false);
    }
  }

  const tipoCfg = TIPO_CFG[tipo];

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 580, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `color-mix(in oklab, ${tipoCfg.color} 14%, var(--color-surface,#fff))`, display: 'grid', placeItems: 'center', color: tipoCfg.color }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>
              {esEdicion ? 'Editar cita' : 'Nueva cita'}
            </h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 3 }}>
              {esEdicion ? 'Reprograma la fecha u hora, o cambia el servicio.' : 'Agenda una cita para un paciente.'}
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
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px 4px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 1. PACIENTE */}
          <Section n={1} label="PACIENTE">
            {!esEdicion ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Cliente" required error={intento && !clienteId ? 'Selecciona un cliente.' : ''}>
                  <div style={{ position: 'relative' }}>
                    <select value={clienteId}
                      onChange={e => { setClienteId(e.target.value ? Number(e.target.value) : ''); setMascotaId(''); }}
                      disabled={lCli}
                      style={{ ...inputSt, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', paddingRight: 36 }}
                      onFocus={fi} onBlur={fo}>
                      <option value="">{lCli ? 'Cargando...' : 'Selecciona un cliente'}</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.text3 }}><IcoChev /></span>
                  </div>
                </Field>
                <Field label="Mascota" required error={intento && !mascotaId ? 'Selecciona una mascota.' : ''}>
                  <div style={{ position: 'relative' }}>
                    <select value={mascotaId}
                      onChange={e => setMascotaId(e.target.value ? Number(e.target.value) : '')}
                      disabled={!clienteId || lMas}
                      style={{ ...inputSt, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', opacity: (!clienteId || lMas) ? .6 : 1, paddingRight: 36 }}
                      onFocus={fi} onBlur={fo}>
                      <option value="">{!clienteId ? 'Elige primero el cliente' : lMas ? 'Cargando...' : 'Selecciona una mascota'}</option>
                      {mascotas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.especie})</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.text3, opacity: (!clienteId || lMas) ? .4 : 1 }}><IcoChev /></span>
                  </div>
                </Field>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: T.surface2 }}>
                <div style={{ fontSize: '.78rem', color: T.text3, marginBottom: 3 }}>Cliente / Mascota</div>
                <div style={{ fontSize: '.9rem', fontWeight: 650 }}>{citaInicial?.clienteNombre ?? '—'}</div>
                <div style={{ fontSize: '.82rem', color: T.text3, marginTop: 2 }}>
                  {citaInicial?.mascotaNombre} · {citaInicial?.mascotaEspecie}
                </div>
              </div>
            )}
          </Section>

          {/* 2. SERVICIO */}
          <Section n={2} label="SERVICIO">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Tipo" required>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 11, height: 11, borderRadius: 4, background: tipoCfg.color, flexShrink: 0, pointerEvents: 'none', zIndex: 1 }} />
                  <select value={tipo} onChange={e => setTipo(e.target.value as TipoCita)}
                    style={{ ...inputSt, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', paddingLeft: 32, paddingRight: 36 }}
                    onFocus={fi} onBlur={fo}>
                    {(Object.keys(TIPO_CFG) as TipoCita[]).map(t => (
                      <option key={t} value={t}>{TIPO_CFG[t].label}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.text3 }}><IcoChev /></span>
                </div>
              </Field>
              {puedeElegirProfesional ? (
                <Field label="Profesional" optional>
                  <div style={{ position: 'relative' }}>
                    <select value={usuarioTenantId}
                      onChange={e => setProf(e.target.value ? Number(e.target.value) : '')}
                      disabled={lProf}
                      style={{ ...inputSt, appearance: 'none', WebkitAppearance: 'none', cursor: lProf ? 'not-allowed' : 'pointer', opacity: lProf ? .6 : 1, paddingRight: 36 }}
                      onFocus={fi} onBlur={fo}>
                      <option value="">{lProf ? 'Cargando…' : 'Sin asignar'}</option>
                      {profesionales.map(p => <option key={p.usuarioTenantId} value={p.usuarioTenantId}>{p.nombre}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.text3, opacity: lProf ? .4 : 1 }}><IcoChev /></span>
                  </div>
                </Field>
              ) : <div />}
            </div>
          </Section>

          {/* 3. FECHA Y HORA */}
          <Section n={3} label="FECHA Y HORA">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Fecha" required error={intento && !fecha ? 'Requerido.' : ''}>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  style={inputSt} onFocus={fi} onBlur={fo} />
              </Field>
              <Field label="Hora de inicio" required error={intento && !hora ? 'Requerido.' : ''}>
                <div style={{ position: 'relative' }}>
                  <select value={hora} onChange={e => setHora(e.target.value)}
                    style={{ ...inputSt, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace", paddingRight: 36 }}
                    onFocus={fi} onBlur={fo}>
                    {HORAS_15.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.text3 }}><IcoChev /></span>
                </div>
              </Field>
            </div>
            <Field label="Duración">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {DUR_CHIPS.map(chip => {
                  const sel = durMin === chip.min;
                  return (
                    <button key={chip.min} type="button" onClick={() => setDurMin(chip.min)}
                      style={{
                        height: 34, padding: '0 14px',
                        fontFamily: "'IBM Plex Mono',monospace", fontSize: '.8rem', fontWeight: sel ? 700 : 500,
                        background: sel ? T.primary : T.surface2, color: sel ? '#fff' : T.text2,
                        border: sel ? `1.5px solid ${T.primary}` : `1.5px solid ${T.line}`,
                        borderRadius: 8, cursor: 'pointer',
                      }}>
                      {chip.label}
                    </button>
                  );
                })}
              </div>
              {hora && durMin > 0 && (
                <div style={{ fontSize: '.78rem', color: T.text3, fontFamily: "'IBM Plex Mono',monospace", marginTop: 4 }}>
                  {hora} – {addMinToHora(hora, durMin)}
                </div>
              )}
            </Field>
          </Section>

          {/* 4. DETALLE */}
          <Section n={4} label="DETALLE (OPCIONAL)">
            <Field label="Motivo">
              <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
                placeholder="Motivo de la cita (opcional)"
                style={inputSt} onFocus={fi} onBlur={fo} />
            </Field>
            <Field label="Observaciones">
              <textarea value={observaciones} onChange={e => setObs(e.target.value)}
                placeholder="Observaciones adicionales (opcional)"
                rows={2}
                style={{ ...inputSt, height: 'auto', padding: '10px 14px', resize: 'none', lineHeight: 1.5 }}
                onFocus={fi} onBlur={fo} />
            </Field>
          </Section>

          <div style={{ height: 4 }} />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}`, opacity: saving ? .7 : 1 }}>
            {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Agendar cita'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
