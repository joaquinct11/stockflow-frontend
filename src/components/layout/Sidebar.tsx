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
} from 'lucide-react';
import { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions'; // ← AGREGAR

const menuItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Proveedores',
    href: '/proveedores',
    icon: Building2,
  },
  {
    title: 'Productos',
    href: '/productos',
    icon: Package,
  },
  {
    title: 'Ventas',
    href: '/ventas',
    icon: ShoppingCart,
  },
  {
    title: 'Inventario',
    href: '/inventario',
    icon: PackageOpen,
  },
  {
    title: 'Usuarios',
    href: '/usuarios',
    icon: Users,
  },
  {
    title: 'Suscripciones',
    href: '/suscripciones',
    icon: CreditCard,
  },
  {
    title: 'Reportes',
    href: '/reportes',
    icon: BarChart3,
  },
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: Settings,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { rol } = usePermissions(); // ← AGREGAR

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
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
              <Package className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">StockFlow</span>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-accent lg:hidden"
          >
            <X size={18} />
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block rounded-md p-2 hover:bg-accent"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Badge de Rol - AGREGAR ESTO */}
        {!collapsed && (
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">ROL</span>
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-bold',
                rol === 'ADMIN' && 'bg-red-100 text-red-800',
                rol === 'GERENTE' && 'bg-blue-100 text-blue-800',
                rol === 'VENDEDOR' && 'bg-green-100 text-green-800',
                rol === 'ALMACENERO' && 'bg-yellow-100 text-yellow-800',
              )}>
                {rol}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1 p-2 overflow-y-auto h-[calc(100vh-12rem)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        {!collapsed && (
          <div className="absolute bottom-0 w-full border-t p-4 bg-card">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">Usuario</p>
                <p className="text-xs text-muted-foreground truncate">usuario@stockflow.com</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}