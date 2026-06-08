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
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { usePlan } from '../../hooks/usePlan';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  UserX,
  Search,
  UserCheck,
  User as UserIcon,
  Lock,
  Shield,
  Crown,
  ShoppingBag,
  Boxes,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Role = 'ADMIN' | 'VENDEDOR' | 'GESTOR_INVENTARIO';

/** Etiquetas en español para cada rol */
const ROL_LABELS: Record<string, string> = {
  ADMIN:             'Administrador',
  VENDEDOR:          'Vendedor',
  GESTOR_INVENTARIO: 'Almacenero',
};

const ROL_STYLE: Record<string, { icon: React.ReactNode; badge: string }> = {
  ADMIN: {
    icon:  <Crown       className="h-3.5 w-3.5 text-rose-600" />,
    badge: 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800',
  },
  VENDEDOR: {
    icon:  <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />,
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800',
  },
  GESTOR_INVENTARIO: {
    icon:  <Boxes       className="h-3.5 w-3.5 text-amber-600" />,
    badge: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
  },
};

function RolBadge({ role }: { role: string }) {
  const style = ROL_STYLE[role] ?? ROL_STYLE['VENDEDOR'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
      {style.icon}
      {ROL_LABELS[role] ?? role}
    </span>
  );
}


type EstadoFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

export function UsuariosList() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const currentUserRole = (useAuthStore((s) => s.user?.rol) || 'VENDEDOR') as Role;

  const { canCreate, canEdit, canDelete, canToggleState, canView } = usePermissions();
  const { isBasico, limites } = usePlan();
  const hasViewPermission = canView('USUARIOS');

  const allowedRoleOptions = useMemo(() => {
    const map: Record<Role, Array<{ value: Role; label: string }>> = {
      ADMIN: [
        { value: 'VENDEDOR',          label: 'Vendedor'   },
        { value: 'GESTOR_INVENTARIO', label: 'Almacenero' },
      ],
      VENDEDOR: [],
      GESTOR_INVENTARIO: [],
    };

    return map[currentUserRole] ?? [];
  }, [currentUserRole]);

  const defaultRolNombre = useMemo(() => {
    return (allowedRoleOptions[0]?.value ?? 'VENDEDOR') as Role;
  }, [allowedRoleOptions]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODOS');

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
    tipoDocumento: '',
    numeroDocumento: '',
    numeroCelular: '',
  });
  const [nombres,   setNombres]   = useState('');
  const [apellidos, setApellidos] = useState('');

  useEffect(() => {
    if (hasViewPermission) fetchUsuarios();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter]);

  useEffect(() => {
    if (!editingId) {
      setFormData((prev) => ({
        ...prev,
        rolNombre: (prev.rolNombre as Role) ?? defaultRolNombre,
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
      if (import.meta.env.DEV) console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      contraseña: '',
      rolNombre: defaultRolNombre,
      activo: true,
      tipoDocumento: '',
      numeroDocumento: '',
      numeroCelular: '',
    });
    setNombres('');
    setApellidos('');
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombres.trim().length < 2) { toast.error('Ingresa el nombre'); return; }
    if (apellidos.trim().length < 2) { toast.error('Ingresa los apellidos'); return; }
    try {
      if (editingId) {
        const usuarioToUpdate = {
          nombre: nombres.trim(),
          apellido: apellidos.trim(),
          rolNombre: formData.rolNombre,
          activo: formData.activo,
          tenantId: tenantId!,
          tipoDocumento: formData.tipoDocumento || undefined,
          numeroDocumento: formData.numeroDocumento || undefined,
          numeroCelular: formData.numeroCelular || undefined,
        };

        await usuarioService.update(editingId, usuarioToUpdate as Usuario);
        toast.success('Usuario actualizado exitosamente');
      } else {
        if (!canCreate('USUARIOS')) {
          toast.error('No tienes permisos para crear usuarios');
          return;
        }
        await usuarioService.create({ ...formData, nombre: nombres.trim(), apellido: apellidos.trim() } as Usuario);
        toast.success('Usuario creado exitosamente');
      }

      resetForm();
      await fetchUsuarios();
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('❌ Error:', error.response?.data);
      const message = error.response?.data?.mensaje || error.response?.data?.error || 'Error al guardar usuario';
      toast.error(message);
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setNombres(usuario.nombre ?? '');
    setApellidos(usuario.apellido ?? '');
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      contraseña: '',
      rolNombre: usuario.rolNombre as Role,
      activo: usuario.activo ?? true,
      tipoDocumento: usuario.tipoDocumento ?? '',
      numeroDocumento: usuario.numeroDocumento ?? '',
      numeroCelular: usuario.numeroCelular ?? '',
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
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch {
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
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch {
          toast.error('Error al activar usuario');
        }
      },
    });
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Desactivar Usuario',
      description:
        'El usuario será desactivado y no podrá iniciar sesión. Su historial de ventas y movimientos se conserva. Puedes reactivarlo desde el listado.',
      confirmText: 'Desactivar',
      action: async () => {
        try {
          await usuarioService.delete(id);
          toast.success('Usuario eliminado');
          await fetchUsuarios();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch {
          toast.error('Error al eliminar usuario');
        }
      },
    });
  };

  const handleReenviarActivacion = async (id: number) => {
    try {
      await usuarioService.reenviarActivacion(id);
      toast.success('📧 Email de activación reenviado exitosamente');
    } catch {
      toast.error('Error al reenviar el email de activación');
    }
  };

  const filteredUsuarios = usuarios.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (estadoFilter === 'ACTIVOS' && !u.activo) return false;
    if (estadoFilter === 'INACTIVOS' && u.activo) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsuarios = filteredUsuarios.slice(startIndex, endIndex);

  const totalUsuarios = usuarios.length;
  const totalActivos = usuarios.filter((u) => u.activo).length;
  const totalInactivos = usuarios.filter((u) => !u.activo).length;
  const totalAdmins = usuarios.filter((u) => u.rolNombre === 'ADMIN').length;

  if (loading) return <LoadingSpinner />;

  const usuariosActuales = usuarios.length;
  const limiteAlcanzado  = isBasico && usuariosActuales >= limites.usuarios;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios del sistema
            {isBasico && (
              <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                limiteAlcanzado
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}>
                {usuariosActuales}/{limites.usuarios} usuarios — Plan Básico
              </span>
            )}
          </p>
        </div>

        {canCreate('USUARIOS') && (
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="w-full sm:w-auto"
            disabled={limiteAlcanzado}
            title={limiteAlcanzado ? `Límite de ${limites.usuarios} usuarios alcanzado. Actualiza al plan Pro.` : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      {/* Banner límite de plan */}
      {isBasico && limiteAlcanzado && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <span className="text-lg">👑</span>
            <p className="text-sm font-medium">
              Alcanzaste el límite de {limites.usuarios} usuarios del plan Básico.
              Actualiza al plan Pro para agregar más.
            </p>
          </div>
          <a
            href="/checkout?plan=PRO"
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Actualizar a Pro
          </a>
        </div>
      )}

      {!hasViewPermission ? (
        <EmptyState
          icon={Lock}
          title="Sin acceso al listado"
          description="No tienes permisos para ver el listado de usuarios. Contacta al administrador para solicitar acceso."
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Usuarios</p>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="text-blue-600 dark:text-blue-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">{totalUsuarios}</div>
                <p className="text-xs text-muted-foreground mt-1">Registrados en el sistema</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activos</p>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="text-emerald-600 dark:text-emerald-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{totalActivos}</div>
                <p className="text-xs text-muted-foreground mt-1">Pueden iniciar sesión</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inactivos</p>
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <UserX className="text-orange-600 dark:text-orange-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight text-orange-600 dark:text-orange-400">{totalInactivos}</div>
                <p className="text-xs text-muted-foreground mt-1">Sin acceso temporal</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administradores</p>
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="text-violet-600 dark:text-violet-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">{totalAdmins}</div>
                <p className="text-xs text-muted-foreground mt-1">Control total</p>
              </CardContent>
            </Card>
          </div>

          {/* Search + Estado filter */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>

                  <div
                    className="flex w-full overflow-x-auto sm:inline-flex sm:w-auto sm:shrink-0 items-center rounded-lg border border-input bg-muted p-1 gap-0.5"
                    role="tablist"
                    aria-label="Filtrar usuarios por estado"
                  >
                    {(
                      [
                        { key: 'TODOS',    label: 'Todos' },
                        { key: 'ACTIVOS',  label: 'Activos' },
                        { key: 'INACTIVOS', label: 'Inactivos' },
                      ] as Array<{ key: EstadoFilter; label: string }>
                    ).map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setEstadoFilter(t.key)}
                        className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          estadoFilter === t.key
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                        aria-pressed={estadoFilter === t.key}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>{filteredUsuarios.length} usuario(s) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsuarios.length === 0 ? (
                <EmptyState
                  title={usuarios.length === 0 ? 'Todavía no hay usuarios' : 'Sin resultados'}
                  description={usuarios.length === 0 ? 'Agrega colaboradores y asígnales un rol para que puedan acceder al sistema con los permisos correctos.' : 'No se encontraron usuarios que coincidan con la búsqueda.'}
                />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{usuario.nombre || 'Sin nombre'}</p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>{usuario.email}</TableCell>

                            <TableCell>
                              <RolBadge role={usuario.rolNombre} />
                            </TableCell>

                            <TableCell>
                              <Badge variant={usuario.activo ? 'success' : 'secondary'}>
                                {usuario.activo ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {canToggleState('USUARIOS') &&
                                  (usuario.activo ? (
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
                                  ))}

                                {/* Reenviar activación — solo para ADMINs, solo si el usuario es inactivo (nunca activó su cuenta) */}
                                {currentUserRole === 'ADMIN' && !usuario.activo && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReenviarActivacion(usuario.id!)}
                                    title="Reenviar email de activación"
                                  >
                                    <Mail className="h-4 w-4 text-blue-500" />
                                  </Button>
                                )}

                                {canEdit('USUARIOS') && (
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(usuario)} title="Editar">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}

                                {canDelete('USUARIOS') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(usuario.id!)}
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
                    totalItems={filteredUsuarios.length}
                    itemsPerPage={itemsPerPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Crear/Editar */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title={editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
        description={editingId ? 'Actualiza la información del usuario' : 'Completa los datos para crear un nuevo usuario'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Datos del usuario</h3>
              <p className="text-xs text-muted-foreground">Campos obligatorios marcados con *</p>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ej: Juan Carlos"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  required
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ej: García López"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  required
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="usuario@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingId}
                  required
                />
                {editingId && <p className="text-xs text-muted-foreground">No se puede cambiar al editar</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Celular</label>
                <Input
                  type="tel"
                  placeholder="Ej: 999888777"
                  value={formData.numeroCelular ?? ''}
                  onChange={(e) => setFormData({ ...formData, numeroCelular: e.target.value })}
                  maxLength={20}
                />
              </div>

              {!editingId && (
                <div className="md:col-span-2 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 px-4 py-3">
                  <span className="text-lg shrink-0">📧</span>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    El usuario recibirá un <strong>email de bienvenida</strong> con un link para establecer su propia contraseña.
                    El link expira en <strong>48 horas</strong>.
                  </p>
                </div>
              )}

              {/* Tipo + Número de documento */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Documento</label>
                <select
                  value={formData.tipoDocumento ?? ''}
                  onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Sin especificar</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné de Extranjería</option>
                  <option value="RUC">RUC</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Documento</label>
                <Input
                  placeholder="Ej: 12345678"
                  value={formData.numeroDocumento ?? ''}
                  onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.rolNombre}
                  onChange={(e) => setFormData({ ...formData, rolNombre: e.target.value as any })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                  disabled={!canCreate('USUARIOS') || allowedRoleOptions.length === 0}
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

                {!canCreate('USUARIOS') && (
                  <p className="text-xs text-muted-foreground">
                    Tu rol (<span className="font-medium">{ROL_LABELS[currentUserRole] ?? currentUserRole}</span>) no puede crear usuarios.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={nombres.trim().length < 2 || apellidos.trim().length < 2 || formData.email.length < 5 || (!editingId && !canCreate('USUARIOS'))}
            >
              {editingId ? 'Actualizar' : 'Crear'} Usuario
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
        onConfirm={async () => {
          if (confirmDialog.action) await confirmDialog.action();
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}