import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  ShieldCheck,
  FileText,
  ClipboardList,
  Inbox,
  ChevronDown,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type LeafItem = {
  type: 'item';
  title: string;
  href: string;
  icon: any;
  show: boolean;
};

type GroupItem = {
  type: 'group';
  title: string;
  icon: any;
  show: boolean;
  key: 'compras' | 'ventas' | 'usuarios';
  items: Omit<LeafItem, 'type'>[];
};

type MenuEntry = LeafItem | GroupItem;

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();
  const { canAccess, isAdmin } = usePermissions();

  const isPathActive = (href: string) => {
    return href === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(href);
  };

  const menu: MenuEntry[] = useMemo(
    () => [
      {
        type: 'item',
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        show: true,
      },
      {
        type: 'item',
        title: 'Proveedores',
        href: '/dashboard/proveedores',
        icon: Building2,
        show: canAccess('PROVEEDORES'),
      },
      {
        type: 'item',
        title: 'Productos',
        href: '/dashboard/productos',
        icon: Package,
        show: canAccess('PRODUCTOS'),
      },

      // ===== Compras =====
      {
        type: 'group',
        key: 'compras',
        title: 'Compras',
        icon: ClipboardList,
        show: canAccess('COMPRAS') || canAccess('RECEPCIONES'),
        items: [
          {
            title: 'Órdenes de compra',
            href: '/dashboard/compras/ordenes',
            icon: ClipboardList,
            show: canAccess('COMPRAS'),
          },
          {
            title: 'Recepciones',
            href: '/dashboard/recepciones',
            icon: Inbox,
            show: canAccess('RECEPCIONES'),
          },
        ],
      },

      // ===== Ventas =====
      {
        type: 'group',
        key: 'ventas',
        title: 'Ventas',
        icon: ShoppingCart,
        show: canAccess('VENTAS') || canAccess('FACTURACION'),
        items: [
          {
            title: 'Ventas',
            href: '/dashboard/ventas',
            icon: ShoppingCart,
            show: canAccess('VENTAS'),
          },
          {
            title: 'Facturación',
            href: '/dashboard/facturacion',
            icon: FileText,
            show: canAccess('FACTURACION'),
          },
        ],
      },

      {
        type: 'item',
        title: 'Inventario',
        href: '/dashboard/inventario',
        icon: PackageOpen,
        show: canAccess('INVENTARIO'),
      },

      // ===== Usuarios/Admin =====
      {
        type: 'group',
        key: 'usuarios',
        title: 'Usuarios',
        icon: Users,
        show: canAccess('USUARIOS') || isAdmin,
        items: [
          {
            title: 'Usuarios',
            href: '/dashboard/usuarios',
            icon: Users,
            show: canAccess('USUARIOS'),
          },
          {
            title: 'Gestión de permisos',
            href: '/dashboard/admin/permisos',
            icon: ShieldCheck,
            show: isAdmin,
          },
        ],
      },

      {
        type: 'item',
        title: 'Suscripciones',
        href: '/dashboard/suscripciones',
        icon: CreditCard,
        show: canAccess('SUSCRIPCIONES'),
      },
      {
        type: 'item',
        title: 'Reportes',
        href: '/dashboard/reportes',
        icon: BarChart3,
        show: canAccess('REPORTES'),
      },
      {
        type: 'item',
        title: 'Configuración',
        href: '/dashboard/configuracion',
        icon: Settings,
        show: true,
      },
    ],
    [canAccess, isAdmin]
  );

  // auto-expand si estás en una ruta del grupo
  const defaultExpanded = useMemo(() => {
    const comprasOpen =
      isPathActive('/dashboard/compras') || isPathActive('/dashboard/recepciones');
    const ventasOpen =
      isPathActive('/dashboard/ventas') || isPathActive('/dashboard/facturacion');
    const usuariosOpen =
      isPathActive('/dashboard/usuarios') || isPathActive('/dashboard/admin');

    return { compras: comprasOpen, ventas: ventasOpen, usuarios: usuariosOpen };
  }, [location.pathname]);

  const [openGroups, setOpenGroups] = useState(defaultExpanded);

  // si cambia la ruta, abrimos el grupo correspondiente (sin cerrar los otros)
  // (evita que al navegar se quede cerrado el grupo activo)
  useMemo(() => {
    setOpenGroups((prev) => ({ ...prev, ...defaultExpanded }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultExpanded.compras, defaultExpanded.ventas, defaultExpanded.usuarios]);

  const toggleGroup = (key: GroupItem['key']) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen border-r bg-card transition-all duration-300',
          'lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'w-64 lg:z-40'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src="/fluxus.png" alt="Fluxus" className="h-7 w-7" />
              <span className="text-lg font-bold">Fluxus</span>
            </div>
          )}

          <button onClick={onClose} className="rounded-md p-2 hover:bg-accent lg:hidden">
            <X size={18} />
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block rounded-md p-2 hover:bg-accent"
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Badge de Rol */}
        {!collapsed && user && (
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">ROL</span>
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-bold',
                  user.rol === 'ADMIN' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
                  user.rol === 'GERENTE' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
                  user.rol === 'VENDEDOR' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
                  user.rol === 'GESTOR_INVENTARIO' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                )}
              >
                {user.rol}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1 p-2 overflow-y-auto h-[calc(100vh-12rem)]">
          {menu
            .filter((entry) => entry.show)
            .map((entry) => {
              if (entry.type === 'item') {
                const Icon = entry.icon;
                const active = isPathActive(entry.href);

                return (
                  <Link
                    key={entry.href}
                    to={entry.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={collapsed ? entry.title : undefined}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {!collapsed && <span>{entry.title}</span>}
                  </Link>
                );
              }

              // Group
              const GroupIcon = entry.icon;
              const visibleChildren = entry.items.filter((it) => it.show);
              if (visibleChildren.length === 0) return null;

              const groupActive = visibleChildren.some((it) => isPathActive(it.href));
              const expanded = !!openGroups[entry.key];

              return (
                <div key={entry.key} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => (collapsed ? undefined : toggleGroup(entry.key))}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      groupActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      collapsed && 'justify-center px-2'
                    )}
                    title={collapsed ? entry.title : undefined}
                    aria-expanded={collapsed ? undefined : expanded}
                  >
                    <GroupIcon size={20} className="flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{entry.title}</span>
                        <ChevronDown
                          size={16}
                          className={cn('transition-transform', expanded ? 'rotate-180' : 'rotate-0')}
                        />
                      </>
                    )}
                  </button>

                  {/* Subitems */}
                  {!collapsed && expanded && (
                    <div className="ml-2 border-l pl-2 space-y-1">
                      {visibleChildren.map((it) => {
                        const Icon = it.icon;
                        const active = isPathActive(it.href);
                        return (
                          <Link
                            key={it.href}
                            to={it.href}
                            onClick={onClose}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                              active
                                ? 'bg-accent text-accent-foreground font-medium'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <Icon size={18} className="flex-shrink-0" />
                            <span>{it.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>

        {/* User Info */}
        {!collapsed && user && (
          <div className="absolute bottom-0 w-full border-t p-4 bg-card">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}