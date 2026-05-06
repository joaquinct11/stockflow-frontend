import { useEffect, useState } from 'react';
import { proveedorService } from '../../services/proveedor.service';
import type { ProveedorDTO } from '../../types';
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
import { Plus, Trash2, Edit, Search, Building2, User, Phone, Mail, CheckCircle, XCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

type EstadoProveedorFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

export function ProveedoresList() {
  const { canCreate, canEdit, canDelete, canToggleState, canView } = usePermissions();
  const hasViewPermission = canView('PROVEEDORES');

  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<ProveedorDTO | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ NUEVO - filtro por estado
  const [estadoFilter, setEstadoFilter] = useState<EstadoProveedorFilter>('TODOS');

  // ✅ Estados de paginación
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

  const [formData, setFormData] = useState<ProveedorDTO>({
    nombre: '',
    ruc: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    activo: true,
    tenantId: 'farmacia-001',
  });

  useEffect(() => {
    if (hasViewPermission) {
      fetchProveedores();
    } else {
      setLoading(false);
    }
  }, [hasViewPermission]);

  // ✅ Resetear página al buscar / cambiar filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter]);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const data = await proveedorService.getAll();
      setProveedores(data);
    } catch (error) {
      toast.error('Error al cargar proveedores');
      if (import.meta.env.DEV) console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProveedor) {
        await proveedorService.update(editingProveedor.id!, formData);
        toast.success('Proveedor actualizado exitosamente');
      } else {
        await proveedorService.create(formData);
        toast.success('Proveedor creado exitosamente');
      }
      resetForm();
      await fetchProveedores();
    } catch (error) {
      toast.error(editingProveedor ? 'Error al actualizar proveedor' : 'Error al crear proveedor');
      if (import.meta.env.DEV) console.error(error);
    }
  };

  const handleEdit = (proveedor: ProveedorDTO) => {
    setEditingProveedor(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      ruc: proveedor.ruc || '',
      contacto: proveedor.contacto || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
      activo: proveedor.activo,
      tenantId: proveedor.tenantId,
    });
    setIsDialogOpen(true);
  };

  const handleActivate = (id: number, nombre: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'success',
      title: 'Activar Proveedor',
      description: `¿Estás seguro de activar el proveedor "${nombre}"?`,
      confirmText: 'Activar',
      action: async () => {
        try {
          await proveedorService.activate(id);
          toast.success('Proveedor activado exitosamente');
          await fetchProveedores();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al activar proveedor');
        }
      },
    });
  };

  const handleDeactivate = (id: number, nombre: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Desactivar Proveedor',
      description: `⚠️ ¿Estás seguro de desactivar el proveedor "${nombre}"? No podrás asignar productos a este proveedor mientras esté inactivo.`,
      confirmText: 'Desactivar',
      action: async () => {
        try {
          await proveedorService.deactivate(id);
          toast.success('Proveedor desactivado exitosamente');
          await fetchProveedores();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al desactivar proveedor');
        }
      },
    });
  };

  const handleDelete = (id: number, nombre: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Proveedor',
      description: `⚠️ ¿Estás seguro de eliminar permanentemente el proveedor "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await proveedorService.delete(id);
          toast.success('Proveedor eliminado exitosamente');
          await fetchProveedores();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al eliminar proveedor');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      ruc: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      activo: true,
      tenantId: 'farmacia-001',
    });
    setEditingProveedor(null);
    setIsDialogOpen(false);
  };

  // ✅ Filtrar proveedores: búsqueda + estado
  const filteredProveedores = proveedores
    .filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        p.nombre.toLowerCase().includes(q) ||
        p.ruc?.toLowerCase().includes(q) ||
        p.contacto?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (estadoFilter === 'ACTIVOS') return p.activo;
      if (estadoFilter === 'INACTIVOS') return !p.activo;
      return true; // TODOS
    });

  // ✅ Paginación
  const totalPages = Math.ceil(filteredProveedores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProveedores = filteredProveedores.slice(startIndex, endIndex);

  const totalProveedores = proveedores.length;
  const proveedoresActivos = proveedores.filter((p) => p.activo).length;
  const proveedoresInactivos = proveedores.filter((p) => !p.activo).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">Gestiona los proveedores de productos</p>
        </div>
        {canCreate('PROVEEDORES') && (
          <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proveedor
          </Button>
        )}
      </div>

      {!hasViewPermission ? (
        <EmptyState
          icon={Lock}
          title="Sin acceso al listado"
          description="No tienes permisos para ver el listado de proveedores. Puedes registrar nuevos proveedores con el botón de arriba."
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 [&>*:last-child]:col-span-2 [&>*:last-child]:mx-auto [&>*:last-child]:max-w-[calc(50%-0.5rem)] sm:[&>*:last-child]:col-auto sm:[&>*:last-child]:max-w-none sm:[&>*:last-child]:mx-0">
            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Proveedores</p>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="text-blue-600 dark:text-blue-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">{totalProveedores}</div>
                <p className="text-xs text-muted-foreground mt-1">Registrados</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activos</p>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="text-emerald-600 dark:text-emerald-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{proveedoresActivos}</div>
                <p className="text-xs text-muted-foreground mt-1">Disponibles para compras</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inactivos</p>
                <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="text-red-600 dark:text-red-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">{proveedoresInactivos}</div>
                <p className="text-xs text-muted-foreground mt-1">Deshabilitados</p>
              </CardContent>
            </Card>
          </div>

          {/* Search + Filtro estado */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, RUC o contacto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>

                {/* Estado filter */}
                <div className="sm:w-[320px]">
                  <div
                    className="inline-flex w-full items-center rounded-lg border border-input bg-muted p-1"
                    role="tablist"
                    aria-label="Filtrar proveedores por estado"
                  >
                    <button
                      type="button"
                      onClick={() => setEstadoFilter('TODOS')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition
                        ${estadoFilter === 'TODOS'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                      aria-pressed={estadoFilter === 'TODOS'}
                    >
                      Todos
                    </button>

                    <button
                      type="button"
                      onClick={() => setEstadoFilter('ACTIVOS')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition flex items-center justify-center gap-2
                        ${estadoFilter === 'ACTIVOS'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                      aria-pressed={estadoFilter === 'ACTIVOS'}
                      title="Mostrar solo proveedores activos"
                    >
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Activos
                    </button>

                    <button
                      type="button"
                      onClick={() => setEstadoFilter('INACTIVOS')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition flex items-center justify-center gap-2
                        ${estadoFilter === 'INACTIVOS'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                      aria-pressed={estadoFilter === 'INACTIVOS'}
                      title="Mostrar solo proveedores inactivos"
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Inactivos
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Proveedores</CardTitle>
              <CardDescription>{filteredProveedores.length} proveedor(es) encontrado(s)</CardDescription>
            </CardHeader>

            <CardContent>
              {filteredProveedores.length === 0 ? (
                <EmptyState title="No hay proveedores" description="Comienza registrando tu primer proveedor" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>RUC</TableHead>
                          <TableHead>Contacto</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentProveedores.map((proveedor) => (
                          <TableRow key={proveedor.id}>
                            <TableCell className="font-semibold">{proveedor.nombre}</TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{proveedor.ruc || '-'}</span>
                            </TableCell>
                            <TableCell>{proveedor.contacto || '-'}</TableCell>
                            <TableCell>{proveedor.telefono || '-'}</TableCell>
                            <TableCell>{proveedor.email || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={proveedor.activo ? 'success' : 'destructive'}>
                                {proveedor.activo ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {canToggleState('PROVEEDORES') &&
                                  (proveedor.activo ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeactivate(proveedor.id!, proveedor.nombre)}
                                      title="Desactivar"
                                    >
                                      <XCircle className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleActivate(proveedor.id!, proveedor.nombre)}
                                      title="Activar proveedor"
                                    >
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    </Button>
                                  ))}

                                {canEdit('PROVEEDORES') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(proveedor)}
                                    title="Editar"
                                  >
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </Button>
                                )}

                                {canDelete('PROVEEDORES') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(proveedor.id!, proveedor.nombre)}
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

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredProveedores.length}
                    itemsPerPage={itemsPerPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog para crear/editar */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        description={editingProveedor ? 'Actualiza la información del proveedor' : 'Registra un nuevo proveedor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sub-header dentro del modal */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {editingProveedor ? 'Editar proveedor' : 'Registrar proveedor'}
              </p>
              <p className="text-xs text-muted-foreground">
                Completa la información. Los campos con * son obligatorios.
              </p>
            </div>

            <Badge variant={editingProveedor ? 'secondary' : 'success'} className="w-fit">
              {editingProveedor ? 'Edición' : 'Nuevo'}
            </Badge>
          </div>

          {/* Sección: Datos principales */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Datos principales</p>
              <p className="text-xs text-muted-foreground">Información básica del proveedor.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Nombre del Proveedor <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ej: Droguería Lima SAC"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">RUC</label>
                <Input
                  placeholder="20123456789"
                  value={formData.ruc}
                  onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                  maxLength={20}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Persona de Contacto</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ej: Juan Pérez"
                    value={formData.contacto}
                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sección: Contacto */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3">
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
                    placeholder="proveedor@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sección: Dirección */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Dirección</p>
              <p className="text-xs text-muted-foreground">Opcional, útil para compras y logística.</p>
            </div>

            <div className="space-y-2">
              <textarea
                placeholder="Av. Ejemplo 123, Lima, Perú"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background
                          placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={resetForm} className="h-11">
              Cancelar
            </Button>
            <Button type="submit" className="h-11">
              {editingProveedor ? 'Actualizar' : 'Crear'} Proveedor
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