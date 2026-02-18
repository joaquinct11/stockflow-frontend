import { useEffect, useState } from 'react';
import { suscripcionService } from '../../services/suscripcion.service';
import type { SuscripcionDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { CreditCard, Plus, Edit2, Trash2, XCircle, CheckCircle, Search, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export function SuscripcionesList() {
  const [suscripciones, setSuscripciones] = useState<SuscripcionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<SuscripcionDTO>({
    usuarioPrincipalId: 0,
    planId: '',
    precioMensual: 0,
    estado: 'ACTIVA',
    metodoPago: '',
    ultimos4Digitos: '',
  });

  useEffect(() => {
    fetchSuscripciones();
  }, []);

  const fetchSuscripciones = async () => {
    try {
      setLoading(true);
      const data = await suscripcionService.getAll();
      setSuscripciones(data);
    } catch (error) {
      toast.error('Error al cargar suscripciones');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const message = error.response?.data?.mensaje || 'Error al guardar suscripción';
      toast.error(message);
    }
  };

  const handleEdit = (suscripcion: SuscripcionDTO) => {
    setFormData(suscripcion);
    setEditingId(suscripcion.id!);
    setShowForm(true);
  };

  const handleCancel = async (id: number) => {
    if (window.confirm('¿Estás seguro de cancelar esta suscripción?')) {
      try {
        await suscripcionService.cancel(id);
        toast.success('Suscripción cancelada');
        await fetchSuscripciones();
      } catch (error) {
        toast.error('Error al cancelar suscripción');
      }
    }
  };

  const handleActivate = async (id: number) => {
    if (window.confirm('¿Estás seguro de activar esta suscripción?')) {
      try {
        await suscripcionService.activate(id);
        toast.success('Suscripción activada');
        await fetchSuscripciones();
      } catch (error) {
        toast.error('Error al activar suscripción');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('⚠️ ¿Estás COMPLETAMENTE seguro de ELIMINAR esta suscripción?')) {
      try {
        await suscripcionService.delete(id);
        toast.success('Suscripción eliminada');
        await fetchSuscripciones();
      } catch (error) {
        toast.error('Error al eliminar suscripción');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      usuarioPrincipalId: 0,
      planId: '',
      precioMensual: 0,
      estado: 'ACTIVA',
      metodoPago: '',
      ultimos4Digitos: '',
    });
    setEditingId(null);
    setShowForm(false);
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
        <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Cancelar' : 'Nueva Suscripción'}
        </Button>
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
              ${ingresosMensuales.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Suscripción' : 'Nueva Suscripción'}</CardTitle>
            <CardDescription>
              {editingId ? 'Actualiza la información de la suscripción' : 'Completa los datos de la nueva suscripción'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Usuario ID</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={formData.usuarioPrincipalId}
                  onChange={(e) => setFormData({ ...formData, usuarioPrincipalId: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <select
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Seleccionar plan</option>
                  <option value="BASICO">Básico</option>
                  <option value="PROFESIONAL">Profesional</option>
                  <option value="EMPRESARIAL">Empresarial</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Precio Mensual ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="29.99"
                  value={formData.precioMensual}
                  onChange={(e) => setFormData({ ...formData, precioMensual: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
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
                <label className="text-sm font-medium">Método de Pago</label>
                <select
                  value={formData.metodoPago}
                  onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Actualizar' : 'Crear'} Suscripción
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
                    <TableHead>ID</TableHead>
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
                      <TableCell className="font-medium">#{suscripcion.id}</TableCell>
                      <TableCell>Usuario #{suscripcion.usuarioPrincipalId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{suscripcion.planId}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${suscripcion.precioMensual.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {suscripcion.metodoPago || 'N/A'}
                        {suscripcion.ultimos4Digitos && ` •••• ${suscripcion.ultimos4Digitos}`}
                      </TableCell>
                      <TableCell>{getEstadoBadge(suscripcion.estado || '')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(suscripcion)}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          
                          {suscripcion.estado === 'ACTIVA' ? (
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
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(suscripcion.id!)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
    </div>
  );
}