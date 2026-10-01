import { useState, useEffect, useRef } from 'react';
import { DeleteAccountModal } from '../../components/ui/DeleteAccountModal';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useThemeStore } from '../../store/themeStore';
import { usuarioService } from '../../services/usuario.service';
import { tenantConfigService } from '../../services/tenantConfig.service';
import { notify } from '../../lib/notify';
import type { DeleteAccountValidationDTO, TenantConfigDTO } from '../../types';

type Section = 'negocio' | 'facturacion' | 'peligro';

const RUBROS: Record<string, string> = {
  BOTICA: 'Botica', FARMACIA: 'Farmacia', MINIMARKET: 'Minimarket',
  FERRETERIA: 'Ferretería', RESTAURANTE: 'Restaurante', TIENDA_ROPA: 'Tienda de Ropa',
  TIENDA: 'Tienda / Bodega', EMPRESA_SERVICIOS: 'Empresa de Servicios / Dealer', OTRO: 'Otro',
};

const FORM_EMPTY: TenantConfigDTO = {
  nombreNegocio: '', ruc: '', direccion: '', telefono: '',
  emailContacto: '', ciudad: '', logoBase64: null, moneda: 'S/.',
  igvPorcentaje: 18, piePaginaPdf: '', serieBoleta: 'B001', serieFactura: 'F001', rubro: 'OTRO',
};

export function AccountSettings() {
  const { user } = useAuthStore();
  const { setConfig } = useTenantConfigStore();
  const { isDark } = useThemeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user?.rol === 'ADMIN';

  // ── Colors ─────────────────────────────────────────────────────────────────
  const C = isDark ? {
    surface: '#11141c', surface2: '#1a1f2b', surface3: '#141822',
    line: '#242a38', lineSoft: '#1e2330',
    text: '#e9ecf2', text2: '#a8b1c2', text3: '#8892a4',
    primary: '#7b83ff', primarySoft: 'rgba(123,131,255,.14)', primaryLine: 'rgba(123,131,255,.34)',
    bad: '#ff6b64', badSoft: 'rgba(255,107,100,.13)',
    shadow: '0 1px 2px rgba(0,0,0,.4), 0 1px 3px rgba(0,0,0,.3)',
    badBorder: 'rgba(255,107,100,0.35)',
  } : {
    surface: '#ffffff', surface2: '#f1f3f7', surface3: '#fafbfc',
    line: '#e4e7ec', lineSoft: '#eef0f4',
    text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
    primary: '#3b47ef', primarySoft: '#eef0ff', primaryLine: '#cfd4fd',
    bad: '#d63b3b', badSoft: '#fdeceb',
    shadow: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
    badBorder: 'rgba(214,59,59,0.35)',
  };

  // ── State ───────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<TenantConfigDTO>({ ...FORM_EMPTY });
  const [savedForm, setSavedForm] = useState<TenantConfigDTO>({ ...FORM_EMPTY });
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>(isAdmin ? 'negocio' : 'peligro');
  const [prevTipo, setPrevTipo] = useState<'B' | 'F'>('B');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [validacion, setValidacion] = useState<DeleteAccountValidationDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) fetchConfig();
    else setConfigLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchConfig = async () => {
    try {
      setConfigLoading(true);
      const data = await tenantConfigService.getConfig();
      setConfig(data);
      const f: TenantConfigDTO = {
        nombreNegocio: data.nombreNegocio ?? '', ruc: data.ruc ?? '',
        direccion: data.direccion ?? '', telefono: data.telefono ?? '',
        emailContacto: data.emailContacto ?? '', ciudad: data.ciudad ?? '',
        logoBase64: data.logoBase64 ?? null, moneda: data.moneda ?? 'S/.',
        igvPorcentaje: data.igvPorcentaje ?? 18, piePaginaPdf: data.piePaginaPdf ?? '',
        serieBoleta: data.serieBoleta ?? 'B001', serieFactura: data.serieFactura ?? 'F001',
        rubro: data.rubro ?? 'OTRO',
      };
      setForm(f);
      setSavedForm(f);
      if (data.logoBase64) setLogoPreview(data.logoBase64);
    } catch (err) {
      notify.fromError(err, 'Error al cargar la configuración');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) { notify.error('El logo no puede superar 2.5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setLogoPreview(b64);
      setForm(p => ({ ...p, logoBase64: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    try {
      setSaving(true);
      const updated = await tenantConfigService.updateConfig(form);
      setConfig(updated);
      setSavedForm({ ...form });
      notify.success('Configuración guardada', { detail: 'Los nuevos datos ya aparecen en tus PDFs.' });
    } catch (err) {
      notify.fromError(err, 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setForm({ ...savedForm });
    if (savedForm.logoBase64) setLogoPreview(savedForm.logoBase64);
    else setLogoPreview(null);
  };

  const handleDeleteClick = async () => {
    if (!user?.usuarioId) return;
    setDeleteLoading(true);
    try {
      const result = await usuarioService.validarEliminacion(user.usuarioId);
      setValidacion(result);
      setShowDeleteModal(true);
    } catch (err) {
      notify.fromError(err, 'Error al validar eliminación');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user?.usuarioId || !validacion) return;
    if (validacion.tipo === 'TENANT_OWNER') await usuarioService.eliminarCuentaCompleta(user.usuarioId);
    else await usuarioService.deactivate(user.usuarioId);
  };

  const set = (k: keyof TenantConfigDTO, v: unknown) =>
    setForm(p => ({ ...p, [k]: v }));

  // ── Validation ──────────────────────────────────────────────────────────────
  const igvN = Number(form.igvPorcentaje ?? 18);
  const rucErr = !form.ruc ? 'El RUC es obligatorio.'
    : (form.ruc ?? '').length !== 11 ? 'El RUC debe tener 11 dígitos.'
    : !/^(10|15|17|20)/.test(form.ruc ?? '') ? 'El RUC debe comenzar con 10 o 20.'
    : '';
  const nomErr = (form.nombreNegocio ?? '').trim().length < 3 ? 'Ingresa el nombre del negocio.' : '';
  const emailErr = form.emailContacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailContacto)
    ? 'Revisa el formato del email.' : '';
  const igvErr = isNaN(igvN) || igvN < 0 || igvN > 100 ? 'Ingresa un porcentaje entre 0 y 100.' : '';
  const sbErr = !/^[A-Z0-9]{4}$/.test(form.serieBoleta ?? '') ? 'Debe tener 4 caracteres.'
    : (form.serieBoleta ?? '')[0] !== 'B' ? 'Debe empezar con B.' : '';
  const sfErr = !/^[A-Z0-9]{4}$/.test(form.serieFactura ?? '') ? 'Debe tener 4 caracteres.'
    : (form.serieFactura ?? '')[0] !== 'F' ? 'Debe empezar con F.' : '';
  const canSave = [rucErr, nomErr, emailErr, igvErr, sbErr, sfErr].filter(Boolean).length === 0;

  const cambios = (Object.keys(form) as Array<keyof TenantConfigDTO>).filter(k => form[k] !== savedForm[k]);
  const dirty = cambios.length > 0 && isAdmin;

  // ── Preview data ────────────────────────────────────────────────────────────
  const monSim = (form.moneda ?? 'S/.') === 'US$' ? 'US$' : 'S/';
  const baseCalc = 16.9 / (1 + (igvErr ? 0 : igvN) / 100);
  const fm = (n: number) => n.toFixed(2).replace('.', ',');
  const initials = (form.nombreNegocio ?? '').trim()
    .split(/\s+/).filter(w => w.length > 2).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase() || 'N';

  // ── Style helpers ───────────────────────────────────────────────────────────
  const inp = (err = false, pl = 13, mono = false): React.CSSProperties => ({
    width: '100%', height: '44px', padding: `0 13px 0 ${pl}px`,
    fontFamily: mono ? "'IBM Plex Mono', monospace" : "'Inter', sans-serif",
    fontSize: mono ? '.88rem' : '.9rem', color: C.text,
    background: C.surface, border: `1px solid ${err ? C.bad : C.line}`,
    borderRadius: '10px', outline: 'none',
    boxShadow: err ? `0 0 0 3px ${C.badSoft}` : undefined,
    letterSpacing: mono ? '.03em' : undefined,
    boxSizing: 'border-box',
  });

  const monoLabel: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '.68rem', fontWeight: 600,
    letterSpacing: '.09em', textTransform: 'uppercase', color: C.text3, margin: '22px 0 11px',
  };

  const fieldLabel: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '.8rem', fontWeight: 600, color: C.text2, marginBottom: '6px',
  };

  const card: React.CSSProperties = {
    background: C.surface, border: `1px solid ${C.line}`,
    borderRadius: '16px', boxShadow: C.shadow,
  };

  const segBtn = (on: boolean, h = 36): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    height: `${h}px`, padding: '0 12px', fontFamily: "'Inter', sans-serif",
    fontSize: '.82rem', fontWeight: 600, border: 0, borderRadius: '8px',
    cursor: 'pointer', flex: 1, transition: 'all .16s',
    color: on ? C.text : C.text3,
    background: on ? C.surface : 'transparent',
    boxShadow: on ? `0 1px 3px rgba(0,0,0,.14), 0 0 0 1px ${C.line}` : undefined,
  });

  const iconTile = (danger = false): React.CSSProperties => ({
    width: '40px', height: '40px', flexShrink: 0, display: 'grid', placeItems: 'center',
    borderRadius: '11px',
    background: danger ? C.badSoft : C.primarySoft,
    color: danger ? C.bad : C.primary,
  });

  const logoTile = (size: number): React.CSSProperties => ({
    width: `${size}px`, height: `${size}px`, flexShrink: 0, display: 'grid', placeItems: 'center',
    borderRadius: `${Math.round(size * .22)}px`,
    fontSize: `${(size * .36).toFixed(0)}px`, fontWeight: 800, letterSpacing: '-.02em',
    color: '#fff', background: 'linear-gradient(145deg, #10b981, #0e7a5c)',
  });

  const errMsg: React.CSSProperties = {
    fontSize: '.76rem', fontWeight: 600, color: C.bad, marginTop: '6px',
  };

  // ── Nav items ────────────────────────────────────────────────────────────────
  const SECS: Array<{ key: Section; label: string; path: string; danger?: boolean }> = [
    ...(isAdmin ? [
      {
        key: 'negocio' as Section, label: 'Datos del negocio',
        path: 'M4 2h16v20H4zM9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01',
      },
      {
        key: 'facturacion' as Section, label: 'Facturación',
        path: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11',
      },
    ] : []),
    {
      key: 'peligro' as Section, label: 'Zona de peligro', danger: true,
      path: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01',
    },
  ];

  // ── Section renders ──────────────────────────────────────────────────────────
  const renderNegocio = () => (
    <section style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '20px 22px 18px', borderBottom: `1px solid ${C.lineSoft}` }}>
        <span style={iconTile()}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
          </svg>
        </span>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: C.text }}>Datos del negocio</h2>
          <p style={{ fontSize: '.82rem', lineHeight: 1.5, color: C.text3, margin: '4px 0 0' }}>Aparecen en los PDFs que generas: comprobantes, órdenes de compra y reportes.</p>
        </div>
      </div>

      {configLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '40px 22px', color: C.text3, fontSize: '.88rem' }}>
          <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${C.primary}`, borderTopColor: 'transparent', animation: 'fx-spin 1s linear infinite', flexShrink: 0 }} />
          Cargando configuración...
        </div>
      ) : (
        <div style={{ padding: '20px 22px 24px' }}>
          {/* Logo */}
          <div style={{ ...monoLabel, margin: '0 0 10px' } as React.CSSProperties}>Logo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {logoPreview
              ? <img src={logoPreview} alt="Logo" style={{ width: '84px', height: '84px', borderRadius: '18px', objectFit: 'contain', border: `1px solid ${C.line}`, background: C.surface2, padding: '4px' }} />
              : <span style={logoTile(84)}>{initials}</span>
            }
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 14px', fontFamily: 'Inter, sans-serif', fontSize: '.84rem', fontWeight: 600, color: C.text2, background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>
                  {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                </button>
                {logoPreview && (
                  <button type="button" onClick={() => { setLogoPreview(null); set('logoBase64', null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 13px', fontFamily: 'Inter, sans-serif', fontSize: '.84rem', fontWeight: 600, color: C.bad, background: 'transparent', border: '1px solid transparent', borderRadius: '10px', cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Quitar
                  </button>
                )}
              </div>
              <span style={{ fontSize: '.74rem', color: C.text3 }}>PNG, JPG o WEBP · máx. 2,5 MB · se recomienda fondo transparente</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleLogoChange} />
          </div>

          {/* Identificación */}
          <div style={monoLabel as React.CSSProperties}>Identificación</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '14px' }}>
            <div>
              <div style={fieldLabel}>Nombre del negocio <span style={{ color: C.bad }}>*</span></div>
              <div style={{ position: 'relative' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', flexShrink: 0 }}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01"/></svg>
                <input type="text" value={form.nombreNegocio ?? ''} onChange={e => set('nombreNegocio', e.target.value)} placeholder="Ej: Farmacia San José" style={inp(!!nomErr && (form.nombreNegocio ?? '').length > 0, 38)} />
              </div>
              {nomErr && (form.nombreNegocio ?? '').length > 0 && <div style={errMsg}>{nomErr}</div>}
            </div>
            <div>
              <div style={fieldLabel}>RUC <span style={{ color: C.bad }}>*</span></div>
              <div style={{ position: 'relative' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>
                <input type="text" inputMode="numeric" value={form.ruc ?? ''} onChange={e => set('ruc', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="20512345678" style={{ ...inp(!!rucErr && (form.ruc ?? '').length > 0, 38, true) }} />
              </div>
              {rucErr && (form.ruc ?? '').length > 0 && <div style={errMsg}>{rucErr}</div>}
            </div>
          </div>

          {/* Tipo de negocio — read only */}
          <div style={{ marginTop: '14px' }}>
            <div style={fieldLabel}>Tipo de negocio (rubro)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', height: '44px', padding: '0 13px', borderRadius: '10px', background: C.surface2, border: `1px solid ${C.lineSoft}` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span style={{ flex: 1, fontSize: '.9rem', fontWeight: 600, color: C.text }}>{RUBROS[form.rubro ?? 'OTRO'] ?? 'Otro'}</span>
              <span style={{ fontSize: '.74rem', color: C.text3, whiteSpace: 'nowrap' }}>Contacta a soporte para cambiarlo</span>
            </div>
          </div>

          {/* Ubicación y contacto */}
          <div style={monoLabel as React.CSSProperties}>Ubicación y contacto</div>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <div style={fieldLabel}>Dirección</div>
              <div style={{ position: 'relative' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <input type="text" value={form.direccion ?? ''} onChange={e => set('direccion', e.target.value)} placeholder="Av. Lima 123, Miraflores" style={inp(false, 38)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '14px' }}>
              <div>
                <div style={fieldLabel}>Ciudad</div>
                <input type="text" value={form.ciudad ?? ''} onChange={e => set('ciudad', e.target.value)} placeholder="Lima" style={inp()} />
              </div>
              <div>
                <div style={fieldLabel}>Teléfono</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '.8rem', fontWeight: 600, color: C.text3, pointerEvents: 'none' }}>+51</span>
                  <input type="tel" value={form.telefono ?? ''} onChange={e => set('telefono', e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="987 654 321" style={{ ...inp(false, 46, true) }} />
                </div>
              </div>
            </div>
            <div>
              <div style={fieldLabel}>Email de contacto</div>
              <div style={{ position: 'relative' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>
                <input type="email" value={form.emailContacto ?? ''} onChange={e => set('emailContacto', e.target.value)} placeholder="contacto@minegocio.com" style={inp(!!emailErr, 38)} />
              </div>
              {emailErr && <div style={errMsg}>{emailErr}</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderFacturacion = () => (
    <section style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '20px 22px 18px', borderBottom: `1px solid ${C.lineSoft}` }}>
        <span style={iconTile()}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>
          </svg>
        </span>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: C.text }}>Facturación electrónica</h2>
          <p style={{ fontSize: '.82rem', lineHeight: 1.5, color: C.text3, margin: '4px 0 0' }}>IGV, series de comprobantes y pie de página para tus boletas y facturas.</p>
        </div>
      </div>

      {configLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '40px 22px', color: C.text3, fontSize: '.88rem' }}>
          <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${C.primary}`, borderTopColor: 'transparent', animation: 'fx-spin 1s linear infinite', flexShrink: 0 }} />
          Cargando configuración...
        </div>
      ) : (
        <div style={{ padding: '20px 22px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.6fr)', gap: '18px' }}>
            {/* Moneda */}
            <div>
              <div style={fieldLabel}>Moneda</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '4px', padding: '4px', background: C.surface2, borderRadius: '11px' }}>
                {[['S/.', 'S/', 'Soles'], ['US$', 'US$', 'Dólares']].map(([v, sim, label]) => (
                  <button key={v} type="button" onClick={() => set('moneda', v)} style={segBtn(form.moneda === v)}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '.8rem' }}>{sim}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* IGV */}
            <div>
              <div style={fieldLabel}>IGV</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ position: 'relative', width: '100px', flexShrink: 0 }}>
                  <input type="text" inputMode="decimal" value={String(form.igvPorcentaje ?? 18)}
                    onChange={e => set('igvPorcentaje', Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                    style={{ ...inp(!!igvErr), paddingRight: '28px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', width: '100px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 650, color: C.text3, pointerEvents: 'none', fontSize: '.9rem' }}>%</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[['18', '18%', 'Tasa general'], ['10', '10%', 'Restaurantes y hoteles MYPE'], ['0', 'Exonerado', 'Zona de Amazonía']].map(([v, label, tip]) => {
                    const on = String(igvN) === v && !igvErr;
                    return (
                      <button key={v} type="button" onClick={() => set('igvPorcentaje', Number(v))} title={tip}
                        style={{ height: '44px', padding: '0 12px', fontFamily: 'Inter, sans-serif', fontSize: '.8rem', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap', color: on ? C.primary : C.text2, background: on ? C.primarySoft : C.surface, border: `1px solid ${on ? C.primary : C.line}` }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {igvErr && <div style={errMsg}>{igvErr}</div>}
            </div>
          </div>

          {/* Series */}
          <div style={monoLabel as React.CSSProperties}>Series de comprobantes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '12px' }}>
            {([
              { key: 'serieBoleta' as keyof TenantConfigDTO, label: 'Boleta de venta', pref: 'B', ph: 'B001', err: sbErr, n: 2915 },
              { key: 'serieFactura' as keyof TenantConfigDTO, label: 'Factura', pref: 'F', ph: 'F001', err: sfErr, n: 342 },
            ] as Array<{ key: keyof TenantConfigDTO; label: string; pref: string; ph: string; err: string; n: number }>).map(({ key, label, pref, ph, err, n }) => (
              <div key={String(key)} style={{ padding: '14px', borderRadius: '12px', background: C.surface3, border: `1px solid ${err ? C.bad : C.lineSoft}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '.86rem', fontWeight: 650, color: C.text }}>{label}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: '6px', color: C.text3, background: C.surface2, whiteSpace: 'nowrap' }}>Empieza con {pref}</span>
                </div>
                <input type="text" value={(form[key] as string) ?? ''} onChange={e => set(key, e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))} maxLength={4} placeholder={ph}
                  style={{ ...inp(!!err, 13, true), marginTop: '10px', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '.08em' }} />
                <div style={{ fontSize: '.74rem', marginTop: '7px', ...(err ? { fontWeight: 600, color: C.bad } : { fontFamily: "'IBM Plex Mono', monospace", color: C.text3 }) }}>
                  {err || `Próximo: ${String(form[key])}-${String(n).padStart(6, '0')}`}
                </div>
              </div>
            ))}
          </div>

          {/* Pie de página */}
          <div style={{ marginTop: '20px' }}>
            <div style={fieldLabel}>Pie de página en PDFs</div>
            <textarea rows={2} maxLength={140} value={form.piePaginaPdf ?? ''} onChange={e => set('piePaginaPdf', e.target.value)}
              placeholder="Ej: Gracias por su preferencia · No se aceptan devoluciones"
              style={{ width: '100%', padding: '11px 13px', fontFamily: 'Inter, sans-serif', fontSize: '.875rem', lineHeight: 1.5, color: C.text, background: C.surface, border: `1px solid ${C.line}`, borderRadius: '10px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '5px', fontSize: '.72rem', color: C.text3 }}>
              <span>Se imprime al final de cada boleta, factura y orden de compra</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{(form.piePaginaPdf ?? '').length} / 140</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderPeligro = () => (
    <section style={{ ...card, border: `1px solid ${C.badBorder}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '20px 22px 18px', borderBottom: `1px solid ${C.lineSoft}` }}>
        <span style={iconTile(true)}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
            <path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
        </span>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: C.bad }}>Zona de peligro</h2>
          <p style={{ fontSize: '.82rem', lineHeight: 1.5, color: C.text3, margin: '4px 0 0' }}>Acciones irreversibles sobre tu cuenta. Lee con atención antes de continuar.</p>
        </div>
      </div>
      <div style={{ padding: '18px 22px 22px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', padding: '16px 18px', borderRadius: '13px', background: C.badSoft }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontSize: '.9rem', fontWeight: 650, color: C.text }}>
              {isAdmin ? 'Eliminar cuenta y negocio' : 'Eliminar mi usuario'}
            </div>
            <div style={{ fontSize: '.82rem', lineHeight: 1.55, color: C.text2, marginTop: '4px' }}>
              {isAdmin
                ? 'Como administrador, se eliminarán permanentemente todos los datos de tu empresa: productos, ventas, clientes y usuarios.'
                : 'Tu usuario será desactivado. Un administrador puede reactivarlo si es necesario.'}
            </div>
          </div>
          <button type="button" onClick={handleDeleteClick} disabled={deleteLoading}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 16px', fontFamily: 'Inter, sans-serif', fontSize: '.86rem', fontWeight: 650, color: '#fff', background: C.bad, border: 0, borderRadius: '11px', cursor: deleteLoading ? 'not-allowed' : 'pointer', boxShadow: `0 8px 20px -10px ${C.bad}`, opacity: deleteLoading ? .7 : 1 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            {deleteLoading ? 'Validando…' : 'Eliminar cuenta'}
          </button>
        </div>
      </div>
    </section>
  );

  const renderPreview = () => {
    const prevNombre = (form.nombreNegocio ?? '').trim() || 'Nombre del negocio';
    const hasNombre = (form.nombreNegocio ?? '').trim().length > 0;
    const prevDir = [form.direccion, form.ciudad].filter(x => x && (x as string).trim()).join(', ');
    const prevTel = form.telefono ? `Tel. ${(form.telefono ?? '').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}` : '';
    const prevEmail = form.emailContacto ?? '';
    const contacto = [prevTel, prevEmail].filter(Boolean).join(' · ');
    const rucStr = form.ruc || '——————————';
    const serie = prevTipo === 'B' ? (form.serieBoleta || 'B001') : (form.serieFactura || 'F001');
    const prevNum = `${serie}-${prevTipo === 'B' ? '002915' : '000342'}`;
    const tipoLabel = prevTipo === 'B' ? 'BOLETA DE VENTA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA';
    const pie = form.piePaginaPdf || '';

    return (
      <div style={{ position: 'sticky', top: '20px', minWidth: 0 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: C.text3, marginBottom: '10px' }}>Vista previa · comprobante</div>
        <div style={{ background: '#fff', color: '#1f2328', border: '1px solid #e4e7ec', borderRadius: '12px', boxShadow: '0 18px 40px -24px rgba(0,0,0,.35)', padding: '18px 16px 14px', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {logoPreview
                ? (
                  <span style={{ ...logoTile(40), marginBottom: '8px', background: 'transparent', overflow: 'hidden' }}>
                    <img src={logoPreview} alt="logo" style={{ width: '40px', height: '40px', maxWidth: '40px', maxHeight: '40px', objectFit: 'contain', display: 'block' }} />
                  </span>
                )
                : <span style={{ ...logoTile(40), marginBottom: '8px' }}>{initials}</span>
              }
              <div style={{ fontSize: '.88rem', fontWeight: 800, lineHeight: 1.25, color: hasNombre ? '#1f2328' : '#8c959f', fontStyle: hasNombre ? undefined : 'italic' }}>{prevNombre}</div>
              {prevDir && <div style={{ fontSize: '.64rem', lineHeight: 1.5, color: '#57606a', marginTop: '3px' }}>{prevDir}</div>}
              {contacto && <div style={{ fontSize: '.64rem', lineHeight: 1.5, color: '#57606a' }}>{contacto}</div>}
            </div>
            <div style={{ flexShrink: 0, width: '110px', padding: '7px 6px', border: '1.5px solid #1f2328', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '.6rem', fontWeight: 700 }}>R.U.C. {rucStr}</div>
              <div style={{ fontSize: '.55rem', fontWeight: 700, letterSpacing: '.02em', margin: '4px 0', padding: '3px 0', background: '#1f2328', color: '#fff', lineHeight: 1.3 }}>{tipoLabel}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.63rem', fontWeight: 700 }}>{prevNum}</div>
            </div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #d0d7de', display: 'grid', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.6rem', fontWeight: 700, color: '#57606a', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <span>Descripción</span><span>Importe</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.64rem' }}><span>Paracetamol 500 mg x2</span><span>{monSim} 7,00</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.64rem' }}><span>Alcohol en gel 250 ml</span><span>{monSim} 9,90</span></div>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #d0d7de', display: 'grid', gap: '3px', fontSize: '.62rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#57606a' }}><span>Op. gravada</span><span>{monSim} {fm(baseCalc)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#57606a' }}><span>IGV ({igvErr ? '—' : `${igvN}%`})</span><span>{monSim} {fm(16.9 - baseCalc)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', fontWeight: 700, marginTop: '2px' }}><span>Total</span><span>{monSim} 16,90</span></div>
          </div>
          {pie && (
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #d0d7de', textAlign: 'center', fontSize: '.6rem', lineHeight: 1.5, color: '#57606a' }}>{pie}</div>
          )}
        </div>
        {/* Boleta / Factura toggle */}
        <div style={{ display: 'flex', gap: '3px', padding: '3px', marginTop: '10px', background: C.surface2, borderRadius: '9px' }}>
          {[['B', 'Boleta'], ['F', 'Factura']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setPrevTipo(k as 'B' | 'F')} style={segBtn(prevTipo === k, 30)}>{l}</button>
          ))}
        </div>
        <p style={{ fontSize: '.74rem', lineHeight: 1.5, color: C.text3, margin: '10px 2px 0' }}>Se actualiza mientras escribes. Así se verán tus PDFs.</p>
      </div>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fx-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0, color: C.text }}>Configuración</h1>
            <p style={{ fontSize: '.865rem', color: C.text3, margin: '7px 0 0' }}>Administra los datos de tu negocio, facturación y cuenta</p>
          </div>
          {dirty && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '.82rem', color: C.text3, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#b7791f', flexShrink: 0 }} />
                {canSave
                  ? `${cambios.length} ${cambios.length === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}`
                  : 'Corrige los errores'}
              </span>
              <button type="button" onClick={handleDiscard}
                style={{ height: '36px', padding: '0 14px', fontFamily: 'Inter, sans-serif', fontSize: '.84rem', fontWeight: 600, color: C.text2, background: 'transparent', border: `1px solid ${C.line}`, borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Descartar
              </button>
              <button type="button" onClick={handleSave} disabled={!canSave || saving}
                style={{ height: '36px', padding: '0 16px', fontFamily: 'Inter, sans-serif', fontSize: '.84rem', fontWeight: 650, color: '#fff', background: C.primary, border: 0, borderRadius: '10px', cursor: canSave && !saving ? 'pointer' : 'not-allowed', opacity: canSave && !saving ? 1 : .5, whiteSpace: 'nowrap' }}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isAdmin ? '210px minmax(0,1fr) 320px' : '210px minmax(0,1fr)',
          gap: '22px', marginTop: '22px', alignItems: 'start',
        }}>
          {/* ── Left nav ──────────────────────────────────────────────────── */}
          <nav style={{ position: 'sticky', top: '20px', display: 'grid', gap: '3px' }}>
            {SECS.map(({ key, label, path, danger }) => {
              const on = activeSection === key;
              return (
                <button key={key} type="button" onClick={() => setActiveSection(key)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', height: '40px', padding: '0 12px', fontFamily: 'Inter, sans-serif', fontSize: '.86rem', border: 0, borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .16s', fontWeight: on ? 650 : 500, color: on ? (danger ? C.bad : C.primary) : (danger ? C.bad : C.text2), background: on ? (danger ? C.badSoft : C.primarySoft) : 'transparent' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d={path} />
                  </svg>
                  <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── Main content ──────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gap: '18px', minWidth: 0 }}>
            {isAdmin && activeSection === 'negocio' && renderNegocio()}
            {isAdmin && activeSection === 'facturacion' && renderFacturacion()}
            {(activeSection === 'peligro' || !isAdmin) && renderPeligro()}
          </div>

          {/* ── Preview panel (admin only) ─────────────────────────────── */}
          {isAdmin && renderPreview()}
        </div>
      </div>


      {/* ── Delete modal ─────────────────────────────────────────────────────── */}
      {validacion && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          validacion={validacion}
          usuarioId={user?.usuarioId || 0}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}
