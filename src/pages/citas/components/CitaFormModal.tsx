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

// ── Palette ───────────────────────────────────────────────────────────────────
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
  badSoft:     'var(--color-bad-soft, #fee2e2)',
} as const;

const IcoX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

const inputBase: React.CSSProperties = {
  width: '100%', height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem',
  color: T.text, background: T.surface, border: `1px solid ${T.line}`,
  borderRadius: 10, outline: 'none', padding: '0 14px',
};

const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = T.primary;
  e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`;
};
const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = T.line;
  e.currentTarget.style.boxShadow = 'none';
};

const LabelInput = ({ label, required, children, error }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2, fontFamily: 'Inter,sans-serif' }}>
      {label}{required && <span style={{ color: T.bad, marginLeft: 3 }}>*</span>}
    </label>
    {children}
    {error && <span style={{ fontSize: '.75rem', color: T.bad, fontFamily: 'Inter,sans-serif' }}>{error}</span>}
  </div>
);

interface Props {
  citaInicial:     CitaResumenDTO | null;
  /** ID de la sucursal seleccionada en el encabezado global (fuente de verdad). */
  sucursalActivaId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const TIPOS: { value: TipoCita; label: string }[] = [
  { value: 'CONSULTA',        label: 'Consulta' },
  { value: 'VACUNACION',      label: 'Vacunación' },
  { value: 'DESPARASITACION', label: 'Desparasitación' },
  { value: 'CONTROL',         label: 'Control' },
  { value: 'PELUQUERIA',      label: 'Peluquería' },
  { value: 'OTRO',            label: 'Otro' },
];

function toLocalDatetimeString(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CitaFormModal({ citaInicial, sucursalActivaId, onClose, onSaved }: Props) {
  const esEdicion = citaInicial !== null;
  const { canCreate, canEdit } = usePermissions();
  // Puede seleccionar un profesional si tiene permiso de crear o editar citas
  // (ADMIN, GERENTE, RECEPCIONISTA). VETERINARIO y GROOMER son el profesional, no el selector.
  const puedeElegirProfesional = canCreate('CITAS') || canEdit('CITAS');

  const [clienteId, setClienteId]           = useState<number | ''>(citaInicial?.clienteId ?? '');
  const [mascotaId, setMascotaId]           = useState<number | ''>(citaInicial?.mascotaId ?? '');
  const [usuarioTenantId, setUsuarioTenantId] = useState<number | ''>(citaInicial?.usuarioTenantId ?? '');
  const [fechaInicio, setFechaInicio]       = useState(toLocalDatetimeString(citaInicial?.fechaInicio));
  const [fechaFin, setFechaFin]             = useState(toLocalDatetimeString(citaInicial?.fechaFin));
  const [tipo, setTipo]                     = useState<TipoCita>(citaInicial?.tipo ?? 'CONSULTA');
  const [motivo, setMotivo]                 = useState(citaInicial?.motivo ?? '');
  const [observaciones, setObs]             = useState('');

  const [clientes, setClientes]             = useState<{ id: number; nombre: string }[]>([]);
  const [mascotas, setMascotas]             = useState<{ id: number; nombre: string; especie: string }[]>([]);
  const [profesionales, setProfesionales]   = useState<ProfesionalElegibleDTO[]>([]);
  const [loadingClientes, setLCli]          = useState(false);
  const [loadingMascotas, setLMas]          = useState(false);
  const [loadingProfs, setLProfs]           = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [intento, setIntento]               = useState(false);

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

  // Cargar profesionales cuando cambie el tipo o la sucursal activa
  useEffect(() => {
    if (!puedeElegirProfesional) return;
    setLProfs(true);
    citaService.getProfesionales(sucursalActivaId, tipo)
      .then(data => {
        setProfesionales(data);
        // Si el profesional seleccionado ya no es elegible, limpiar la selección
        if (usuarioTenantId && !data.some(p => p.usuarioTenantId === Number(usuarioTenantId))) {
          setUsuarioTenantId('');
        }
      })
      .catch(err => notify.fromError(err, 'Error al cargar profesionales'))
      .finally(() => setLProfs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, sucursalActivaId, puedeElegirProfesional]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIntento(true);

    if (!clienteId || !mascotaId || !fechaInicio || !fechaFin) {
      notify.error('Completa todos los campos obligatorios');
      return;
    }

    // Backend usa LocalDateTime (TIMESTAMP WITHOUT TIME ZONE) — enviar hora local sin conversión UTC
    const inicio = fechaInicio.length === 16 ? fechaInicio + ':00' : fechaInicio;
    const fin    = fechaFin.length    === 16 ? fechaFin    + ':00' : fechaFin;

    if (new Date(fin) <= new Date(inicio)) {
      notify.error('La fecha/hora fin debe ser posterior a la fecha/hora inicio');
      return;
    }

    setSaving(true);
    try {
      if (esEdicion && citaInicial) {
        await citaService.update(citaInicial.id, {
          fechaInicio: inicio,
          fechaFin: fin,
          tipo,
          motivo: motivo || undefined,
          observaciones: observaciones || undefined,
          sucursalId: sucursalActivaId ?? undefined,
          usuarioTenantId: usuarioTenantId ? Number(usuarioTenantId) : undefined,
        });
        notify.success('Cita actualizada');
      } else {
        await citaService.create({
          clienteId: Number(clienteId),
          mascotaId: Number(mascotaId),
          fechaInicio: inicio,
          fechaFin: fin,
          tipo,
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

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden', fontFamily: 'Inter,sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>
              {esEdicion ? 'Editar cita' : 'Nueva cita'}
            </h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>
              {esEdicion ? 'Actualiza los datos de la cita.' : 'Los campos con * son obligatorios.'}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <IcoX />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px 4px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Cliente — solo en creación */}
          {!esEdicion && (
            <LabelInput label="Cliente" required error={intento && !clienteId ? 'Selecciona un cliente.' : ''}>
              <select
                value={clienteId}
                onChange={e => { setClienteId(e.target.value ? Number(e.target.value) : ''); setMascotaId(''); }}
                disabled={loadingClientes}
                style={{ ...inputBase, appearance: 'none', cursor: 'pointer', paddingRight: 14 }}
                onFocus={focusIn} onBlur={focusOut}
              >
                <option value="">{loadingClientes ? 'Cargando...' : '— Selecciona un cliente —'}</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </LabelInput>
          )}

          {/* Mascota — solo en creación */}
          {!esEdicion && (
            <LabelInput label="Mascota" required error={intento && !mascotaId ? 'Selecciona una mascota.' : ''}>
              <select
                value={mascotaId}
                onChange={e => setMascotaId(e.target.value ? Number(e.target.value) : '')}
                disabled={!clienteId || loadingMascotas}
                style={{ ...inputBase, appearance: 'none', cursor: 'pointer', paddingRight: 14, opacity: (!clienteId || loadingMascotas) ? .6 : 1 }}
                onFocus={focusIn} onBlur={focusOut}
              >
                <option value="">
                  {!clienteId ? 'Selecciona un cliente primero' : loadingMascotas ? 'Cargando...' : '— Selecciona una mascota —'}
                </option>
                {mascotas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.especie})</option>)}
              </select>
            </LabelInput>
          )}

          {/* En edición: resumen del cliente/mascota */}
          {esEdicion && citaInicial && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: T.surface2, fontSize: '.875rem' }}>
              <div style={{ color: T.text3, fontSize: '.78rem', marginBottom: 4 }}>Cliente / Mascota</div>
              <div style={{ fontWeight: 600 }}>{citaInicial.clienteNombre ?? '—'}</div>
              <div style={{ color: T.text3, marginTop: 2 }}>{citaInicial.mascotaNombre} · {citaInicial.mascotaEspecie}</div>
            </div>
          )}

          {/* Profesional — ADMIN, GERENTE y RECEPCIONISTA pueden elegir profesional */}
          {puedeElegirProfesional && (
            <LabelInput label="Profesional">
              <select
                value={usuarioTenantId}
                onChange={e => setUsuarioTenantId(e.target.value ? Number(e.target.value) : '')}
                disabled={loadingProfs}
                style={{ ...inputBase, appearance: 'none', cursor: loadingProfs ? 'not-allowed' : 'pointer', paddingRight: 14, opacity: loadingProfs ? .6 : 1 }}
                onFocus={focusIn} onBlur={focusOut}
              >
                <option value="">
                  {loadingProfs ? 'Cargando profesionales…' : profesionales.length === 0 ? '— Sin profesionales disponibles —' : '— Sin asignar —'}
                </option>
                {profesionales.map(p => (
                  <option key={p.usuarioTenantId} value={p.usuarioTenantId}>{p.nombre} ({p.rolNombre})</option>
                ))}
              </select>
            </LabelInput>
          )}

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <LabelInput label="Inicio" required error={intento && !fechaInicio ? 'Campo requerido.' : ''}>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                style={inputBase}
                onFocus={focusIn} onBlur={focusOut}
              />
            </LabelInput>
            <LabelInput label="Fin" required error={intento && !fechaFin ? 'Campo requerido.' : ''}>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                style={inputBase}
                onFocus={focusIn} onBlur={focusOut}
              />
            </LabelInput>
          </div>

          {/* Tipo */}
          <LabelInput label="Tipo" required>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TipoCita)}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer', paddingRight: 14 }}
              onFocus={focusIn} onBlur={focusOut}
            >
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </LabelInput>

          {/* Motivo */}
          <LabelInput label="Motivo">
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Motivo de la cita (opcional)"
              style={inputBase}
              onFocus={focusIn} onBlur={focusOut}
            />
          </LabelInput>

          {/* Observaciones */}
          <LabelInput label="Observaciones">
            <textarea
              value={observaciones}
              onChange={e => setObs(e.target.value)}
              placeholder="Observaciones adicionales (opcional)"
              rows={2}
              style={{ ...inputBase, height: 'auto', padding: '10px 14px', resize: 'none', lineHeight: 1.5 }}
              onFocus={focusIn} onBlur={focusOut}
            />
          </LabelInput>

          {/* Espaciado antes del footer */}
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
          <button type="submit" form="" onClick={handleSubmit} disabled={saving}
            style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}`, opacity: saving ? .7 : 1 }}>
            {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar cita'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
