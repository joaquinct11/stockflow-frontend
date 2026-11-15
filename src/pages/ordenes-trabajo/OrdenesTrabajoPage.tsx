import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { notify } from '../../lib/notify';
import {
  ordenTrabajoService,
  type OtResumenDTO,
  type OrdenTrabajoDTO,
  type OtPageResumenDTO,
  type CrearOtRequestDTO,
  type ActualizarOtRequestDTO,
} from '../../services/ordenTrabajo.service';
import { clienteService, type ClienteDTO } from '../../services/cliente.service';
import { equipoService, type EquipoResumenDTO } from '../../services/equipo.service';
import { sucursalService, type SucursalDTO } from '../../services/sucursal.service';
import { usuarioService } from '../../services/usuario.service';
import type { Usuario } from '../../types';

// ── Design tokens (mismo sistema que EquiposPage / ClientesList) ──────────────
const T = {
  bg: '#f7f8fa', surface: '#ffffff', surface2: '#f1f3f7', surface3: '#fafbfc',
  line: '#e4e7ec', lineSoft: '#eef0f4',
  text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
  primary: '#3b47ef', primarySoft: '#eef0ff', primaryLine: '#cfd4fd',
  ok: '#0f9d6e', okSoft: '#e7f7f1',
  warn: '#b7791f', warnSoft: '#fdf6e7',
  bad: '#d63b3b', badSoft: '#fdeceb',
  purple: '#7c3aed', purpleSoft: '#f3eeff',
  cyan: '#0891b2', cyanSoft: '#ecfeff',
  orange: '#c2500a', orangeSoft: '#fff4ed',
  shadow: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
} as const;

// ── SVG icons inline ──────────────────────────────────────────────────────────
const IcoSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
const IcoPlus   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
const IcoX      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IcoEdit   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
const IcoEye    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoSwap   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>;
const IcoWrench = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IcoChevL  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IcoChevR  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

// ── Configuración de estados y prioridades ────────────────────────────────────

const ESTADOS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ABIERTA:           { label: 'Abierta',          bg: T.cyanSoft,   color: T.cyan },
  EN_PROCESO:        { label: 'En proceso',        bg: T.primarySoft,color: T.primary },
  DIAGNOSTICADA:     { label: 'Diagnosticada',     bg: T.warnSoft,   color: T.warn },
  PENDIENTE_REPUESTO:{ label: 'Pend. repuesto',    bg: T.orangeSoft, color: T.orange },
  CERRADA_TECN:      { label: 'Cerrada técn.',     bg: T.okSoft,     color: T.ok },
  FACTURADA:         { label: 'Facturada',         bg: T.purpleSoft, color: T.purple },
  ENTREGADA:         { label: 'Entregada',         bg: '#f0f4f8',    color: '#4a5568' },
  CANCELADA:         { label: 'Cancelada',         bg: T.badSoft,    color: T.bad },
};

const PRIORIDADES_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  BAJA:   { label: 'Baja',   bg: '#f1f3f7', color: T.text3 },
  NORMAL: { label: 'Normal', bg: T.cyanSoft, color: T.cyan },
  ALTA:   { label: 'Alta',   bg: T.orangeSoft, color: T.orange },
  URGENTE:{ label: 'Urgente',bg: T.badSoft,  color: T.bad },
};

// Transiciones de estado permitidas (UI-level, lógica de negocio básica)
const TRANSICIONES: Record<string, string[]> = {
  ABIERTA:            ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO:         ['DIAGNOSTICADA', 'PENDIENTE_REPUESTO', 'CERRADA_TECN', 'CANCELADA'],
  DIAGNOSTICADA:      ['EN_PROCESO', 'PENDIENTE_REPUESTO', 'CERRADA_TECN', 'CANCELADA'],
  PENDIENTE_REPUESTO: ['EN_PROCESO', 'DIAGNOSTICADA', 'CERRADA_TECN', 'CANCELADA'],
  CERRADA_TECN:       ['FACTURADA', 'CANCELADA'],
  FACTURADA:          ['ENTREGADA'],
  ENTREGADA:          [],
  CANCELADA:          [],
};

// ── Helpers de formato ────────────────────────────────────────────────────────

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADOS_CONFIG[estado] ?? { label: estado, bg: '#f1f3f7', color: T.text3 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999, fontSize: '.76rem', fontWeight: 600,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function PrioridadBadge({ prioridad }: { prioridad: string }) {
  const cfg = PRIORIDADES_CONFIG[prioridad] ?? { label: prioridad, bg: '#f1f3f7', color: T.text3 };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: '.73rem', fontWeight: 600,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

type UsuarioResumen = Pick<Usuario, 'id' | 'nombre' | 'rolNombre'>

interface CreateFormState {
  clienteId: string;
  equipoClienteId: string;
  sucursalId: string;
  tecnicoId: string;
  descripcionProblema: string;
  prioridad: string;
  observaciones: string;
}

interface EditFormState {
  prioridad: string;
  descripcionProblema: string;
  diagnostico: string;
  trabajoRealizado: string;
  observaciones: string;
}

// ── Modal de creación ─────────────────────────────────────────────────────────

function CreateModal({
  onClose, onCreated,
  clientes, sucursales, usuarios,
}: {
  onClose: () => void;
  onCreated: (ot: OrdenTrabajoDTO) => void;
  clientes: ClienteDTO[];
  sucursales: SucursalDTO[];
  usuarios: UsuarioResumen[];
}) {
  const [form, setForm] = useState<CreateFormState>({
    clienteId: '', equipoClienteId: '', sucursalId: '',
    tecnicoId: '', descripcionProblema: '', prioridad: 'NORMAL', observaciones: '',
  });
  const [equipos, setEquipos] = useState<EquipoResumenDTO[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateFormState, string>>>({});

  useEffect(() => {
    if (!form.clienteId) { setEquipos([]); return; }
    setLoadingEquipos(true);
    equipoService.listarPorCliente(Number(form.clienteId))
      .then(setEquipos)
      .catch(() => setEquipos([]))
      .finally(() => setLoadingEquipos(false));
    setForm(f => ({ ...f, equipoClienteId: '' }));
  }, [form.clienteId]);

  function validate() {
    const e: Partial<Record<keyof CreateFormState, string>> = {};
    if (!form.clienteId) e.clienteId = 'Seleccione un cliente';
    if (!form.equipoClienteId) e.equipoClienteId = 'Seleccione un equipo';
    if (!form.sucursalId) e.sucursalId = 'Seleccione una sucursal';
    if (!form.descripcionProblema.trim()) e.descripcionProblema = 'La descripción es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const dto: CrearOtRequestDTO = {
        clienteId: Number(form.clienteId),
        equipoClienteId: Number(form.equipoClienteId),
        sucursalId: Number(form.sucursalId),
        tecnicoId: form.tecnicoId ? Number(form.tecnicoId) : null,
        descripcionProblema: form.descripcionProblema.trim(),
        prioridad: form.prioridad || undefined,
        observaciones: form.observaciones.trim() || undefined,
      };
      const created = await ordenTrabajoService.crear(dto);
      notify.success('Orden de trabajo creada');
      onCreated(created);
    } catch (err) {
      notify.fromError(err, 'No se pudo crear la orden de trabajo');
    } finally {
      setSaving(false);
    }
  }

  const F = fieldStyle;

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, maxWidth: 540 }}>
        <ModalHeader title="Nueva Orden de Trabajo" subtitle="Crear nueva solicitud de servicio técnico" onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto' }}>

            <FieldRow label="Cliente *" error={errors.clienteId}>
              <select style={F} value={form.clienteId} onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}>
                <option value="">Seleccionar cliente…</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </FieldRow>

            <FieldRow label="Equipo del cliente *" error={errors.equipoClienteId}>
              <select
                style={F}
                value={form.equipoClienteId}
                disabled={!form.clienteId || loadingEquipos}
                onChange={e => setForm(f => ({ ...f, equipoClienteId: e.target.value }))}
              >
                <option value="">
                  {loadingEquipos ? 'Cargando…' : !form.clienteId ? 'Seleccione un cliente primero' : 'Seleccionar equipo…'}
                </option>
                {equipos.filter(eq => eq.activo).map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nombre}{eq.marca ? ` · ${eq.marca}` : ''}{eq.modelo ? ` ${eq.modelo}` : ''}
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label="Sucursal *" error={errors.sucursalId}>
              <select style={F} value={form.sucursalId} onChange={e => setForm(f => ({ ...f, sucursalId: e.target.value }))}>
                <option value="">Seleccionar sucursal…</option>
                {sucursales.filter(s => s.activo !== false).map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </FieldRow>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FieldRow label="Prioridad">
                <select style={F} value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}>
                  <option value="BAJA">Baja</option>
                  <option value="NORMAL">Normal</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </FieldRow>
              <FieldRow label="Técnico asignado">
                <select style={F} value={form.tecnicoId} onChange={e => setForm(f => ({ ...f, tecnicoId: e.target.value }))}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u.id} value={u.id!}>{u.nombre}</option>)}
                </select>
              </FieldRow>
            </div>

            <FieldRow label="Descripción del problema *" error={errors.descripcionProblema}>
              <textarea
                style={{ ...F, minHeight: 80, resize: 'vertical' }}
                value={form.descripcionProblema}
                onChange={e => setForm(f => ({ ...f, descripcionProblema: e.target.value }))}
                placeholder="Describe el problema del equipo…"
              />
            </FieldRow>

            <FieldRow label="Observaciones">
              <textarea
                style={{ ...F, minHeight: 56, resize: 'vertical' }}
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                placeholder="Notas adicionales (opcional)…"
              />
            </FieldRow>
          </div>

          <ModalFooter onClose={onClose} saving={saving} submitLabel="Crear OT" />
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Modal de edición ──────────────────────────────────────────────────────────

function EditModal({
  ot, onClose, onUpdated,
}: {
  ot: OrdenTrabajoDTO;
  onClose: () => void;
  onUpdated: (updated: OrdenTrabajoDTO) => void;
}) {
  const [form, setForm] = useState<EditFormState>({
    prioridad: ot.prioridad ?? 'NORMAL',
    descripcionProblema: ot.descripcionProblema ?? '',
    diagnostico: ot.diagnostico ?? '',
    trabajoRealizado: ot.trabajoRealizado ?? '',
    observaciones: ot.observaciones ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EditFormState, string>>>({});

  function validate() {
    const e: Partial<Record<keyof EditFormState, string>> = {};
    if (!form.descripcionProblema.trim()) e.descripcionProblema = 'La descripción es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const dto: ActualizarOtRequestDTO = {
        prioridad: form.prioridad || undefined,
        descripcionProblema: form.descripcionProblema.trim(),
        diagnostico: form.diagnostico.trim() || undefined,
        trabajoRealizado: form.trabajoRealizado.trim() || undefined,
        observaciones: form.observaciones.trim() || undefined,
      };
      const updated = await ordenTrabajoService.actualizar(ot.id, dto);
      notify.success('Orden de trabajo actualizada');
      onUpdated(updated);
    } catch (err) {
      notify.fromError(err, 'No se pudo actualizar la orden de trabajo');
    } finally {
      setSaving(false);
    }
  }

  const F = fieldStyle;

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, maxWidth: 540 }}>
        <ModalHeader title={`Editar OT ${ot.numeroOt}`} subtitle={`${ot.clienteNombre} · ${ot.equipoNombre}`} onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto' }}>
            <FieldRow label="Prioridad">
              <select style={F} value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}>
                <option value="BAJA">Baja</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </FieldRow>

            <FieldRow label="Descripción del problema *" error={errors.descripcionProblema}>
              <textarea
                style={{ ...F, minHeight: 80, resize: 'vertical' }}
                value={form.descripcionProblema}
                onChange={e => setForm(f => ({ ...f, descripcionProblema: e.target.value }))}
              />
            </FieldRow>

            <FieldRow label="Diagnóstico">
              <textarea
                style={{ ...F, minHeight: 72, resize: 'vertical' }}
                value={form.diagnostico}
                onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))}
                placeholder="Resultado del diagnóstico técnico…"
              />
            </FieldRow>

            <FieldRow label="Trabajo realizado">
              <textarea
                style={{ ...F, minHeight: 72, resize: 'vertical' }}
                value={form.trabajoRealizado}
                onChange={e => setForm(f => ({ ...f, trabajoRealizado: e.target.value }))}
                placeholder="Descripción del trabajo ejecutado…"
              />
            </FieldRow>

            <FieldRow label="Observaciones">
              <textarea
                style={{ ...F, minHeight: 56, resize: 'vertical' }}
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              />
            </FieldRow>
          </div>

          <ModalFooter onClose={onClose} saving={saving} submitLabel="Guardar cambios" />
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Modal de cambio de estado ─────────────────────────────────────────────────

function CambiarEstadoModal({
  ot, onClose, onChanged,
}: {
  ot: OtResumenDTO;
  onClose: () => void;
  onChanged: () => void;
}) {
  const transiciones = TRANSICIONES[ot.estado] ?? [];
  const [nuevoEstado, setNuevoEstado] = useState(transiciones[0] ?? '');
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoEstado) return;
    setSaving(true);
    try {
      await ordenTrabajoService.cambiarEstado(ot.id, { estado: nuevoEstado, observacion: observacion.trim() || undefined });
      notify.success(`Estado actualizado a "${ESTADOS_CONFIG[nuevoEstado]?.label ?? nuevoEstado}"`);
      onChanged();
    } catch (err) {
      notify.fromError(err, 'No se pudo cambiar el estado');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, maxWidth: 420 }}>
        <ModalHeader title="Cambiar estado" subtitle={`${ot.numeroOt} · ${ot.clienteNombre}`} onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '10px 14px', background: T.surface2, borderRadius: 8 }}>
              <div style={{ fontSize: '.8rem', color: T.text3, marginBottom: 4 }}>OT</div>
              <div style={{ fontSize: '.9rem', fontWeight: 600, color: T.text }}>{ot.numeroOt}</div>
              <div style={{ fontSize: '.8rem', color: T.text2, marginTop: 2 }}>{ot.clienteNombre} · {ot.equipoNombre}</div>
              <div style={{ marginTop: 8 }}>
                <EstadoBadge estado={ot.estado} />
              </div>
            </div>

            {transiciones.length === 0 ? (
              <div style={{ padding: '12px 14px', background: T.surface2, borderRadius: 8, fontSize: '.84rem', color: T.text2 }}>
                Esta OT está en un estado terminal y no puede cambiar de estado.
              </div>
            ) : (
              <>
                <FieldRow label="Nuevo estado">
                  <select style={fieldStyle} value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
                    {transiciones.map(est => (
                      <option key={est} value={est}>{ESTADOS_CONFIG[est]?.label ?? est}</option>
                    ))}
                  </select>
                </FieldRow>

                <FieldRow label="Observación">
                  <textarea
                    style={{ ...fieldStyle, minHeight: 64, resize: 'vertical' }}
                    value={observacion}
                    onChange={e => setObservacion(e.target.value)}
                    placeholder="Notas sobre el cambio de estado (opcional)…"
                  />
                </FieldRow>
              </>
            )}
          </div>

          {transiciones.length > 0 && (
            <ModalFooter onClose={onClose} saving={saving} submitLabel="Cambiar estado" />
          )}
          {transiciones.length === 0 && (
            <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" style={btnSecondary} onClick={onClose}>Cerrar</button>
            </div>
          )}
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Sub-componentes reutilizables ─────────────────────────────────────────────

function FieldRow({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: '.76rem', color: T.bad }}>{error}</span>}
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px 16px', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: T.primarySoft, display: 'grid', placeItems: 'center', color: T.primary, flexShrink: 0 }}>
        <IcoWrench />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{title}</h2>
        {subtitle && <div style={{ fontSize: '.78rem', color: T.text3, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <button type="button" onClick={onClose} style={btnIcon}><IcoX /></button>
    </div>
  );
}

function ModalFooter({ onClose, saving, submitLabel }: { onClose: () => void; saving: boolean; submitLabel: string }) {
  return (
    <div style={{ padding: '14px 24px 20px', borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
      <button type="button" style={btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
      <button type="submit" style={{ ...btnPrimary, opacity: saving ? .6 : 1 }} disabled={saving}>
        {saving ? 'Guardando…' : submitLabel}
      </button>
    </div>
  );
}

// ── Estilos comunes ───────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)',
  backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};

const modalStyle: React.CSSProperties = {
  width: '100%', maxHeight: 'calc(100vh - 40px)',
  display: 'flex', flexDirection: 'column',
  background: T.surface, border: `1px solid ${T.line}`,
  borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden',
};

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 13px', borderRadius: 10,
  border: `1px solid ${T.line}`, background: T.surface, color: T.text,
  fontSize: '.9rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const ghostInput: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 13px', borderRadius: 8,
  border: '1px solid transparent', background: T.surface2, color: T.text,
  fontSize: '.875rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color .15s, box-shadow .15s',
};

const btnPrimary: React.CSSProperties = {
  height: 44, padding: '0 22px', borderRadius: 11, border: 'none', cursor: 'pointer',
  background: T.primary, color: '#fff', fontWeight: 600, fontSize: '.875rem',
  fontFamily: 'inherit', boxShadow: `0 8px 20px -10px ${T.primary}`,
};

const btnSecondary: React.CSSProperties = {
  height: 44, padding: '0 18px', borderRadius: 11, cursor: 'pointer',
  background: T.surface, border: `1px solid ${T.line}`, color: T.text2,
  fontWeight: 500, fontSize: '.875rem', fontFamily: 'inherit',
};

const btnIcon: React.CSSProperties = {
  display: 'grid', placeItems: 'center', width: 30, height: 30,
  borderRadius: 7, border: 'none', cursor: 'pointer',
  background: 'transparent', color: T.text3,
};

// ── Sub-componentes de diseño ─────────────────────────────────────────────────

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3 }}>
      {children}
    </div>
  );
}

function PagBtn({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif',
        fontSize: '.81rem', fontWeight: 600, borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        ...(active
          ? { color: '#fff', background: T.primary, border: `1px solid ${T.primary}` }
          : disabled
            ? { color: T.text3, background: 'transparent', border: `1px solid ${T.line}`, opacity: .5 }
            : { color: T.text2, background: T.surface, border: `1px solid ${T.line}` }),
      }}>
      {children}
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function OrdenesTrabajoPage() {
  const navigate = useNavigate();
  const { isAdmin, puede } = usePermissions();
  const rawRol = useAuthStore((s) => s.user?.rol);
  const isTecnicoServicio = rawRol === 'TECNICO_SERVICIO';

  const canCreate       = isAdmin || puede('CREAR_OT');
  const canEdit         = isAdmin || puede('EDITAR_OT');
  const canCambiarEstado = isAdmin || puede('CAMBIAR_ESTADO_OT');

  // ── Datos de listado ───────────────────────────────────────────────────────
  const [rows, setRows]           = useState<OtResumenDTO[]>([]);
  const [resumen, setResumen]     = useState<OtPageResumenDTO | null>(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 20;

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [search, setSearch]           = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // ── Modales ───────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate]           = useState(false);
  const [editOt, setEditOt]                   = useState<OrdenTrabajoDTO | null>(null);
  const [cambiarEstadoOt, setCambiarEstadoOt] = useState<OtResumenDTO | null>(null);
  const [loadingDetail, setLoadingDetail]     = useState(false);

  // ── Datos para formularios ─────────────────────────────────────────────────
  const [clientes, setClientes]     = useState<ClienteDTO[]>([]);
  const [sucursales, setSucursales] = useState<SucursalDTO[]>([]);
  const [usuarios, setUsuarios]     = useState<UsuarioResumen[]>([]);

  const fetchList = useCallback(async (p: number, estado: string, q: string) => {
    setLoading(true);
    try {
      const res = await ordenTrabajoService.listar({
        page: p, size: PAGE_SIZE,
        estado: estado || undefined,
        search: q || undefined,
      });
      setRows(res.content);
      setResumen(res.resumen);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (err) {
      notify.fromError(err, 'No se pudieron cargar las órdenes de trabajo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(page, filtroEstado, search);
  }, [page, filtroEstado, fetchList]);  // search se aplica con debounce manual

  // Debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      fetchList(0, filtroEstado, search);
    }, 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar datos para formularios al montar
  useEffect(() => {
    if (!canCreate && !canEdit) return;
    Promise.all([
      clienteService.getActivos().catch(() => [] as ClienteDTO[]),
      sucursalService.listar().catch(() => [] as SucursalDTO[]),
      usuarioService.getAll(true).catch(() => [] as Usuario[]),
    ]).then(([c, s, u]) => {
      setClientes(c);
      setSucursales(s);
      setUsuarios((u as Usuario[]).filter(u => u.nombre && u.activo !== false));
    });
  }, [canCreate, canEdit]);

  async function openEdit(id: number) {
    setLoadingDetail(true);
    try {
      const full = await ordenTrabajoService.getById(id);
      setEditOt(full);
    } catch (err) {
      notify.fromError(err, 'No se pudo cargar la orden de trabajo');
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleEstadoChange() {
    setCambiarEstadoOt(null);
    fetchList(page, filtroEstado, search);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="page-header-row">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: T.text, letterSpacing: '-.028em' }}>
            {isTecnicoServicio ? 'Mis órdenes de trabajo' : 'Órdenes de Trabajo'}
          </h1>
          <p style={{ margin: 0, fontSize: '.82rem', color: T.text3, marginTop: 3 }}>Gestión de reparaciones y servicios técnicos</p>
        </div>
        {canCreate && (
          <button className="page-action-btn" onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 20px', height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', background: T.primary, color: '#fff', fontWeight: 600, fontSize: '.875rem', fontFamily: 'inherit' }}>
            <IcoPlus /> Nueva OT
          </button>
        )}
      </div>

      {/* ── Tarjetas resumen ───────────────────────────────────────── */}
      {resumen && (
        <div className="kpi-grid">
          {[
            { label: 'Total OT', value: resumen.total, color: T.primary, sub: 'órdenes registradas' },
            { label: 'Abiertas', value: resumen.abiertas, color: T.cyan, sub: 'pendientes de inicio' },
            { label: 'En proceso', value: resumen.enProceso, color: T.warn, sub: 'en atención activa' },
            { label: 'Cerradas', value: resumen.cerradas, color: T.ok, sub: 'finalizadas' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14,
              padding: '16px 18px', boxShadow: T.shadow,
            }}>
              <MonoLabel>{stat.label}</MonoLabel>
              <div style={{ fontSize: '1.72rem', fontWeight: 700, color: stat.color, lineHeight: 1, margin: '8px 0 4px' }}>{stat.value}</div>
              <div style={{ fontSize: '.75rem', color: T.text3 }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabla (con filtros integrados) ─────────────────────────── */}
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
          <div className="filter-bar">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}>
                <IcoSearch />
              </span>
              <input
                type="text"
                placeholder="Buscar por N° OT, cliente o equipo…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...ghostInput, paddingLeft: 36 }}
                onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <select
              style={{ ...fieldStyle, height: 40, minWidth: 160 }}
              value={filtroEstado}
              onChange={e => { setFiltroEstado(e.target.value); setPage(0); }}
              onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
              onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {(search || filtroEstado) && (
              <button
                style={btnSecondary}
                onClick={() => { setSearch(''); setFiltroEstado(''); setPage(0); }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ background: T.surface3, borderBottom: `1px solid ${T.line}` }}>
                {['N° OT', 'Cliente / Equipo', 'Técnico / Sucursal', 'Prioridad', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{
                    padding: '11px 14px', textAlign: 'left',
                    fontSize: '.72rem', fontWeight: 650, color: T.text3,
                    textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: T.text3, fontSize: '.875rem' }}>Cargando…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: T.surface2, display: 'grid', placeItems: 'center', color: T.text3 }}>
                        <IcoWrench />
                      </div>
                      <div style={{ fontWeight: 700, color: T.text }}>
                        {search || filtroEstado ? 'Sin resultados para los filtros aplicados' : 'No hay órdenes de trabajo'}
                      </div>
                      <div style={{ fontSize: '.82rem', color: T.text3 }}>
                        {!search && !filtroEstado && canCreate ? 'Crea la primera orden de trabajo para comenzar.' : ''}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && rows.map((ot, idx) => (
                <tr
                  key={ot.id}
                  style={{
                    borderBottom: idx < rows.length - 1 ? `1px solid ${T.lineSoft}` : undefined,
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, color: T.primary, fontSize: '.82rem' }}>
                      {ot.numeroOt}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: T.text, fontSize: '.875rem' }}>{ot.clienteNombre}</div>
                    <div style={{ fontSize: '.78rem', color: T.text3, marginTop: 2 }}>{ot.equipoNombre}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '.82rem', color: T.text2 }}>{ot.tecnicoNombre ?? <span style={{ color: T.text3 }}>Sin asignar</span>}</div>
                    {ot.sucursalNombre && <div style={{ fontSize: '.78rem', color: T.text3, marginTop: 2 }}>{ot.sucursalNombre}</div>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <PrioridadBadge prioridad={ot.prioridad} />
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <EstadoBadge estado={ot.estado} />
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontSize: '.8rem', color: T.text3 }}>
                    {fmtFecha(ot.createdAt)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <ActionBtn title="Ver detalle" onClick={() => navigate(`/dashboard/ordenes-trabajo/${ot.id}`)} hoverBg={T.surface2}>
                        <IcoEye />
                      </ActionBtn>
                      {canEdit && (
                        <ActionBtn title="Editar" onClick={() => openEdit(ot.id)} loading={loadingDetail} hoverBg={T.primarySoft} hoverColor={T.primary}>
                          <IcoEdit />
                        </ActionBtn>
                      )}
                      {canCambiarEstado && TRANSICIONES[ot.estado]?.length > 0 && (
                        <ActionBtn title="Cambiar estado" onClick={() => setCambiarEstadoOt(ot)} hoverBg={T.warnSoft} hoverColor={T.warn}>
                          <IcoSwap />
                        </ActionBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderTop: `1px solid ${T.line}`,
            flexWrap: 'wrap', gap: 8,
          }}>
            <span style={{ fontSize: '.8rem', color: T.text3 }}>
              {totalElements} resultado{totalElements !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <PagBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}><IcoChevL /></PagBtn>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(i => Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1)
                .reduce<(number | '…')[]>((acc, i, idx, arr) => {
                  if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(i);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === '…'
                    ? <span key={`e${i}`} style={{ padding: '0 4px', fontSize: '.82rem', color: T.text3, lineHeight: '32px' }}>…</span>
                    : <PagBtn key={item} active={item === page} onClick={() => setPage(item as number)}>{(item as number) + 1}</PagBtn>
                )}
              <PagBtn disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><IcoChevR /></PagBtn>
            </div>
          </div>
        )}
      </div>

      {/* ── Modales ────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateModal
          clientes={clientes}
          sucursales={sucursales}
          usuarios={usuarios}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setPage(0); fetchList(0, filtroEstado, search); }}
        />
      )}

      {editOt && (
        <EditModal
          ot={editOt}
          onClose={() => setEditOt(null)}
          onUpdated={() => { setEditOt(null); fetchList(page, filtroEstado, search); }}
        />
      )}

      {cambiarEstadoOt && (
        <CambiarEstadoModal
          ot={cambiarEstadoOt}
          onClose={() => setCambiarEstadoOt(null)}
          onChanged={handleEstadoChange}
        />
      )}
    </div>
  );
}

// ── Botón de acción en tabla ──────────────────────────────────────────────────

function ActionBtn({
  children, title, onClick, loading = false, hoverBg = T.surface2, hoverColor,
}: { children: React.ReactNode; title: string; onClick: () => void; loading?: boolean; hoverBg?: string; hoverColor?: string }) {
  return (
    <button
      type="button"
      title={title}
      disabled={loading}
      onClick={onClick}
      style={{
        display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 7,
        border: 0, background: 'transparent', cursor: loading ? 'wait' : 'pointer',
        color: T.text2, transition: 'background .12s, color .12s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
        if (hoverColor) (e.currentTarget as HTMLButtonElement).style.color = hoverColor;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = T.text2;
      }}
    >
      {children}
    </button>
  );
}
