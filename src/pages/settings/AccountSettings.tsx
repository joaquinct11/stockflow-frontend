import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { DeleteAccountModal } from '../../components/ui/DeleteAccountModal';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { usuarioService } from '../../services/usuario.service';
import { tenantConfigService } from '../../services/tenantConfig.service';
import {
  Trash2, AlertTriangle, CreditCard, CheckCircle, XCircle, Clock,
  Building2, Upload, X, Save, Percent, FileText, Phone, Mail,
  MapPin, Hash, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { DeleteAccountValidationDTO, TenantConfigDTO } from '../../types';

export function AccountSettings() {
  const { user, suscripcionEstado } = useAuthStore();
  const { setConfig } = useTenantConfigStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Eliminar cuenta ────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [validacion, setValidacion] = useState<DeleteAccountValidationDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Config del negocio ─────────────────────────────────────────────────────
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TenantConfigDTO>({
    nombreNegocio: '',
    ruc: '',
    direccion: '',
    telefono: '',
    emailContacto: '',
    ciudad: '',
    logoBase64: null,
    moneda: 'S/.',
    igvPorcentaje: 18,
    piePaginaPdf: '',
    serieBoleta: 'B001',
    serieFactura: 'F001',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const isAdmin = user?.rol === 'ADMIN';

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
      setForm({
        nombreNegocio: data.nombreNegocio ?? '',
        ruc: data.ruc ?? '',
        direccion: data.direccion ?? '',
        telefono: data.telefono ?? '',
        emailContacto: data.emailContacto ?? '',
        ciudad: data.ciudad ?? '',
        logoBase64: data.logoBase64 ?? null,
        moneda: data.moneda ?? 'S/.',
        igvPorcentaje: data.igvPorcentaje ?? 18,
        piePaginaPdf: data.piePaginaPdf ?? '',
        serieBoleta: data.serieBoleta ?? 'B001',
        serieFactura: data.serieFactura ?? 'F001',
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
    if (file.size > 500 * 1024) {
      toast.error('El logo no puede superar 500 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setLogoPreview(b64);
      setForm((prev) => ({ ...prev, logoBase64: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setForm((prev) => ({ ...prev, logoBase64: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  // ── Eliminar cuenta ────────────────────────────────────────────────────────
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
    if (validacion.tipo === 'TENANT_OWNER') {
      await usuarioService.eliminarCuentaCompleta(user.usuarioId);
    } else {
      await usuarioService.deactivate(user.usuarioId);
    }
  };

  // ── Plan ───────────────────────────────────────────────────────────────────
  const planId = user?.suscripcion?.planId ?? 'BASICO';
  const planLabel = planId === 'PRO' ? 'Pro' : 'Básico';
  const planPrecio = planId === 'PRO' ? 'S/ 99.99/mes' : 'S/ 49.99/mes';
  const estadoSus = suscripcionEstado ?? user?.suscripcion?.estado ?? 'SIN_SUSCRIPCION';

  function estadoBadge(estado: string) {
    switch (estado) {
      case 'ACTIVA':     return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Activa</Badge>;
      case 'CANCELADA':  return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>;
      case 'SUSPENDIDA': return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Suspendida</Badge>;
      case 'PENDIENTE':  return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      default:           return <Badge variant="outline">Sin suscripción</Badge>;
    }
  }

  const field = (key: keyof TenantConfigDTO) => (
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administra los datos de tu negocio y tu cuenta</p>
      </div>

      {/* ── Configuración del negocio (solo ADMIN) ─────────────────────────── */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos del negocio
            </CardTitle>
            <CardDescription>
              Esta información aparece en los PDFs que generas (OC, reportes, comprobantes)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {configLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Cargando configuración...
              </div>
            ) : (
              <>
                {/* Logo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Logo del negocio</label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative w-24 h-24 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                        <img src={logoPreview} alt="Logo" className="object-contain w-full h-full p-1" />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute top-1 right-1 rounded-full bg-destructive text-white p-0.5 hover:bg-destructive/80"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                        <Building2 size={24} />
                        <span className="text-[10px]">Sin logo</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={14} className="mr-2" />
                        {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                      </Button>
                      <p className="text-xs text-muted-foreground">PNG, JPG · Máx. 500 KB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>
                </div>

                {/* Info general */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Building2 size={13} className="text-muted-foreground" />
                      Nombre del negocio
                    </label>
                    <Input value={form.nombreNegocio ?? ''} onChange={field('nombreNegocio')} placeholder="Ej: Farmacia San José" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Hash size={13} className="text-muted-foreground" />
                      RUC
                    </label>
                    <Input value={form.ruc ?? ''} onChange={field('ruc')} placeholder="20512345678" maxLength={11} />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin size={13} className="text-muted-foreground" />
                      Dirección
                    </label>
                    <Input value={form.direccion ?? ''} onChange={field('direccion')} placeholder="Av. Lima 123, Miraflores" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin size={13} className="text-muted-foreground" />
                      Ciudad
                    </label>
                    <Input value={form.ciudad ?? ''} onChange={field('ciudad')} placeholder="Lima" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Phone size={13} className="text-muted-foreground" />
                      Teléfono
                    </label>
                    <Input value={form.telefono ?? ''} onChange={field('telefono')} placeholder="987 654 321" />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Mail size={13} className="text-muted-foreground" />
                      Email de contacto
                    </label>
                    <Input value={form.emailContacto ?? ''} onChange={field('emailContacto')} placeholder="contacto@minegocio.com" type="email" />
                  </div>
                </div>

                {/* Facturación */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Receipt size={14} />
                    Facturación
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        Moneda
                      </label>
                      <Input value={form.moneda ?? 'S/.'} onChange={field('moneda')} placeholder="S/." />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <Percent size={13} className="text-muted-foreground" />
                        IGV (%)
                      </label>
                      <Input
                        type="number" min={0} max={100} step={0.1}
                        value={form.igvPorcentaje ?? 18}
                        onChange={(e) => setForm((prev) => ({ ...prev, igvPorcentaje: Number(e.target.value) }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Serie Boleta</label>
                      <Input value={form.serieBoleta ?? 'B001'} onChange={field('serieBoleta')} placeholder="B001" maxLength={10} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Serie Factura</label>
                      <Input value={form.serieFactura ?? 'F001'} onChange={field('serieFactura')} placeholder="F001" maxLength={10} />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <FileText size={13} className="text-muted-foreground" />
                        Pie de página en PDFs
                      </label>
                      <Input
                        value={form.piePaginaPdf ?? ''}
                        onChange={field('piePaginaPdf')}
                        placeholder="Ej: Gracias por su preferencia · RUC 20512345678"
                      />
                    </div>
                  </div>
                </div>

                {/* Vista previa de cómo quedará en el PDF */}
                {(form.nombreNegocio || logoPreview) && (
                  <div className="rounded-lg border border-dashed p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Vista previa — encabezado PDF
                    </p>
                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 rounded border text-sm">
                      {logoPreview && (
                        <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain shrink-0" />
                      )}
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
                    <Save size={15} className="mr-2" />
                    {saving ? 'Guardando...' : 'Guardar configuración'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Mi Plan ────────────────────────────────────────────────────────── */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Mi Plan
            </CardTitle>
            <CardDescription>Información de tu suscripción activa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">Plan {planLabel}</span>
                  {estadoBadge(estadoSus)}
                </div>
                <p className="text-sm text-muted-foreground">{planPrecio}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/suscripciones')}>
                  Gestionar suscripción
                </Button>
                {(estadoSus === 'CANCELADA' || estadoSus === 'SUSPENDIDA' || estadoSus === 'SIN_SUSCRIPCION') && (
                  <Button size="sm" onClick={() => navigate('/checkout?plan=BASICO')}>
                    Activar plan
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Zona de peligro ────────────────────────────────────────────────── */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de Peligro
          </CardTitle>
          <CardDescription>Acciones irreversibles en tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
            <h3 className="font-semibold mb-2">Eliminar Cuenta</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isAdmin
                ? 'Como administrador, eliminar tu cuenta eliminará toda la información de tu empresa de forma permanente.'
                : 'Tu usuario será desactivado pero puede ser recuperado por un administrador.'}
            </p>
            <Button variant="destructive" onClick={handleDeleteClick} disabled={deleteLoading} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {deleteLoading ? 'Validando...' : 'Eliminar Cuenta'}
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
