import { useEffect, useMemo, useState } from 'react';
import { suscripcionService } from '../../services/suscripcion.service';
import { usuarioService } from '../../services/usuario.service';
import type { SuscripcionDTO, Usuario } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  XCircle,
  CheckCircle,
  Search,
  DollarSign,
  User as UserIcon,
  Lock,
  CircleDot,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';

const PLAN_PRICES: Record<string, number> = {
  FREE: 0,
  BASICO: 50,
  PRO: 100,
};

type EstadoFilter = 'TODOS' | 'ACTIVA' | 'CANCELADA' | 'SUSPENDIDA';

function estadoBadge(estado: string) {
  switch (estado) {
    case 'ACTIVA':
      return (
        <Badge variant="success">
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Activa
        </Badge>
      );
    case 'CANCELADA':
      return (
        <Badge variant="secondary">
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Cancelada
        </Badge>
      );
    case 'SUSPENDIDA':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Suspendida
        </Badge>
      );
    default:
      return <Badge variant="outline">{estado || '—'}</Badge>;
  }
}

export function SuscripcionesList() {
  const { userId } = useCurrentUser();
  const { canView, canCreate, canEdit, canDelete, canToggleState, isAdmin } = usePermissions();

  const [suscripciones, setSuscripciones] = useState<SuscripcionDTO[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODOS');

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

  // UI/Producto decision:
  // - En general “Suscripción” es un recurso financiero: normalmente NO se edita libremente el estado/precio,
  //   sino que se “CANCELA/ACTIVA” (acciones) y el plan/metodo se ajusta por “Actualizar”.
  // - Por eso el formulario:
  //   * En “Nueva”: usuario + plan + método + últimos 4.
  //   * En “Editar”: permitir cambiar plan y método/últimos4 (pero NO editar precio manualmente y NO cambiar estado aquí).
  //   * El estado se cambia SOLO con botones (cancelar/activar).
  const [formData, setFormData] = useState<SuscripcionDTO>({
    usuarioPrincipalId: 0,
    planId: '',
    precioMensual: 0,
    estado: 'ACTIVA',
    metodoPago: '',
    ultimos4Digitos: '',
  });

  useEffect(() => {
    if (userId) {
      setFormData((prev) => ({ ...prev, usuarioPrincipalId: userId }));
    }
  }, [userId]);

  useEffect(() => {
    fetchSuscripciones();
    fetchUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSuscripciones = async () => {
    try {
      setLoading(true);
      if (!canView('SUSCRIPCIONES')) {
        setSuscripciones([]);
        return;
      }
      const data = await suscripcionService.getAll();
      setSuscripciones(data);
    } catch (error) {
      toast.error('Error al cargar suscripciones');
      if (import.meta.env.DEV) console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    if (!isAdmin && !canView('USUARIOS')) return;
    try {
      const data = await usuarioService.getAll();
      setUsuarios(data);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error al cargar usuarios:', error);
    }
  };

  const usuarioNombreById = useMemo(() => {
    const m = new Map<number, Usuario>();
    usuarios.forEach((u) => {
      if (u.id != null) m.set(Number(u.id), u);
    });
    return m;
  }, [usuarios]);

  const handlePlanChange = (newPlanId: string) => {
    setFormData((prev) => ({
      ...prev,
      planId: newPlanId,
      precioMensual: PLAN_PRICES[newPlanId] || 0,
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      usuarioPrincipalId: userId || 0,
      planId: '',
      precioMensual: 0,
      estado: 'ACTIVA',
      metodoPago: '',
      ultimos4Digitos: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (suscripcion: SuscripcionDTO) => {
    setEditingId(suscripcion.id!);
    setFormData({
      ...suscripcion,
      // precio fijo por plan (si vino distinto por backend igual se muestra como readonly)
      precioMensual: suscripcion.precioMensual ?? (PLAN_PRICES[suscripcion.planId] || 0),
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      usuarioPrincipalId: userId || 0,
      planId: '',
      precioMensual: 0,
      estado: 'ACTIVA',
      metodoPago: '',
      ultimos4Digitos: '',
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Normalmente no se edita estado acá: se hace por acciones (cancelar/activar)
      // pero por compatibilidad con tu DTO, lo mandamos como venga.
      if (editingId) {
        await suscripcionService.update(editingId, formData);
        toast.success('Suscripción actualizada');
      } else {
        await suscripcionService.create(formData);
        toast.success('Suscripción creada');
      }
      resetForm();
      await fetchSuscripciones();
    } catch (error: any) {
      if (import.meta.env.DEV) console.log('❌ Error completo:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.mensajes?.precioMensual ||
        error.response?.data?.mensaje ||
        error.message ||
        'Error al guardar suscripción';
      toast.error(message);
    }
  };

  const handleCancel = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Cancelar Suscripción',
      description: '¿Estás seguro de que deseas cancelar esta suscripción? El usuario perderá acceso a los servicios.',
      confirmText: 'Cancelar Suscripción',
      action: async () => {
        try {
          await suscripcionService.cancel(id);
          toast.success('Suscripción cancelada');
          await fetchSuscripciones();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch {
          toast.error('Error al cancelar suscripción');
        }
      },
    });
  };

  const handleActivate = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'success',
      title: 'Activar Suscripción',
      description: '¿Estás seguro de que deseas activar esta suscripción?',
      confirmText: 'Activar',
      action: async () => {
        try {
          await suscripcionService.activate(id);
          toast.success('Suscripción activada');
          await fetchSuscripciones();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch {
          toast.error('Error al activar suscripción');
        }
      },
    });
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Suscripción',
      description: '⚠️ Estás a punto de eliminar esta suscripción de forma permanente. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await suscripcionService.delete(id);
          toast.success('Suscripción eliminada');
          await fetchSuscripciones();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch {
          toast.error('Error al eliminar suscripción');
        }
      },
    });
  };

  const filteredSuscripciones = suscripciones.filter((s) => {
    const q = searchTerm.toLowerCase();

    const usuario = s.usuarioPrincipalId ? usuarioNombreById.get(Number(s.usuarioPrincipalId)) : undefined;
    const nombre = usuario?.nombre?.toLowerCase() ?? '';
    const email = usuario?.email?.toLowerCase() ?? '';

    const matchesSearch =
      !q ||
      s.planId?.toLowerCase().includes(q) ||
      s.estado?.toLowerCase().includes(q) ||
      s.metodoPago?.toLowerCase().includes(q) ||
      nombre.includes(q) ||
      email.includes(q);

    if (!matchesSearch) return false;

    if (estadoFilter !== 'TODOS' && s.estado !== estadoFilter) return false;

    return true;
  });

  const totalActivas = suscripciones.filter((s) => s.estado === 'ACTIVA').length;
  const totalCanceladas = suscripciones.filter((s) => s.estado === 'CANCELADA').length;
  const ingresosMensuales = suscripciones
    .filter((s) => s.estado === 'ACTIVA')
    .reduce((sum, s) => sum + (s.precioMensual || 0), 0);

  if (loading) return <LoadingSpinner />;

  if (!canView('SUSCRIPCIONES')) {
    return (
      <EmptyState
        icon={Lock}
        title="Acceso restringido"
        description="No tienes permisos para ver el módulo de Suscripciones."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suscripciones</h1>
          <p className="text-muted-foreground">Gestiona las suscripciones y planes</p>
        </div>

        {canCreate('SUSCRIPCIONES') && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Suscripción
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suscripciones</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suscripciones.length}</div>
            <p className="text-xs text-muted-foreground">Registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{totalActivas}</div>
            <p className="text-xs text-muted-foreground">Con acceso vigente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{totalCanceladas}</div>
            <p className="text-xs text-muted-foreground">Sin acceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/.{ingresosMensuales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Solo activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Estado filter (estilo módulos) */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-6">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuario, plan, estado o método de pago..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="w-full rounded-lg border border-input bg-muted p-1">
                <div className="flex gap-1 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Filtrar por estado">
                  {(
                    [
                      { key: 'TODOS', label: 'Todos' },
                      { key: 'ACTIVA', label: '✅ Activas' },
                      { key: 'CANCELADA', label: '⛔ Canceladas' },
                      { key: 'SUSPENDIDA', label: '⚠️ Suspendidas' },
                    ] as Array<{ key: EstadoFilter; label: string }>
                  ).map((t) => {
                    const active = estadoFilter === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setEstadoFilter(t.key)}
                        className={[
                          'whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition',
                          'min-w-[140px] sm:min-w-0 flex-1',
                          active
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                        ].join(' ')}
                        aria-pressed={active}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Suscripciones</CardTitle>
          <CardDescription>{filteredSuscripciones.length} suscripción(es) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSuscripciones.length === 0 ? (
            <EmptyState title="No hay suscripciones" description="No se encontraron suscripciones con ese criterio" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredSuscripciones.map((suscripcion) => {
                    const u = suscripcion.usuarioPrincipalId
                      ? usuarioNombreById.get(Number(suscripcion.usuarioPrincipalId))
                      : undefined;

                    const canCancel = canToggleState('SUSCRIPCIONES') && suscripcion.estado === 'ACTIVA';
                    const canActivate = canToggleState('SUSCRIPCIONES') && suscripcion.estado !== 'ACTIVA';

                    return (
                      <TableRow key={suscripcion.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {u?.nombre || `Usuario #${suscripcion.usuarioPrincipalId}`}
                              </p>
                              {u?.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">{suscripcion.planId || '—'}</Badge>
                        </TableCell>

                        <TableCell className="font-semibold">S/.{(suscripcion.precioMensual ?? 0).toFixed(2)}</TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {suscripcion.metodoPago || 'N/A'}
                          {suscripcion.ultimos4Digitos && ` •••• ${suscripcion.ultimos4Digitos}`}
                        </TableCell>

                        <TableCell>{estadoBadge(suscripcion.estado || '')}</TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canCancel && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancel(suscripcion.id!)}
                                title="Cancelar"
                              >
                                <XCircle className="h-4 w-4 text-orange-600" />
                              </Button>
                            )}

                            {canActivate && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleActivate(suscripcion.id!)}
                                title="Activar"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}

                            {/* Edit: recomendado solo para cambiar plan/metodo; estado no aquí */}
                            {canEdit('SUSCRIPCIONES') && (
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(suscripcion)} title="Editar">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}

                            {canDelete('SUSCRIPCIONES') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(suscripcion.id!)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog - Crear/Editar (estilo Proveedores/Productos) */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title={editingId ? 'Editar Suscripción' : 'Nueva Suscripción'}
        description={
          editingId
            ? 'Actualiza plan y datos de pago. El estado se gestiona desde las acciones (activar/cancelar).'
            : 'Completa los datos para crear una nueva suscripción.'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Datos de la suscripción</h3>
              <p className="text-xs text-muted-foreground">Campos obligatorios marcados con *</p>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Usuario (en editar lo congelamos para evitar “mover” una suscripción a otro usuario) */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Usuario <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.usuarioPrincipalId}
                  onChange={(e) => setFormData({ ...formData, usuarioPrincipalId: parseInt(e.target.value) })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                  disabled={!!editingId || (!isAdmin && !canView('USUARIOS'))}
                >
                  <option value={0}>Seleccionar usuario</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.id} - {usuario.nombre} ({usuario.email})
                    </option>
                  ))}
                </select>
                {editingId && (
                  <p className="text-xs text-muted-foreground">
                    Para seguridad, no se puede cambiar el usuario en una suscripción existente.
                  </p>
                )}
                {!editingId && !isAdmin && !canView('USUARIOS') && (
                  <p className="text-xs text-muted-foreground">
                    No tienes permisos para listar usuarios; se asignará el usuario actual.
                  </p>
                )}
              </div>

              {/* Plan */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Plan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.planId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Seleccionar plan</option>
                  <option value="FREE">Free - S/.0/mes</option>
                  <option value="BASICO">Básico - S/.50/mes</option>
                  <option value="PRO">Pro - S/.100/mes</option>
                </select>
              </div>

              {/* Precio (readonly) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio Mensual (S/.)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.precioMensual}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Se calcula automáticamente según el plan seleccionado</p>
              </div>

              {/* Método pago */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Método de Pago <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.metodoPago}
                  onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Seleccionar método</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="DEBITO">Débito</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>

              {/* Ult 4 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Últimos 4 dígitos (opcional)</label>
                <Input
                  type="text"
                  placeholder="1234"
                  maxLength={4}
                  value={formData.ultimos4Digitos}
                  onChange={(e) => setFormData({ ...formData, ultimos4Digitos: e.target.value })}
                />
              </div>

              {/* Estado (solo informativo en el form) */}
              {editingId && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Estado actual</label>
                  <div className="h-10 rounded-md border border-input bg-muted px-3 flex items-center gap-2 text-sm">
                    <CircleDot className="h-4 w-4 text-muted-foreground" />
                    {estadoBadge(formData.estado || '')}
                    <span className="text-xs text-muted-foreground ml-auto">
                      Cambia con “Activar/Cancelar”
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {editingId ? 'Guardar cambios' : 'Crear Suscripción'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        onConfirm={async () => {
          if (confirmDialog.action) await confirmDialog.action();
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}