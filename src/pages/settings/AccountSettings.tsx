import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DeleteAccountModal } from '../../components/ui/DeleteAccountModal';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { usuarioService } from '../../services/usuario.service';
import { tenantConfigService } from '../../services/tenantConfig.service';
import {
  Trash2, AlertTriangle, Building2, Upload, X, Save,
  Percent, FileText, Phone, Mail, MapPin, Hash, Receipt, Zap,
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

  // ── Config ────────────────────────────────────────────────────────────────
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

  // ── Eliminar cuenta ───────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [validacion, setValidacion]           = useState<DeleteAccountValidationDTO | null>(null);
  const [deleteLoading, setDeleteLoading]     = useState(false);

  useEffect(() => {
    if (isAdmin) fetchConfig();
    else setConfigLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Scroll al bloque de facturación si viene desde el onboarding
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
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || 'Error al validar eliminación');
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

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
      <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      Cargando...
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">

      {/* ── Título ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administra los datos de tu negocio y cuenta</p>
      </div>

      {isAdmin && (
        <>
          {/* ── 1. Datos del negocio ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Datos del negocio
              </CardTitle>
              <CardDescription>
                Aparecen en los PDFs que generas: órdenes de compra, reportes y comprobantes
              </CardDescription>
            </CardHeader>

            <CardContent>
              {configLoading ? <LoadingSpinner /> : (
                <div className="space-y-5">
                  {/* Logo */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logo</label>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <div className="relative w-20 h-20 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                          <img src={logoPreview} alt="Logo" className="object-contain w-full h-full p-1" />
                          <button type="button" onClick={() => { setLogoPreview(null); setForm(p => ({ ...p, logoBase64: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="absolute top-1 right-1 rounded-full bg-destructive text-white p-0.5 hover:bg-destructive/80">
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                          <Building2 size={22} />
                          <span className="text-[10px]">Sin logo</span>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Upload size={13} className="mr-2" />
                          {logoPreview ? 'Cambiar' : 'Subir logo'}
                        </Button>
                        <p className="text-xs text-muted-foreground">PNG, JPG · Máx. 2.5 MB</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
                    </div>
                  </div>

                  {/* Campos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5"><Building2 size={13} className="text-muted-foreground" />Nombre del negocio</label>
                      <Input value={form.nombreNegocio ?? ''} onChange={field('nombreNegocio')} placeholder="Ej: Farmacia San José" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5"><Hash size={13} className="text-muted-foreground" />RUC</label>
                      <Input value={form.ruc ?? ''} onChange={field('ruc')} placeholder="20512345678" maxLength={11} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium flex items-center gap-1.5"><MapPin size={13} className="text-muted-foreground" />Dirección</label>
                      <Input value={form.direccion ?? ''} onChange={field('direccion')} placeholder="Av. Lima 123, Miraflores" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5"><MapPin size={13} className="text-muted-foreground" />Ciudad</label>
                      <Input value={form.ciudad ?? ''} onChange={field('ciudad')} placeholder="Lima" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5"><Phone size={13} className="text-muted-foreground" />Teléfono</label>
                      <Input value={form.telefono ?? ''} onChange={field('telefono')} placeholder="987 654 321" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium flex items-center gap-1.5"><Mail size={13} className="text-muted-foreground" />Email de contacto</label>
                      <Input value={form.emailContacto ?? ''} onChange={field('emailContacto')} placeholder="contacto@minegocio.com" type="email" />
                    </div>
                  </div>

                  {/* Vista previa PDF */}
                  {(form.nombreNegocio || logoPreview) && (
                    <div className="rounded-lg border border-dashed p-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vista previa — encabezado PDF</p>
                      <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 rounded border text-sm">
                        {logoPreview && <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain shrink-0" />}
                        <div>
                          <p className="font-bold text-base">{form.nombreNegocio || 'Mi negocio'}</p>
                          {form.ruc && <p className="text-xs text-muted-foreground">RUC: {form.ruc}</p>}
                          {form.direccion && <p className="text-xs text-muted-foreground">{form.direccion}{form.ciudad ? `, ${form.ciudad}` : ''}</p>}
                          {form.telefono && <p className="text-xs text-muted-foreground">Tel: {form.telefono}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      <Save size={14} className="mr-2" />{saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 2. Facturación ───────────────────────────────────────────── */}
          <Card ref={facturacionRef} id="facturacion">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Facturación
              </CardTitle>
              <CardDescription>
                Configura IGV, series de comprobantes y tu integración con el OSE para SUNAT
              </CardDescription>
            </CardHeader>

            <CardContent>
              {configLoading ? <LoadingSpinner /> : (
                <div className="space-y-5">
                  {/* IGV / Series / Pie */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Moneda</label>
                      <Input value={form.moneda ?? 'S/.'} onChange={field('moneda')} placeholder="S/." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5"><Percent size={13} className="text-muted-foreground" />IGV (%)</label>
                      <Input type="number" min={0} max={100} step={0.1} value={form.igvPorcentaje ?? 18}
                        onChange={e => setForm(p => ({ ...p, igvPorcentaje: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Serie Boleta</label>
                      <Input value={form.serieBoleta ?? 'BBB1'} onChange={field('serieBoleta')} placeholder="BBB1" maxLength={10} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Serie Factura</label>
                      <Input value={form.serieFactura ?? 'FFF1'} onChange={field('serieFactura')} placeholder="FFF1" maxLength={10} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium flex items-center gap-1.5"><FileText size={13} className="text-muted-foreground" />Pie de página en PDFs</label>
                      <Input value={form.piePaginaPdf ?? ''} onChange={field('piePaginaPdf')} placeholder="Ej: Gracias por su preferencia · RUC 20512345678" />
                    </div>
                  </div>

                  {/* OSE */}
                  <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap size={15} className="text-indigo-600 dark:text-indigo-400" />
                      <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                        Integración OSE — Envío a SUNAT
                      </p>
                      {oseTokenGuardado && (
                        <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          ✓ Configurado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400">
                      Conecta tu cuenta de Nubefact, Efact u otro OSE para emitir comprobantes con validez oficial ante SUNAT.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-indigo-800 dark:text-indigo-300">URL del OSE</label>
                      <Input value={form.oseUrl ?? ''} onChange={field('oseUrl')}
                        placeholder="https://api.nubefact.com/api/v1/tu-empresa-slug" className="font-mono text-xs" />
                      <p className="text-[11px] text-muted-foreground">La URL que te dio tu OSE al crear tu empresa, incluye el slug final.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Token API del OSE</label>
                      <Input type="password" value={form.oseToken ?? ''} onChange={field('oseToken')}
                        placeholder={oseTokenGuardado ? '••••••  (token guardado — deja vacío para no cambiar)' : 'Pega tu token API aquí'}
                        className="font-mono text-xs" autoComplete="new-password" />
                      <p className="text-[11px] text-muted-foreground">
                        En Nubefact: <strong>Mi perfil → Token de API</strong>.
                        {oseTokenGuardado && ' Deja vacío si no quieres cambiar el token actual.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      <Save size={14} className="mr-2" />{saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── 3. Zona de peligro ───────────────────────────────────────────── */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de peligro
          </CardTitle>
          <CardDescription>Acciones irreversibles en tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
            <h3 className="font-semibold mb-1">Eliminar cuenta</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isAdmin
                ? 'Como administrador, eliminar tu cuenta eliminará toda la información de tu empresa de forma permanente.'
                : 'Tu usuario será desactivado pero puede ser recuperado por un administrador.'}
            </p>
            <Button variant="destructive" onClick={handleDeleteClick} disabled={deleteLoading} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {deleteLoading ? 'Validando...' : 'Eliminar cuenta'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
