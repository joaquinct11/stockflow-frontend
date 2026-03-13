import { useEffect, useMemo, useState } from 'react';
import { usuarioService } from '../../services/usuario.service';
import type { Usuario } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { useAuthStore } from '../../store/authStore'; // ✅ AGREGAR
import { Users, Plus, Edit2, Trash2, UserX, Search, UserCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';

type Role = 'ADMIN' | 'GERENTE' | 'VENDEDOR' | 'GESTOR_INVENTARIO';

export function UsuariosList() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const currentUserRole = (useAuthStore((s) => s.user?.rol) || 'VENDEDOR') as Role;

  // ✅ HARD-CODEADO: Opciones según el rol del logueado
  const allowedRoleOptions = useMemo(() => {
    const map: Record<Role, Array<{ value: Role; label: string }>> = {
      ADMIN: [
        { value: 'GERENTE', label: 'Gerente' },
        { value: 'VENDEDOR', label: 'Vendedor' },
        { value: 'GESTOR_INVENTARIO', label: 'Gestor de Inventario' },
      ],
      GERENTE: [
        { value: 'VENDEDOR', label: 'Vendedor' },
        { value: 'GESTOR_INVENTARIO', label: 'Gestor de Inventario' },
      ],
      VENDEDOR: [],
      GESTOR_INVENTARIO: [],
    };

    return map[currentUserRole] ?? [];
  }, [currentUserRole]);

  // ✅ Por defecto: primera opción permitida (si no hay, VENDEDOR)
  const defaultRolNombre = useMemo(() => {
    return (allowedRoleOptions[0]?.value ?? 'VENDEDOR') as any;
  }, [allowedRoleOptions]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const [formData, setFormData] = useState<Omit<Usuario, 'id' | 'tenantId'>>({
    nombre: '',
    email: '',
    contraseña: '',
    rolNombre: 'VENDEDOR',
    activo: true,
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ✅ Si cambia el rol del logueado, asegura que el form tenga un rol válido cuando NO se edita
  useEffect(() => {
    if (!editingId) {
      setFormData((prev) => ({
        ...prev,
        rolNombre: (prev.rolNombre as any) ?? defaultRolNombre,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRolNombre]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuarioService.getAll();
      setUsuarios(data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // EDITAR usuario existente
        const usuarioToUpdate = {
          nombre: formData.nombre,
          rolNombre: formData.rolNombre,
          activo: formData.activo,
          tenantId: tenantId!,
        };

        await usuarioService.update(editingId, usuarioToUpdate as Usuario);
        toast.success('Usuario actualizado exitosamente');
      } else {
        // ✅ Validación simple en front: si no tiene opciones, no permite crear
        if (allowedRoleOptions.length === 0) {
          toast.error('No tienes permisos para crear usuarios');
          return;
        }

        // CREAR nuevo usuario (sin tenantId, se asigna automáticamente en backend)
        await usuarioService.create(formData as Usuario);
        toast.success('Usuario creado exitosamente');
      }

      resetForm();
      await fetchUsuarios();
    } catch (error: any) {
      console.error('❌ Error:', error.response?.data);
      const message = error.response?.data?.mensaje || error.response?.data?.error || 'Error al guardar usuario';
      toast.error(message);
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      contraseña: '', // No mostrar la contraseña
      rolNombre: usuario.rolNombre,
      activo: usuario.activo ?? true,
    });
    setEditingId(usuario.id!);
    setIsDialogOpen(true);
  };

  const handleDeactivate = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Desactivar Usuario',
      description: '¿Estás seguro de que deseas desactivar este usuario? Podrá ser reactivado más tarde.',
      confirmText: 'Desactivar',
      action: async () => {
        try {
          await usuarioService.deactivate(id);
          toast.success('Usuario desactivado');
          await fetchUsuarios();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al desactivar usuario');
        }
      },
    });
  };

  const handleActivate = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'success',
      title: 'Activar Usuario',
      description: '¿Estás seguro de que deseas activar este usuario?',
      confirmText: 'Activar',
      action: async () => {
        try {
          await usuarioService.activate(id);
          toast.success('Usuario activado');
          await fetchUsuarios();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al activar usuario');
        }
      },
    });
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Usuario',
      description: '⚠️ Estás a punto de eliminar este usuario de forma permanente. Esta acción no se puede deshacer. ¿Continuar?',
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await usuarioService.delete(id);
          toast.success('Usuario eliminado');
          await fetchUsuarios();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al eliminar usuario');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      contraseña: '',
      rolNombre: defaultRolNombre,
      activo: true,
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const filteredUsuarios = usuarios.filter((u) =>
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsuarios = filteredUsuarios.slice(startIndex, endIndex);

  if (loading) {
    return <LoadingSpinner />;
  }

  const canCreateUsers = allowedRoleOptions.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios del sistema
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Rol actual: <span className="font-medium">{currentUserRole}</span>
          </p>
        </div>

        <Button
          onClick={() => {
            if (!canCreateUsers) {
              toast.error('No tienes permisos para crear usuarios');
              return;
            }
            // Asegurar rol por defecto válido al abrir
            setFormData((prev) => ({
              ...prev,
              rolNombre: prev.rolNombre || defaultRolNombre,
            }));
            setIsDialogOpen(true);
          }}
          className="w-full sm:w-auto"
          disabled={!canCreateUsers}
          title={!canCreateUsers ? 'No tienes permisos' : undefined}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usuarios.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usuarios.filter((u) => u.activo).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Inactivos</CardTitle>
            <UserX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usuarios.filter((u) => !u.activo).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usuarios.filter((u) => u.rolNombre === 'ADMIN').length}
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
              placeholder="Buscar por nombre o email..."
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
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {filteredUsuarios.length} usuario(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsuarios.length === 0 ? (
            <EmptyState
              title="No hay usuarios"
              description="No se encontraron usuarios en el sistema"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* <TableHead>ID</TableHead> */}
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentUsuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        {/* <TableCell className="font-medium">#{usuario.id}</TableCell> */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{usuario.nombre || 'Sin nombre'}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{usuario.email}</TableCell>

                        <TableCell>
                          <Badge variant="outline">{usuario.rolNombre}</Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant={usuario.activo ? 'success' : 'secondary'}>
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(usuario)}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            {usuario.activo ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeactivate(usuario.id!)}
                                title="Desactivar"
                              >
                                <UserX className="h-4 w-4 text-orange-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleActivate(usuario.id!)}
                                title="Activar"
                              >
                                <UserCheck className="h-4 w-4 text-green-600" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(usuario.id!)}
                              title="Eliminar permanentemente"
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

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredUsuarios.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog/Modal para crear/editar */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title={editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
        description={
          editingId
            ? 'Actualiza la información del usuario'
            : 'Completa los datos para crear un nuevo usuario'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre Completo
                <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Juan Pérez"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                minLength={3}
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 3, máximo 150 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Email
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingId}
                required
              />
              {editingId && (
                <p className="text-xs text-muted-foreground">
                  No se puede cambiar al editar
                </p>
              )}
            </div>

            {!editingId && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Contraseña
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.contraseña}
                  onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                Rol
                <span className="text-red-500">*</span>
              </label>

              <select
                value={formData.rolNombre}
                onChange={(e) => setFormData({ ...formData, rolNombre: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
                disabled={!canCreateUsers || allowedRoleOptions.length === 0}
              >
                {allowedRoleOptions.length === 0 ? (
                  <option value="">No tienes permisos para crear usuarios</option>
                ) : (
                  allowedRoleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                )}
              </select>

              {!canCreateUsers && (
                <p className="text-xs text-muted-foreground">
                  Tu rol (<span className="font-medium">{currentUserRole}</span>) no puede crear usuarios.
                </p>
              )}
            </div>

            <div className="space-y-2 flex items-center md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Usuario Activo
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formData.nombre.length < 3 || (!editingId && !canCreateUsers)}>
              {editingId ? 'Actualizar' : 'Crear'} Usuario
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