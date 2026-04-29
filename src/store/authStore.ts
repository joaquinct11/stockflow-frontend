import { create } from 'zustand';
import type { JwtResponse } from '../types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: JwtResponse | null;
  isAuthenticated: boolean;
  /** Estado de suscripción del tenant, actualizado independientemente del JWT */
  suscripcionEstado: string | null;
  setUser: (user: JwtResponse) => void;
  logout: () => void;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSuscripcionEstado: (estado: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  suscripcionEstado: null,

  setUser: (user) => {
    if (import.meta.env.DEV) { console.log('✅ Usuario establecido:', user.email);}
    set({ user, isAuthenticated: true });
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', user.accessToken);
    localStorage.setItem('refreshToken', user.refreshToken);
  },

  logout: () => {
    if (import.meta.env.DEV) { console.log('🚪 Cerrando sesión');}
    set({ user: null, isAuthenticated: false, suscripcionEstado: null });
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token'); // ✅ Eliminar token viejo si existe
  },

  setSuscripcionEstado: (estado: string) => {
    set({ suscripcionEstado: estado });
  },

  // ✅ NUEVO: Refrescar tokens automáticamente
  refreshUser: async () => {
    try {
      if (import.meta.env.DEV) { console.log('🔄 Intentando refrescar tokens...');}
      const refreshedData = await authService.refresh();
      
      // Actualizar el usuario con los nuevos datos
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          ...refreshedData,
        };
        set({ user: updatedUser });
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('accessToken', refreshedData.accessToken);
        localStorage.setItem('refreshToken', refreshedData.refreshToken);
        if (import.meta.env.DEV) { console.log('✅ Tokens refrescados exitosamente');}
      }
    } catch (error) {
      if (import.meta.env.DEV) { console.error('❌ Error refrescando tokens:', error);}
      // Si falla el refresh, hacer logout
      get().logout();
      throw error;
    }
  },

  initialize: async () => {
    if (import.meta.env.DEV) { console.log('🔄 Inicializando AuthStore...');}
    
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');
    
    if (import.meta.env.DEV) { console.log('📦 Datos en localStorage:');}
    if (import.meta.env.DEV) { console.log('  - accessToken:', accessToken ? '✅' : '❌');}
    if (import.meta.env.DEV) { console.log('  - refreshToken:', refreshToken ? '✅' : '❌');}
    if (import.meta.env.DEV) { console.log('  - user:', storedUser ? '✅' : '❌');}
    
    if (storedUser && accessToken && refreshToken) {
      const user = JSON.parse(storedUser);
      if (import.meta.env.DEV) { console.log('✅ Sesión restaurada para:', user.email);}
      set({ user, isAuthenticated: true });

      // Refresh user data from server to get up-to-date permissions and profile
      try {
        const profile = await authService.obtenerPerfil();
        const updatedUser = {
          ...user,
          permisos: profile.permisos,
          nombre: profile.nombre,
          email: profile.email,
          rol: profile.rol,
          tenantId: profile.tenantId,
        };
        set({ user: updatedUser });
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (import.meta.env.DEV) { console.log('✅ Permisos actualizados desde /api/auth/me:', profile.permisos);}
      } catch (error) {
        if (import.meta.env.DEV) { console.warn('⚠️ No se pudo actualizar permisos desde /api/auth/me, usando datos locales:', error);}
      }
    } else {
      if (import.meta.env.DEV) { console.log('❌ No hay sesión guardada o tokens incompletos');}
      set({ user: null, isAuthenticated: false });
    }
  },
}));