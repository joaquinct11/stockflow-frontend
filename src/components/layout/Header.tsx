import { useState, useEffect, useRef } from 'react';
import { Bell, Moon, Sun, LogOut, User, Menu, ChevronDown, Settings, Package, Clock, CreditCard, CheckCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { productoService } from '../../services/producto.service';
import { ordenCompraService } from '../../services/ordenCompra.service';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { ProductoDTO, OrdenCompraDTO } from '../../types';

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

function diasDesde(fecha?: string | null): number {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

interface Notificacion {
  id: string;
  tipo: 'danger' | 'warning' | 'info' | 'success';
  titulo: string;
  detalle: string;
  ruta?: string;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { isDark, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ── Notificaciones ─────────────────────────────────────────────────────────
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const cargarNotificaciones = async () => {
    setNotifLoading(true);
    try {
      const [productos, ordenes] = await Promise.all([
        productoService.getAll().catch(() => [] as ProductoDTO[]),
        ordenCompraService.getAll().catch(() => [] as OrdenCompraDTO[]),
      ]);

      const nuevas: Notificacion[] = [];

      // 🔴 Bajo stock
      const bajoStock = productos.filter((p) => (p.stockActual ?? 0) <= (p.stockMinimo ?? 0));
      if (bajoStock.length > 0) {
        nuevas.push({
          id: 'bajo-stock',
          tipo: 'danger',
          titulo: `${bajoStock.length} producto${bajoStock.length > 1 ? 's' : ''} con stock bajo`,
          detalle: bajoStock.slice(0, 3).map((p) => p.nombre).join(', ') + (bajoStock.length > 3 ? ` y ${bajoStock.length - 3} más` : ''),
          ruta: '/dashboard/inventario',
        });
      }

      // 🟡 OC retrasadas (enviadas hace +30 días)
      const ocRetrasadas = ordenes.filter(
        (o) => o.estado === 'ENVIADA' && diasDesde(o.createdAt) > 30
      );
      if (ocRetrasadas.length > 0) {
        nuevas.push({
          id: 'oc-retrasadas',
          tipo: 'warning',
          titulo: `${ocRetrasadas.length} OC retrasada${ocRetrasadas.length > 1 ? 's' : ''}`,
          detalle: `${ocRetrasadas.length > 1 ? 'Llevan' : 'Lleva'} más de 30 días sin recepción`,
          ruta: '/dashboard/compras',
        });
      }

      // 🔵 Trial por vencer
      const suscEstado = user?.suscripcionEstado;
      const fechaVenc = (user as any)?.fechaProximoCobro as string | undefined;
      if (suscEstado === 'TRIAL' && fechaVenc) {
        const diff = new Date(fechaVenc).getTime() - Date.now();
        const dias = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        if (dias <= 7) {
          nuevas.push({
            id: 'trial-vence',
            tipo: 'info',
            titulo: `Período de prueba ${dias === 0 ? 'vence hoy' : `vence en ${dias} día${dias !== 1 ? 's' : ''}`}`,
            detalle: 'Suscríbete para mantener el acceso completo al sistema.',
            ruta: '/dashboard/suscripciones',
          });
        }
      }

      // ✅ Sin alertas
      if (nuevas.length === 0) {
        nuevas.push({
          id: 'ok',
          tipo: 'success',
          titulo: 'Todo en orden',
          detalle: 'No hay alertas pendientes en este momento.',
        });
      }

      setNotificaciones(nuevas);
    } catch {
      // silencioso
    } finally {
      setNotifLoading(false);
    }
  };

  const handleBellClick = () => {
    const opening = !isNotifOpen;
    setIsNotifOpen(opening);
    if (opening) cargarNotificaciones();
  };

  // Cerrar al click fuera del panel
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isNotifOpen]);

  const contadorAlertas = notificaciones.filter((n) => n.tipo !== 'success').length;

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
  const tipoColor = (tipo: Notificacion['tipo']) => ({
    danger:  'bg-red-500/10 border-red-200 dark:border-red-800',
    warning: 'bg-amber-500/10 border-amber-200 dark:border-amber-800',
    info:    'bg-blue-500/10 border-blue-200 dark:border-blue-800',
    success: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-800',
  }[tipo]);

  const tipoIcono = (tipo: Notificacion['tipo']) => ({
    danger:  <Package size={15} className="text-red-500 shrink-0 mt-0.5" />,
    warning: <Clock size={15} className="text-amber-500 shrink-0 mt-0.5" />,
    info:    <CreditCard size={15} className="text-blue-500 shrink-0 mt-0.5" />,
    success: <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />,
  }[tipo]);

  const tipoTitulo = (tipo: Notificacion['tipo']) => ({
    danger:  'text-red-700 dark:text-red-400',
    warning: 'text-amber-700 dark:text-amber-400',
    info:    'text-blue-700 dark:text-blue-400',
    success: 'text-emerald-700 dark:text-emerald-400',
  }[tipo]);

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

        {/* ── Notificaciones ─────────────────────────────────────────────── */}
        <div className="relative hidden sm:block" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            title="Notificaciones"
            className="relative rounded-lg"
            onClick={handleBellClick}
          >
            <Bell size={18} />
            {/* Badge rojo: siempre visible si hay alertas reales, o el puntito estático inicial */}
            {contadorAlertas > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-background">
                {contadorAlertas > 9 ? '9+' : contadorAlertas}
              </span>
            ) : notificaciones.length === 0 ? (
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-background" />
            ) : null}
          </Button>

          {/* Panel de notificaciones */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-background border rounded-xl shadow-xl shadow-black/10 z-50 overflow-hidden">
              {/* Header panel */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div>
                  <p className="text-sm font-semibold">Notificaciones</p>
                  {!notifLoading && (
                    <p className="text-xs text-muted-foreground">
                      {contadorAlertas > 0
                        ? `${contadorAlertas} alerta${contadorAlertas > 1 ? 's' : ''} activa${contadorAlertas > 1 ? 's' : ''}`
                        : 'Sin alertas'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Contenido */}
              <div className="divide-y max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                    <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Verificando alertas...
                  </div>
                ) : (
                  notificaciones.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.ruta) { navigate(n.ruta); setIsNotifOpen(false); }
                      }}
                      className={[
                        'flex gap-3 px-4 py-3 border-l-4 transition-colors',
                        tipoColor(n.tipo),
                        n.ruta ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110' : '',
                      ].join(' ')}
                    >
                      {tipoIcono(n.tipo)}
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold leading-snug ${tipoTitulo(n.tipo)}`}>
                          {n.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.detalle}</p>
                        {n.ruta && (
                          <p className="text-[10px] text-primary mt-1 font-medium">Ver →</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {!notifLoading && (
                <div className="px-4 py-2 border-t bg-muted/30 flex justify-end">
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
