import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  UserCheck,
  CreditCard,
  BarChart3,
  TrendingDown,
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
  Receipt,
  Award,
  Boxes,
  FlaskConical,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useSucursalStore } from '../../store/sucursalStore';
import { usePlan } from '../../hooks/usePlan';

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
  key: 'ventas' | 'gastos' | 'contactos' | 'inventario' | 'usuarios';
  items: Omit<LeafItem, 'type'>[];
};

type MenuEntry = LeafItem | GroupItem;

const ROL_LABEL: Record<string, string> = {
  ADMIN:             'Admin',
  VENDEDOR:          'Vendedor',
  GESTOR_INVENTARIO: 'Almacén',
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
  const { user, suscripcionEstado } = useAuthStore();
  const { canAccess, isAdmin, puede } = usePermissions();
  const { config: negocioConfig } = useTenantConfigStore();
  const { sucursales } = useSucursalStore();
  const { isPro } = usePlan();
  const esRopa       = negocioConfig?.rubro === 'TIENDA_ROPA';
  const esServicios  = negocioConfig?.rubro === 'EMPRESA_SERVICIOS';
  const esBoticaFarmacia = negocioConfig?.rubro === 'BOTICA' || negocioConfig?.rubro === 'FARMACIA';
  const esPro        = isPro || sucursales.length > 0;

  // Trial info para la barra del sidebar
  const trialEndDate = (user?.suscripcion?.trialEndDate) as string | undefined;
  const esTrial = suscripcionEstado === 'TRIAL';
  const diasTrialRestantes = (() => {
    if (!esTrial || !trialEndDate) return null;
    const diff = Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  })();
  const trialProgressPct = (() => {
    if (!esTrial || diasTrialRestantes === null) return 57;
    const total = 14;
    return Math.round(((total - diasTrialRestantes) / total) * 100);
  })();

  const isPathActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href === '/pos') return location.pathname === '/pos';
    if (href.includes('?')) {
      const [hrefPath, hrefQuery] = href.split('?');
      return location.pathname.startsWith(hrefPath) && location.search.includes(hrefQuery);
    }
    if (href === '/dashboard/productos' && location.search.includes('tipo=')) return false;
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
        type: 'group',
        key: 'ventas',
        title: esServicios ? 'Facturación' : 'Ventas',
        icon: ShoppingCart,
        show: canAccess('VENTAS') || canAccess('FACTURACION') || canAccess('POS') || isAdmin,
        items: [
          { title: 'Punto de Venta',   href: '/pos',                        icon: ScanLine,      show: canAccess('POS') },
          { title: 'Cuadre de Caja',   href: '/dashboard/caja',             icon: Wallet,        show: canAccess('POS') },
          { title: esServicios ? 'Servicios prestados' : 'Historial de Ventas', href: '/dashboard/ventas', icon: ShoppingCart, show: canAccess('VENTAS') },
          { title: 'Facturación',      href: '/dashboard/facturacion',      icon: FileText,      show: canAccess('FACTURACION') },
          { title: 'Notas de Crédito', href: '/dashboard/notas-credito',    icon: Receipt,       show: !esServicios && (isAdmin || puede('VER_NOTAS_CREDITO')) },
        ],
      },
      {
        type: 'group',
        key: 'gastos',
        title: 'Gastos',
        icon: TrendingDown,
        show: canAccess('GASTOS') || (!esRopa && !esServicios && (canAccess('COMPRAS') || canAccess('RECEPCIONES'))),
        items: [
          { title: 'Gastos y Egresos',   href: '/dashboard/gastos',           icon: TrendingDown, show: canAccess('GASTOS') },
          { title: 'Órdenes de Compra',  href: '/dashboard/compras/ordenes',  icon: ClipboardList,show: !esRopa && !esServicios && canAccess('COMPRAS') },
          { title: 'Recepciones',        href: '/dashboard/recepciones',       icon: Inbox,        show: !esRopa && !esServicios && canAccess('RECEPCIONES') },
        ],
      },
      {
        type: 'group',
        key: 'contactos',
        title: 'Contactos',
        icon: UserCheck,
        show: canAccess('CLIENTES') || canAccess('PROVEEDORES'),
        items: [
          { title: 'Clientes',    href: '/dashboard/clientes',    icon: UserCheck,  show: canAccess('CLIENTES') },
          { title: 'Proveedores', href: '/dashboard/proveedores', icon: Building2,  show: canAccess('PROVEEDORES') },
        ],
      },
      {
        type: 'item',
        title: 'Comisiones',
        href: '/dashboard/comisiones',
        icon: BarChart3,
        show: esServicios && (isAdmin || puede('VER_COMISIONES')),
      },
      {
        type: 'group',
        key: 'inventario',
        title: esServicios ? 'Catálogo e Inventario' : 'Inventario',
        icon: PackageOpen,
        show: canAccess('PRODUCTOS') || canAccess('INVENTARIO'),
        items: [
          { title: esServicios ? 'Catálogo de Servicios' : 'Productos', href: esServicios ? '/dashboard/productos?tipo=SERVICIO' : '/dashboard/productos', icon: Package, show: canAccess('PRODUCTOS') },
          { title: 'Productos Físicos', href: '/dashboard/productos?tipo=PRODUCTO', icon: Boxes, show: esServicios && canAccess('PRODUCTOS') },
          { title: 'Movimientos',       href: '/dashboard/inventario',              icon: PackageOpen, show: canAccess('INVENTARIO') },
        ],
      },
      {
        type: 'group',
        key: 'usuarios',
        title: 'Usuarios',
        icon: Users,
        show: canAccess('USUARIOS') || isAdmin,
        items: [
          { title: 'Usuarios',           href: '/dashboard/usuarios',        icon: Users,      show: canAccess('USUARIOS') },
          { title: 'Gestión de permisos',href: '/dashboard/admin/permisos',  icon: ShieldCheck,show: isAdmin },
        ],
      },
      { type: 'item', title: 'DIGEMID / OPPF',  href: '/dashboard/digemid',        icon: FlaskConical, show: esBoticaFarmacia && isAdmin },
      { type: 'item', title: 'Certificados',     href: '/dashboard/certificados',   icon: Award,        show: !esServicios && canAccess('CERTIFICADOS') },
      { type: 'item', title: 'Sucursales',       href: '/dashboard/sucursales',     icon: Building2,    show: isAdmin && esPro },
      { type: 'item', title: 'Suscripciones',    href: '/dashboard/suscripciones',  icon: CreditCard,   show: canAccess('SUSCRIPCIONES') },
      { type: 'item', title: 'Reportes',         href: '/dashboard/reportes',       icon: BarChart3,    show: canAccess('REPORTES') },
      { type: 'item', title: 'Configuración',    href: '/dashboard/configuracion',  icon: Settings,     show: true },
    ],
    [canAccess, isAdmin, puede, user?.rol, esPro, esServicios, esBoticaFarmacia]
  );

  const defaultExpanded = useMemo(() => {
    const ventasOpen =
      isPathActive('/dashboard/ventas') || isPathActive('/dashboard/facturacion') ||
      isPathActive('/dashboard/notas-credito') || isPathActive('/dashboard/caja') ||
      location.pathname === '/pos';
    const gastosOpen =
      isPathActive('/dashboard/gastos') || isPathActive('/dashboard/compras') ||
      isPathActive('/dashboard/recepciones');
    const contactosOpen =
      isPathActive('/dashboard/clientes') || isPathActive('/dashboard/proveedores');
    const inventarioOpen =
      location.pathname.startsWith('/dashboard/productos') ||
      isPathActive('/dashboard/inventario') || isPathActive('/dashboard/kardex');
    const usuariosOpen =
      isPathActive('/dashboard/usuarios') || isPathActive('/dashboard/admin');
    return { ventas: ventasOpen, gastos: gastosOpen, contactos: contactosOpen, inventario: inventarioOpen, usuarios: usuariosOpen };
  }, [location.pathname, location.search]);

  const [openGroups, setOpenGroups] = useState(defaultExpanded);
  const [collapsedPopover, setCollapsedPopover] = useState<{ key: string; top: number } | null>(null);

  useEffect(() => { setCollapsedPopover(null); }, [location.pathname]);

  useMemo(() => {
    setOpenGroups((prev) => ({ ...prev, ...defaultExpanded }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultExpanded.ventas, defaultExpanded.gastos, defaultExpanded.contactos, defaultExpanded.inventario, defaultExpanded.usuarios]);

  const toggleGroup = (key: GroupItem['key']) => {
    setOpenGroups((prev) => {
      const isCurrentlyOpen = prev[key];
      return { ventas: false, gastos: false, contactos: false, inventario: false, usuarios: false, [key]: !isCurrentlyOpen };
    });
  };

  return (
    <>
      {/* Overlay flyout colapsado */}
      {collapsed && collapsedPopover && (
        <div className="fixed inset-0 z-[65]" onClick={() => setCollapsedPopover(null)} />
      )}

      {/* Botón expandir — tab flotante en el borde derecho del sidebar contraído */}
      {collapsed && (
        <button
          onClick={() => onCollapsedChange(false)}
          aria-label="Expandir sidebar"
          className="fixed top-1/2 -translate-y-1/2 left-[68px] z-[21] hidden lg:flex items-center justify-center w-5 h-8 bg-card border border-border border-l-0 rounded-r-md shadow-sm text-muted-foreground hover:text-primary hover:bg-accent transition-all"
        >
          <ChevronRight size={13} />
        </button>
      )}

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
          'bg-sidebar border-r border-sidebar-line',
          'transition-all duration-300 ease-in-out',
          'lg:translate-x-0',
          collapsed ? 'lg:w-[68px]' : 'lg:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          !isOpen && 'max-lg:pointer-events-none',
          'w-64 lg:z-20'
        )}
      >
        {/* ── Logo header ─────────────────────────────────────────── */}
        <div className={cn(
          'flex h-16 items-center border-b border-sidebar-line flex-shrink-0 relative',
          collapsed ? 'justify-center px-3' : 'gap-[10px] px-[18px]'
        )}>
          {!collapsed && (
            <>
              <img src="/fluxus.png" alt="Fluxus" className="w-[30px] h-[30px] rounded-lg object-cover flex-shrink-0" />
              <div className="min-w-0 leading-[1.2]">
                <div className="text-base font-bold tracking-tight">Fluxus</div>
                <div className="text-[10px] text-muted-foreground tracking-wide">Mini ERP · Perú</div>
              </div>
            </>
          )}

          {collapsed && (
            <button
              onClick={() => onCollapsedChange(false)}
              title="Expandir sidebar"
              className="hidden lg:block rounded-lg hover:ring-2 hover:ring-primary/40 transition-all"
              aria-label="Expandir sidebar"
            >
              <img src="/fluxus.png" alt="Fluxus" className="w-[30px] h-[30px] rounded-lg object-cover" />
            </button>
          )}
          {collapsed && (
            <img src="/fluxus.png" alt="Fluxus" className="w-[30px] h-[30px] rounded-lg object-cover lg:hidden" />
          )}

          {/* Botón cerrar móvil */}
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent lg:hidden"
          >
            <X size={17} />
          </button>

          {/* Botón collapse desktop — solo visible cuando expandido */}
          {!collapsed && (
            <button
              onClick={() => onCollapsedChange(true)}
              className="hidden lg:grid place-items-center ml-auto w-[26px] h-[26px] rounded-[7px] transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Colapsar sidebar"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {/* ── Badge de Rol ──────────────────────────────────────── */}
        {!collapsed && user && (
          <div className="flex items-center justify-between gap-2 px-[18px] py-[10px] border-b border-sidebar-line flex-shrink-0">
            <span className="font-mono text-[.62rem] font-semibold tracking-[.1em] uppercase text-muted-foreground">Rol</span>
            <span className="text-[.66rem] font-bold tracking-[.05em] uppercase text-destructive bg-destructive/10 rounded-full px-[9px] py-[2px]">
              {ROL_LABEL[user.rol] ?? user.rol}
            </span>
          </div>
        )}

        {/* ── Navegación ────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-[10px] flex flex-col gap-0.5">
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
                      'relative flex items-center gap-[11px] rounded-[9px] px-[10px] py-2 text-[.865rem] font-medium transition-all',
                      collapsed && 'justify-center px-0 w-full',
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                    )}
                    style={active ? { boxShadow: 'inset 3px 0 0 hsl(var(--primary))' } : undefined}
                  >
                    <Icon size={17} className="flex-shrink-0" />
                    {!collapsed && <span className="flex-1 min-w-0">{entry.title}</span>}
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
                <div key={entry.key} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      if (collapsed) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCollapsedPopover((prev) =>
                          prev?.key === entry.key ? null : { key: entry.key, top: rect.top }
                        );
                      } else {
                        toggleGroup(entry.key);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-[11px] rounded-[9px] px-[10px] py-2 text-[.865rem] font-medium transition-all',
                      collapsed && 'justify-center px-0',
                      groupActive || (collapsed && collapsedPopover?.key === entry.key)
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                    )}
                    style={groupActive ? { boxShadow: 'inset 3px 0 0 hsl(var(--primary))' } : undefined}
                    title={collapsed ? entry.title : undefined}
                    aria-expanded={collapsed ? undefined : expanded}
                  >
                    <GroupIcon size={17} className="flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{entry.title}</span>
                        <ChevronDown
                          size={14}
                          className={cn('transition-transform duration-200 flex-shrink-0', expanded ? 'rotate-180' : 'rotate-0')}
                        />
                      </>
                    )}
                  </button>

                  {/* Subitems */}
                  {!collapsed && expanded && (
                    <div className="ml-3 pl-[11px] border-l border-sidebar-line flex flex-col gap-0.5">
                      {visibleChildren.map((it) => {
                        const Icon = it.icon;
                        const active = isPathActive(it.href);
                        return (
                          <Link
                            key={it.href}
                            to={it.href}
                            onClick={onClose}
                            className={cn(
                              'flex items-center gap-[10px] rounded-lg px-[10px] py-[7px] text-[.83rem] transition-all',
                              active
                                ? 'text-primary bg-primary/10 font-semibold'
                                : 'text-ink-2 hover:text-ink hover:bg-surface-2 font-medium'
                            )}
                          >
                            <Icon size={16} className="flex-shrink-0" />
                            <span className="flex-1 min-w-0">{it.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>

        {/* ── Trial / Suscripción ───────────────────────────────── */}
        {!collapsed && user && (
          <div className="border-t border-sidebar-line flex-shrink-0">
            {esTrial && (
              <div className="p-3">
                <div className="border border-border rounded-xl p-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[.77rem] font-semibold text-muted-foreground">Prueba gratuita</span>
                    <span className="font-mono text-[.72rem] font-semibold text-primary">
                      {diasTrialRestantes !== null ? `${diasTrialRestantes} días` : '—'}
                    </span>
                  </div>
                  <div className="h-[5px] rounded-full bg-border mt-[9px] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${trialProgressPct}%` }}
                    />
                  </div>
                  <Link
                    to="/dashboard/suscripciones"
                    onClick={onClose}
                    className="block text-center mt-[10px] text-[.78rem] font-semibold text-white bg-primary rounded-lg py-[7px] hover:brightness-110 transition-all"
                  >
                    Activar suscripción
                  </Link>
                </div>
              </div>
            )}

            {/* ── User row ────────────────────────────────────────── */}
            <div className={cn(
              'flex items-center gap-[10px] px-[14px] py-[11px]',
              esTrial ? 'border-t border-sidebar-line' : ''
            )}>
              <span className="w-8 h-8 flex-shrink-0 rounded-full bg-primary/10 border border-primary/30 text-primary text-[.72rem] font-bold grid place-items-center">
                {getInitials(user.nombre)}
              </span>
              <div className="min-w-0 flex-1 leading-[1.3]">
                <div className="text-[.82rem] font-semibold truncate">{user.nombre}</div>
                <div className="text-[.71rem] text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* User row colapsado */}
        {collapsed && user && (
          <div className="flex justify-center py-3 flex-shrink-0">
            <span className="w-8 h-8 flex-shrink-0 rounded-full bg-primary/10 border border-primary/30 text-primary text-[.72rem] font-bold grid place-items-center">
              {getInitials(user.nombre)}
            </span>
          </div>
        )}
      </aside>

      {/* Flyout de grupos — fuera del aside para escapar su stacking context */}
      {collapsed && collapsedPopover && (() => {
        const entry = menu
          .filter((e) => e.show)
          .find((e) => e.type === 'group' && (e as GroupItem).key === collapsedPopover.key) as GroupItem | undefined;
        if (!entry) return null;
        const children = entry.items.filter((it) => it.show);
        return (
          <div
            className="fixed left-[68px] z-[70] min-w-[200px] bg-sidebar border border-sidebar-line rounded-xl shadow-card py-1.5 overflow-hidden"
            style={{ top: collapsedPopover.top }}
          >
            <div className="px-3 py-1.5 mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-3 border-b border-sidebar-line">
              {entry.title}
            </div>
            {children.map((it) => {
              const Icon = it.icon;
              const active = isPathActive(it.href);
              return (
                <Link
                  key={it.href}
                  to={it.href}
                  onClick={() => { onClose(); setCollapsedPopover(null); }}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm transition-all',
                    active
                      ? 'text-primary bg-primary/10 font-semibold'
                      : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                  )}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  <span>{it.title}</span>
                </Link>
              );
            })}
          </div>
        );
      })()}
    </>
  );
}
