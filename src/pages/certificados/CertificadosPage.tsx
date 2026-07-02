import { useEffect, useState } from 'react';
import { certificadoService } from '../../services/certificado.service';
import { usuarioService } from '../../services/usuario.service';
import type { CertificadoDTO, Usuario } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import {
  Plus, Edit2, Trash2, Award, AlertTriangle, CheckCircle2,
  Clock, Calendar, User, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useSucursalStore } from '../../store/sucursalStore';

// Carnet de sanidad se detecta por texto para mostrar selector de usuario
const ES_CARNET = (tipo: string) =>
  tipo.toLowerCase().includes('carnet') || tipo.toLowerCase().includes('sanidad');

// ── Semáforo de estado ───────────────────────────────────────────────────────

function EstadoBadge({ estado, diasRestantes }: { estado?: string; diasRestantes?: number }) {
  if (estado === 'VENCIDO') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Vencido hace {Math.abs(diasRestantes ?? 0)} día{Math.abs(diasRestantes ?? 0) !== 1 ? 's' : ''}
      </Badge>
    );
  }
  if (estado === 'POR_VENCER') {
    return (
      <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400 gap-1">
        <Clock className="h-3 w-3" />
        Vence en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Vigente
    </Badge>
  );
}

// ── Formulario vacío ─────────────────────────────────────────────────────────

const FORM_VACIO: CertificadoDTO = {
  tipo: '',
  descripcion: '',
  usuarioId: undefined,
  fechaVencimiento: '',
  diasAlerta: 30,
  observaciones: '',
};

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CertificadoDTO>(FORM_VACIO);
  const [saving, setSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false, id: null,
  });

  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  useEffect(() => {
    if (!sucursalLoaded) return;
    fetchData();
  }, [sucursalLoaded, sucursalId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [certs, tiposData] = await Promise.all([
        certificadoService.listar(sucursalId),
        certificadoService.getTipos(),
      ]);
      setCertificados(certs);
      setTipos(tiposData);
    } catch {
      toast.error('Error al cargar los certificados');
    } finally {
      setLoading(false);
    }
    // Usuarios: solo ADMIN/GERENTE tienen acceso; ignorar 403 silenciosamente
    try {
      const users = await usuarioService.getAll(true);
      setUsuarios(users);
    } catch { /* sin permiso */ }
  };

  const handleNuevo = () => {
    setFormData(FORM_VACIO);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEditar = (cert: CertificadoDTO) => {
    setFormData({
      tipo: cert.tipo,
      descripcion: cert.descripcion,
      usuarioId: cert.usuarioId,
      fechaVencimiento: cert.fechaVencimiento,
      diasAlerta: cert.diasAlerta ?? 30,
      observaciones: cert.observaciones ?? '',
    });
    setEditingId(cert.id!);
    setIsDialogOpen(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await certificadoService.actualizar(editingId, formData);
        toast.success('Certificado actualizado');
      } else {
        await certificadoService.crear({ ...formData, sucursalId });
        toast.success('Certificado registrado');
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirmDialog.id) return;
    try {
      await certificadoService.eliminar(confirmDialog.id);
      toast.success('Certificado eliminado');
      fetchData();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setConfirmDialog({ isOpen: false, id: null });
    }
  };

  // ── Filtro ────────────────────────────────────────────────────────────────

  const certificadosFiltrados = certificados.filter(c => {
    if (filtroEstado === 'TODOS') return true;
    return c.estado === filtroEstado;
  });

  const contadores = {
    VENCIDO:   certificados.filter(c => c.estado === 'VENCIDO').length,
    POR_VENCER: certificados.filter(c => c.estado === 'POR_VENCER').length,
    VIGENTE:   certificados.filter(c => c.estado === 'VIGENTE').length,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificados</h1>
          <p className="text-muted-foreground">
            Control de vigencias de documentos del establecimiento
          </p>
        </div>
        {canCreate('CERTIFICADOS') && (
          <Button onClick={handleNuevo}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo certificado
          </Button>
        )}
      </div>

      {/* Resumen semáforo */}
      <div className="grid grid-cols-3 gap-3">
        <Card
          className={`cursor-pointer transition-all ${filtroEstado === 'VENCIDO' ? 'ring-2 ring-destructive' : ''}`}
          onClick={() => setFiltroEstado(f => f === 'VENCIDO' ? 'TODOS' : 'VENCIDO')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-2.5">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{contadores.VENCIDO}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${filtroEstado === 'POR_VENCER' ? 'ring-2 ring-amber-400' : ''}`}
          onClick={() => setFiltroEstado(f => f === 'POR_VENCER' ? 'TODOS' : 'POR_VENCER')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2.5">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{contadores.POR_VENCER}</p>
              <p className="text-xs text-muted-foreground">Por vencer</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${filtroEstado === 'VIGENTE' ? 'ring-2 ring-emerald-400' : ''}`}
          onClick={() => setFiltroEstado(f => f === 'VIGENTE' ? 'TODOS' : 'VIGENTE')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{contadores.VIGENTE}</p>
              <p className="text-xs text-muted-foreground">Vigentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtroEstado === 'TODOS' ? 'Todos los certificados' : `Filtro: ${filtroEstado === 'VENCIDO' ? 'Vencidos' : filtroEstado === 'POR_VENCER' ? 'Por vencer' : 'Vigentes'}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certificadosFiltrados.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Sin certificados"
              description={filtroEstado === 'TODOS'
                ? 'Registra el primer certificado o documento del establecimiento.'
                : 'No hay certificados en esta categoría.'}
            />
          ) : (
            <div className="space-y-2">
              {certificadosFiltrados.map(cert => (
                <div
                  key={cert.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    cert.estado === 'VENCIDO'
                      ? 'border-destructive/30 bg-destructive/5'
                      : cert.estado === 'POR_VENCER'
                      ? 'border-amber-300/50 bg-amber-50/50 dark:border-amber-700/30 dark:bg-amber-950/20'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  {/* Icono tipo */}
                  <div className={`rounded-full p-2 shrink-0 ${
                    cert.estado === 'VENCIDO' ? 'bg-destructive/10' :
                    cert.estado === 'POR_VENCER' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    'bg-emerald-100 dark:bg-emerald-900/30'
                  }`}>
                    <Award className={`h-4 w-4 ${
                      cert.estado === 'VENCIDO' ? 'text-destructive' :
                      cert.estado === 'POR_VENCER' ? 'text-amber-600 dark:text-amber-400' :
                      'text-emerald-600 dark:text-emerald-400'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{cert.descripcion}</span>
                      <Badge variant="outline" className="text-xs">{cert.tipo}</Badge>
                    </div>
                    {cert.usuarioNombre && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" />
                        {cert.usuarioNombre}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      Vence: {new Date(cert.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-PE', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Estado */}
                  <EstadoBadge estado={cert.estado} diasRestantes={cert.diasRestantes} />

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit('CERTIFICADOS') && (
                      <Button variant="ghost" size="icon" onClick={() => handleEditar(cert)} title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete('CERTIFICADOS') && (
                      <Button
                        variant="ghost" size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDialog({ isOpen: true, id: cert.id! })}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal formulario */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingId ? 'Editar certificado' : 'Nuevo certificado'}
        description="Registra la información del documento o certificado"
      >
        <form onSubmit={handleGuardar} className="space-y-4 mt-2">

          {/* Tipo — select desde BD */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.tipo}
                onChange={e => setFormData({ ...formData, tipo: e.target.value, usuarioId: undefined })}
                required
                className="w-full h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecciona un tipo…</option>
                {tipos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {ES_CARNET(formData.tipo) ? 'Descripción (opcional)' : 'Descripción'}{' '}
              {!ES_CARNET(formData.tipo) && <span className="text-red-500">*</span>}
            </label>
            <Input
              placeholder="Notas o identificador del documento"
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              required={!ES_CARNET(formData.tipo)}
            />
          </div>

          {/* Usuario — solo para carnets */}
          {ES_CARNET(formData.tipo) && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Trabajador <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.usuarioId ?? ''}
                  onChange={e => {
                    const uid = Number(e.target.value);
                    const u = usuarios.find(u => u.id === uid);
                    setFormData({
                      ...formData,
                      usuarioId: uid || undefined,
                      descripcion: formData.descripcion || (u ? `${u.nombre} ${u.apellido ?? ''}`.trim() : ''),
                    });
                  }}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Selecciona un trabajador</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido ?? ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          {/* Fecha de vencimiento */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fecha de vencimiento <span className="text-red-500">*</span></label>
            <Input
              type="date"
              value={formData.fechaVencimiento}
              onChange={e => setFormData({ ...formData, fechaVencimiento: e.target.value })}
              required
            />
          </div>

          {/* Días de alerta */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Alertar con anticipación (días)</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={formData.diasAlerta ?? 30}
              onChange={e => setFormData({ ...formData, diasAlerta: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Recibirás alerta cuando falten {formData.diasAlerta ?? 30} días para el vencimiento.
            </p>
          </div>

          {/* Observaciones */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Observaciones <span className="text-xs text-muted-foreground font-normal">(opcional)</span></label>
            <textarea
              value={formData.observaciones ?? ''}
              onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirm eliminar */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Eliminar certificado"
        description="¿Seguro que deseas eliminar este certificado? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
        onConfirm={handleEliminar}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
}
