import { Bell, Search, Moon, Sun, LogOut, User, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
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

      {/* Search */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="pl-8 w-full"
          />
        </div>
      </div>

      {/* Spacer en móvil */}
      <div className="flex-1 sm:hidden" />

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
        <Button variant="ghost" size="icon" title="Notificaciones" className="hidden sm:flex">
          <Bell size={20} />
        </Button>

        {/* User Menu */}
        <div className="flex items-center gap-2 pl-2 border-l">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium">{user?.nombre || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">{user?.rol || 'ADMIN'}</p>
          </div>
          
          <Button variant="ghost" size="icon" title="Perfil" className="hidden sm:flex">
            <User size={20} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
}