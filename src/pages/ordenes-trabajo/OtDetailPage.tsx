import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { notify } from '../../lib/notify';
import {
  ordenTrabajoService,
  type OrdenTrabajoDTO,
  type OtConsumoMaterialDTO,
  type RegistrarConsumoOtRequestDTO,
  type RegistrarDevolucionOtRequestDTO,
  type RegistrarClasificacionOtRequestDTO,
  type ActualizarOtRequestDTO,
  type ActualizarEstadoOtRequestDTO,
  type CierreTecnicoOtRequestDTO,
  type FacturarOtRequestDTO,
  type EntregarOtRequestDTO,
} from '../../services/ordenTrabajo.service';
import { productoService } from '../../services/producto.service';
import { productoPresentacionService } from '../../services/productoPresentacion.service';
import { usuarioService } from '../../services/usuario.service';
import { useAuthStore } from '../../store/authStore';
import { useBreadcrumbStore } from '../../store/breadcrumbStore';
import type { ProductoDTO, ProductoPresentacionDTO, Usuario } from '../../types';

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IcoBack    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IcoWrench  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IcoEdit    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
const IcoSwap    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>;
const IcoPlus    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
const IcoX       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IcoBox     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const IcoSearch  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
const IcoUndo    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>;
const IcoTag     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l7.3-7.3a1 1 0 0 0 0-1.42Z"/><path d="M7 7h.01"/></svg>;
const IcoChev    = ({ open }: { open?: boolean }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .15s', transform: open ? 'rotate(90deg)' : 'none' }}><path d="m9 18 6-6-6-6"/></svg>;
const IcoReceipt  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>;
const IcoTruck    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>;
const IcoCheck    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const IcoBan      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>;

// ── Estado/prioridad configs ───────────────────────────────────────────────────
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

const TRANSICIONES: Record<string, string[]> = {
  ABIERTA:            ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO:         ['DIAGNOSTICADA', 'PENDIENTE_REPUESTO', 'CERRADA_TECN', 'CANCELADA'],
  DIAGNOSTICADA:      ['EN_PROCESO', 'PENDIENTE_REPUESTO', 'CERRADA_TECN', 'CANCELADA'],
  PENDIENTE_REPUESTO: ['EN_PROCESO', 'DIAGNOSTICADA', 'CERRADA_TECN', 'CANCELADA'],
  // FACTURADA se alcanza solo via POST /{id}/facturar; ENTREGADA tendrá su propio flujo.
  CERRADA_TECN:       ['CANCELADA'],
  FACTURADA:          [],
  ENTREGADA:          [],
  CANCELADA:          [],
};

const ESTADOS_CON_CONSUMO = new Set(['ABIERTA', 'EN_PROCESO', 'DIAGNOSTICADA', 'PENDIENTE_REPUESTO']);

const CLASIF_CONFIG = {
  INSTALADO:   { label: 'Instalado',   bg: T.okSoft,     color: T.ok },
  RECUPERABLE: { label: 'Recuperable', bg: T.cyanSoft,   color: T.cyan },
  DAÑADO:      { label: 'Dañado',      bg: T.warnSoft,   color: T.warn },
  PERDIDO:     { label: 'Perdido',     bg: T.badSoft,    color: T.bad },
} as const;

function ClasifBadge({ value }: { value: string }) {
  const cfg = CLASIF_CONFIG[value as keyof typeof CLASIF_CONFIG] ?? { label: value, bg: T.surface2, color: T.text3 };
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 999, fontSize: '.72rem', fontWeight: 600, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

// ── Formato helpers ───────────────────────────────────────────────────────────
function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function fmtMonto(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);
}

// ── Shared style primitives ───────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)',
  backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};

const modalStyle: React.CSSProperties = {
  width: '100%', maxWidth: 520, maxHeight: 'calc(100vh - 40px)',
  display: 'flex', flexDirection: 'column',
  background: T.surface, border: `1px solid ${T.line}`,
  borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden',
};

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 13px', borderRadius: 10,
  border: `1px solid ${T.line}`, background: T.surface, color: T.text,
  fontSize: '.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
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

// ── Badge components ──────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADOS_CONFIG[estado] ?? { label: estado, bg: T.surface2, color: T.text3 };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 9px', borderRadius: 999,
      fontSize: '.75rem', fontWeight: 600, background: cfg.bg, color: cfg.color,
      whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
}

function PrioridadBadge({ prioridad }: { prioridad: string }) {
  const cfg = PRIORIDADES_CONFIG[prioridad] ?? { label: prioridad, bg: T.surface2, color: T.text3 };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 9px', borderRadius: 999,
      fontSize: '.75rem', fontWeight: 600, background: cfg.bg, color: cfg.color,
    }}>{cfg.label}</span>
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────────────
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, alignItems: 'start', padding: '8px 0', borderBottom: `1px solid ${T.lineSoft}` }}>
      <span style={{ fontSize: '.8rem', fontWeight: 600, color: T.text3, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: '.875rem', color: T.text, lineHeight: 1.4 }}>{children || '—'}</span>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '.72rem', fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

// ── ModalHeader / Footer ──────────────────────────────────────────────────────
function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px 16px', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: T.primarySoft, display: 'grid', placeItems: 'center', color: T.primary, flexShrink: 0 }}>
        <IcoWrench />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: T.text }}>{title}</h2>
        {subtitle && <div style={{ fontSize: '.78rem', color: T.text3, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <button type="button" onClick={onClose} style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'transparent', color: T.text3 }}>
        <IcoX />
      </button>
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

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: '.76rem', color: T.bad }}>{error}</span>}
    </div>
  );
}

// ── Modal Cambiar Estado ──────────────────────────────────────────────────────
function CambiarEstadoModal({ ot, onClose, onChanged }: {
  ot: OrdenTrabajoDTO;
  onClose: () => void;
  onChanged: (updated: OrdenTrabajoDTO) => void;
}) {
  const opciones = TRANSICIONES[ot.estado] ?? [];
  const [estado, setEstado]       = useState(opciones[0] ?? '');
  const [observacion, setObs]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!estado) { setErr('Seleccioná un estado'); return; }
    setSaving(true);
    try {
      const dto: ActualizarEstadoOtRequestDTO = { estado, observacion: observacion || undefined };
      const updated = await ordenTrabajoService.cambiarEstado(ot.id, dto);
      onChanged(updated);
      notify.success('Estado actualizado');
    } catch (e) {
      notify.fromError(e, 'No se pudo cambiar el estado');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <form style={{ ...modalStyle, maxWidth: 440 }} onSubmit={handleSubmit}>
        <ModalHeader title="Cambiar estado" subtitle={ot.numeroOt} onClose={onClose} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {opciones.length === 0 ? (
            <p style={{ color: T.text2, fontSize: '.875rem' }}>Esta OT no tiene transiciones disponibles.</p>
          ) : (
            <>
              <FormField label="Nuevo estado" error={err}>
                <select value={estado} onChange={e => { setEstado(e.target.value); setErr(''); }}
                  style={{ ...fieldStyle }}>
                  {opciones.map(s => (
                    <option key={s} value={s}>{ESTADOS_CONFIG[s]?.label ?? s}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Observación (opcional)">
                <textarea value={observacion} onChange={e => setObs(e.target.value)} rows={3}
                  placeholder="Notas sobre el cambio de estado…"
                  style={{ ...fieldStyle, height: 'auto', padding: '10px 13px', resize: 'vertical' }} />
              </FormField>
            </>
          )}
        </div>
        {opciones.length > 0 && <ModalFooter onClose={onClose} saving={saving} submitLabel="Cambiar estado" />}
      </form>
    </div>,
    document.body
  );
}

// ── Modal Editar OT ───────────────────────────────────────────────────────────
function EditarOtModal({ ot, onClose, onUpdated }: {
  ot: OrdenTrabajoDTO;
  onClose: () => void;
  onUpdated: (updated: OrdenTrabajoDTO) => void;
}) {
  const [form, setForm] = useState<ActualizarOtRequestDTO>({
    prioridad: ot.prioridad,
    descripcionProblema: ot.descripcionProblema,
    diagnostico: ot.diagnostico ?? '',
    trabajoRealizado: ot.trabajoRealizado ?? '',
    observaciones: ot.observaciones ?? '',
  });
  const [saving, setSaving] = useState(false);

  const setF = (k: keyof ActualizarOtRequestDTO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await ordenTrabajoService.actualizar(ot.id, {
        prioridad: form.prioridad,
        descripcionProblema: form.descripcionProblema || undefined,
        diagnostico: form.diagnostico || undefined,
        trabajoRealizado: form.trabajoRealizado || undefined,
        observaciones: form.observaciones || undefined,
      });
      onUpdated(updated);
      notify.success('Orden de trabajo actualizada');
    } catch (err) {
      notify.fromError(err, 'No se pudo actualizar la orden de trabajo');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <form style={{ ...modalStyle, maxWidth: 560 }} onSubmit={handleSubmit}>
        <ModalHeader title="Editar OT" subtitle={ot.numeroOt} onClose={onClose} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
          <FormField label="Prioridad">
            <select value={form.prioridad} onChange={setF('prioridad')} style={fieldStyle}>
              {['BAJA', 'NORMAL', 'ALTA', 'URGENTE'].map(p => (
                <option key={p} value={p}>{PRIORIDADES_CONFIG[p]?.label ?? p}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Descripción del problema">
            <textarea value={form.descripcionProblema} onChange={setF('descripcionProblema')} rows={3}
              style={{ ...fieldStyle, height: 'auto', padding: '10px 13px', resize: 'vertical' }} />
          </FormField>
          <FormField label="Diagnóstico">
            <textarea value={form.diagnostico} onChange={setF('diagnostico')} rows={3}
              placeholder="Diagnóstico técnico…"
              style={{ ...fieldStyle, height: 'auto', padding: '10px 13px', resize: 'vertical' }} />
          </FormField>
          <FormField label="Trabajo realizado">
            <textarea value={form.trabajoRealizado} onChange={setF('trabajoRealizado')} rows={3}
              placeholder="Descripción del trabajo realizado…"
              style={{ ...fieldStyle, height: 'auto', padding: '10px 13px', resize: 'vertical' }} />
          </FormField>
          <FormField label="Observaciones">
            <textarea value={form.observaciones} onChange={setF('observaciones')} rows={2}
              placeholder="Observaciones adicionales…"
              style={{ ...fieldStyle, height: 'auto', padding: '10px 13px', resize: 'vertical' }} />
          </FormField>
        </div>
        <ModalFooter onClose={onClose} saving={saving} submitLabel="Guardar cambios" />
      </form>
    </div>,
    document.body
  );
}

// ── Modal Registrar Consumo ───────────────────────────────────────────────────
function RegistrarConsumoModal({ otId, sucursalId, onClose, onRegistered }: {
  otId: number;
  sucursalId: number | null;
  onClose: () => void;
  onRegistered: (c: OtConsumoMaterialDTO) => void;
}) {
  const [query, setQuery]                           = useState('');
  const [allProductos, setAllProductos]             = useState<ProductoDTO[]>([]);
  const [loadingProductos, setLoadingProductos]     = useState(true);
  const [dropdownOpen, setDropdownOpen]             = useState(false);
  const [selectedProducto, setSelectedProducto]     = useState<ProductoDTO | null>(null);
  const [presentaciones, setPresentaciones]         = useState<ProductoPresentacionDTO[]>([]);
  const [presentacionId, setPresentacionId]         = useState<number | ''>('');
  const [cantidad, setCantidad]                     = useState('1');
  const [precio, setPrecio]                         = useState('');
  const [precioModificado, setPrecioModificado]     = useState(false);
  const [notas, setNotas]                           = useState('');
  const [saving, setSaving]                         = useState(false);
  const [errs, setErrs]                             = useState<Record<string, string>>({});
  const [segmento, setSegmento]                     = useState<'TODOS' | 'MATERIALES' | 'SERVICIOS'>('TODOS');

  // Carga todos los productos de la sucursal al abrir el modal.
  // GET /productos?sucursalId= devuelve stockActual por sucursal + stockVigente FEFO.
  // Nota: GET /productos/buscar no soporta sucursalId; filtrado por nombre en memoria.
  useEffect(() => {
    setLoadingProductos(true);
    productoService.getAll(sucursalId ?? undefined)
      .then(ps => setAllProductos(ps.filter(p => p.activo !== false)))
      .catch(err => notify.fromError(err, 'Error cargando productos'))
      .finally(() => setLoadingProductos(false));
  }, [sucursalId]);

  // Filtro en memoria: nombre o código de barras, mínimo 2 caracteres + segmento activo
  const productosFiltrados: ProductoDTO[] = query.length >= 2
    ? allProductos.filter(p => {
        const q = query.toLowerCase();
        const matchQuery = p.nombre.toLowerCase().includes(q) || (p.codigoBarras ?? '').toLowerCase().includes(q);
        const matchSeg = segmento === 'TODOS' || (segmento === 'MATERIALES' ? p.tipo !== 'SERVICIO' : p.tipo === 'SERVICIO');
        return matchQuery && matchSeg;
      })
    : [];

  // Cargar presentaciones al seleccionar producto; auto-fill precio desde presentación principal
  useEffect(() => {
    if (!selectedProducto?.id) { setPresentaciones([]); setPresentacionId(''); return; }
    productoPresentacionService.listar(selectedProducto.id).then(ps => {
      setPresentaciones(ps);
      const principal = ps.find(p => p.esPrincipal) ?? ps[0];
      setPresentacionId(principal?.id ?? '');
      if (principal) setPrecio(principal.precioVenta > 0 ? String(principal.precioVenta) : '');
    }).catch(() => setPresentaciones([]));
  }, [selectedProducto]);

  function seleccionarProducto(p: ProductoDTO) {
    setSelectedProducto(p);
    setQuery(p.nombre);
    setDropdownOpen(false);
    setErrs(e => ({ ...e, producto: '' }));
    setPrecio(p.precioVenta > 0 ? String(p.precioVenta) : '');
    setPrecioModificado(false);
  }

  const factorActual = presentaciones.find(p => p.id === Number(presentacionId))?.factor ?? 1;
  const cantNum = parseInt(cantidad) || 0;
  const cantBase = cantNum * factorActual;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrs: Record<string, string> = {};
    if (!selectedProducto) newErrs.producto = 'Seleccioná un producto';
    if (!cantidad || cantNum <= 0) newErrs.cantidad = 'Ingresá una cantidad válida';
    if (precio && parseFloat(precio) < 0) newErrs.precio = 'El precio no puede ser negativo';
    if (selectedProducto && selectedProducto.tipo !== 'SERVICIO') {
      const stock = selectedProducto.stockVigente ?? selectedProducto.stockActual ?? 0;
      if (cantBase > stock) newErrs.cantidad = `Supera el stock disponible (${stock} ${selectedProducto.unidadMedidaNombre ?? 'u.'})`;
    }
    if (Object.keys(newErrs).length) { setErrs(newErrs); return; }

    setSaving(true);
    try {
      const dto: RegistrarConsumoOtRequestDTO = {
        productoId: selectedProducto!.id!,
        presentacionId: presentacionId ? Number(presentacionId) : undefined,
        cantidadPresentacion: cantNum,
        precioUnitario: precio ? parseFloat(precio) : undefined,
        notas: notas || undefined,
      };
      const result = await ordenTrabajoService.registrarConsumo(otId, dto);
      onRegistered(result);
      notify.success('Consumo registrado');
    } catch (err) {
      notify.fromError(err, 'No se pudo registrar el consumo');
    } finally {
      setSaving(false);
    }
  }

  const esServicio = selectedProducto?.tipo === 'SERVICIO';

  function stockEfectivo(p: ProductoDTO): number {
    return p.stockVigente ?? p.stockActual ?? 0;
  }

  function puedeSeleccionar(p: ProductoDTO): boolean {
    return p.tipo === 'SERVICIO' || stockEfectivo(p) > 0;
  }

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <form style={{ ...modalStyle, maxWidth: 480 }} onSubmit={handleSubmit}>
        <ModalHeader title="Registrar consumo" subtitle="Material o servicio utilizado" onClose={onClose} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>

          {/* Búsqueda de material o servicio */}
          <FormField label="Material o servicio" error={errs.producto}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {(['TODOS', 'MATERIALES', 'SERVICIOS'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => { setSegmento(s); if (query.length >= 2) setDropdownOpen(true); }}
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 8,
                    border: `1px solid ${segmento === s ? T.primary : T.line}`,
                    background: segmento === s ? T.primary : T.surface2,
                    color: segmento === s ? '#fff' : T.text2,
                    fontWeight: segmento === s ? 600 : 400,
                    fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {s === 'TODOS' ? 'Todos' : s === 'MATERIALES' ? 'Materiales' : 'Servicios'}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}>
                <IcoSearch />
              </span>
              <input
                type="text"
                placeholder={loadingProductos ? 'Cargando productos…' : 'Buscar por nombre o código…'}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedProducto(null); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                style={{ ...fieldStyle, paddingLeft: 36 }}
                autoFocus
                disabled={loadingProductos}
              />
              {/* Dropdown */}
              {dropdownOpen && !selectedProducto && productosFiltrados.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,.12)', marginTop: 2, maxHeight: 240, overflowY: 'auto',
                }}>
                  {productosFiltrados.map(p => {
                    const esServ = p.tipo === 'SERVICIO';
                    const stock = stockEfectivo(p);
                    const puede = puedeSeleccionar(p);
                    return (
                      <button key={p.id} type="button"
                        onClick={() => puede && seleccionarProducto(p)}
                        disabled={!puede}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 14px', border: 'none',
                          background: puede ? 'none' : T.surface2,
                          cursor: puede ? 'pointer' : 'not-allowed',
                          borderBottom: `1px solid ${T.lineSoft}`,
                          fontFamily: 'inherit', opacity: puede ? 1 : 0.55,
                        }}
                        onMouseEnter={e => { if (puede) e.currentTarget.style.background = T.surface2; }}
                        onMouseLeave={e => { e.currentTarget.style.background = puede ? 'none' : T.surface2; }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '.875rem', fontWeight: 600, color: T.text, flex: 1 }}>{p.nombre}</span>
                          <span style={{
                            fontSize: '.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                            background: esServ ? T.okSoft : T.primarySoft,
                            color: esServ ? T.ok : T.primary,
                          }}>
                            {esServ ? 'Servicio' : 'Material'}
                          </span>
                        </div>
                        <div style={{ fontSize: '.75rem', color: T.text3, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {!esServ && (
                            <>
                              <span style={{ color: stock > 0 ? T.ok : T.bad, fontWeight: 500 }}>
                                {stock > 0 ? `Stock: ${stock}` : 'Sin stock'}
                              </span>
                              {p.unidadMedidaNombre && <span>{p.unidadMedidaNombre}</span>}
                            </>
                          )}
                          {esServ && (
                            <>
                              {p.precioVenta > 0 && (
                                <span style={{ color: T.text2 }}>
                                  {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(p.precioVenta)}
                                </span>
                              )}
                              <span style={{ color: T.ok }}>Sin stock</span>
                            </>
                          )}
                          {p.codigoBarras && <span style={{ marginLeft: 'auto' }}>{p.codigoBarras}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {loadingProductos && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 14px', fontSize: '.82rem', color: T.text3, marginTop: 2 }}>
                  Cargando…
                </div>
              )}
            </div>
          </FormField>

          {/* Info del producto seleccionado */}
          {selectedProducto && (
            <div style={{ background: T.surface2, borderRadius: 10, padding: '10px 14px', fontSize: '.82rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, color: T.text, flex: 1 }}>{selectedProducto.nombre}</span>
                <span style={{
                  fontSize: '.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                  background: esServicio ? T.okSoft : T.primarySoft,
                  color: esServicio ? T.ok : T.primary,
                }}>
                  {esServicio ? 'Servicio' : 'Material'}
                </span>
              </div>
              {selectedProducto.codigoBarras && (
                <div style={{ color: T.text3 }}>
                  Código: <strong style={{ color: T.text2 }}>{selectedProducto.codigoBarras}</strong>
                </div>
              )}
              {!esServicio && (
                <div style={{ color: T.text3 }}>
                  Stock{sucursalId ? ' en sucursal' : ''}: <strong style={{ color: T.text2 }}>{stockEfectivo(selectedProducto)} {selectedProducto.unidadMedidaNombre ?? ''}</strong>
                  {selectedProducto.stockVigente != null && selectedProducto.stockVigente !== selectedProducto.stockActual && (
                    <span style={{ marginLeft: 8, color: T.warn, fontSize: '.72rem' }}>
                      ({selectedProducto.stockActual} total, {selectedProducto.stockVigente} vigentes)
                    </span>
                  )}
                </div>
              )}
              {precio && parseFloat(precio) > 0 && (
                <div style={{ color: T.text3 }}>
                  Precio: <strong style={{ color: T.text2 }}>{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(parseFloat(precio))}</strong>
                </div>
              )}
              {!esServicio && (
                <div style={{ fontSize: '.72rem', color: T.text3, marginTop: 2 }}>
                  Se descontará del inventario{sucursalId ? ' de esta sucursal' : ''}.
                </div>
              )}
              {esServicio && <div style={{ color: T.ok }}>No genera movimiento ni descuento de inventario.</div>}
            </div>
          )}

          {/* Presentación */}
          {presentaciones.length > 0 && (
            <FormField label="Presentación">
              <select value={presentacionId}
                onChange={e => {
                  const newId = Number(e.target.value);
                  setPresentacionId(newId);
                  if (!precioModificado) {
                    const pres = presentaciones.find(p => p.id === newId);
                    if (pres) setPrecio(pres.precioVenta > 0 ? String(pres.precioVenta) : '');
                  }
                }}
                style={fieldStyle}>
                {presentaciones.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.unidadMedidaNombre} ×{p.factor} — {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(p.precioVenta)}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {/* Cantidad */}
          <FormField label="Cantidad" error={errs.cantidad}>
            <input type="number" min="1" step="1" value={cantidad}
              onChange={e => { setCantidad(e.target.value); setErrs(ee => ({ ...ee, cantidad: '' })); }}
              style={fieldStyle} />
            {selectedProducto && cantNum > 0 && factorActual > 1 && (
              <span style={{ fontSize: '.75rem', color: T.text3 }}>
                = {cantBase} {selectedProducto.unidadMedidaNombre ?? 'unidades'} base
              </span>
            )}
          </FormField>

          {/* Precio unitario */}
          <FormField label="Precio unitario" error={errs.precio}>
            <input type="number" min="0" step="0.01" value={precio}
              onChange={e => { setPrecio(e.target.value); setPrecioModificado(true); setErrs(ee => ({ ...ee, precio: '' })); }}
              placeholder="0.00"
              style={fieldStyle} />
          </FormField>

          {/* Notas */}
          <FormField label="Notas (opcional)">
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              placeholder="Descripción del uso o justificación…"
              style={{ ...fieldStyle, height: 'auto', padding: '10px 13px', resize: 'vertical' }} />
          </FormField>
        </div>
        <ModalFooter onClose={onClose} saving={saving} submitLabel="Registrar consumo" />
      </form>
    </div>,
    document.body
  );
}

// ── Modal Devolver Consumo ────────────────────────────────────────────────────
function DevolucionModal({ consumo, otId, onClose, onDone }: {
  consumo: OtConsumoMaterialDTO;
  otId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const disponible = consumo.cantidadBase - (consumo.cantidadDevuelta ?? 0);
  const [cantidad, setCantidad] = useState(String(disponible));
  const [motivo, setMotivo]     = useState('');
  const [saving, setSaving]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cantNum = parseInt(cantidad, 10);
    if (!cantNum || cantNum < 1) { notify.warn('Ingresá una cantidad válida'); return; }
    if (cantNum > disponible) { notify.warn(`Máximo disponible: ${disponible}`); return; }
    setSaving(true);
    try {
      const dto: RegistrarDevolucionOtRequestDTO = { cantidadBase: cantNum, motivo: motivo || undefined };
      await ordenTrabajoService.registrarDevolucion(otId, consumo.id, dto);
      notify.success('Devolución registrada');
      onDone();
    } catch (err) {
      notify.fromError(err, 'No se pudo registrar la devolución');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <form style={{ ...modalStyle, maxWidth: 440 }} onSubmit={handleSubmit}>
        <ModalHeader title="Registrar devolución" subtitle={consumo.productoNombre ?? `Producto #${consumo.productoId}`} onClose={onClose} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: T.surface2, fontSize: '.82rem', color: T.text2 }}>
            Disponible para devolver: <strong style={{ color: T.text }}>{disponible}</strong> unidades base
          </div>
          <FormField label="Cantidad a devolver">
            <input type="number" min="1" max={disponible} step="1" value={cantidad}
              onChange={e => setCantidad(e.target.value)} style={fieldStyle} autoFocus />
          </FormField>
          <FormField label="Motivo (opcional)">
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
              placeholder="Razón de la devolución…"
              style={{ ...fieldStyle, height: 'auto', padding: '10px 13px', resize: 'vertical' }} />
          </FormField>
        </div>
        <ModalFooter onClose={onClose} saving={saving} submitLabel="Registrar devolución" />
      </form>
    </div>,
    document.body
  );
}

// ── Modal Clasificar Consumo ──────────────────────────────────────────────────
function ClasificacionModal({ consumo, otId, onClose, onDone }: {
  consumo: OtConsumoMaterialDTO;
  otId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const disponible = consumo.cantidadBase - (consumo.cantidadDevuelta ?? 0) - (consumo.cantidadClasificada ?? 0);
  const [clasificacion, setClasificacion] = useState<'INSTALADO' | 'RECUPERABLE' | 'DAÑADO' | 'PERDIDO'>('INSTALADO');
  const [cantidad, setCantidad] = useState(String(disponible));
  const [notas, setNotas]       = useState('');
  const [saving, setSaving]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cantNum = parseInt(cantidad, 10);
    if (!cantNum || cantNum < 1) { notify.warn('Ingresá una cantidad válida'); return; }
    if (cantNum > disponible) { notify.warn(`Máximo disponible: ${disponible}`); return; }
    setSaving(true);
    try {
      const dto: RegistrarClasificacionOtRequestDTO = { clasificacion, cantidad: cantNum, notas: notas || undefined };
      await ordenTrabajoService.registrarClasificacion(otId, consumo.id, dto);
      notify.success('Clasificación registrada');
      onDone();
    } catch (err) {
      notify.fromError(err, 'No se pudo registrar la clasificación');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <form style={{ ...modalStyle, maxWidth: 440 }} onSubmit={handleSubmit}>
        <ModalHeader title="Clasificar material" subtitle={consumo.productoNombre ?? `Producto #${consumo.productoId}`} onClose={onClose} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: T.surface2, fontSize: '.82rem', color: T.text2 }}>
            Disponible para clasificar: <strong style={{ color: T.text }}>{disponible}</strong> unidades
          </div>
          <FormField label="Clasificación">
            <select value={clasificacion} onChange={e => setClasificacion(e.target.value as typeof clasificacion)} style={fieldStyle}>
              <option value="INSTALADO">Instalado</option>
              <option value="RECUPERABLE">Recuperable</option>
              <option value="DAÑADO">Dañado</option>
              <option value="PERDIDO">Perdido</option>
            </select>
          </FormField>
          <FormField label="Cantidad">
            <input type="number" min="1" max={disponible} step="1" value={cantidad}
              onChange={e => setCantidad(e.target.value)} style={fieldStyle} />
          </FormField>
          <FormField label="Notas (opcional)">
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              placeholder="Observaciones sobre el material…"
              style={{ ...fieldStyle, height: 'auto', padding: '10px 13px', resize: 'vertical' }} />
          </FormField>
        </div>
        <ModalFooter onClose={onClose} saving={saving} submitLabel="Clasificar" />
      </form>
    </div>,
    document.body
  );
}

// ── Modal Entregar OT ─────────────────────────────────────────────────────────
function EntregarOtModal({ ot, onClose, onDone }: {
  ot: OrdenTrabajoDTO;
  onClose: () => void;
  onDone: (updated: OrdenTrabajoDTO) => void;
}) {
  const [recibidoPor, setRecibidoPor]           = useState('');
  const [documentoReceptor, setDocumento]       = useState('');
  const [conformidadCliente, setConformidad]    = useState<boolean>(true);
  const [observaciones, setObservaciones]       = useState('');
  const [saving, setSaving]                     = useState(false);
  const [errNombre, setErrNombre]               = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recibidoPor.trim()) { setErrNombre('El nombre de quien recibe es obligatorio'); return; }
    setSaving(true);
    try {
      const dto: EntregarOtRequestDTO = {
        recibidoPor: recibidoPor.trim(),
        documentoReceptor: documentoReceptor.trim() || undefined,
        conformidadCliente,
        observaciones: observaciones.trim() || undefined,
      };
      const updated = await ordenTrabajoService.entregar(ot.id, dto);
      notify.success('Entrega registrada correctamente');
      onDone(updated);
    } catch (err) {
      notify.fromError(err, 'Error al registrar la entrega');
      setSaving(false);
    }
  }

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <form style={modalStyle} onSubmit={handleSubmit}>
        <ModalHeader title="Registrar entrega del equipo" subtitle={ot.numeroOt} onClose={onClose} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>

          <FormField label="Recibido por *" error={errNombre}>
            <input
              type="text"
              value={recibidoPor}
              onChange={e => { setRecibidoPor(e.target.value); setErrNombre(''); }}
              placeholder="Nombre completo de quien retira el equipo"
              maxLength={200}
              style={fieldStyle}
              autoFocus
            />
          </FormField>

          <FormField label="Documento de identidad (opcional)">
            <input
              type="text"
              value={documentoReceptor}
              onChange={e => setDocumento(e.target.value)}
              placeholder="DNI, CE u otro documento"
              maxLength={50}
              style={fieldStyle}
            />
          </FormField>

          <FormField label="Conformidad del cliente *">
            <div style={{ display: 'flex', gap: 12 }}>
              {[true, false].map(val => (
                <label key={String(val)} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: '.875rem', color: T.text }}>
                  <input
                    type="radio"
                    name="conformidad"
                    checked={conformidadCliente === val}
                    onChange={() => setConformidad(val)}
                  />
                  {val ? 'Conforme' : 'No conforme'}
                </label>
              ))}
            </div>
          </FormField>

          <FormField label="Observaciones (opcional)">
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Notas sobre la entrega…"
              maxLength={2000}
              style={{ ...fieldStyle, height: 'auto', padding: '10px 13px', resize: 'vertical' }}
            />
          </FormField>
        </div>
        <ModalFooter onClose={onClose} saving={saving} submitLabel="Registrar entrega" />
      </form>
    </div>,
    document.body
  );
}

// ── Modal Anular Facturación OT ──────────────────────────────────────────────
function AnularFacturaOtModal({ ot, onClose, onDone }: {
  ot: OrdenTrabajoDTO;
  onClose: () => void;
  onDone: (updated: OrdenTrabajoDTO) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      const updated = await ordenTrabajoService.anularFactura(ot.id);
      notify.success('Facturación anulada. La OT vuelve a estado CERRADA_TECN.');
      onDone(updated);
    } catch (err) {
      notify.fromError(err, 'No se pudo anular la facturación');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.45)' }}>
      <div style={{ background: T.surface, borderRadius: 14, padding: 28, width: 440, maxWidth: '92vw', boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: T.bad }}>Anular facturación</div>
            <div style={{ fontSize: '.82rem', color: T.text2, marginTop: 4 }}>{ot.numeroOt}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text2, padding: 4, lineHeight: 1 }}><IcoX /></button>
        </div>

        <div style={{ background: T.badSoft, border: `1px solid ${T.bad}`, borderRadius: 9, padding: '12px 14px', marginBottom: 20, fontSize: '.85rem', color: T.bad, lineHeight: 1.55 }}>
          <strong>Esta acción no restaura inventario.</strong>
          <br />
          Los consumos de materiales ya fueron descontados del stock al registrarse. La anulación de la facturación <em>no revierte</em> esos movimientos.
          <br />
          La OT volverá al estado <strong>CERRADA_TECN</strong> y podrá ser refacturada.
        </div>

        {ot.ventaId && (
          <div style={{ fontSize: '.82rem', color: T.text2, marginBottom: 16 }}>
            Venta a anular: <strong style={{ color: T.text }}>#{ot.ventaId}</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface, color: T.text2, cursor: 'pointer', fontSize: '.85rem', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button onClick={handleConfirmar} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${T.bad}`, background: T.bad, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '.85rem', fontFamily: 'inherit', opacity: loading ? .7 : 1 }}>
            {loading ? 'Anulando…' : 'Confirmar anulación'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Modal Facturar OT ─────────────────────────────────────────────────────────
const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'OTRO'];

function FacturarOtModal({ ot, consumos, onClose, onDone }: {
  ot: OrdenTrabajoDTO;
  consumos: OtConsumoMaterialDTO[];
  onClose: () => void;
  onDone: (updated: OrdenTrabajoDTO) => void;
}) {
  const currentUser = useAuthStore(s => s.user);

  const [vendedorId, setVendedorId] = useState<string>(
    currentUser?.usuarioId ? String(currentUser.usuarioId) : ''
  );
  const [metodoPago, setMetodoPago]     = useState('EFECTIVO');
  const [cajaId, setCajaId]             = useState('');
  const [montoManoObra, setMontoManoObra] = useState('0');
  const [usuarios, setUsuarios]         = useState<Usuario[]>([]);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    usuarioService.getAll(true).then(setUsuarios).catch(() => {});
  }, []);

  const materialesFisicos = consumos.filter(c => c.productoTipo !== 'SERVICIO');
  const servicios         = consumos.filter(c => c.productoTipo === 'SERVICIO');

  const totalMateriales = materialesFisicos.reduce((acc, c) => acc + (c.precioUnitario ?? 0) * c.cantidadBase, 0);
  const totalServicios  = servicios.reduce((acc, c) => acc + (c.precioUnitario ?? 0) * c.cantidadBase, 0);

  const manoObraNum = parseFloat(montoManoObra) || 0;
  const totalVenta  = totalMateriales + totalServicios + manoObraNum;

  const isDisabled = saving || !vendedorId || !metodoPago || manoObraNum < 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDisabled) return;
    setSaving(true);
    try {
      const dto: FacturarOtRequestDTO = {
        vendedorId: Number(vendedorId),
        metodoPago,
        cajaId: cajaId ? Number(cajaId) : null,
        montoManoObra: manoObraNum,
      };
      const updated = await ordenTrabajoService.facturar(ot.id, dto);
      notify.success('OT facturada correctamente');
      onDone(updated);
    } catch (err) {
      notify.fromError(err, 'Error al facturar la OT');
      setSaving(false);
    }
  }

  const iS: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 8,
    border: `1px solid ${T.line}`, fontSize: '.83rem',
    fontFamily: 'inherit', background: T.surface, color: T.text,
    outline: 'none', boxSizing: 'border-box',
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
      <div style={{ background: T.surface, borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: T.text }}>Facturar OT</h3>
            <p style={{ margin: '3px 0 0', fontSize: '.8rem', color: T.text3 }}>{ot.numeroOt}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text3, padding: 4 }}><IcoX /></button>
        </div>

        {/* Materiales físicos */}
        {materialesFisicos.length > 0 && (
          <div style={{ marginBottom: 12, border: `1px solid ${T.line}`, borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '7px 12px', background: T.surface2, fontSize: '.72rem', fontWeight: 600, color: T.text3, letterSpacing: '.04em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
              <span>Materiales ({materialesFisicos.length})</span>
              <span style={{ color: T.text2 }}>S/ {totalMateriales.toFixed(2)}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.79rem' }}>
              <thead>
                <tr style={{ background: T.surface3 }}>
                  <th style={{ padding: '5px 12px', textAlign: 'left', color: T.text3, fontWeight: 500 }}>Producto</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', color: T.text3, fontWeight: 500 }}>Cant.</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', color: T.text3, fontWeight: 500 }}>P. Unit.</th>
                  <th style={{ padding: '5px 12px', textAlign: 'right', color: T.text3, fontWeight: 500 }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {materialesFisicos.map(c => {
                  const precio = c.precioUnitario ?? 0;
                  const sub = precio * c.cantidadBase;
                  return (
                    <tr key={c.id} style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                      <td style={{ padding: '5px 12px', color: T.text }}>{c.productoNombre ?? `ID ${c.productoId}`}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: T.text2 }}>{c.cantidadBase}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: T.text2 }}>S/ {precio.toFixed(2)}</td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', color: T.text, fontWeight: 500 }}>S/ {sub.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Servicios */}
        {servicios.length > 0 && (
          <div style={{ marginBottom: 12, border: `1px solid ${T.line}`, borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '7px 12px', background: T.surface2, fontSize: '.72rem', fontWeight: 600, color: T.text3, letterSpacing: '.04em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
              <span>Servicios ({servicios.length})</span>
              <span style={{ color: T.text2 }}>S/ {totalServicios.toFixed(2)}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.79rem' }}>
              <thead>
                <tr style={{ background: T.surface3 }}>
                  <th style={{ padding: '5px 12px', textAlign: 'left', color: T.text3, fontWeight: 500 }}>Servicio</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', color: T.text3, fontWeight: 500 }}>Cant.</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', color: T.text3, fontWeight: 500 }}>P. Unit.</th>
                  <th style={{ padding: '5px 12px', textAlign: 'right', color: T.text3, fontWeight: 500 }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {servicios.map(c => {
                  const precio = c.precioUnitario ?? 0;
                  const sub = precio * c.cantidadBase;
                  return (
                    <tr key={c.id} style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                      <td style={{ padding: '5px 12px', color: T.text }}>{c.productoNombre ?? `ID ${c.productoId}`}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: T.text2 }}>{c.cantidadBase}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: T.text2 }}>S/ {precio.toFixed(2)}</td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', color: T.text, fontWeight: 500 }}>S/ {sub.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 500, color: T.text2, display: 'block', marginBottom: 5 }}>Vendedor *</label>
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} required style={iS}>
              <option value="">Seleccionar vendedor</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre ?? u.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 500, color: T.text2, display: 'block', marginBottom: 5 }}>Método de pago *</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} required style={iS}>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '.8rem', fontWeight: 500, color: T.text2, display: 'block', marginBottom: 5 }}>Caja ID (opcional)</label>
              <input type="number" value={cajaId} onChange={e => setCajaId(e.target.value)} placeholder="Ej: 1" style={iS} min="1" />
            </div>
            <div>
              <label style={{ fontSize: '.8rem', fontWeight: 500, color: T.text2, display: 'block', marginBottom: 5 }}>Mano de obra (S/)</label>
              <input
                type="number"
                value={montoManoObra}
                onChange={e => setMontoManoObra(e.target.value)}
                min="0"
                step="0.01"
                style={iS}
              />
            </div>
          </div>

          {/* Total */}
          <div style={{ background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 9, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '.82rem', color: T.text2 }}>
              {materialesFisicos.length > 0 && <div>Materiales: <b>S/ {totalMateriales.toFixed(2)}</b></div>}
              {servicios.length > 0 && <div>Servicios: <b>S/ {totalServicios.toFixed(2)}</b></div>}
              <div>Mano de obra: <b>S/ {manoObraNum.toFixed(2)}</b></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '.72rem', color: T.text3 }}>Total a facturar</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: T.primary }}>S/ {totalVenta.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ padding: '0 20px', height: 38, borderRadius: 9, border: `1px solid ${T.line}`, background: T.surface, color: T.text2, fontWeight: 500, fontSize: '.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            {(() => {
              const dis = isDisabled;
              return (
                <button type="submit" disabled={dis}
                  style={{ padding: '0 20px', height: 38, borderRadius: 9, border: 'none', background: dis ? T.line : T.primary, color: dis ? T.text3 : '#fff', fontWeight: 600, fontSize: '.82rem', cursor: dis ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1 }}>
                  {saving ? 'Facturando…' : 'Confirmar facturación'}
                </button>
              );
            })()}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Modal Cierre Técnico ──────────────────────────────────────────────────────
function CierreTecnicoModal({ ot, consumos, onClose, onDone }: {
  ot: OrdenTrabajoDTO;
  consumos: OtConsumoMaterialDTO[];
  onClose: () => void;
  onDone: (updated: OrdenTrabajoDTO) => void;
}) {
  const [diagnosticoFinal, setDiagnosticoFinal] = useState('');
  const [solucionAplicada, setSolucionAplicada] = useState('');
  const [observaciones, setObservaciones]       = useState('');
  const [saving, setSaving]                     = useState(false);

  const pendientes = consumos.filter(c => {
    if (c.productoTipo === 'SERVICIO') return false;
    const devuelta    = c.cantidadDevuelta    ?? 0;
    const clasificada = c.cantidadClasificada ?? 0;
    const pendiente   = c.cantidadBase - devuelta - clasificada;
    return pendiente > 0;
  });

  const hasPendientes = pendientes.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPendientes) return;
    setSaving(true);
    try {
      const dto: CierreTecnicoOtRequestDTO = { diagnosticoFinal, solucionAplicada, observaciones: observaciones || undefined };
      const updated = await ordenTrabajoService.cierreTecnico(ot.id, dto);
      onDone(updated);
      notify.success('OT cerrada técnicamente');
    } catch (err) {
      notify.fromError(err, 'Error al cerrar la OT técnicamente');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={handleSubmit} style={{ background: T.surface, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,.18)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: T.text }}>Cierre técnico — {ot.numeroOt}</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text3, padding: 4 }}><IcoX /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {hasPendientes && (
            <div style={{ background: T.badSoft, border: `1px solid ${T.bad}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontWeight: 600, fontSize: '.82rem', color: T.bad, marginBottom: 8 }}>
                Materiales sin regularizar ({pendientes.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pendientes.map(c => {
                  const devuelta    = c.cantidadDevuelta    ?? 0;
                  const clasificada = c.cantidadClasificada ?? 0;
                  const pend        = c.cantidadBase - devuelta - clasificada;
                  return (
                    <div key={c.id} style={{ fontSize: '.8rem', color: T.bad }}>
                      · {c.productoNombre} — {pend} unid. pendiente{pend > 1 ? 's' : ''}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: '.79rem', color: T.bad }}>
                Regulariza todos los consumos físicos antes de cerrar la OT.
              </div>
            </div>
          )}

          <FormField label="Diagnóstico final *">
            <textarea
              required
              rows={3}
              value={diagnosticoFinal}
              onChange={e => setDiagnosticoFinal(e.target.value)}
              placeholder="Describe el diagnóstico final del equipo…"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${T.line}`, borderRadius: 8, fontSize: '.875rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </FormField>

          <FormField label="Solución aplicada *">
            <textarea
              required
              rows={3}
              value={solucionAplicada}
              onChange={e => setSolucionAplicada(e.target.value)}
              placeholder="Describe el trabajo realizado y la solución aplicada…"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${T.line}`, borderRadius: 8, fontSize: '.875rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </FormField>

          <FormField label="Observaciones (opcional)">
            <textarea
              rows={2}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Observaciones adicionales…"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${T.line}`, borderRadius: 8, fontSize: '.875rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </FormField>
        </div>

        <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${T.line}` }}>
          <button type="button" onClick={onClose} style={{ padding: '0 18px', height: 38, borderRadius: 9, border: `1px solid ${T.line}`, background: T.surface, color: T.text2, fontWeight: 500, fontSize: '.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          {(() => {
            const isDisabled = saving || hasPendientes || !diagnosticoFinal.trim() || !solucionAplicada.trim();
            return (
              <button
                type="submit"
                disabled={isDisabled}
                style={{ padding: '0 20px', height: 38, borderRadius: 9, border: 'none', background: isDisabled ? T.line : T.ok, color: isDisabled ? T.text3 : '#fff', fontWeight: 600, fontSize: '.82rem', cursor: isDisabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1 }}
              >
                {saving ? 'Cerrando…' : 'Confirmar cierre técnico'}
              </button>
            );
          })()}
        </div>
      </form>
    </div>,
    document.body
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function OtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, puede } = usePermissions();

  const otId = Number(id);

  const canEdit           = isAdmin || puede('EDITAR_OT');
  const canCambiarEstado  = isAdmin || puede('CAMBIAR_ESTADO_OT');
  const canConsumo        = isAdmin || puede('REGISTRAR_CONSUMO_OT');
  const canDevolver       = isAdmin || puede('DEVOLVER_CONSUMO_OT');
  const canClasificar     = isAdmin || puede('CLASIFICAR_CONSUMO_OT');
  const canCerrarTecnico  = isAdmin || puede('CERRAR_TECNICO_OT');
  const canFacturar           = isAdmin || puede('FACTURAR_OT');
  const canEntregar           = isAdmin || puede('REGISTRAR_ENTREGA_OT');
  const canAnularFactura      = isAdmin || puede('ANULAR_FACTURA_OT');

  const [ot, setOt]                   = useState<OrdenTrabajoDTO | null>(null);
  const [consumos, setConsumos]       = useState<OtConsumoMaterialDTO[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<'info' | 'consumos' | 'historial'>('info');

  const [showEdit, setShowEdit]             = useState(false);
  const [showEstado, setShowEstado]         = useState(false);
  const [showCierreTecnico, setShowCierreTecnico] = useState(false);
  const [showFacturar, setShowFacturar]             = useState(false);
  const [showEntrega, setShowEntrega]               = useState(false);
  const [showAnularFactura, setShowAnularFactura]   = useState(false);
  const [showConsumo, setShowConsumo]       = useState(false);
  const [devolucionConsumo, setDevolucionConsumo]       = useState<OtConsumoMaterialDTO | null>(null);
  const [clasificacionConsumo, setClasificacionConsumo] = useState<OtConsumoMaterialDTO | null>(null);
  const [expandedConsumoId, setExpandedConsumoId]       = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!otId) return;
    setLoading(true);
    try {
      const [otData, consumosData] = await Promise.all([
        ordenTrabajoService.getById(otId),
        ordenTrabajoService.getConsumos(otId).catch(() => [] as OtConsumoMaterialDTO[]),
      ]);
      setOt(otData);
      setConsumos(consumosData);
    } catch (err) {
      notify.fromError(err, 'No se pudo cargar la orden de trabajo');
    } finally {
      setLoading(false);
    }
  }, [otId]);

  const reloadConsumos = useCallback(async () => {
    try {
      const data = await ordenTrabajoService.getConsumos(otId);
      setConsumos(data);
    } catch (err) {
      notify.fromError(err, 'No se pudo actualizar los consumos');
    }
  }, [otId]);

  useEffect(() => { load(); }, [load]);

  const { set: setBreadcrumb, clear: clearBreadcrumb } = useBreadcrumbStore();
  useEffect(() => {
    if (ot?.numeroOt) setBreadcrumb(ot.numeroOt);
    return () => clearBreadcrumb();
  }, [ot?.numeroOt, setBreadcrumb, clearBreadcrumb]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: T.text3, fontSize: '.9rem' }}>
        Cargando…
      </div>
    );
  }

  if (!ot) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
        <div style={{ color: T.text2, fontWeight: 600 }}>Orden de trabajo no encontrada</div>
        <button style={btnSecondary} onClick={() => navigate('/dashboard/ordenes-trabajo')}>Volver al listado</button>
      </div>
    );
  }

  const puedeConsumo = canConsumo && ESTADOS_CON_CONSUMO.has(ot.estado);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="page-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/ordenes-trabajo')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: `1px solid ${T.line}`, background: T.surface, color: T.text2, fontWeight: 500, fontSize: '.82rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <IcoBack /> Volver
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: T.text, letterSpacing: '-.024em', fontFamily: "'IBM Plex Mono',monospace" }}>
                {ot.numeroOt}
              </h1>
              <EstadoBadge estado={ot.estado} />
              <PrioridadBadge prioridad={ot.prioridad} />
            </div>
            <p style={{ margin: 0, fontSize: '.82rem', color: T.text3, marginTop: 3 }}>
              {ot.clienteNombre} · {ot.equipoNombre}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {canCerrarTecnico && ['EN_PROCESO', 'DIAGNOSTICADA', 'PENDIENTE_REPUESTO'].includes(ot.estado) && (
            <button
              className="page-action-btn"
              onClick={() => setShowCierreTecnico(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 9, border: `1px solid ${T.ok}`, cursor: 'pointer', background: T.okSoft, color: T.ok, fontWeight: 600, fontSize: '.82rem', fontFamily: 'inherit' }}
            >
              <IcoWrench /> Cerrar técnicamente
            </button>
          )}
          {canFacturar && ot.estado === 'CERRADA_TECN' && (
            <button
              className="page-action-btn"
              onClick={() => setShowFacturar(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 9, border: `1px solid ${T.primary}`, cursor: 'pointer', background: T.primarySoft, color: T.primary, fontWeight: 600, fontSize: '.82rem', fontFamily: 'inherit' }}
            >
              <IcoReceipt /> Facturar OT
            </button>
          )}
          {canEntregar && ot.estado === 'FACTURADA' && (
            <button
              className="page-action-btn"
              onClick={() => setShowEntrega(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 9, border: `1px solid ${T.ok}`, cursor: 'pointer', background: T.okSoft, color: T.ok, fontWeight: 600, fontSize: '.82rem', fontFamily: 'inherit' }}
            >
              <IcoTruck /> Registrar entrega
            </button>
          )}
          {canAnularFactura && ot.estado === 'FACTURADA' && (
            <button
              className="page-action-btn"
              onClick={() => setShowAnularFactura(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 9, border: `1px solid ${T.bad}`, cursor: 'pointer', background: T.badSoft, color: T.bad, fontWeight: 600, fontSize: '.82rem', fontFamily: 'inherit' }}
            >
              <IcoBan /> Anular facturación
            </button>
          )}
          {canCambiarEstado && (TRANSICIONES[ot.estado] ?? []).length > 0 && (
            <button
              className="page-action-btn"
              onClick={() => setShowEstado(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 9, border: `1px solid ${T.line}`, cursor: 'pointer', background: T.surface, color: T.text2, fontWeight: 500, fontSize: '.82rem', fontFamily: 'inherit' }}
            >
              <IcoSwap /> Cambiar estado
            </button>
          )}
          {canEdit && (
            <button
              className="page-action-btn"
              onClick={() => setShowEdit(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 18px', height: 38, borderRadius: 9, border: 'none', cursor: 'pointer', background: T.primary, color: '#fff', fontWeight: 600, fontSize: '.82rem', fontFamily: 'inherit' }}
            >
              <IcoEdit /> Editar
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, overflow: 'hidden' }}>

        {/* Tab nav */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, padding: '0 20px' }}>
          {([
            { key: 'info', label: 'Información' },
            { key: 'consumos', label: `Consumos${consumos.length > 0 ? ` (${consumos.length})` : ''}` },
            { key: 'historial', label: `Historial${(ot.historial ?? []).length > 0 ? ` (${(ot.historial ?? []).length})` : ''}` },
          ] as const).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: '14px 18px 13px', fontSize: '.875rem', fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? T.primary : T.text2,
                background: 'none', border: 'none', borderBottom: tab === t.key ? `2px solid ${T.primary}` : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
                transition: 'color .15s, border-color .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '24px 24px 28px' }}>

          {/* ── Tab: Información ─────────────────────────────────── */}
          {tab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
              <div>
                <Section title="Datos generales">
                  <div>
                    <InfoRow label="N° OT">
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, color: T.primary }}>{ot.numeroOt}</span>
                    </InfoRow>
                    <InfoRow label="Estado"><EstadoBadge estado={ot.estado} /></InfoRow>
                    <InfoRow label="Prioridad"><PrioridadBadge prioridad={ot.prioridad} /></InfoRow>
                    <InfoRow label="Fecha apertura">{fmtFecha(ot.createdAt)}</InfoRow>
                    {ot.fechaCierreTecnico && <InfoRow label="Fecha cierre">{fmtFecha(ot.fechaCierreTecnico)}</InfoRow>}
                  </div>
                </Section>
                <div style={{ marginTop: 24 }}>
                  <Section title="Cliente y equipo">
                    <div>
                      <InfoRow label="Cliente">{ot.clienteNombre}</InfoRow>
                      <InfoRow label="Equipo">{ot.equipoNombre}</InfoRow>
                      {ot.equipoTipo && <InfoRow label="Tipo">{ot.equipoTipo}</InfoRow>}
                      {ot.equipoMarca && <InfoRow label="Marca">{ot.equipoMarca}</InfoRow>}
                      {ot.equipoModelo && <InfoRow label="Modelo">{ot.equipoModelo}</InfoRow>}
                      {ot.equipoNumeroSerie && <InfoRow label="N° serie"><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.82rem' }}>{ot.equipoNumeroSerie}</span></InfoRow>}
                    </div>
                  </Section>
                </div>
              </div>

              <div>
                <Section title="Asignación y facturación">
                  <div>
                    <InfoRow label="Técnico">{ot.tecnicoNombre ?? <span style={{ color: T.text3 }}>Sin asignar</span>}</InfoRow>
                    <InfoRow label="Sucursal">{ot.sucursalNombre ?? '—'}</InfoRow>
                    {ot.montoManoObra != null && <InfoRow label="Mano de obra">{fmtMonto(ot.montoManoObra)}</InfoRow>}
                    {ot.totalFacturado != null && <InfoRow label="Total facturado">{fmtMonto(ot.totalFacturado)}</InfoRow>}
                  </div>
                </Section>
                <div style={{ marginTop: 24 }}>
                  <Section title="Descripción del trabajo">
                    <div>
                      <InfoRow label="Problema">
                        <span style={{ whiteSpace: 'pre-wrap' }}>{ot.descripcionProblema}</span>
                      </InfoRow>
                      {ot.diagnostico && <InfoRow label="Diagnóstico"><span style={{ whiteSpace: 'pre-wrap' }}>{ot.diagnostico}</span></InfoRow>}
                      {ot.trabajoRealizado && <InfoRow label="Trabajo realizado"><span style={{ whiteSpace: 'pre-wrap' }}>{ot.trabajoRealizado}</span></InfoRow>}
                      {ot.observaciones && <InfoRow label="Observaciones"><span style={{ whiteSpace: 'pre-wrap' }}>{ot.observaciones}</span></InfoRow>}
                    </div>
                  </Section>
                </div>

                {ot.estado === 'ENTREGADA' && ot.fechaEntrega && (
                  <div style={{ marginTop: 24 }}>
                    <Section title="Datos de entrega">
                      <div style={{ background: T.okSoft, border: `1px solid #b2dece`, borderRadius: 10, padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: T.ok, display: 'flex' }}><IcoCheck /></span>
                        <span style={{ fontSize: '.82rem', fontWeight: 600, color: T.ok }}>Equipo entregado</span>
                      </div>
                      <div>
                        <InfoRow label="Recibido por">{ot.recibidoPor}</InfoRow>
                        {ot.documentoReceptor && <InfoRow label="Documento">{ot.documentoReceptor}</InfoRow>}
                        <InfoRow label="Fecha de entrega">{fmtFecha(ot.fechaEntrega)}</InfoRow>
                        <InfoRow label="Conformidad">
                          {ot.conformidadCliente === true
                            ? <span style={{ color: T.ok, fontWeight: 600 }}>Sí</span>
                            : <span style={{ color: T.bad, fontWeight: 600 }}>No</span>}
                        </InfoRow>
                        {ot.observacionesEntrega && (
                          <InfoRow label="Obs. entrega">
                            <span style={{ whiteSpace: 'pre-wrap' }}>{ot.observacionesEntrega}</span>
                          </InfoRow>
                        )}
                      </div>
                    </Section>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Consumos ────────────────────────────────────── */}
          {tab === 'consumos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontWeight: 600, color: T.text }}>Materiales y servicios consumidos</div>
                  <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 2 }}>
                    {consumos.length === 0 ? 'No se han registrado consumos' : `${consumos.length} registro${consumos.length !== 1 ? 's' : ''}`}
                  </div>
                </div>
                {puedeConsumo && (
                  <button
                    type="button"
                    onClick={() => setShowConsumo(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 38, borderRadius: 9, border: 'none', cursor: 'pointer', background: T.primary, color: '#fff', fontWeight: 600, fontSize: '.82rem', fontFamily: 'inherit' }}
                  >
                    <IcoPlus /> Registrar consumo
                  </button>
                )}
              </div>

              {consumos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: T.surface2, display: 'grid', placeItems: 'center', color: T.text3 }}>
                    <IcoBox />
                  </div>
                  <div style={{ fontWeight: 600, color: T.text }}>Sin consumos registrados</div>
                  {puedeConsumo
                    ? <div style={{ fontSize: '.82rem', color: T.text3 }}>Registrá los materiales utilizados en esta OT.</div>
                    : <div style={{ fontSize: '.82rem', color: T.text3 }}>Los consumos solo se pueden registrar en estados activos.</div>
                  }
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                    <thead>
                      <tr style={{ background: T.surface3, borderBottom: `1px solid ${T.line}` }}>
                        <th style={{ width: 32, padding: '10px 8px' }} />
                        {['Producto', 'Pres.', 'Cant.', 'Base', 'Dev.', 'Clasif.', 'Pend.', 'Precio', 'Registrado por', 'Fecha', ''].map(h => (
                          <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontSize: '.72rem', fontWeight: 650, color: T.text3, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {consumos.flatMap((c) => {
                        const devuelto    = c.cantidadDevuelta ?? 0;
                        const clasificado = c.cantidadClasificada ?? 0;
                        const pendiente   = c.cantidadBase - devuelto - clasificado;
                        const dispDev     = c.cantidadBase - devuelto;
                        const esMaterial  = c.productoTipo !== 'SERVICIO';
                        const isExpanded  = expandedConsumoId === c.id;
                        const hasDetail   = esMaterial && ((c.devoluciones?.length ?? 0) > 0 || (c.clasificaciones?.length ?? 0) > 0);
                        const tdBase: React.CSSProperties = { padding: '10px 10px', fontSize: '.82rem', color: T.text2, borderBottom: `1px solid ${T.lineSoft}` };
                        const rows: React.ReactNode[] = [];

                        rows.push(
                          <tr key={c.id} style={{ background: isExpanded ? T.surface2 : undefined }}>
                            <td style={{ ...tdBase, width: 32, textAlign: 'center' }}>
                              {hasDetail && (
                                <button type="button" onClick={() => setExpandedConsumoId(isExpanded ? null : c.id)}
                                  style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'transparent', color: T.text3, margin: 'auto' }}>
                                  <IcoChev open={isExpanded} />
                                </button>
                              )}
                            </td>
                            <td style={{ ...tdBase, fontWeight: 600, color: T.text }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span>{c.productoNombre ?? `Producto #${c.productoId}`}</span>
                                {c.productoTipo === 'SERVICIO' && (
                                  <span style={{ fontSize: '.7rem', color: T.text3, fontWeight: 400 }}>Servicio</span>
                                )}
                              </div>
                            </td>
                            <td style={tdBase}>{c.presentacionNombre ?? '—'}</td>
                            <td style={{ ...tdBase, fontFamily: "'IBM Plex Mono',monospace", color: T.text }}>{c.cantidadPresentacion}</td>
                            <td style={{ ...tdBase, fontFamily: "'IBM Plex Mono',monospace" }}>{c.cantidadBase}</td>
                            <td style={{ ...tdBase, fontFamily: "'IBM Plex Mono',monospace", color: devuelto > 0 ? T.ok : T.text3 }}>
                              {devuelto > 0 ? devuelto : '—'}
                            </td>
                            <td style={{ ...tdBase, fontFamily: "'IBM Plex Mono',monospace", color: clasificado > 0 ? T.cyan : T.text3 }}>
                              {clasificado > 0 ? clasificado : '—'}
                            </td>
                            <td style={{ ...tdBase, fontFamily: "'IBM Plex Mono',monospace", color: pendiente > 0 ? T.warn : T.text3, fontWeight: pendiente > 0 ? 600 : 400 }}>
                              {pendiente > 0 ? pendiente : '—'}
                            </td>
                            <td style={tdBase}>{c.precioUnitario != null ? fmtMonto(c.precioUnitario) : '—'}</td>
                            <td style={{ ...tdBase, color: T.text3 }}>{c.registradoPorNombre ?? '—'}</td>
                            <td style={{ ...tdBase, whiteSpace: 'nowrap', color: T.text3 }}>{fmtFecha(c.createdAt)}</td>
                            <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 5 }}>
                                {canDevolver && esMaterial && dispDev > 0 && (
                                  <button type="button" onClick={() => setDevolucionConsumo(c)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: `1px solid ${T.line}`, background: T.surface, color: T.text2, fontWeight: 500, fontSize: '.76rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    <IcoUndo /> Devolver
                                  </button>
                                )}
                                {canClasificar && esMaterial && pendiente > 0 && (
                                  <button type="button" onClick={() => setClasificacionConsumo(c)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: `1px solid ${T.primaryLine}`, background: T.primarySoft, color: T.primary, fontWeight: 500, fontSize: '.76rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    <IcoTag /> Clasificar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );

                        if (isExpanded && hasDetail) {
                          rows.push(
                            <tr key={`det-${c.id}`}>
                              <td colSpan={12} style={{ padding: '0 16px 14px 44px', background: T.surface2, borderBottom: `1px solid ${T.lineSoft}` }}>
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                  {(c.devoluciones?.length ?? 0) > 0 && (
                                    <div style={{ minWidth: 220 }}>
                                      <div style={{ fontSize: '.7rem', fontWeight: 700, color: T.ok, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                                        Devoluciones
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {c.devoluciones!.map(d => (
                                          <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: '.78rem', color: T.text2 }}>
                                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: T.ok, fontWeight: 600 }}>+{d.cantidadBase}</span>
                                            <span>{d.registradoPorNombre ?? '—'}</span>
                                            {d.motivo && <span style={{ color: T.text3, fontStyle: 'italic' }}>{d.motivo}</span>}
                                            <span style={{ color: T.text3, fontSize: '.72rem' }}>{fmtFecha(d.createdAt)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {(c.clasificaciones?.length ?? 0) > 0 && (
                                    <div style={{ minWidth: 240 }}>
                                      <div style={{ fontSize: '.7rem', fontWeight: 700, color: T.cyan, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                                        Clasificaciones
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {c.clasificaciones!.map(cl => (
                                          <div key={cl.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: '.78rem', color: T.text2 }}>
                                            <ClasifBadge value={cl.clasificacion} />
                                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{cl.cantidad}</span>
                                            <span>{cl.registradoPorNombre ?? '—'}</span>
                                            {cl.notas && <span style={{ color: T.text3, fontStyle: 'italic' }}>{cl.notas}</span>}
                                            <span style={{ color: T.text3, fontSize: '.72rem' }}>{fmtFecha(cl.createdAt)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return rows;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Historial ───────────────────────────────────── */}
          {tab === 'historial' && (
            <div>
              {(ot.historial ?? []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px', color: T.text3, fontSize: '.875rem' }}>
                  Sin historial de cambios de estado.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
                  {(ot.historial ?? []).map((h, idx) => (
                    <div key={h.id} style={{
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                      padding: '12px 16px', background: T.surface2, borderRadius: 10,
                      border: `1px solid ${T.lineSoft}`,
                    }}>
                      {/* Timeline dot */}
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: idx === 0 ? T.primary : T.line, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {h.estadoAnterior && (
                            <><EstadoBadge estado={h.estadoAnterior} /><span style={{ color: T.text3, fontSize: '.8rem' }}>→</span></>
                          )}
                          <EstadoBadge estado={h.estadoNuevo} />
                        </div>
                        {h.observacion && (
                          <p style={{ margin: '5px 0 0', fontSize: '.8rem', color: T.text2, lineHeight: 1.5 }}>{h.observacion}</p>
                        )}
                      </div>
                      <span style={{ fontSize: '.73rem', color: T.text3, whiteSpace: 'nowrap', marginTop: 3, flexShrink: 0 }}>
                        {fmtFecha(h.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modales ─────────────────────────────────────────────── */}
      {showCierreTecnico && ot && (
        <CierreTecnicoModal
          ot={ot}
          consumos={consumos}
          onClose={() => setShowCierreTecnico(false)}
          onDone={updated => { setOt(updated); setShowCierreTecnico(false); }}
        />
      )}
      {showFacturar && ot && (
        <FacturarOtModal
          ot={ot}
          consumos={consumos}
          onClose={() => setShowFacturar(false)}
          onDone={updated => { setOt(updated); setShowFacturar(false); }}
        />
      )}

      {showAnularFactura && ot && (
        <AnularFacturaOtModal
          ot={ot}
          onClose={() => setShowAnularFactura(false)}
          onDone={updated => { setOt(updated); setShowAnularFactura(false); }}
        />
      )}

      {showEntrega && ot && (
        <EntregarOtModal
          ot={ot}
          onClose={() => setShowEntrega(false)}
          onDone={updated => { setOt(updated); setShowEntrega(false); }}
        />
      )}

      {showEdit && ot && (
        <EditarOtModal
          ot={ot}
          onClose={() => setShowEdit(false)}
          onUpdated={updated => { setOt(updated); setShowEdit(false); }}
        />
      )}

      {showEstado && ot && (
        <CambiarEstadoModal
          ot={ot}
          onClose={() => setShowEstado(false)}
          onChanged={updated => { setOt(updated); setShowEstado(false); }}
        />
      )}

      {showConsumo && ot && (
        <RegistrarConsumoModal
          otId={ot.id}
          sucursalId={ot.sucursalId}
          onClose={() => setShowConsumo(false)}
          onRegistered={c => { setConsumos(prev => [...prev, c]); setShowConsumo(false); }}
        />
      )}

      {devolucionConsumo && ot && (
        <DevolucionModal
          consumo={devolucionConsumo}
          otId={ot.id}
          onClose={() => setDevolucionConsumo(null)}
          onDone={() => { setDevolucionConsumo(null); reloadConsumos(); }}
        />
      )}

      {clasificacionConsumo && ot && (
        <ClasificacionModal
          consumo={clasificacionConsumo}
          otId={ot.id}
          onClose={() => setClasificacionConsumo(null)}
          onDone={() => { setClasificacionConsumo(null); reloadConsumos(); }}
        />
      )}
    </div>
  );
}
