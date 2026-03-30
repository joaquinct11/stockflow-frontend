import { useState } from 'react';
import { Bell, Moon, Sun, LogOut, User, Menu, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { isDark, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      toast.success('Sesión cerrada exitosamente');
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      logout();
      navigate('/login');
    }
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/dashboard/perfil');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Botón hamburguesa para móvil */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </Button>

      {/* ✅ SPACER - Empuja todo a la derecha */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" title="Notificaciones" className="hidden sm:flex relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
        </Button>

        {/* ✅ User Dropdown - Reemplaza el antiguo User Section */}
        <div className="relative">
          <Button
            variant="ghost"
            className="flex items-center gap-2 pl-3 pr-2 border-l"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {/* Nombre y Rol */}
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium leading-tight">{user?.nombre || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground uppercase font-medium">{user?.rol || 'ADMIN'}</p>
            </div>

            {/* Avatar */}
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>

            {/* Chevron */}
            <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {/* ✅ NUEVO: Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-background border rounded-lg shadow-lg py-2 z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b">
                <p className="font-medium text-sm">{user?.nombre}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>

              {/* Menu Items */}
              <button
                onClick={handleProfileClick}
                className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2 text-sm"
              >
                <User size={16} />
                Mi Perfil
              </button>

              <div className="border-t my-2"></div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2 text-sm text-red-500 hover:text-red-600"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Cerrar dropdown si haces click fuera */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </header>
  );
}