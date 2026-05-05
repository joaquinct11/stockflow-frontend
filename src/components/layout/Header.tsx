import { useState } from 'react';
import { Bell, Moon, Sun, LogOut, User, Menu, ChevronDown, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface HeaderProps {
  onMenuClick: () => void;
}

function getInitials(nombre?: string) {
  if (!nombre) return '?';
  const parts = nombre.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export function Header({ onMenuClick }: HeaderProps) {
  const { isDark, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch { /* silencioso */ }
    logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/dashboard/perfil');
  };

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    navigate('/dashboard/configuracion');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6">

      {/* Hamburguesa móvil */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu size={20} />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Controles derechos */}
      <div className="flex items-center gap-1">

        {/* Toggle tema */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
          className="rounded-lg"
        >
          {isDark
            ? <Sun size={18} className="text-amber-400" />
            : <Moon size={18} />}
        </Button>

        {/* Notificaciones */}
        <Button
          variant="ghost"
          size="icon"
          title="Notificaciones"
          className="hidden sm:flex relative rounded-lg"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-background" />
        </Button>

        {/* Separador */}
        <div className="hidden sm:block w-px h-6 bg-border mx-1" />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
          >
            {/* Nombre + Rol — desktop */}
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold leading-tight">{user?.nombre || 'Usuario'}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">
                {user?.rol || 'ADMIN'}
              </p>
            </div>

            {/* Avatar con iniciales */}
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">{getInitials(user?.nombre)}</span>
            </div>

            <ChevronDown
              size={14}
              className={`text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-background border rounded-xl shadow-xl shadow-black/10 py-1.5 z-50 overflow-hidden">

              {/* Info usuario */}
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{getInitials(user?.nombre)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{user?.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Opciones */}
              <div className="py-1">
                <button
                  onClick={handleProfileClick}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2.5 text-sm font-medium transition-colors"
                >
                  <User size={15} className="text-muted-foreground" />
                  Mi perfil
                </button>
                <button
                  onClick={handleSettingsClick}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2.5 text-sm font-medium transition-colors"
                >
                  <Settings size={15} className="text-muted-foreground" />
                  Configuración
                </button>
              </div>

              <div className="border-t my-1" />

              {/* Cerrar sesión */}
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cierra dropdown al click fuera */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
      )}
    </header>
  );
}
