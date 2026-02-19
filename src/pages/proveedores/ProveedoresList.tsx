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
import { Plus, Trash2, Edit, Search, Building2, User, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProveedoresList() {
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<ProveedorDTO | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ NUEVO - Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
    fetchProveedores();
  }, []);

  // ✅ NUEVO - Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const data = await proveedorService.getAll();
      setProveedores(data);
    } catch (error) {
      toast.error('Error al cargar proveedores');
      console.error(error);
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
      console.error(error);
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

  // ✅ ACTUALIZADO - Filtrar proveedores
  const filteredProveedores = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ruc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contacto?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ NUEVO - Calcular paginación
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
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProveedores}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{proveedoresActivos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <Building2 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{proveedoresInactivos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, RUC o contacto..."
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
                      <TableHead>ID</TableHead>
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
                    {/* ✅ CAMBIAR - Usar currentProveedores en lugar de filteredProveedores */}
                    {currentProveedores.map((proveedor) => (
                      <TableRow key={proveedor.id}>
                        <TableCell className="font-medium">#{proveedor.id}</TableCell>
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
                            {proveedor.activo ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeactivate(proveedor.id!, proveedor.nombre)}
                                title="Desactivar proveedor"
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
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(proveedor)}
                              title="Editar proveedor"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(proveedor.id!, proveedor.nombre)}
                              title="Eliminar proveedor"
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

              {/* ✅ NUEVO - Paginación */}
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

      {/* Dialog para crear/editar */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        description={editingProveedor ? 'Actualiza la información del proveedor' : 'Registra un nuevo proveedor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                Nombre del Proveedor
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ej: Droguería Lima SAC"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="pl-8"
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
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Persona de Contacto</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ej: Juan Pérez"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="999 999 999"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="proveedor@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Dirección</label>
              <textarea
                placeholder="Av. Ejemplo 123, Lima, Perú"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Estado</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="activo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Proveedor Activo
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit">{editingProveedor ? 'Actualizar' : 'Crear'} Proveedor</Button>
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