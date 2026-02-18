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
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
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
          // Desktop
          'lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          // Mobile
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
          
          {/* Botón de cerrar en móvil */}
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-accent lg:hidden"
          >
            <X size={18} />
          </button>

          {/* Botón de colapsar en desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block rounded-md p-2 hover:bg-accent"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-2 overflow-y-auto h-[calc(100vh-8rem)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose} // Cerrar sidebar en móvil al hacer clic
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
                <p className="text-sm font-medium truncate">Usuario Admin</p>
                <p className="text-xs text-muted-foreground truncate">admin@stockflow.com</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}