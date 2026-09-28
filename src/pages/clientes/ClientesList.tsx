import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { clienteService, type ClienteDTO } from '../../services/cliente.service';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';
import { notify } from '../../lib/notify';
import { usePermissions } from '../../hooks/usePermissions';

const T = {
  bg: '#f7f8fa', surface: '#ffffff', surface2: '#f1f3f7', surface3: '#fafbfc',
  line: '#e4e7ec', lineSoft: '#eef0f4',
  text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
  primary: '#3b47ef', primarySoft: '#eef0ff', primaryLine: '#cfd4fd',
  ok: '#0f9d6e', okSoft: '#e7f7f1',
  warn: '#b7791f', warnSoft: '#fdf6e7',
  bad: '#d63b3b', badSoft: '#fdeceb',
  shadow: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
} as const;

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3 }}>
      {children}
    </div>
  );
}

const HUES = [262, 200, 160, 25, 330, 45, 290, 180];
function avatarStyle(nombre: string, size: number, apagado?: boolean): React.CSSProperties {
  let s = 0;
  for (let i = 0; i < nombre.length; i++) s = ((s * 31 + nombre.charCodeAt(i)) >>> 0);
  const hue = HUES[s % HUES.length];
  return {
    width: size, height: size, flexShrink: 0, display: 'grid', placeItems: 'center',
    borderRadius: Math.round(size * .3),
    fontSize: (size * .36).toFixed(1) + 'px', fontWeight: 700, letterSpacing: '.01em',
    ...(apagado
      ? { color: T.text3, background: T.surface2 }
      : { color: `oklch(0.45 0.13 ${hue})`, background: `oklch(0.94 0.04 ${hue})` }),
  };
}

function iniciales(nombre: string): string {
  return nombre.replace(/\b(S\.?A\.?C\.?|E\.?I\.?R\.?L\.?|S\.?R\.?L\.?|S\.?A\.?)\b/gi, '')
    .trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';
}

function fmtTel(t?: string): string {
  if (!t) return '—';
  if (t.length === 9) return t.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  return t.replace(/(\d{2})(\d{3})(\d+)/, '($1) $2 $3');
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

const POR_PAGINA = 10;
const TIPOS = [
  { key: 'DNI', label: 'DNI' },
  { key: 'RUC', label: 'RUC' },
  { key: 'CE', label: 'CE' },
  { key: 'PASAPORTE', label: 'Pasaporte' },
] as const;

type TipoDoc = 'DNI' | 'RUC' | 'CE' | 'PASAPORTE';
type EstadoFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';
type DocFilter = 'TODOS' | 'DNI' | 'RUC' | 'OTROS';
type ModalConfirm = 'activar' | 'desactivar' | 'eliminar';

interface FormState {
  nombre: string;
  tipoDocumento: TipoDoc;
  numeroDocumento: string;
  telefono: string;
  email: string;
  direccion: string;
  intento: boolean;
}

const emptyForm = (): FormState => ({ nombre: '', tipoDocumento: 'DNI', numeroDocumento: '', telefono: '', email: '', direccion: '', intento: false });

// ── SVG icons ─────────────────────────────────────────────────────────
const IcoSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
const IcoPlus = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
const IcoX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IcoEdit = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
const IcoDeactivate = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>;
const IcoActivate = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>;
const IcoTrash = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IcoPhone = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>;
const IcoMail = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>;
const IcoDoc = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4"/><path d="M14 14h3"/></svg>;
const IcoUser = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoPin = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoUsers = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>;

export function ClientesList() {
  const { canCreate, canEdit, canDelete, canToggleState, canView } = usePermissions();
  const hasViewPermission = canView('CLIENTES');

  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODOS');
  const [docFilter, setDocFilter] = useState<DocFilter>('TODOS');
  const [page, setPage] = useState(1);

  const [modalForm, setModalForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [modalConfirm, setModalConfirm] = useState<ModalConfirm | null>(null);
  const [confirmCliente, setConfirmCliente] = useState<ClienteDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (hasViewPermission) fetchClientes();
    else setLoading(false);
  }, [hasViewPermission]);

  useEffect(() => { setPage(1); }, [busqueda, estadoFilter, docFilter]);

  async function fetchClientes() {
    try {
      setLoading(true);
      const data = await clienteService.getAll();
      setClientes(data);
    } catch (err) {
      notify.fromError(err, 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  }

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function openNew() { setEditingId(null); setForm(emptyForm()); setModalForm(true); }

  function openEdit(c: ClienteDTO) {
    setEditingId(c.id ?? null);
    setForm({ nombre: c.nombre, tipoDocumento: (c.tipoDocumento as TipoDoc) || 'DNI', numeroDocumento: c.numeroDocumento || '', telefono: c.telefono || '', email: c.email || '', direccion: c.direccion || '', intento: false });
    setModalForm(true);
  }

  function closeForm() { setModalForm(false); setEditingId(null); setForm(emptyForm()); }

  function openConfirm(type: ModalConfirm, c: ClienteDTO) { setConfirmCliente(c); setModalConfirm(type); }
  function closeConfirm() { setModalConfirm(null); setConfirmCliente(null); }

  async function handleSubmit() {
    setF('intento', true);
    if (!form.nombre.trim()) return;
    try {
      setSaving(true);
      const payload: ClienteDTO = { nombre: form.nombre.trim(), tipoDocumento: form.tipoDocumento, numeroDocumento: form.numeroDocumento, telefono: form.telefono, email: form.email, direccion: form.direccion.trim(), activo: true };
      if (editingId) {
        await clienteService.update(editingId, payload);
        toast.success('Cliente actualizado');
      } else {
        await clienteService.create(payload);
        toast.success('Cliente registrado');
      }
      closeForm();
      await fetchClientes();
    } catch (err) {
      notify.fromError(err, editingId ? 'No se pudo actualizar el cliente.' : 'No se pudo registrar el cliente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!confirmCliente?.id) return;
    try {
      setConfirming(true);
      if (modalConfirm === 'activar') { await clienteService.activate(confirmCliente.id); toast.success('Cliente activado'); }
      else if (modalConfirm === 'desactivar') { await clienteService.deactivate(confirmCliente.id); toast.success('Cliente desactivado'); }
      else if (modalConfirm === 'eliminar') { await clienteService.delete(confirmCliente.id); toast.success('Cliente eliminado'); }
      closeConfirm();
      await fetchClientes();
    } catch (err) {
      notify.fromError(err, `No se pudo ${modalConfirm === 'eliminar' ? 'eliminar' : modalConfirm === 'activar' ? 'activar' : 'desactivar'} el cliente.`);
    } finally {
      setConfirming(false);
    }
  }

  const { filtered, total, activos, inactivos, empresas, estadoCounts } = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const matchDoc = (c: ClienteDTO) => docFilter === 'TODOS' || (docFilter === 'OTROS' ? (c.tipoDocumento === 'CE' || c.tipoDocumento === 'PASAPORTE') : c.tipoDocumento === docFilter);
    const matchQ = (c: ClienteDTO) => !q || c.nombre.toLowerCase().includes(q) || (c.numeroDocumento || '').toLowerCase().includes(q) || (c.telefono || '').includes(q.replace(/\s/g, '')) || (c.email || '').toLowerCase().includes(q);
    const base = clientes.filter(c => matchDoc(c) && matchQ(c));
    const filtered = base.filter(c => estadoFilter === 'TODOS' || (estadoFilter === 'ACTIVOS' ? c.activo : !c.activo));
    return {
      filtered,
      total: clientes.length,
      activos: clientes.filter(c => c.activo).length,
      inactivos: clientes.filter(c => !c.activo).length,
      empresas: clientes.filter(c => c.tipoDocumento === 'RUC' && c.activo).length,
      estadoCounts: {
        TODOS: base.length,
        ACTIVOS: base.filter(c => c.activo).length,
        INACTIVOS: base.filter(c => !c.activo).length,
      },
    };
  }, [clientes, busqueda, estadoFilter, docFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  const safePage = Math.min(page, totalPages);
  const desde = (safePage - 1) * POR_PAGINA;
  const paginated = filtered.slice(desde, desde + POR_PAGINA);

  const seg = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 34,
    padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 600,
    border: 0, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' as const,
    color: on ? T.text : T.text3,
    background: on ? T.surface : 'transparent',
    boxShadow: on ? `0 1px 3px rgba(0,0,0,.14),0 0 0 1px ${T.line}` : undefined,
  });

  const isRuc = form.tipoDocumento === 'RUC';
  const nombreErr = form.intento && !form.nombre.trim() ? (isRuc ? 'Ingresa la razón social.' : 'Ingresa el nombre del cliente.') : '';

  const CONFIRM_CFG = {
    activar: { tone: T.ok, toneSoft: T.okSoft, iconPath: 'M9 12.5 11.5 15 15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', titulo: 'Activar cliente', sub: 'Volverá a estar disponible en el POS.', texto: 'Podrás seleccionarlo al registrar ventas y emitir comprobantes a su nombre.', btnLabel: 'Activar cliente' },
    desactivar: { tone: T.warn, toneSoft: T.warnSoft, iconPath: 'M15 9l-6 6M9 9l6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', titulo: 'Desactivar cliente', sub: 'Puedes volver a activarlo cuando quieras.', texto: 'No aparecerá al buscar clientes en el POS. Su historial de ventas y comprobantes se conserva.', btnLabel: 'Desactivar' },
    eliminar: { tone: T.bad, toneSoft: T.badSoft, iconPath: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', titulo: 'Eliminar cliente', sub: 'Esta acción no se puede deshacer.', texto: 'Se eliminará permanentemente. Si solo quieres ocultarlo del POS, mejor desactívalo.', btnLabel: 'Eliminar permanentemente' },
  } as const;
  const cfgConfirm = modalConfirm ? CONFIRM_CFG[modalConfirm] : null;

  if (loading) return <LoadingSpinner />;

  const inputBase: React.CSSProperties = { width: '100%', height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none' };
  const focusIn = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; };
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Clientes</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Gestiona la cartera de clientes de tu negocio</p>
        </div>
        {canCreate('CLIENTES') && (
          <button type="button" onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}` }}>
            <IcoPlus /> Nuevo cliente
          </button>
        )}
      </div>

      {!hasViewPermission ? (
        <div style={{ padding: '56px 24px', textAlign: 'center', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14 }}>
          <p style={{ color: T.text3 }}>No tienes permisos para ver el listado de clientes.</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
            {([
              { label: 'Total clientes', value: total, sub: 'Registrados', color: T.text },
              { label: 'Activos', value: activos, sub: 'Disponibles para vender', color: T.ok },
              { label: 'Inactivos', value: inactivos, sub: 'Deshabilitados', color: inactivos ? T.bad : T.text },
              { label: 'Empresas', value: empresas, sub: 'Con RUC, pueden recibir factura', color: T.text },
            ] as const).map(({ label, value, sub, color }) => (
              <div key={label} style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
                <MonoLabel>{label}</MonoLabel>
                <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color }}>{value}</div>
                <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Main card */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 0 }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}><IcoSearch /></span>
                <input type="text" value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1); }}
                  placeholder="Buscar por nombre, documento, teléfono o email…"
                  style={{ width: '100%', height: 40, padding: '0 13px 0 38px', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none', fontFamily: 'Inter,sans-serif' }}
                  onFocus={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                  onBlur={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0, overflowX: 'auto' }}>
                {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as EstadoFilter[]).map(k => (
                  <button key={k} type="button" onClick={() => { setEstadoFilter(k); setPage(1); }} style={seg(estadoFilter === k)}>
                    {k === 'TODOS' ? 'Todos' : k === 'ACTIVOS' ? 'Activos' : 'Inactivos'}
                    <span style={{ fontSize: '.7rem', fontWeight: 700, color: T.text3 }}>{estadoCounts[k]}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0, overflowX: 'auto' }}>
                {([['TODOS', 'Todo doc.'], ['DNI', 'DNI'], ['RUC', 'RUC'], ['OTROS', 'Otros']] as [DocFilter, string][]).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => { setDocFilter(k); setPage(1); }} style={seg(docFilter === k)}>{l}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}><IcoUsers /></div>
                <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14 }}>Ningún cliente coincide con la búsqueda</div>
                <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 380 }}>Revisa el nombre o documento, o quita los filtros para ver a todos.</p>
                <button type="button" onClick={() => { setBusqueda(''); setEstadoFilter('TODOS'); setDocFilter('TODOS'); setPage(1); }}
                  style={{ height: 38, marginTop: 16, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                  Quitar filtros
                </button>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem', minWidth: 960 }}>
                    <thead>
                      <tr style={{ background: T.surface3 }}>
                        {['Cliente', 'Documento', 'Contacto', 'Estado', 'Acciones'].map((h, i) => (
                          <th key={h} style={{ textAlign: i === 4 ? 'right' : 'left', padding: i === 0 || i === 4 ? '10px 18px' : '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(c => {
                        const inis = iniciales(c.nombre);
                        return (
                          <tr key={c.id}
                            onClick={() => canEdit('CLIENTES') && openEdit(c)}
                            style={{ borderTop: `1px solid ${T.lineSoft}`, cursor: canEdit('CLIENTES') ? 'pointer' : 'default', transition: 'background .14s', opacity: c.activo ? 1 : .72 }}
                            onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}>
                            <td style={{ padding: '11px 18px', maxWidth: 340 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                                <span style={avatarStyle(c.nombre, 34, !c.activo)}>{inis}</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre}</div>
                                  <div style={{ fontSize: '.75rem', color: T.text3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.direccion || 'Sin dirección'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ display: 'inline-flex', minWidth: 34, justifyContent: 'center', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 700, letterSpacing: '.04em', padding: '3px 6px', borderRadius: 6, ...(c.tipoDocumento === 'RUC' ? { color: T.primary, background: T.primarySoft } : { color: T.text2, background: T.surface2 }) }}>
                                  {c.tipoDocumento === 'PASAPORTE' ? 'PAS' : (c.tipoDocumento || '—')}
                                </span>
                                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.82rem', fontWeight: 600 }}>{c.numeroDocumento || '—'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.82rem', color: T.text2 }}>
                                <span style={{ display: 'grid', color: T.text3 }}><IcoPhone /></span>
                                <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{fmtTel(c.telefono)}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.78rem', color: T.text3, marginTop: 4 }}>
                                <span style={{ display: 'grid' }}><IcoMail /></span>
                                {c.email || '—'}
                              </div>
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, ...(c.activo ? { color: T.ok, background: T.okSoft } : { color: T.text3, background: T.surface2 }) }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.activo ? T.ok : T.text3 }} />
                                {c.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', gap: 3 }}>
                                {canEdit('CLIENTES') && (
                                  <button type="button" onClick={e => { e.stopPropagation(); openEdit(c); }} title="Editar cliente"
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.primarySoft; e.currentTarget.style.color = T.primary; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoEdit />
                                  </button>
                                )}
                                {canToggleState('CLIENTES') && c.activo && (
                                  <button type="button" onClick={e => { e.stopPropagation(); openConfirm('desactivar', c); }} title="Desactivar cliente"
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.warnSoft; e.currentTarget.style.color = T.warn; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoDeactivate />
                                  </button>
                                )}
                                {canToggleState('CLIENTES') && !c.activo && (
                                  <button type="button" onClick={e => { e.stopPropagation(); openConfirm('activar', c); }} title="Activar cliente"
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.okSoft; e.currentTarget.style.color = T.ok; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoActivate />
                                  </button>
                                )}
                                {canDelete('CLIENTES') && (
                                  <button type="button" onClick={e => { e.stopPropagation(); openConfirm('eliminar', c); }} title="Eliminar cliente"
                                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.badSoft; e.currentTarget.style.color = T.bad; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                    <IcoTrash />
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
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', borderTop: `1px solid ${T.lineSoft}` }}>
                  <span style={{ fontSize: '.8rem', color: T.text3 }}>
                    Mostrando {desde + 1}–{Math.min(desde + POR_PAGINA, filtered.length)} de {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <PagBtn disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</PagBtn>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <PagBtn key={n} active={n === safePage} onClick={() => setPage(n)}>{n}</PagBtn>
                    ))}
                    <PagBtn disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</PagBtn>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Modal form */}
      {modalForm && createPortal(
        <div onClick={closeForm} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <span style={avatarStyle(form.nombre.trim() || 'N', 38, false)}>
                {form.nombre.trim() ? iniciales(form.nombre) : '+'}
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{editingId ? 'Actualiza la información del cliente.' : 'Los campos con * son obligatorios.'}</div>
              </div>
              <button type="button" onClick={closeForm} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <IcoX />
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 22px' }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, marginBottom: 10 }}>Identificación</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 4, padding: 4, background: T.surface2, borderRadius: 11 }}>
                {TIPOS.map(tp => (
                  <button key={tp.key} type="button" onClick={() => { setF('tipoDocumento', tp.key as TipoDoc); setF('numeroDocumento', ''); }} style={seg(form.tipoDocumento === tp.key)}>
                    {tp.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                  Número de {form.tipoDocumento === 'PASAPORTE' ? 'pasaporte' : form.tipoDocumento}{isRuc ? ' *' : ''}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}><IcoDoc /></span>
                    <input type="text" value={form.numeroDocumento}
                      onChange={e => {
                        let v = e.target.value;
                        if (form.tipoDocumento === 'DNI' || isRuc) v = v.replace(/\D/g, '');
                        else v = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        const maxLen = form.tipoDocumento === 'DNI' ? 8 : isRuc ? 11 : form.tipoDocumento === 'CE' ? 12 : 20;
                        setF('numeroDocumento', v.slice(0, maxLen));
                      }}
                      placeholder={form.tipoDocumento === 'DNI' ? '8 dígitos' : isRuc ? '11 dígitos' : form.tipoDocumento === 'CE' ? 'Carné de extranjería' : 'N° de pasaporte'}
                      style={{ ...inputBase, padding: '0 13px 0 38px', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.88rem', letterSpacing: '.04em' }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </div>
                  {(form.tipoDocumento === 'DNI' || isRuc) && (
                    <button type="button"
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 15px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: 650, borderRadius: 10, whiteSpace: 'nowrap', border: 0, cursor: 'pointer', color: T.primary, background: T.primarySoft }}>
                      <IcoSearch />{isRuc ? 'SUNAT' : 'RENIEC'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                  {isRuc ? 'Razón social *' : 'Nombre completo *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}><IcoUser /></span>
                  <input type="text" value={form.nombre} onChange={e => setF('nombre', e.target.value)}
                    placeholder={isRuc ? 'Se completa al consultar SUNAT' : 'Ej: Juan Pérez García'}
                    style={{ ...inputBase, padding: '0 13px 0 38px', border: `1px solid ${nombreErr ? T.bad : T.line}`, boxShadow: nombreErr ? `0 0 0 3px ${T.badSoft}` : 'none' }}
                    onFocus={e => { if (!nombreErr) focusIn(e); }}
                    onBlur={e => { if (!nombreErr) focusOut(e); }}
                  />
                </div>
                {nombreErr && <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>{nombreErr}</div>}
              </div>

              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, margin: '22px 0 10px' }}>Contacto</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Teléfono</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.8rem', fontWeight: 600, color: T.text3, pointerEvents: 'none' }}>+51</span>
                    <input type="tel" inputMode="numeric" value={form.telefono}
                      onChange={e => setF('telefono', e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="999 999 999"
                      style={{ ...inputBase, padding: '0 13px 0 46px', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem' }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}><IcoMail /></span>
                    <input type="email" value={form.email} onChange={e => setF('email', e.target.value.trim())}
                      placeholder="cliente@ejemplo.com"
                      style={{ ...inputBase, padding: '0 13px 0 38px' }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                  {isRuc ? 'Dirección fiscal' : 'Dirección'}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'grid' }}><IcoPin /></span>
                  <input type="text" value={form.direccion} onChange={e => setF('direccion', e.target.value)}
                    placeholder="Av. Ejemplo 123, distrito, provincia"
                    style={{ ...inputBase, padding: '0 13px 0 38px' }}
                    onFocus={focusIn} onBlur={focusOut}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <button type="button" onClick={closeForm}
                style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                Cancelar
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}`, opacity: saving ? .7 : 1 }}>
                {saving ? 'Guardando…' : (editingId ? 'Guardar cambios' : 'Registrar cliente')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal confirm */}
      {modalConfirm && confirmCliente && cfgConfirm && createPortal(
        <div onClick={closeConfirm} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: cfgConfirm.toneSoft, color: cfgConfirm.tone }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d={cfgConfirm.iconPath} />
                </svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>{cfgConfirm.titulo}</h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{cfgConfirm.sub}</div>
              </div>
              <button type="button" onClick={closeConfirm} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <IcoX />
              </button>
            </div>
            <div style={{ padding: '18px 22px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 12, background: T.surface2 }}>
                <span style={avatarStyle(confirmCliente.nombre, 38, !confirmCliente.activo)}>{iniciales(confirmCliente.nombre)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '.9rem', fontWeight: 650, lineHeight: 1.35 }}>{confirmCliente.nombre}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.76rem', color: T.text3, marginTop: 3 }}>
                    {(confirmCliente.tipoDocumento || '')} {confirmCliente.numeroDocumento || '—'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '.84rem', lineHeight: 1.55, color: T.text2, margin: '14px 0 0' }}>{cfgConfirm.texto}</p>
            </div>
            <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <button type="button" onClick={closeConfirm}
                style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                Cancelar
              </button>
              <button type="button" onClick={handleConfirm} disabled={confirming}
                style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: cfgConfirm.tone, border: 0, borderRadius: 11, cursor: confirming ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${cfgConfirm.tone}`, opacity: confirming ? .7 : 1 }}>
                {confirming ? 'Procesando…' : cfgConfirm.btnLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
