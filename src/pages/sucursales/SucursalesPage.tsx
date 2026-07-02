import { useEffect, useState } from 'react';
import { sucursalService, type SucursalDTO } from '../../services/sucursal.service';
import { useSucursalStore } from '../../store/sucursalStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import {
  Building2, Plus, Edit, Trash2, MapPin, Phone, Mail,
  Star, CheckCircle, XCircle, Store,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_SUCURSALES = 5;

const emptyForm: Omit<SucursalDTO, 'id'> = {
  nombre: '',
  direccion: '',
  telefono: '',
  email: '',
};

export function SucursalesPage() {
  const { sucursales: storeList, setSucursales } = useSucursalStore();
  const [sucursales, setSucursalesLocal] = useState<SucursalDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<SucursalDTO | null>(null);
  const [form, setForm] = useState<Omit<SucursalDTO, 'id'>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await sucursalService.listar();
      setSucursalesLocal(data);
      setSucursales(data); // sincronizar con el store global
    } catch {
      toast.error('Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ── Abrir modal ──────────────────────────────────────────────────────────────

  const abrirCrear = () => {
    setEditando(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const abrirEditar = (s: SucursalDTO) => {
    setEditando(s);
    setForm({ nombre: s.nombre, direccion: s.direccion ?? '', telefono: s.telefono ?? '', email: s.email ?? '' });
    setDialogOpen(true);
  };

  // ── Guardar ──────────────────────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      if (editando) {
        await sucursalService.actualizar(editando.id, form);
        toast.success('Sucursal actualizada');
      } else {
        await sucursalService.crear(form);
        toast.success('Sucursal creada');
      }
      setDialogOpen(false);
      cargar();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Desactivar ───────────────────────────────────────────────────────────────

  const handleDesactivar = async () => {
    if (confirmId == null) return;
    try {
      await sucursalService.desactivar(confirmId);
      toast.success('Sucursal desactivada');
      cargar();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se puede desactivar');
    } finally {
      setConfirmId(null);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────

  const activas    = sucursales.filter((s) => s.activo).length;
  const principal  = sucursales.find((s) => s.esPrincipal);
  const restantes  = MAX_SUCURSALES - activas;

  // ── UI ───────────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 size={24} className="text-primary" />
            Mis Sucursales
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Plan Pro · hasta {MAX_SUCURSALES} locales activos
          </p>
        </div>
        <Button
          onClick={abrirCrear}
          disabled={activas >= MAX_SUCURSALES}
          title={activas >= MAX_SUCURSALES ? `Límite de ${MAX_SUCURSALES} sucursales alcanzado` : ''}
        >
          <Plus size={16} />
          Nueva sucursal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sucursales activas</p>
              <p className="text-2xl font-bold">{activas}<span className="text-base font-normal text-muted-foreground">/{MAX_SUCURSALES}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Star size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sucursal principal</p>
              <p className="text-sm font-semibold truncate max-w-[140px]">{principal?.nombre ?? '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${restantes > 0 ? 'bg-emerald-500/10' : 'bg-muted'}`}>
              <Plus size={18} className={restantes > 0 ? 'text-emerald-500' : 'text-muted-foreground'} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Puedes agregar</p>
              <p className="text-2xl font-bold">{restantes > 0 ? restantes : 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">local{restantes !== 1 ? 'es' : ''} más</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de sucursales */}
      {sucursales.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">Aún no tienes sucursales configuradas</p>
            <p className="text-sm mt-1">Al hacer el upgrade al plan Pro se crea automáticamente tu sucursal principal.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sucursales.map((s) => (
            <Card key={s.id} className={`border shadow-sm transition-all ${s.esPrincipal ? 'border-primary/30 bg-primary/5' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${s.esPrincipal ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Building2 size={15} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{s.nombre}</CardTitle>
                      {s.esPrincipal && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Principal</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.activo
                      ? <CheckCircle size={14} className="text-emerald-500" title="Activa" />
                      : <XCircle size={14} className="text-muted-foreground" title="Inactiva" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3 space-y-1.5">
                {s.direccion && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin size={11} className="shrink-0" /> {s.direccion}
                  </p>
                )}
                {s.telefono && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone size={11} className="shrink-0" /> {s.telefono}
                  </p>
                )}
                {s.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail size={11} className="shrink-0" /> {s.email}
                  </p>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => abrirEditar(s)}>
                    <Edit size={12} /> Editar
                  </Button>
                  {!s.esPrincipal && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                      onClick={() => setConfirmId(s.id)}
                      title="Desactivar sucursal"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editando ? 'Editar sucursal' : 'Nueva sucursal'}
      >
        <div className="space-y-4 p-1">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre <span className="text-red-500">*</span></label>
            <Input
              placeholder="Ej: Sucursal Miraflores"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Dirección</label>
            <Input
              placeholder="Ej: Av. Larco 123, Miraflores"
              value={form.direccion ?? ''}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                placeholder="Ej: 01 234 5678"
                value={form.telefono ?? ''}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="local@negocio.com"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleGuardar} disabled={saving}>
              {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm desactivar */}
      <ConfirmDialog
        isOpen={confirmId != null}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDesactivar}
        title="¿Desactivar sucursal?"
        message="Los datos de esta sucursal se conservan pero el local quedará inactivo. Esta acción se puede revertir desde soporte."
        confirmText="Desactivar"
        variant="danger"
      />
    </div>
  );
}
