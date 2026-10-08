import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { certificadoService } from '../../services/certificado.service';
import { usuarioService } from '../../services/usuario.service';
import type { CertificadoDTO, Usuario } from '../../types';
import { notify } from '../../lib/notify';
import { usePermissions } from '../../hooks/usePermissions';
import { useSucursalStore } from '../../store/sucursalStore';

const T = {
  bg: '#f7f8fa', surface: '#ffffff', surface2: '#f1f3f7', surface3: '#fafbfc',
  line: '#e4e7ec', lineSoft: '#eef0f4',
  text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
  primary: '#3b47ef', primarySoft: '#eef0ff', primaryLine: '#cfd4fd',
  ok: '#0f9d6e', okSoft: '#e7f7f1',
  warn: '#b7791f', warnSoft: '#fdf6e7', warnLine: '#f0dfb4',
  bad: '#d63b3b', badSoft: '#fdeceb',
  shadow: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
} as const;

const IC = {
  award:  ['M12 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z', 'M15.5 13 17 22l-5-3-5 3 1.5-9'],
  alert:  ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z','M12 9v4','M12 17h.01'],
  clock:  ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z','M12 7v5l3 2'],
  ok:     ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z','M8.5 12l2.5 2.5 4.5-5'],
  bell:   ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9','M10.3 21a1.9 1.9 0 0 0 3.4 0'],
  plus:   ['M12 5v14','M5 12h14'],
  pencil: ['M12 20h9','M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  trash:  ['M3 6h18','M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6','M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
  x:      ['M18 6 6 18','m6 6 12 12'],
  check:  ['m5 12 5 5L20 7'],
  chevD:  ['m6 9 6 6 6-6'],
  store:  ['m2 7 1.5-4h17L22 7','M4 7v13h16V7','M2 7h20','M9 20v-6h6v6'],
} as const;

const Ic = ({ paths, size = 16, style }: { paths: readonly string[]; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {paths.map((d, i) => <path key={i} d={d} />)}
  </svg>
);

const ES_CARNET = (tipo: string) => /carnet|sanidad/i.test(tipo ?? '');

const HUES = [262, 200, 160, 25, 330, 45, 290, 180];
const strHash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const avatarStyle = (name: string, size: number): React.CSSProperties => {
  const hue = HUES[strHash(name) % HUES.length];
  return { width: size, height: size, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', fontSize: size * 0.38, fontWeight: 700, color: `oklch(0.45 0.13 ${hue})`, background: `oklch(0.94 0.04 ${hue})` };
};
const initials = (nombre: string, apellido?: string) => {
  const parts = [nombre, apellido].filter(Boolean).join(' ').split(/\s+/);
  return parts.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

const iso = (d: Date) => d.toISOString().split('T')[0];
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
const MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const fmtLarga = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return `${String(d.getDate()).padStart(2,'0')} ${MES[d.getMonth()]} ${d.getFullYear()}`; };

interface FormState {
  id: number | null;
  renovaId: number | null;
  tipo: string;
  desc: string;
  usuarioId: number | null;
  venc: string;
  alerta: string;
  obs: string;
  intento: boolean;
}
const FORM_VACIO: FormState = { id: null, renovaId: null, tipo: '', desc: '', usuarioId: null, venc: '', alerta: '30', obs: '', intento: false };

const FORMA_INPUT: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem',
  color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none',
};

// ── Overlay modal base ───────────────────────────────────────────────────────
const Overlay = ({ onClose, children }: { onClose: () => void; children: React.ReactNode }) =>
  createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'fx-in .2s ease', overflow: 'hidden' }}>
        {children}
      </div>
    </div>,
    document.body,
  );

// ── Modal formulario ─────────────────────────────────────────────────────────
function FormModal({ form, tipos, usuarios, onClose, onSave, saving }: {
  form: FormState;
  tipos: string[];
  usuarios: Usuario[];
  onClose: () => void;
  onSave: (f: FormState) => void;
  saving: boolean;
}) {
  const [f, setF] = useState<FormState>(form);
  const sf = (o: Partial<FormState>) => setF(p => ({ ...p, ...o }));

  const esCarnet = ES_CARNET(f.tipo);
  const al = Math.max(1, Math.min(365, parseInt(f.alerta, 10) || 30));
  const fecha = f.venc ? new Date(f.venc + 'T00:00:00') : null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const aviso = fecha ? addMonths(fecha, 0) : null;
  if (aviso && fecha) aviso.setDate(fecha.getDate() - al);
  const pasado = aviso && aviso <= hoy;
  const diasRest = fecha ? Math.round((fecha.getTime() - hoy.getTime()) / 864e5) : null;

  const titulo = f.renovaId ? 'Renovar certificado' : f.id ? 'Editar certificado' : 'Nuevo certificado';
  const btnLabel = f.renovaId ? 'Guardar renovación' : f.id ? 'Guardar cambios' : 'Registrar';

  const fAvisoMsg = !fecha
    ? 'Elige la fecha de vencimiento para ver cuándo te avisaremos.'
    : pasado
    ? `La alerta ya está activa: faltan ${Math.max(0, diasRest ?? 0)} días para el vencimiento (aviso configurado a ${al} días).`
    : `Te avisaremos el ${fmtLarga(iso(aviso!))}, ${al} días antes del vencimiento.`;

  const avisoBoxStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 14, padding: '11px 13px',
    borderRadius: 11, fontSize: '.8rem', lineHeight: 1.5,
    ...(!fecha ? { color: T.text3, background: T.surface2 }
      : pasado ? { color: T.warn, background: T.warnSoft }
      : { color: T.primary, background: T.primarySoft }),
  };

  const campoStyle = (err: boolean): React.CSSProperties => ({
    ...FORMA_INPUT,
    border: `1px solid ${err ? T.bad : T.line}`,
    ...(err ? { boxShadow: `0 0 0 3px ${T.badSoft}` } : {}),
  });

  const errTipo  = f.intento && !f.tipo;
  const errUsu   = f.intento && esCarnet && !f.usuarioId;
  const errDesc  = f.intento && !esCarnet && !f.desc.trim();
  const errVenc  = f.intento && !f.venc;

  const handleSave = () => {
    const ok = f.tipo && (esCarnet ? f.usuarioId : f.desc.trim()) && f.venc;
    if (!ok) { sf({ intento: true }); return; }
    onSave({ ...f, alerta: String(al) });
  };

  const segStyle = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32,
    padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 600,
    border: 0, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .16s',
    ...(on ? { color: T.text, background: T.surface, boxShadow: `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` }
           : { color: T.text3, background: 'transparent' }),
  });

  return (
    <Overlay onClose={onClose}>
      <style>{`@keyframes fx-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
        <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.primarySoft, color: T.primary }}>
          <Ic paths={IC.award} size={18} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{titulo}</h2>
          <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>Registra la información del documento o certificado</div>
        </div>
        <button onClick={onClose} style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
          <Ic paths={IC.x} size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 22px' }}>
        {/* Tipo */}
        <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
          Tipo de documento <span style={{ color: T.bad }}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <select value={f.tipo} onChange={e => sf({ tipo: e.target.value, usuarioId: ES_CARNET(e.target.value) ? f.usuarioId : null })}
            style={{ ...campoStyle(errTipo), paddingRight: 36, appearance: 'none', cursor: 'pointer', ...(f.tipo ? {} : { color: T.text3 }) }}>
            <option value="" disabled>Selecciona el tipo de documento</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Ic paths={IC.chevD} size={14} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }} />
        </div>
        {errTipo && <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>Selecciona un tipo.</div>}

        {/* Selector de trabajador (carnet) */}
        {esCarnet && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
              Trabajador <span style={{ color: T.bad }}>*</span>
            </label>
            <div style={{ display: 'grid', gap: 6 }}>
              {usuarios.map(u => {
                const on = f.usuarioId === u.id;
                const nombre = `${u.nombre} ${u.apellido ?? ''}`.trim();
                return (
                  <button key={u.id} type="button" onClick={() => sf({ usuarioId: u.id, desc: f.desc || nombre })}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontFamily: 'Inter,sans-serif', borderRadius: 11, cursor: 'pointer', transition: 'all .16s', background: T.surface, border: `1.5px solid ${on ? T.primary : T.line}`, ...(on ? { background: T.primarySoft } : {}) }}>
                    <span style={avatarStyle(nombre, 32)}>{initials(u.nombre, u.apellido)}</span>
                    <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: T.text }}>{nombre}</span>
                      <span style={{ display: 'block', fontSize: '.72rem', color: T.text3, marginTop: 1 }}>{u.rol ?? 'Trabajador'}</span>
                    </span>
                    <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: '50%', boxSizing: 'border-box', background: T.surface, ...(on ? { border: `5px solid ${T.primary}` } : { border: `1.5px solid ${T.line}` }) }} />
                  </button>
                );
              })}
            </div>
            {errUsu && <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>Selecciona el trabajador.</div>}
          </div>
        )}

        {/* Descripción */}
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
            {esCarnet ? 'Descripción ' : 'Descripción '}
            {esCarnet ? <span style={{ fontWeight: 500, color: T.text3 }}>(opcional)</span> : <span style={{ color: T.bad }}>*</span>}
          </label>
          <input type="text" value={f.desc} onChange={e => sf({ desc: e.target.value })}
            placeholder="Notas o identificador del documento" style={campoStyle(errDesc)} />
        </div>

        <div style={{ height: 1, background: T.lineSoft, margin: '22px -22px' }} />

        {/* Fecha + Alerta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
              Fecha de vencimiento <span style={{ color: T.bad }}>*</span>
            </label>
            <input type="date" value={f.venc} onChange={e => sf({ venc: e.target.value })} style={{ ...campoStyle(errVenc), colorScheme: 'light' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
              {([['+6 meses', 6], ['+1 año', 12], ['+2 años', 24]] as [string, number][]).map(([l, m]) => (
                <button key={l} type="button" onClick={() => sf({ venc: iso(addMonths(hoy, m)) })}
                  style={{ height: 26, padding: '0 9px', fontFamily: 'Inter,sans-serif', fontSize: '.72rem', fontWeight: 600, color: T.text2, background: T.surface2, border: 0, borderRadius: 7, cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
              Alertar con anticipación
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 3, padding: 3, background: T.surface2, borderRadius: 10 }}>
              {[15, 30, 60, 90].map(n => (
                <button key={n} type="button" onClick={() => sf({ alerta: String(n) })} style={segStyle(al === n)}>{n} d</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
              <input type="text" inputMode="numeric" value={f.alerta}
                onChange={e => sf({ alerta: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                style={{ width: 64, height: 30, padding: '0 8px', textAlign: 'center', fontFamily: 'Inter,sans-serif', fontSize: '.8rem', fontWeight: 600, color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 7, outline: 'none' }} />
              <span style={{ fontSize: '.74rem', color: T.text3 }}>días (1 a 365)</span>
            </div>
          </div>
        </div>

        {/* Aviso preview */}
        <div style={avisoBoxStyle}>
          <span style={{ display: 'grid', marginTop: 1 }}><Ic paths={IC.bell} size={15} /></span>
          <span>{fAvisoMsg}</span>
        </div>

        {/* Observaciones */}
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
            Observaciones <span style={{ fontWeight: 500, color: T.text3 }}>(opcional)</span>
          </label>
          <textarea rows={2} value={f.obs} onChange={e => sf({ obs: e.target.value })}
            placeholder="Notas adicionales…"
            style={{ width: '100%', padding: '11px 13px', fontFamily: 'Inter,sans-serif', fontSize: '.875rem', lineHeight: 1.5, color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', resize: 'none' }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
        <button onClick={onClose} style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}`, opacity: saving ? .7 : 1 }}>
          {saving ? 'Guardando…' : btnLabel}
        </button>
      </div>
    </Overlay>
  );
}

// ── Modal eliminar ───────────────────────────────────────────────────────────
function DeleteModal({ cert, onClose, onConfirm }: { cert: CertificadoDTO; onClose: () => void; onConfirm: () => void }) {
  const tone = cert.estado === 'VENCIDO' ? T.bad : cert.estado === 'POR_VENCER' ? T.warn : T.ok;
  const toneSoft = cert.estado === 'VENCIDO' ? T.badSoft : cert.estado === 'POR_VENCER' ? T.warnSoft : T.okSoft;
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}` }}>
        <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.badSoft, color: T.bad }}>
          <Ic paths={IC.trash} size={18} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Eliminar certificado</h2>
          <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>Esta acción no se puede deshacer.</div>
        </div>
        <button onClick={onClose} style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
          <Ic paths={IC.x} size={16} />
        </button>
      </div>
      <div style={{ padding: '18px 22px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 12, background: T.surface2 }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: toneSoft, color: tone }}>
            <Ic paths={IC.award} size={17} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '.9rem', fontWeight: 650, lineHeight: 1.35 }}>{cert.descripcion}</div>
            <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 3 }}>{cert.tipo} · vence {fmtLarga(cert.fechaVencimiento)}</div>
          </div>
        </div>
        <p style={{ fontSize: '.84rem', lineHeight: 1.55, color: T.text2, margin: '14px 0 0' }}>Dejarás de recibir alertas de su vencimiento.</p>
      </div>
      <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}` }}>
        <button onClick={onClose} style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Cancelar
        </button>
        <button onClick={onConfirm} style={{ flex: 1, height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.bad, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.bad}` }}>
          Eliminar
        </button>
      </div>
    </Overlay>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export function CertificadosPage() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;
  const sucursalId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;

  const [certificados, setCertificados] = useState<CertificadoDTO[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [seg, setSeg] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const [modalForm, setModalForm] = useState<FormState | null>(null);
  const [modalDel, setModalDel] = useState<CertificadoDTO | null>(null);

  useEffect(() => { if (!sucursalLoaded) return; fetchData(); }, [sucursalLoaded, sucursalId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [certs, tiposData] = await Promise.all([
        certificadoService.listar(sucursalId),
        certificadoService.getTipos(),
      ]);
      setCertificados(certs);
      setTipos(tiposData);
    } catch (err) {
      notify.fromError(err, 'No se pudieron cargar los certificados.');
    } finally {
      setLoading(false);
    }
    try {
      const users = await usuarioService.getAll(true);
      setUsuarios(users);
    } catch { /* sin permiso — carnet selector seguirá vacío */ }
  };

  const abrirNuevo = () => setModalForm({ ...FORM_VACIO });

  const abrirEditar = (c: CertificadoDTO) => setModalForm({
    id: c.id!, renovaId: null,
    tipo: c.tipo, desc: c.descripcion,
    usuarioId: c.usuarioId ?? null,
    venc: c.fechaVencimiento, alerta: String(c.diasAlerta ?? 30),
    obs: c.observaciones ?? '', intento: false,
  });

  const abrirRenovar = (c: CertificadoDTO) => {
    const base = new Date(c.fechaVencimiento + 'T00:00:00');
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const desde = base < hoy ? hoy : base;
    setModalForm({
      id: null, renovaId: c.id!,
      tipo: c.tipo, desc: c.descripcion,
      usuarioId: c.usuarioId ?? null,
      venc: iso(addMonths(desde, 12)), alerta: String(c.diasAlerta ?? 30),
      obs: c.observaciones ?? '', intento: false,
    });
  };

  const handleGuardar = async (f: FormState) => {
    setSaving(true);
    try {
      const dto: CertificadoDTO = {
        tipo: f.tipo, descripcion: f.desc.trim() || f.tipo,
        usuarioId: ES_CARNET(f.tipo) ? (f.usuarioId ?? undefined) : undefined,
        fechaVencimiento: f.venc, diasAlerta: parseInt(f.alerta, 10) || 30,
        observaciones: f.obs.trim() || undefined,
        sucursalId,
      };
      if (f.id) {
        await certificadoService.actualizar(f.id, dto);
        notify.success('Certificado actualizado');
      } else if (f.renovaId) {
        await certificadoService.actualizar(f.renovaId, { ...dto, fechaVencimiento: f.venc });
        notify.success('Certificado renovado');
      } else {
        await certificadoService.crear(dto);
        notify.success('Certificado registrado');
      }
      setModalForm(null);
      fetchData();
    } catch (err) {
      notify.fromError(err, 'No se pudo guardar el certificado.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!modalDel?.id) return;
    try {
      await certificadoService.eliminar(modalDel.id);
      notify.success('Certificado eliminado');
      setModalDel(null);
      fetchData();
    } catch (err) {
      notify.fromError(err, 'No se pudo eliminar el certificado.');
    }
  };

  // ── Filtro ────────────────────────────────────────────────────────────────
  const q = busqueda.trim().toLowerCase();
  const base = certificados.filter(c =>
    !q || c.descripcion.toLowerCase().includes(q) || c.tipo.toLowerCase().includes(q)
      || (c.usuarioNombre ?? '').toLowerCase().includes(q)
  );
  const cnt = (k: string) => base.filter(c => c.estado === k).length;
  const filas = base.filter(c => seg === 'TODOS' || c.estado === seg)
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));

  const tot = {
    VENCIDO: certificados.filter(c => c.estado === 'VENCIDO').length,
    POR_VENCER: certificados.filter(c => c.estado === 'POR_VENCER').length,
    VIGENTE: certificados.filter(c => c.estado === 'VIGENTE').length,
  };

  const vencidos = certificados.filter(c => c.estado === 'VENCIDO').sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: T.text3, fontFamily: 'Inter,sans-serif', fontSize: '.9rem' }}>
      Cargando certificados…
    </div>
  );

  // ── Helpers de tabla ──────────────────────────────────────────────────────
  const toneOf = (estado?: string) => estado === 'VENCIDO' ? T.bad : estado === 'POR_VENCER' ? T.warn : T.ok;
  const toneSoftOf = (estado?: string) => estado === 'VENCIDO' ? T.badSoft : estado === 'POR_VENCER' ? T.warnSoft : T.okSoft;

  const barPct = (c: CertificadoDTO) => {
    if (c.estado === 'VENCIDO') return 100;
    const d = c.diasRestantes ?? 0;
    const al = c.diasAlerta ?? 30;
    if (c.estado === 'POR_VENCER') return Math.max(4, Math.min(95, Math.round((d / Math.max(1, al)) * 90)));
    return Math.max(40, Math.min(100, Math.round(Math.min(d, 365) / 365 * 100)));
  };

  const diasLabel = (c: CertificadoDTO) => {
    const d = c.diasRestantes ?? 0;
    if (d < 0) return `Venció hace ${-d}${d === -1 ? ' día' : ' días'}`;
    if (d === 0) return 'Vence hoy';
    return `Faltan ${d}${d === 1 ? ' día' : ' días'}`;
  };

  const estadoLabel = (e?: string) => e === 'VENCIDO' ? 'Vencido' : e === 'POR_VENCER' ? 'Por vencer' : 'Vigente';

  const segStyle = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 34,
    padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 600,
    border: 0, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .16s',
    ...(on ? { color: T.text, background: T.surface, boxShadow: `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` }
           : { color: T.text3, background: 'transparent' }),
  });

  const KPIS = [
    { k: 'TODOS', label: 'Total', n: certificados.length, pie: 'Documentos registrados', tone: null as string | null, paths: IC.award },
    { k: 'VENCIDO', label: 'Vencidos', n: tot.VENCIDO, pie: 'Renovar cuanto antes', tone: T.bad, paths: IC.alert },
    { k: 'POR_VENCER', label: 'Por vencer', n: tot.POR_VENCER, pie: 'Dentro del plazo de aviso', tone: T.warn, paths: IC.clock },
    { k: 'VIGENTE', label: 'Vigentes', n: tot.VIGENTE, pie: 'Al día', tone: T.ok, paths: IC.ok },
  ];

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', color: T.text }}>
      <style>{`@keyframes fx-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Certificados</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Control de vigencias de documentos del establecimiento</p>
        </div>
        {canCreate('CERTIFICADOS') && (
          <button onClick={abrirNuevo} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}` }}>
            <Ic paths={IC.plus} size={15} /> Nuevo certificado
          </button>
        )}
      </div>

      {/* Banner urgente */}
      {vencidos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: T.badSoft, border: `1px solid ${T.line}` }}>
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 9, background: T.surface, color: T.bad }}>
            <Ic paths={IC.bell} size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: '.88rem', fontWeight: 650 }}>
              {vencidos.length === 1 ? `${vencidos[0].tipo} vencido hace ${Math.abs(vencidos[0].diasRestantes ?? 0)} días` : `${vencidos.length} certificados vencidos`}
            </div>
            <div style={{ fontSize: '.78rem', color: T.text2, marginTop: 2 }}>Un documento vencido puede generar multas o cierre temporal en una inspección.</div>
          </div>
          <button onClick={() => abrirRenovar(vencidos[0])} style={{ height: 36, padding: '0 14px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 650, color: '#fff', background: T.bad, border: 0, borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Renovar ahora
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
        {KPIS.map(({ k, label, n, pie, tone, paths }) => {
          const on = seg === k && k !== 'TODOS';
          const hot = tone && n > 0 && k !== 'VIGENTE';
          return (
            <button key={k} type="button" onClick={() => setSeg(s => s === k ? 'TODOS' : k)}
              style={{ display: 'block', width: '100%', padding: '16px 18px', fontFamily: 'Inter,sans-serif', textAlign: 'left', borderRadius: 14, cursor: 'pointer', transition: 'all .16s', boxShadow: T.shadow, background: on ? (tone ? `${tone}22` : T.surface) : hot ? toneSoftOf(k) : T.surface, border: on ? `1.5px solid ${tone}` : hot ? `1px solid ${k === 'POR_VENCER' ? T.warnLine : T.line}` : `1px solid ${T.line}` }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>{label}</span>
                <span style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, background: tone ? `${tone}22` : T.surface2, color: tone ?? T.text3 }}>
                  <Ic paths={paths} size={15} />
                </span>
              </span>
              <span style={{ display: 'block', fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 6, color: tone && n ? tone : T.text }}>
                {n}
              </span>
              <span style={{ display: 'block', fontSize: '.79rem', color: T.text3, marginTop: 5 }}>{pie}</span>
            </button>
          );
        })}
      </div>

      {/* Tabla card */}
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar documento, tipo o trabajador…"
              style={{ width: '100%', height: 40, padding: '0 13px 0 38px', fontFamily: 'Inter,sans-serif', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, overflowX: 'auto' }}>
            {([['TODOS','Todos',null], ['VENCIDO','Vencidos',T.bad], ['POR_VENCER','Por vencer',T.warn], ['VIGENTE','Vigentes',T.ok]] as [string,string,string|null][]).map(([k, l, tc]) => (
              <button key={k} type="button" onClick={() => setSeg(k)} style={segStyle(seg === k)}>
                <span style={{ width: 7, height: 7, flexShrink: 0, borderRadius: '50%', background: tc ?? 'transparent', display: tc ? 'block' : 'none' }} />
                {l}
                <span style={{ fontSize: '.7rem', fontWeight: 700, color: T.text3 }}>{cnt(k) ?? base.length}</span>
              </button>
            ))}
          </div>
        </div>

        {filas.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem', minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: T.surface3 }}>
                    {['Documento','Titular','Vencimiento','Vigencia','Aviso','Estado','Acciones'].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 4 || i === 6 ? 'right' : 'left', padding: i === 0 || i === 6 ? '10px 18px' : '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map(c => {
                    const tone = toneOf(c.estado);
                    const toneSoft = toneSoftOf(c.estado);
                    const pct = barPct(c);
                    const renovable = c.estado !== 'VIGENTE';
                    return (
                      <tr key={c.id} onClick={() => canEdit('CERTIFICADOS') && abrirEditar(c)}
                        style={{ borderTop: `1px solid ${T.lineSoft}`, cursor: canEdit('CERTIFICADOS') ? 'pointer' : 'default', transition: 'background .14s', ...(c.estado === 'VENCIDO' ? { background: `color-mix(in oklab, ${T.badSoft} 55%, transparent)` } : {}) }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                        onMouseLeave={e => (e.currentTarget.style.background = c.estado === 'VENCIDO' ? `color-mix(in oklab, ${T.badSoft} 55%, transparent)` : 'transparent')}>
                        {/* Documento */}
                        <td style={{ padding: '11px 18px', maxWidth: 340 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                            <span style={{ width: 36, height: 36, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: toneSoft, color: tone }}>
                              <Ic paths={IC.award} size={16} />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.descripcion}</div>
                              <div style={{ fontSize: '.74rem', color: T.text3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.tipo}</div>
                            </div>
                          </div>
                        </td>
                        {/* Titular */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          {c.usuarioNombre ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={avatarStyle(c.usuarioNombre, 26)}>{initials(c.usuarioNombre)}</span>
                              <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{c.usuarioNombre}</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.8rem', color: T.text3 }}>
                              <Ic paths={IC.store} size={14} /> Establecimiento
                            </div>
                          )}
                        </td>
                        {/* Vencimiento */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.82rem', fontWeight: 600 }}>{fmtLarga(c.fechaVencimiento)}</div>
                          <div style={{ fontSize: '.72rem', fontWeight: 600, marginTop: 2, color: c.estado === 'VIGENTE' ? T.text3 : tone }}>{diasLabel(c)}</div>
                        </td>
                        {/* Vigencia bar */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ width: 120, height: 6, borderRadius: 6, background: T.surface2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 6, background: tone, width: `${pct}%`, ...(c.estado === 'VENCIDO' ? { opacity: .35 } : {}) }} />
                          </div>
                        </td>
                        {/* Aviso */}
                        <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.78rem', color: T.text2 }}>
                            <Ic paths={IC.bell} size={13} /> {c.diasAlerta ?? 30} d
                          </span>
                        </td>
                        {/* Estado */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, whiteSpace: 'nowrap', color: tone, background: toneSoft }}>
                            <span style={{ width: 6, height: 6, flexShrink: 0, borderRadius: '50%', background: tone }} />
                            {estadoLabel(c.estado)}
                          </span>
                        </td>
                        {/* Acciones */}
                        <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                            {renovable && canEdit('CERTIFICADOS') && (
                              <button onClick={() => abrirRenovar(c)} style={{ height: 30, padding: '0 11px', marginRight: 4, fontFamily: 'Inter,sans-serif', fontSize: '.76rem', fontWeight: 650, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                Renovar
                              </button>
                            )}
                            {canEdit('CERTIFICADOS') && (
                              <button onClick={() => abrirEditar(c)} title="Editar certificado"
                                style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.primarySoft; (e.currentTarget as HTMLButtonElement).style.color = T.primary; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = T.text3; }}>
                                <Ic paths={IC.pencil} size={15} />
                              </button>
                            )}
                            {canDelete('CERTIFICADOS') && (
                              <button onClick={() => setModalDel(c)} title="Eliminar certificado"
                                style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.badSoft; (e.currentTarget as HTMLButtonElement).style.color = T.bad; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = T.text3; }}>
                                <Ic paths={IC.trash} size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '13px 18px', borderTop: `1px solid ${T.lineSoft}`, fontSize: '.8rem', color: T.text3 }}>
              {filas.length} {filas.length === 1 ? 'certificado' : 'certificados'} · ordenados por fecha de vencimiento
            </div>
          </>
        ) : (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
              <Ic paths={IC.award} size={24} />
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14 }}>Sin certificados</div>
            <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>
              {seg === 'TODOS' ? 'Registra el primer certificado o documento del establecimiento.' : 'No hay certificados en esta categoría.'}
            </p>
          </div>
        )}
      </div>

      {/* Modales */}
      {modalForm && (
        <FormModal
          form={modalForm} tipos={tipos} usuarios={usuarios}
          onClose={() => setModalForm(null)} onSave={handleGuardar} saving={saving}
        />
      )}
      {modalDel && (
        <DeleteModal cert={modalDel} onClose={() => setModalDel(null)} onConfirm={handleEliminar} />
      )}
    </div>
  );
}
