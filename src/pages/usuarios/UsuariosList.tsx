import { useEffect, useState } from 'react';
import { usuarioService } from '../../services/usuario.service';
import type { Usuario } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Users, Plus, Edit2, Trash2, UserX, Search, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function UsuariosList() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Usuario>({
    nombre: '',
    email: '',
    contraseña: '',
    rolNombre: 'VENDEDOR',
    tenantId: 'farmacia-001',
    activo: true,
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

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
          tenantId: formData.tenantId,
          activo: formData.activo,
        };
        
        console.log('📤 Actualizando usuario:', usuarioToUpdate);
        
        await usuarioService.update(editingId, usuarioToUpdate as Usuario);
        toast.success('Usuario actualizado exitosamente');
      } else {
        // CREAR nuevo usuario
        console.log('📤 Creando usuario:', formData);
        
        await usuarioService.create(formData);
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
      ...usuario,
      contraseña: '', // No mostrar la contraseña
    });
    setEditingId(usuario.id!);
    setIsDialogOpen(true);
  };

  const handleDeactivate = async (id: number) => {
    if (window.confirm('¿Estás seguro de desactivar este usuario?')) {
      try {
        await usuarioService.deactivate(id);
        toast.success('Usuario desactivado');
        await fetchUsuarios();
      } catch (error) {
        toast.error('Error al desactivar usuario');
      }
    }
  };

  const handleActivate = async (id: number) => {
    if (window.confirm('¿Estás seguro de activar este usuario?')) {
      try {
        await usuarioService.activate(id);
        toast.success('Usuario activado');
        await fetchUsuarios();
      } catch (error) {
        toast.error('Error al activar usuario');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('⚠️ ¿Estás COMPLETAMENTE seguro de ELIMINAR este usuario? Esta acción no se puede deshacer.')) {
      try {
        await usuarioService.delete(id);
        toast.success('Usuario eliminado');
        await fetchUsuarios();
      } catch (error) {
        toast.error('Error al eliminar usuario');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      contraseña: '',
      rolNombre: 'VENDEDOR',
      tenantId: 'farmacia-001',
      activo: true,
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const filteredUsuarios = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
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
              {usuarios.filter(u => u.activo).length}
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
              {usuarios.filter(u => !u.activo).length}
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
              {usuarios.filter(u => u.rolNombre === 'ADMIN').length}
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">#{usuario.id}</TableCell>
                      <TableCell>{usuario.nombre}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{usuario.rolNombre}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {usuario.tenantId}
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
          )}
        </CardContent>
      </Card>

      {/* Dialog/Modal */}
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
              <label className="text-sm font-medium">Nombre Completo</label>
              <Input
                placeholder="Juan Pérez"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingId}
                required
              />
            </div>

            {!editingId && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Contraseña</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Rol</label>
              <select
                value={formData.rolNombre}
                onChange={(e) => setFormData({ ...formData, rolNombre: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="VENDEDOR">Vendedor</option>
                <option value="ADMIN">Administrador</option>
                <option value="ALMACEN">Almacén</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant ID</label>
              <Input
                placeholder="farmacia-001"
                value={formData.tenantId}
                onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                required
              />
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
            <Button type="submit">
              {editingId ? 'Actualizar' : 'Crear'} Usuario
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}