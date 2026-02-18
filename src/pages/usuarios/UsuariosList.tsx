import { useEffect, useState } from 'react';
import { usuarioService } from '../../services/usuario.service';
import type { Usuario } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';

export function UsuariosList() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          Gestiona los usuarios del sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {usuarios.length} usuario(s) registrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <EmptyState
              title="No hay usuarios"
              description="No se encontraron usuarios en el sistema"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}