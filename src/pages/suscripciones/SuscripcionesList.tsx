import { useEffect, useState } from 'react';
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
import { CreditCard, Plus, Edit2, Trash2, XCircle, CheckCircle, Search, DollarSign, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';

const PLAN_PRICES: Record<string, number> = {
  FREE: 0,
  BASICO: 50,
  PRO: 100,
};

export function SuscripcionesList() {
  const { userId } = useCurrentUser();
  const { canView, canEdit } = usePermissions();
  const [suscripciones, setSuscripciones] = useState<SuscripcionDTO[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

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
      console.log('🔄 Actualizando usuarioPrincipalId:', userId);
      setFormData((prev) => ({
        ...prev,
        usuarioPrincipalId: userId,
      }));
    }
  }, [userId]);

  useEffect(() => {
    fetchSuscripciones();
    fetchUsuarios();
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const data = await usuarioService.getAll();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const handlePlanChange = (newPlanId: string) => {
    setFormData({
      ...formData,
      planId: newPlanId,
      precioMensual: PLAN_PRICES[newPlanId] || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('📤 Datos que se envían:', JSON.stringify(formData, null, 2));

    try {
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
      console.log('❌ Error completo:', error);
      console.log('❌ Response data:', error.response?.data);
      const message = error.response?.data?.message || error.response?.data?.mensajes?.precioMensual || error.response?.data?.mensaje || error.message || 'Error al guardar suscripción';
      toast.error(message);
    }
  };

  const handleEdit = (suscripcion: SuscripcionDTO) => {
    setFormData(suscripcion);
    setEditingId(suscripcion.id!);
    setIsDialogOpen(true);
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
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
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
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
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
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al eliminar suscripción');
        }
      },
    });
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

  const filteredSuscripciones = suscripciones.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    return (
      s.planId?.toLowerCase().includes(searchLower) ||
      s.estado?.toLowerCase().includes(searchLower) ||
      s.metodoPago?.toLowerCase().includes(searchLower)
    );
  });

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'ACTIVA':
        return <Badge variant="success">Activa</Badge>;
      case 'CANCELADA':
        return <Badge variant="secondary">Cancelada</Badge>;
      case 'SUSPENDIDA':
        return <Badge variant="destructive">Suspendida</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const totalActivas = suscripciones.filter(s => s.estado === 'ACTIVA').length;
  const totalCanceladas = suscripciones.filter(s => s.estado === 'CANCELADA').length;
  const ingresosMensuales = suscripciones
    .filter(s => s.estado === 'ACTIVA')
    .reduce((sum, s) => sum + s.precioMensual, 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suscripciones</h1>
          <p className="text-muted-foreground">
            Gestiona las suscripciones y planes
          </p>
        </div>
        {canEdit('SUSCRIPCIONES') && (
          <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCanceladas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/.{ingresosMensuales.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por plan, estado o método de pago..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Suscripciones</CardTitle>
          <CardDescription>
            {filteredSuscripciones.length} suscripción(es) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSuscripciones.length === 0 ? (
            <EmptyState
              title="No hay suscripciones"
              description="No se encontraron suscripciones en el sistema"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* <TableHead>ID</TableHead> */}
                    <TableHead>Usuario</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuscripciones.map((suscripcion) => (
                    <TableRow key={suscripcion.id}>
                      {/* <TableCell className="font-medium">#{suscripcion.id}</TableCell> */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{usuarios.find(u => u.id === suscripcion.usuarioPrincipalId)?.nombre || 'Sin nombre'}</p>
                              {/* <p className="text-xs text-muted-foreground">ID: {venta.vendedorId}</p> */}
                            </div>
                          </div>
                        {/* {usuarios.find(u => u.id === suscripcion.usuarioPrincipalId)?.nombre || 'Usuario Desconocido'} */}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{suscripcion.planId}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        S/.{suscripcion.precioMensual.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {suscripcion.metodoPago || 'N/A'}
                        {suscripcion.ultimos4Digitos && ` •••• ${suscripcion.ultimos4Digitos}`}
                      </TableCell>
                      <TableCell>{getEstadoBadge(suscripcion.estado || '')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit('SUSCRIPCIONES') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(suscripcion)}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}

                          {canEdit('SUSCRIPCIONES') && (
                            suscripcion.estado === 'ACTIVA' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancel(suscripcion.id!)}
                                title="Cancelar"
                              >
                                <XCircle className="h-4 w-4 text-orange-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleActivate(suscripcion.id!)}
                                title="Activar"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )
                          )}

                          {canEdit('SUSCRIPCIONES') && (
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title={editingId ? 'Editar Suscripción' : 'Nueva Suscripción'}
        description={
          editingId
            ? 'Actualiza la información de la suscripción'
            : 'Completa los datos para crear una nueva suscripción'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Usuario
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.usuarioPrincipalId}
                onChange={(e) => setFormData({ ...formData, usuarioPrincipalId: parseInt(e.target.value) })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value={0}>Seleccionar usuario</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.id} - {usuario.nombre} ({usuario.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Plan
                <span className="text-red-500">*</span>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Precio Mensual (S/.)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.precioMensual}
                disabled={true}
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Se calcula automáticamente según el plan seleccionado
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Estado
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ACTIVA">Activa</option>
                <option value="CANCELADA">Cancelada</option>
                <option value="SUSPENDIDA">Suspendida</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Método de Pago
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.metodoPago}
                onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">Seleccionar método</option>
                <option value="TARJETA">Tarjeta de Crédito</option>
                <option value="DEBITO">Tarjeta de Débito</option>
                <option value="PAYPAL">PayPal</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Últimos 4 Dígitos (Tarjeta)</label>
              <Input
                type="text"
                placeholder="1234"
                maxLength={4}
                value={formData.ultimos4Digitos}
                onChange={(e) => setFormData({ ...formData, ultimos4Digitos: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingId ? 'Actualizar' : 'Crear'} Suscripción
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
          if (confirmDialog.action) {
            await confirmDialog.action();
          }
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}