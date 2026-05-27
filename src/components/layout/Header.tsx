import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Moon, Sun, LogOut, User, Menu, ChevronDown, Settings, AlertTriangle, Info, CheckCircle, X, BellOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { notificacionService, type NotificacionDTO } from '../../services/notificacion.service';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GlobalSearch } from './GlobalSearch';

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

function tipoAColor(tipo: string): 'danger' | 'warning' | 'info' | 'success' {
  if (['STOCK_BAJO', 'PRODUCTO_VENCIDO', 'DESCUADRE_CAJA', 'VENTA_ANULADA'].includes(tipo)) return 'danger';
  if (['PRODUCTO_POR_VENCER', 'PRODUCTO_SIN_MOVIMIENTO', 'OC_SIN_RECEPCIONAR', 'SUSCRIPCION_POR_VENCER'].includes(tipo)) return 'warning';
  return 'info';
}

function tipoARuta(tipo: string): string | undefined {
  const map: Record<string, string> = {
    STOCK_BAJO:              '/dashboard/inventario',
    PRODUCTO_VENCIDO:        '/dashboard/inventario',
    PRODUCTO_POR_VENCER:     '/dashboard/inventario',
    PRODUCTO_SIN_MOVIMIENTO: '/dashboard/inventario',
    OC_SIN_RECEPCIONAR:      '/dashboard/ordenes-compra',
    SUSCRIPCION_POR_VENCER:  '/dashboard/suscripciones',
    DESCUADRE_CAJA:          '/dashboard/caja',
    VENTA_ANULADA:           '/dashboard/ventas',
  };
  return map[tipo];
}

function formatRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { isDark, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Notificaciones ─────────────────────────────────────────────────────────
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notificaciones, setNotificaciones] = useState<NotificacionDTO[]>([]);
  const [noLeidasCount, setNoLeidasCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const count = await notificacionService.contarNoLeidas();
      setNoLeidasCount(count);
    } catch { /* silencioso */ }
  }, []);

  // Polling del badge cada 2 minutos
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 120_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const cargarNotificaciones = useCallback(async () => {
    setNotifLoading(true);
    try {
      const data = await notificacionService.getAll();
      setNotificaciones(data);
      setNoLeidasCount(data.filter((n) => !n.leida).length);
    } catch { /* silencioso */ } finally {
      setNotifLoading(false);
    }
  }, []);

  const handleBellClick = () => {
    const opening = !isNotifOpen;
    setIsNotifOpen(opening);
    if (opening) cargarNotificaciones();
  };

  const handleMarcarLeida = async (n: NotificacionDTO) => {
    const ruta = tipoARuta(n.tipo);
    if (!n.leida) {
      try { await notificacionService.marcarLeida(n.id); } catch { /* silencioso */ }
      setNotificaciones((prev) => prev.map((x) => x.id === n.id ? { ...x, leida: true } : x));
      setNoLeidasCount((c) => Math.max(0, c - 1));
    }
    if (ruta) { navigate(ruta); setIsNotifOpen(false); }
  };

  const handleMarcarTodas = async () => {
    try { await notificacionService.marcarTodasLeidas(); } catch { /* silencioso */ }
    setNotificaciones((prev) => prev.map((x) => ({ ...x, leida: true })));
    setNoLeidasCount(0);
  };

  const handleEliminar = async (e: React.MouseEvent, n: NotificacionDTO) => {
    e.stopPropagation();
    try {
      await notificacionService.eliminar(n.id);
      setNotificaciones((prev) => prev.filter((x) => x.id !== n.id));
      if (!n.leida) setNoLeidasCount((c) => Math.max(0, c - 1));
    } catch { /* silencioso — no eliminar del estado si falló */ }
  };

  const handleEliminarLeidas = async () => {
    try {
      await notificacionService.eliminarTodasLeidas();
      setNotificaciones((prev) => prev.filter((x) => !x.leida));
    } catch { /* silencioso */ }
  };

  // Cerrar notificaciones al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isNotifOpen]);

  // Cerrar dropdown de usuario al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDropdownOpen]);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* silencioso */ }
    logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const handleProfileClick = () => { setIsDropdownOpen(false); navigate('/dashboard/perfil'); };
  const handleSettingsClick = () => { setIsDropdownOpen(false); navigate('/dashboard/configuracion'); };

  // ── Helpers de UI ───────────────────────────────────────────────────────────
  const colorForTipo = (tipo: string) => {
    const c = tipoAColor(tipo);
    return {
      danger:  'bg-red-500/10 border-red-200 dark:border-red-800',
      warning: 'bg-amber-500/10 border-amber-200 dark:border-amber-800',
      info:    'bg-blue-500/10 border-blue-200 dark:border-blue-800',
      success: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-800',
    }[c];
  };

  const iconoForTipo = (tipo: string) => {
    const c = tipoAColor(tipo);
    return {
      danger:  <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />,
      warning: <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />,
      info:    <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />,
      success: <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />,
    }[c];
  };

  const tituloColorForTipo = (tipo: string) => {
    const c = tipoAColor(tipo);
    return {
      danger:  'text-red-700 dark:text-red-400',
      warning: 'text-amber-700 dark:text-amber-400',
      info:    'text-blue-700 dark:text-blue-400',
      success: 'text-emerald-700 dark:text-emerald-400',
    }[c];
  };

  return (
    <header className="sticky top-0 z-[45] flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6">

      {/* Hamburguesa móvil */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu size={20} />
      </Button>

      {/* Búsqueda global */}
      <GlobalSearch />

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

        {/* ── Notificaciones ─────────────────────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            title="Notificaciones"
            className="relative rounded-lg"
            onClick={handleBellClick}
          >
            <Bell size={18} />
            {noLeidasCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-background">
                {noLeidasCount > 9 ? '9+' : noLeidasCount}
              </span>
            ) : null}
          </Button>

          {/* Panel de notificaciones */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-background border rounded-xl shadow-xl shadow-black/10 z-50 overflow-hidden">
              {/* Header panel */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div>
                  <p className="text-sm font-semibold">Notificaciones</p>
                  {!notifLoading && (
                    <p className="text-xs text-muted-foreground">
                      {noLeidasCount > 0
                        ? `${noLeidasCount} sin leer`
                        : 'Todo al día'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {noLeidasCount > 0 && !notifLoading && (
                    <button
                      onClick={handleMarcarTodas}
                      className="text-xs text-primary hover:underline transition-colors"
                      title="Marcar todas como leídas"
                    >
                      Marcar todas
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Contenido — altura fija para que el scroll sea siempre visible */}
              <div className="divide-y h-72 overflow-y-scroll scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {notifLoading ? (
                  <div className="flex items-center justify-center h-full gap-2 text-muted-foreground text-sm">
                    <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Cargando...
                  </div>
                ) : notificaciones.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <BellOff size={28} className="opacity-30" />
                    <p className="text-sm">Sin notificaciones</p>
                  </div>
                ) : (
                  notificaciones.map((n) => {
                    const ruta = tipoARuta(n.tipo);
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleMarcarLeida(n)}
                        className={[
                          'flex gap-3 px-4 py-3 border-l-4 transition-colors',
                          colorForTipo(n.tipo),
                          n.leida ? 'opacity-50' : '',
                          ruta ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110' : '',
                        ].join(' ')}
                      >
                        {iconoForTipo(n.tipo)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className={`text-xs font-semibold leading-snug ${tituloColorForTipo(n.tipo)}`}>
                              {n.titulo}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              {!n.leida && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1" />
                              )}
                              <button
                                onClick={(e) => handleEliminar(e, n)}
                                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors ml-1"
                                title="Eliminar notificación"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.mensaje}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {formatRelativo(n.createdAt)}
                            {ruta && <span className="text-primary ml-2 font-medium">Ver →</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {!notifLoading && (
                <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between">
                  <button
                    onClick={handleEliminarLeidas}
                    disabled={!notificaciones.some((n) => n.leida)}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Borrar leídas
                  </button>
                  <button
                    onClick={cargarNotificaciones}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Actualizar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="hidden sm:block w-px h-6 bg-border mx-1" />

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
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

    </header>
  );
}
