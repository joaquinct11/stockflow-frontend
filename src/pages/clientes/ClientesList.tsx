import { useEffect, useState } from 'react';
import { clienteService, type ClienteDTO } from '../../services/cliente.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  Plus, Trash2, Edit, Search, Users, Phone, Mail,
  CheckCircle, XCircle, IdCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

type EstadoFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

const TIPOS_DOCUMENTO = ['DNI', 'RUC', 'CE', 'PASAPORTE'];

const emptyForm: ClienteDTO = {
  nombre: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  telefono: '',
  email: '',
  direccion: '',
  activo: true,
};

export function ClientesList() {
  const { canCreate, canEdit, canDelete, canToggleState, canView } = usePermissions();
  const hasViewPermission = canView('CLIENTES');

  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteDTO | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

  const [formData, setFormData] = useState<ClienteDTO>(emptyForm);

  useEffect(() => {
    if (hasViewPermission) fetchClientes();
    else setLoading(false);
  }, [hasViewPermission]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, estadoFilter]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const data = await clienteService.getAll();
      setClientes(data);
    } catch {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await clienteService.update(editingCliente.id!, formData);
        toast.success('Cliente actualizado exitosamente');
      } else {
        await clienteService.create(formData);
        toast.success('Cliente creado exitosamente');
      }
      resetForm();
      await fetchClientes();
    } catch {
      toast.error(editingCliente ? 'Error al actualizar cliente' : 'Error al crear cliente');
    }
  };

  const handleEdit = (c: ClienteDTO) => {
    setEditingCliente(c);
    setFormData({
      nombre: c.nombre,
      tipoDocumento: c.tipoDocumento || 'DNI',
      numeroDocumento: c.numeroDocumento || '',
      telefono: c.telefono || '',
      email: c.email || '',
      direccion: c.direccion || '',
      activo: c.activo,
    });
    setIsDialogOpen(true);
  };

  const handleActivate = (id: number, nombre: string) => {
    setConfirmDialog({
      isOpen: true, type: 'success',
      title: 'Activar Cliente',
      description: `¿Estás seguro de activar el cliente "${nombre}"?`,
      confirmText: 'Activar',
      action: async () => {
        try {
          await clienteService.activate(id);
          toast.success('Cliente activado');
          await fetchClientes();
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
        } catch { toast.error('Error al activar cliente'); }
      },
    });
  };

  const handleDeactivate = (id: number, nombre: string) => {
    setConfirmDialog({
      isOpen: true, type: 'warning',
      title: 'Desactivar Cliente',
      description: `¿Estás seguro de desactivar al cliente "${nombre}"?`,
      confirmText: 'Desactivar',
      action: async () => {
        try {
          await clienteService.deactivate(id);
          toast.success('Cliente desactivado');
          await fetchClientes();
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
        } catch { toast.error('Error al desactivar cliente'); }
      },
    });
  };

  const handleDelete = (id: number, nombre: string) => {
    setConfirmDialog({
      isOpen: true, type: 'danger',
      title: 'Eliminar Cliente',
      description: `¿Estás seguro de eliminar permanentemente al cliente "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await clienteService.delete(id);
          toast.success('Cliente eliminado');
          await fetchClientes();
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
        } catch { toast.error('Error al eliminar cliente'); }
      },
    });
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingCliente(null);
    setIsDialogOpen(false);
  };

  const filtered = clientes.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      c.nombre.toLowerCase().includes(q) ||
      c.numeroDocumento?.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (estadoFilter === 'ACTIVOS') return c.activo;
    if (estadoFilter === 'INACTIVOS') return !c.activo;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const total = clientes.length;
  const activos = clientes.filter((c) => c.activo).length;
  const inactivos = clientes.filter((c) => !c.activo).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona la cartera de clientes de tu negocio</p>
        </div>
        {canCreate('CLIENTES') && (
          <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        )}
      </div>

      {!hasViewPermission ? (
        <EmptyState
          icon={Users}
          title="Sin acceso al listado"
          description="No tienes permisos para ver el listado de clientes."
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 [&>*:last-child]:col-span-2 [&>*:last-child]:mx-auto [&>*:last-child]:max-w-[calc(50%-0.5rem)] sm:[&>*:last-child]:col-auto sm:[&>*:last-child]:max-w-none sm:[&>*:last-child]:mx-0">
            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Clientes</p>
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="text-violet-600 dark:text-violet-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">{total}</div>
                <p className="text-xs text-muted-foreground mt-1">Registrados</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activos</p>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="text-emerald-600 dark:text-emerald-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{activos}</div>
                <p className="text-xs text-muted-foreground mt-1">Disponibles</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inactivos</p>
                <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="text-red-600 dark:text-red-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">{inactivos}</div>
                <p className="text-xs text-muted-foreground mt-1">Deshabilitados</p>
              </CardContent>
            </Card>
          </div>

          {/* Search + Filtro */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar por nombre, documento, teléfono o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <div className="flex w-full overflow-x-auto sm:inline-flex sm:w-auto sm:shrink-0 items-center rounded-lg border border-input bg-muted p-1 gap-0.5">
                  {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as EstadoFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setEstadoFilter(f)}
                      className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        estadoFilter === f
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }`}
                    >
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Lista de Clientes</CardTitle>
              <CardDescription>{filtered.length} cliente(s) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <EmptyState icon={Users} title="Todavía no hay clientes" description="Registra clientes para asociarlos a tus ventas, llevar un historial y personalizar la atención." />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Nombre</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-semibold">{c.nombre}</TableCell>
                            <TableCell>
                              {c.tipoDocumento && c.numeroDocumento ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {c.tipoDocumento}
                                  </span>
                                  <span className="text-sm">{c.numeroDocumento}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{c.telefono || '-'}</TableCell>
                            <TableCell>{c.email || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={c.activo ? 'success' : 'destructive'}>
                                {c.activo ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {canToggleState('CLIENTES') && (
                                  c.activo ? (
                                    <Button variant="ghost" size="icon" onClick={() => handleDeactivate(c.id!, c.nombre)} title="Desactivar">
                                      <XCircle className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="icon" onClick={() => handleActivate(c.id!, c.nombre)} title="Activar">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    </Button>
                                  )
                                )}
                                {canEdit('CLIENTES') && (
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} title="Editar">
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </Button>
                                )}
                                {canDelete('CLIENTES') && (
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id!, c.nombre)} title="Eliminar">
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
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filtered.length}
                    itemsPerPage={itemsPerPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog crear/editar */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
        description={editingCliente ? 'Actualiza la información del cliente' : 'Registra un nuevo cliente'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{editingCliente ? 'Editar cliente' : 'Registrar cliente'}</p>
              <p className="text-xs text-muted-foreground">Los campos con * son obligatorios.</p>
            </div>
            <Badge variant={editingCliente ? 'secondary' : 'success'} className="w-fit">
              {editingCliente ? 'Edición' : 'Nuevo'}
            </Badge>
          </div>

          {/* Datos principales */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Datos principales</p>
              <p className="text-xs text-muted-foreground">Información básica del cliente.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Nombre <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Users className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ej: Juan Pérez García"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de documento</label>
                <select
                  value={formData.tipoDocumento}
                  onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Número de documento</label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="12345678"
                    value={formData.numeroDocumento}
                    onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                    className="pl-10 h-11"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Contacto</p>
              <p className="text-xs text-muted-foreground">Datos para comunicación.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="999 999 999"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold">Dirección</p>
              <p className="text-xs text-muted-foreground">Opcional, útil para entregas y facturación.</p>
            </div>
            <textarea
              placeholder="Av. Ejemplo 123, Lima, Perú"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={resetForm} className="h-11">Cancelar</Button>
            <Button type="submit" className="h-11">
              {editingCliente ? 'Actualizar' : 'Crear'} Cliente
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        onConfirm={async () => { if (confirmDialog.action) await confirmDialog.action(); }}
        onCancel={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
