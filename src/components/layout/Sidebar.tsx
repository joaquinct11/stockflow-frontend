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
  ScanLine,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
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

const ROL_BADGE: Record<string, string> = {
  ADMIN:             'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  GERENTE:           'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  VENDEDOR:          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  GESTOR_INVENTARIO: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
};

function getInitials(nombre?: string) {
  if (!nombre) return '?';
  const parts = nombre.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export function Sidebar({ isOpen, onClose, collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const { canAccess, isAdmin } = usePermissions();

  const isPathActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href === '/pos') return location.pathname === '/pos';
    return location.pathname.startsWith(href);
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
      // Punto de Venta — solo visible cuando tiene acceso a POS (VENDEDOR, ADMIN, GERENTE)
      {
        type: 'item',
        title: 'Punto de Venta',
        href: '/pos',
        icon: ScanLine,
        show: canAccess('POS'),
      },
      {
        type: 'item',
        title: 'Cuadre de Caja',
        href: '/dashboard/caja',
        icon: Wallet,
        show: canAccess('POS'),
      },
      // Ventas historial — VENDEDOR ve sus propias ventas y facturación
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

  const defaultExpanded = useMemo(() => {
    const comprasOpen = isPathActive('/dashboard/compras') || isPathActive('/dashboard/recepciones');
    const ventasOpen = isPathActive('/dashboard/ventas') || isPathActive('/dashboard/facturacion');
    const usuariosOpen = isPathActive('/dashboard/usuarios') || isPathActive('/dashboard/admin');
    return { compras: comprasOpen, ventas: ventasOpen, usuarios: usuariosOpen };
  }, [location.pathname]);

  const [openGroups, setOpenGroups] = useState(defaultExpanded);

  useMemo(() => {
    setOpenGroups((prev) => ({ ...prev, ...defaultExpanded }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultExpanded.compras, defaultExpanded.ventas, defaultExpanded.usuarios]);

  const toggleGroup = (key: GroupItem['key']) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen flex flex-col',
          'bg-slate-900 border-r border-slate-800',
          'transition-all duration-300 ease-in-out',
          'lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'w-64 lg:z-40'
        )}
      >
        {/* ── Logo ──────────────────────────────────────────────── */}
        <div className={cn(
          'flex h-16 items-center border-b border-slate-800 flex-shrink-0',
          collapsed ? 'justify-center px-3' : 'justify-between px-4'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <img src="/fluxus.png" alt="Fluxus" className="h-5 w-5" />
              </div>
              <div>
                <span className="text-white font-bold text-base tracking-tight">Fluxus</span>
                <p className="text-slate-500 text-[10px] leading-tight">ERP · Gestión</p>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <img src="/fluxus.png" alt="Fluxus" className="h-5 w-5" />
            </div>
          )}

          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X size={18} />
          </button>

          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              'hidden lg:flex items-center justify-center rounded-md p-1.5',
              'text-slate-400 hover:text-white hover:bg-slate-800',
              collapsed && 'absolute -right-3 top-5 bg-slate-900 border border-slate-700 shadow-md'
            )}
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* ── Badge de Rol ──────────────────────────────────────── */}
        {!collapsed && user && (
          <div className="px-4 py-2.5 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Rol</span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
                ROL_BADGE[user.rol] ?? 'bg-slate-700 text-slate-300'
              )}>
                {user.rol}
              </span>
            </div>
          </div>
        )}

        {/* ── Navegación ────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
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
                    title={collapsed ? entry.title : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                      collapsed && 'justify-center px-2',
                      active
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    )}
                  >
                    <Icon size={18} className="flex-shrink-0" />
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
                <div key={entry.key} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => (collapsed ? undefined : toggleGroup(entry.key))}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                      collapsed && 'justify-center px-2',
                      groupActive
                        ? 'bg-primary/20 text-primary'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    )}
                    title={collapsed ? entry.title : undefined}
                    aria-expanded={collapsed ? undefined : expanded}
                  >
                    <GroupIcon size={18} className="flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{entry.title}</span>
                        <ChevronDown
                          size={14}
                          className={cn('transition-transform duration-200', expanded ? 'rotate-180' : 'rotate-0')}
                        />
                      </>
                    )}
                  </button>

                  {/* Subitems */}
                  {!collapsed && expanded && (
                    <div className="ml-3 pl-3 border-l border-slate-700/60 space-y-0.5">
                      {visibleChildren.map((it) => {
                        const Icon = it.icon;
                        const active = isPathActive(it.href);
                        return (
                          <Link
                            key={it.href}
                            to={it.href}
                            onClick={onClose}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                              active
                                ? 'text-white bg-slate-800 font-medium'
                                : 'text-slate-500 hover:text-white hover:bg-slate-800'
                            )}
                          >
                            <Icon size={16} className="flex-shrink-0" />
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

        {/* ── User Info ─────────────────────────────────────────── */}
        {user && (
          <div className={cn(
            'border-t border-slate-800 p-3 flex-shrink-0',
            collapsed ? 'flex justify-center' : 'flex items-center gap-3'
          )}>
            {/* Avatar con iniciales */}
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{getInitials(user.nombre)}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.nombre}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
