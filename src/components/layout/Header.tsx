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
      toast.success('Sesi��n cerrada exitosamente');
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
      {/* <div className="max-w-2xl w-full hidden sm:block">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="pl-8 w-full"
          />
        </div>
      </div> */}

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

        {/* ✅ User Section - Pegado a la derecha */}
        <div className="flex items-center gap-2 pl-3 border-l">
          {/* Nombre y Rol */}
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium leading-tight">{user?.nombre || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground uppercase font-medium">{user?.rol || 'ADMIN'}</p>
          </div>

          {/* Avatar */}
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}