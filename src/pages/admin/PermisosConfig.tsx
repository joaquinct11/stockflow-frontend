import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/admin.service';
import type { AdminUsuario, Permiso } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Input } from '../../components/ui/Input';
import { Search, Shield, Users, Save, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Backend permissions format:
 *   ACCION_RECURSO e.g. CREAR_PRODUCTO, VER_INVENTARIO, ELIMINAR_VENTA
 *
 * In the backend response, the permission "code" is the field `nombre`.
 * Example: { id: 1, nombre: "CREAR_PRODUCTO", descripcion: "...", rolId: 1 }
 *
 * We group by RECURSO (suffix after last underscore).
 */
const RESOURCE_GROUPS: { label: string; resource: string }[] = [
  { label: 'Productos', resource: 'PRODUCTO' },
  { label: 'Inventario', resource: 'INVENTARIO' },
  { label: 'Ventas', resource: 'VENTA' },
  { label: 'Proveedores', resource: 'PROVEEDOR' },
  { label: 'Usuarios / Admin', resource: 'USUARIOS' }, // ajusta si en tu BD es USUARIO
  { label: 'Reportes', resource: 'REPORTES' },
  { label: 'Suscripciones', resource: 'SUSCRIPCIONES' },
];

function getRoleBadgeClass(rol: string) {
  switch (rol) {
    case 'ADMIN':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
    case 'GERENTE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
    case 'VENDEDOR':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    case 'GESTOR_INVENTARIO':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
  }
}

function getPermCode(p: Permiso): string {
  return (p?.nombre ?? '').toString();
}

function getPermResource(code: string): string {
  const parts = (code ?? '').split('_').filter(Boolean);
  if (parts.length < 2) return 'OTROS';
  return parts[parts.length - 1];
}

export function PermisosConfig() {
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [permisosCatalog, setPermisosCatalog] = useState<Permiso[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userPermisos, setUserPermisos] = useState<string[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoadingInit(true);

      const [users, perms] = await Promise.all([
        adminService.getUsuarios().catch(() => {
          throw new Error('usuarios');
        }),
        adminService.getPermisos().catch(() => {
          throw new Error('permisos');
        }),
      ]);

      setUsuarios(users);
      setPermisosCatalog(perms);

      // expand all groups by default
      const expanded: Record<string, boolean> = {};
      RESOURCE_GROUPS.forEach((g) => {
        expanded[g.resource] = true;
      });
      expanded.OTROS = true;
      setExpandedGroups(expanded);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const resource =
        message === 'usuarios'
          ? 'usuarios'
          : message === 'permisos'
            ? 'catálogo de permisos'
            : 'datos';
      toast.error(`Error al cargar ${resource}`);
    } finally {
      setLoadingInit(false);
    }
  };

  const handleSelectUser = async (user: AdminUsuario) => {
    setSelectedUserId(user.id);
    setUserPermisos([]);

    try {
      setLoadingPermisos(true);
      const perms = await adminService.getUsuarioPermisos(user.id);
      setUserPermisos(perms);
    } catch {
      toast.error(`Error al cargar permisos de ${user.nombre}`);
    } finally {
      setLoadingPermisos(false);
    }
  };

  const togglePermiso = (code: string) => {
    setUserPermisos((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    if (selectedUserId === null) return;

    try {
      setSaving(true);
      await adminService.updateUsuarioPermisos(selectedUserId, userPermisos);
      toast.success('Permisos actualizados correctamente');
    } catch {
      toast.error('Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (resource: string) => {
    setExpandedGroups((prev) => ({ ...prev, [resource]: !prev[resource] }));
  };

  const selectedUser = usuarios.find((u) => u.id === selectedUserId) ?? null;

  const filteredUsuarios = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return usuarios;

    return usuarios.filter(
      (u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usuarios, userSearch]);

  const groupedPermisos = useMemo(() => {
    const catalog = Array.isArray(permisosCatalog) ? permisosCatalog : [];
    const q = permSearch.trim().toLowerCase();
    const knownResources = RESOURCE_GROUPS.map((g) => g.resource);

    const matchesSearch = (p: Permiso) => {
      if (!q) return true;
      const code = getPermCode(p).toLowerCase();
      const desc = (p.descripcion ?? '').toLowerCase();
      return code.includes(q) || desc.includes(q);
    };

    const groups = [
      ...RESOURCE_GROUPS.map((group) => {
        const perms = catalog.filter((p) => {
          const code = getPermCode(p);
          const resource = getPermResource(code);
          return resource === group.resource && matchesSearch(p);
        });
        return { label: group.label, resource: group.resource, perms };
      }),
      {
        label: 'Otros',
        resource: 'OTROS',
        perms: catalog.filter((p) => {
          const code = getPermCode(p);
          const resource = getPermResource(code);
          return !knownResources.includes(resource) && matchesSearch(p);
        }),
      },
    ].filter((g) => g.perms.length > 0);

    return groups;
  }, [permisosCatalog, permSearch]);

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Gestión de Permisos</h1>
          <p className="text-sm text-muted-foreground">
            Asigna permisos específicos a cada usuario de tu organización
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User list */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-primary" />
              <CardTitle className="text-base">Usuarios</CardTitle>
            </div>
            <CardDescription>Selecciona un usuario para editar sus permisos</CardDescription>

            <div className="relative mt-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Buscar usuario..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ul className="divide-y">
              {filteredUsuarios.map((user) => (
                <li key={user.id}>
                  <button
                    onClick={() => handleSelectUser(user)}
                    className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
                      selectedUserId === user.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user.nombre}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${getRoleBadgeClass(
                          user.rolNombre
                        )}`}
                      >
                        {user.rolNombre}
                      </span>
                    </div>
                  </button>
                </li>
              ))}

              {filteredUsuarios.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">Sin resultados</li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Permissions panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  {selectedUser ? `Permisos de ${selectedUser.nombre}` : 'Permisos'}
                </CardTitle>
                <CardDescription>
                  {selectedUser
                    ? `Rol: ${selectedUser.rolNombre} · ${selectedUser.email}`
                    : 'Selecciona un usuario para ver y editar sus permisos'}
                </CardDescription>
              </div>

              {selectedUser && (
                <Button onClick={handleSave} disabled={saving || loadingPermisos} className="flex-shrink-0">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              )}
            </div>

            {selectedUser && (
              <div className="relative mt-2">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Buscar permiso..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </CardHeader>

          <CardContent>
            {!selectedUser && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield size={48} className="text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Selecciona un usuario en el panel izquierdo</p>
              </div>
            )}

            {selectedUser && loadingPermisos && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {selectedUser && !loadingPermisos && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {userPermisos.length} permiso{userPermisos.length !== 1 ? 's' : ''} asignado
                    {userPermisos.length !== 1 ? 's' : ''}
                  </Badge>

                  {selectedUser.rolNombre === 'ADMIN' && (
                    <Badge
                      variant="default"
                      className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                    >
                      Admin — acceso total por rol
                    </Badge>
                  )}
                </div>

                {groupedPermisos.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No se encontraron permisos{permSearch ? ` para "${permSearch}"` : ''}
                  </p>
                )}

                {groupedPermisos.map((group) => (
                  <div key={group.resource} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group.resource)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors font-medium text-sm"
                    >
                      <span>{group.label}</span>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {group.perms.filter((p) => userPermisos.includes(getPermCode(p))).length}/
                          {group.perms.length}
                        </span>
                        {expandedGroups[group.resource] ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </button>

                    {expandedGroups[group.resource] && (
                      <div className="divide-y">
                        {group.perms.map((perm) => {
                          const code = getPermCode(perm);
                          return (
                            <label
                              key={perm.id}
                              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={userPermisos.includes(code)}
                                onChange={() => togglePermiso(code)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{code}</p>
                                {perm.descripcion && (
                                  <p className="text-xs text-muted-foreground">{perm.descripcion}</p>
                                )}
                                <code className="text-xs text-muted-foreground font-mono">{code}</code>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}