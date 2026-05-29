import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DeleteAccountModal } from '../../components/ui/DeleteAccountModal';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { usuarioService } from '../../services/usuario.service';
import { tenantConfigService } from '../../services/tenantConfig.service';
import {
  Trash2, AlertTriangle, Building2, Upload, X, Save,
  Percent, FileText, Phone, Mail, MapPin, Hash, Receipt, Zap, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { DeleteAccountValidationDTO, TenantConfigDTO } from '../../types';

export function AccountSettings() {
  const { user } = useAuthStore();
  const { setConfig } = useTenantConfigStore();
  const location = useLocation();
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const facturacionRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.rol === 'ADMIN';

  // ── Config ─────────────────────────────────────────────────────────────────
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving]               = useState(false);
  const [oseTokenGuardado, setOseTokenGuardado] = useState(false);
  const [logoPreview, setLogoPreview]     = useState<string | null>(null);
  const [form, setForm] = useState<TenantConfigDTO>({
    nombreNegocio: '', ruc: '', direccion: '', telefono: '',
    emailContacto: '', ciudad: '', logoBase64: null, moneda: 'S/.',
    igvPorcentaje: 18, piePaginaPdf: '', serieBoleta: 'BBB1',
    serieFactura: 'FFF1', oseUrl: '', oseToken: '',
  });

  // ── Eliminar cuenta ────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [validacion, setValidacion]           = useState<DeleteAccountValidationDTO | null>(null);
  const [deleteLoading, setDeleteLoading]     = useState(false);

  useEffect(() => {
    if (isAdmin) fetchConfig();
    else setConfigLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (location.hash === '#facturacion' && !configLoading && facturacionRef.current) {
      facturacionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, configLoading]);

  const fetchConfig = async () => {
    try {
      setConfigLoading(true);
      const data = await tenantConfigService.getConfig();
      setConfig(data);
      setOseTokenGuardado(!!data.oseToken);
      setForm({
        nombreNegocio: data.nombreNegocio ?? '', ruc: data.ruc ?? '',
        direccion: data.direccion ?? '', telefono: data.telefono ?? '',
        emailContacto: data.emailContacto ?? '', ciudad: data.ciudad ?? '',
        logoBase64: data.logoBase64 ?? null, moneda: data.moneda ?? 'S/.',
        igvPorcentaje: data.igvPorcentaje ?? 18, piePaginaPdf: data.piePaginaPdf ?? '',
        serieBoleta: data.serieBoleta ?? 'BBB1', serieFactura: data.serieFactura ?? 'FFF1',
        oseUrl: data.oseUrl ?? '', oseToken: '',
      });
      if (data.logoBase64) setLogoPreview(data.logoBase64);
    } catch {
      toast.error('Error al cargar la configuración');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) { toast.error('El logo no puede superar 2.5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setLogoPreview(b64);
      setForm(p => ({ ...p, logoBase64: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await tenantConfigService.updateConfig(form);
      setConfig(updated);
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!user?.usuarioId) return;
    setDeleteLoading(true);
    try {
      const result = await usuarioService.validarEliminacion(user.usuarioId);
      setValidacion(result);
      setShowDeleteModal(true);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { mensaje?: string } } })?.response?.data?.mensaje || 'Error al validar eliminación');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user?.usuarioId || !validacion) return;
    if (validacion.tipo === 'TENANT_OWNER') await usuarioService.eliminarCuentaCompleta(user.usuarioId);
    else await usuarioService.deactivate(user.usuarioId);
  };

  const field = (key: keyof TenantConfigDTO) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  const Loader = () => (
    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
      <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      Cargando configuración...
    </div>
  );

  // ── Sección helper ──────────────────────────────────────────────────────────
  const SectionHeader = ({
    icon: Icon, title, description, danger,
  }: { icon: React.ElementType; title: string; description: string; danger?: boolean }) => (
    <div className={`flex items-start gap-4 pb-5 mb-6 border-b ${danger ? 'border-destructive/30' : 'border-border'}`}>
      <div className={`rounded-xl p-2.5 ${danger ? 'bg-destructive/10' : 'bg-primary/10'}`}>
        <Icon size={20} className={danger ? 'text-destructive' : 'text-primary'} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className={`font-semibold text-base ${danger ? 'text-destructive' : ''}`}>{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Administra los datos de tu negocio, facturación y cuenta</p>
      </div>

      <div className="space-y-6">

          {isAdmin && (
            <>
              {/* ── 1. Datos del negocio ──────────────────────────────────── */}
              <div id="negocio" className="rounded-2xl border bg-card p-6 shadow-sm scroll-mt-20">
                <SectionHeader
                  icon={Building2}
                  title="Datos del negocio"
                  description="Aparecen en los PDFs que generas: órdenes de compra, reportes y comprobantes."
                />

                {configLoading ? <Loader /> : (
                  <div className="space-y-6">
                    {/* Logo */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Logo del negocio</label>
                      <div className="flex items-center gap-5">
                        {logoPreview ? (
                          <div className="relative w-20 h-20 rounded-xl border overflow-hidden bg-muted flex items-center justify-center">
                            <img src={logoPreview} alt="Logo" className="object-contain w-full h-full p-1" />
                            <button
                              type="button"
                              onClick={() => { setLogoPreview(null); setForm(p => ({ ...p, logoBase64: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                              className="absolute top-1 right-1 rounded-full bg-destructive text-white p-0.5 hover:bg-destructive/80"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 text-muted-foreground bg-muted/30">
                            <Building2 size={22} className="opacity-40" />
                            <span className="text-[10px]">Sin logo</span>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Upload size={13} className="mr-2" />
                            {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                          </Button>
                          <p className="text-xs text-muted-foreground">PNG o JPG · Máx. 2.5 MB</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
                      </div>
                    </div>

                    {/* Campos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><Building2 size={13} />Nombre del negocio <span className="text-destructive">*</span></label>
                        <Input value={form.nombreNegocio ?? ''} onChange={field('nombreNegocio')} placeholder="Ej: Farmacia San José" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><Hash size={13} />RUC <span className="text-destructive">*</span></label>
                        <Input value={form.ruc ?? ''} onChange={field('ruc')} placeholder="20512345678" maxLength={11} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><MapPin size={13} />Dirección</label>
                        <Input value={form.direccion ?? ''} onChange={field('direccion')} placeholder="Av. Lima 123, Miraflores" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><MapPin size={13} />Ciudad</label>
                        <Input value={form.ciudad ?? ''} onChange={field('ciudad')} placeholder="Lima" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><Phone size={13} />Teléfono</label>
                        <Input value={form.telefono ?? ''} onChange={field('telefono')} placeholder="987 654 321" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><Mail size={13} />Email de contacto</label>
                        <Input value={form.emailContacto ?? ''} onChange={field('emailContacto')} placeholder="contacto@minegocio.com" type="email" />
                      </div>
                    </div>

                    {/* Vista previa PDF */}
                    {(form.nombreNegocio || logoPreview) && (
                      <div className="rounded-xl border border-dashed p-4 space-y-2 bg-muted/20">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vista previa · Encabezado PDF</p>
                        <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border text-sm">
                          {logoPreview && <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain shrink-0 rounded" />}
                          <div>
                            <p className="font-bold text-base leading-tight">{form.nombreNegocio || 'Mi negocio'}</p>
                            {form.ruc && <p className="text-xs text-muted-foreground">RUC: {form.ruc}</p>}
                            {form.direccion && <p className="text-xs text-muted-foreground">{form.direccion}{form.ciudad ? `, ${form.ciudad}` : ''}</p>}
                            {form.telefono && <p className="text-xs text-muted-foreground">Tel: {form.telefono}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSave} disabled={saving} className="gap-2">
                        <Save size={14} />{saving ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 2. Facturación ────────────────────────────────────────── */}
              <div ref={facturacionRef} id="facturacion" className="rounded-2xl border bg-card p-6 shadow-sm scroll-mt-20">
                <SectionHeader
                  icon={Receipt}
                  title="Facturación electrónica"
                  description="Configura IGV, series de comprobantes y la integración con tu OSE para emitir a SUNAT."
                />

                {configLoading ? <Loader /> : (
                  <div className="space-y-6">
                    {/* IGV / Moneda / Series / Pie */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">General</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-muted-foreground">Moneda</label>
                          <Input value={form.moneda ?? 'S/.'} onChange={field('moneda')} placeholder="S/." />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><Percent size={13} />IGV (%)</label>
                          <Input type="number" min={0} max={100} step={0.1} value={form.igvPorcentaje ?? 18}
                            onChange={e => setForm(p => ({ ...p, igvPorcentaje: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-muted-foreground">Serie Boleta</label>
                          <Input value={form.serieBoleta ?? 'BBB1'} onChange={field('serieBoleta')} placeholder="BBB1" maxLength={10} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-muted-foreground">Serie Factura</label>
                          <Input value={form.serieFactura ?? 'FFF1'} onChange={field('serieFactura')} placeholder="FFF1" maxLength={10} />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"><FileText size={13} />Pie de página en PDFs</label>
                          <Input value={form.piePaginaPdf ?? ''} onChange={field('piePaginaPdf')} placeholder="Ej: Gracias por su preferencia · RUC 20512345678" />
                        </div>
                      </div>
                    </div>

                    {/* OSE */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Integración OSE — Envío a SUNAT</p>
                      <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap size={15} className="text-indigo-600 dark:text-indigo-400" />
                            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                              Conecta tu OSE (Nubefact, Efact, Alegra…)
                            </p>
                          </div>
                          {oseTokenGuardado && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} /> Configurado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
                          Ingresa la URL y el token de tu OSE para que Fluxus pueda enviar los comprobantes electrónicos directamente a SUNAT con validez oficial.
                        </p>
                        <div className="grid gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">URL del OSE</label>
                            <Input
                              value={form.oseUrl ?? ''} onChange={field('oseUrl')}
                              placeholder="https://api.nubefact.com/api/v1/mi-empresa"
                              className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">URL que te entregó tu OSE al crear tu empresa (incluye el slug al final).</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">Token API del OSE</label>
                            <Input
                              type="password"
                              value={form.oseToken ?? ''} onChange={field('oseToken')}
                              placeholder={oseTokenGuardado ? '••••••  (guardado — deja vacío para no cambiar)' : 'Pega tu token API aquí'}
                              className="font-mono text-xs" autoComplete="new-password"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              En Nubefact: <strong>Mi perfil → Token de API</strong>.{' '}
                              {oseTokenGuardado && 'Deja vacío si no quieres cambiar el token actual.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSave} disabled={saving} className="gap-2">
                        <Save size={14} />{saving ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── 3. Zona de peligro ────────────────────────────────────────── */}
          <div id="peligro" className="rounded-2xl border border-destructive/40 bg-card p-6 shadow-sm scroll-mt-20">
            <SectionHeader
              icon={AlertTriangle}
              title="Zona de peligro"
              description="Acciones irreversibles sobre tu cuenta. Lee con atención antes de continuar."
              danger
            />

            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">Eliminar cuenta</p>
                  <p className="text-sm text-muted-foreground mt-0.5 max-w-md">
                    {isAdmin
                      ? 'Como administrador, esta acción eliminará permanentemente todos los datos de tu empresa: productos, ventas, clientes y usuarios.'
                      : 'Tu usuario será desactivado. Un administrador puede reactivarlo si es necesario.'}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteClick}
                  disabled={deleteLoading}
                  className="gap-2 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteLoading ? 'Validando...' : 'Eliminar cuenta'}
                </Button>
              </div>
            </div>
          </div>

      </div>

      {validacion && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          validacion={validacion}
          usuarioId={user?.usuarioId || 0}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
