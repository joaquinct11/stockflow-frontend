import { create } from 'zustand';
import type { JwtResponse } from '../types';

interface AuthState {
  user: JwtResponse | null;
  isAuthenticated: boolean;
  setUser: (user: JwtResponse) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) => {
    console.log('✅ Usuario establecido:', user); // ← Log para debug
    set({ user, isAuthenticated: true });
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', user.token);
  },

  logout: () => {
    console.log('🚪 Cerrando sesión'); // ← Log para debug
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  initialize: () => {
    console.log('🔄 Inicializando AuthStore...'); // ← Log para debug
    
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    console.log('📦 Usuario en localStorage:', storedUser); // ← Log para debug
    console.log('🔑 Token en localStorage:', token ? 'Existe' : 'No existe'); // ← Log para debug
    
    if (storedUser && token) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('✅ Sesión restaurada para:', user.email); // ← Log para debug
      set({ user, isAuthenticated: true });
    } else {
      console.log('❌ No hay sesión guardada'); // ← Log para debug
      set({ user: null, isAuthenticated: false });
    }
  },
}));