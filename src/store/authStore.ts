import { create } from 'zustand';
import type { JwtResponse, TenantInfo } from '../types';
import { authService } from '../services/auth.service';
import { useSucursalStore } from './sucursalStore';
import { useTenantConfigStore } from './tenantConfigStore';

interface AuthState {
  user: JwtResponse | null;
  isAuthenticated: boolean;
  /** Estado de suscripción del tenant, actualizado independientemente del JWT */
  suscripcionEstado: string | null;

  // Multi-tenant: estado pendiente de selección de tenant
  pendingTenantSelection: boolean;
  availableTenants: TenantInfo[];
  selectionToken: string | null;

  // Lista conocida de tenants (disponible antes de abrir el dropdown)
  knownTenants: TenantInfo[] | null;
  tenantsLoading: boolean;
  tenantsError: boolean;

  setUser: (user: JwtResponse) => void;
  logout: () => void;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSuscripcionEstado: (estado: string) => void;
  updatePlanCodigo: (planCodigo: string) => void;
  setPendingSelection: (selectionToken: string, tenants: TenantInfo[]) => void;
  completeTenantSelection: (user: JwtResponse) => void;
  resetPendingSelection: () => void;
  startTenantSwitch: (tenants: TenantInfo[]) => void;
  setKnownTenants: (tenants: TenantInfo[]) => void;
  setTenantsLoading: (loading: boolean) => void;
  setTenantsError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  suscripcionEstado: null,
  pendingTenantSelection: false,
  availableTenants: [],
  selectionToken: null,
  knownTenants: null,
  tenantsLoading: false,
  tenantsError: false,

  setUser: (user) => {
    if (import.meta.env.DEV) { console.log('✅ Usuario establecido:', user.email);}
    set({ user, isAuthenticated: true });
    localStorage.setItem('user', JSON.stringify(user));
    if (user.accessToken) { localStorage.setItem('accessToken', user.accessToken); }
    if (user.refreshToken) { localStorage.setItem('refreshToken', user.refreshToken); }
  },

  setPendingSelection: (selectionToken, tenants) => {
    if (import.meta.env.DEV) { console.log('🏢 Estado pendiente de selección establecido, tenants:', tenants.length);}
    // Limpiar sucursal y config del tenant anterior antes de entrar en selección
    useSucursalStore.getState().clearSucursales();
    useTenantConfigStore.getState().clearConfig();
    // Limpiar sesión anterior: si isAuthenticated quedaba true desde una sesión previa,
    // SelectTenantRoute lo detectaba y redirigía a /dashboard creando un bucle infinito.
    set({ pendingTenantSelection: true, availableTenants: tenants, selectionToken, isAuthenticated: false, user: null });
  },

  completeTenantSelection: (user) => {
    if (import.meta.env.DEV) { console.log('✅ Selección de tenant completada:', user.tenantId);}
    const availTenants = get().availableTenants;
    set({
      user,
      isAuthenticated: true,
      pendingTenantSelection: false,
      availableTenants: [],
      selectionToken: null,
      // Preservar la lista de tenants para que el Header la tenga inmediatamente
      knownTenants: availTenants.length > 0 ? availTenants : get().knownTenants,
      tenantsLoading: false,
      tenantsError: false,
    });
    localStorage.setItem('user', JSON.stringify(user));
    if (user.accessToken) { localStorage.setItem('accessToken', user.accessToken); }
    if (user.refreshToken) { localStorage.setItem('refreshToken', user.refreshToken); }
  },

  resetPendingSelection: () => {
    set({ pendingTenantSelection: false, availableTenants: [], selectionToken: null });
    localStorage.removeItem('selectionToken');
    localStorage.removeItem('pendingTenants');
    useSucursalStore.getState().clearSucursales();
    useTenantConfigStore.getState().clearConfig();
  },

  startTenantSwitch: (tenants) => {
    if (import.meta.env.DEV) { console.log('🔄 Iniciando cambio de negocio, tenants disponibles:', tenants.length); }
    useSucursalStore.getState().clearSucursales();
    useTenantConfigStore.getState().clearConfig();
    set({
      pendingTenantSelection: true,
      availableTenants: tenants,
      knownTenants: tenants,
      selectionToken: null,
      isAuthenticated: false,
    });
  },

  logout: () => {
    if (import.meta.env.DEV) { console.log('🚪 Cerrando sesión');}
    set({
      user: null,
      isAuthenticated: false,
      suscripcionEstado: null,
      pendingTenantSelection: false,
      availableTenants: [],
      selectionToken: null,
      knownTenants: null,
      tenantsLoading: false,
      tenantsError: false,
    });
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('selectionToken');
    localStorage.removeItem('pendingTenants');
    useSucursalStore.getState().clearSucursales();
    useTenantConfigStore.getState().clearConfig();
  },

  setSuscripcionEstado: (estado: string) => {
    set({ suscripcionEstado: estado });
  },

  setKnownTenants: (tenants) => set({ knownTenants: tenants, tenantsLoading: false, tenantsError: false }),
  setTenantsLoading: (loading) => set({ tenantsLoading: loading }),
  setTenantsError: () => set({ tenantsError: true, tenantsLoading: false }),

  updatePlanCodigo: (planCodigo: string) => {
    if (!planCodigo) return;
    const currentUser = get().user;
    if (!currentUser?.suscripcion) return;
    const updatedUser = {
      ...currentUser,
      suscripcion: { ...currentUser.suscripcion, planCodigo },
    };
    set({ user: updatedUser });
    localStorage.setItem('user', JSON.stringify(updatedUser));
  },

  refreshUser: async () => {
    try {
      if (import.meta.env.DEV) { console.log('🔄 Intentando refrescar tokens...');}
      const refreshedData = await authService.refresh();

      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = { ...currentUser, ...refreshedData };
        set({ user: updatedUser });
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (refreshedData.accessToken) { localStorage.setItem('accessToken', refreshedData.accessToken); }
        if (refreshedData.refreshToken) { localStorage.setItem('refreshToken', refreshedData.refreshToken); }
        if (import.meta.env.DEV) { console.log('✅ Tokens refrescados exitosamente');}
      }
    } catch (error) {
      if (import.meta.env.DEV) { console.error('❌ Error refrescando tokens:', error);}
      get().logout();
      throw error;
    }
  },

  initialize: async () => {
    // Si ya estamos en modo cambio de negocio (establecido por startTenantSwitch),
    // no reinicializar desde localStorage — preservar el estado en memoria.
    if (get().pendingTenantSelection) return;

    if (import.meta.env.DEV) { console.log('🔄 Inicializando AuthStore...');}

    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');
    const storedSelectionToken = localStorage.getItem('selectionToken');
    const storedPendingTenants = localStorage.getItem('pendingTenants');

    const hasValidAccessToken = !!accessToken && accessToken !== 'null' && accessToken !== '';

    if (storedUser && hasValidAccessToken && refreshToken) {
      // Sesión completa
      const user = JSON.parse(storedUser);
      if (import.meta.env.DEV) { console.log('✅ Sesión restaurada para:', user.email);}
      set({ user, isAuthenticated: true });

      try {
        const profile = await authService.obtenerPerfil();
        const updatedUser = {
          ...user,
          permisos: profile.permisos,
          nombre: profile.nombre,
          email: profile.email,
          rol: profile.rol,
          tenantId: profile.tenantId,
          sucursalId: profile.sucursalId ?? null,
          tenantNombre: profile.nombreFarmacia,
        };
        set({ user: updatedUser });
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (import.meta.env.DEV) { console.log('✅ Permisos actualizados desde /api/auth/me:', profile.permisos);}
      } catch (error) {
        if (import.meta.env.DEV) { console.warn('⚠️ No se pudo actualizar permisos desde /api/auth/me, usando datos locales:', error);}
      }
    } else if (storedSelectionToken && storedPendingTenants) {
      // Sesión pendiente de selección de tenant (usuario recargó /select-tenant)
      try {
        const tenants = JSON.parse(storedPendingTenants);
        if (import.meta.env.DEV) { console.log('🏢 Estado pendiente restaurado desde localStorage');}
        set({ isAuthenticated: false, user: null, pendingTenantSelection: true, availableTenants: tenants, selectionToken: storedSelectionToken });
      } catch {
        // Si el JSON está corrupto, limpiar
        localStorage.removeItem('selectionToken');
        localStorage.removeItem('pendingTenants');
        set({ user: null, isAuthenticated: false });
      }
    } else {
      if (import.meta.env.DEV) { console.log('❌ No hay sesión guardada o tokens incompletos');}
      set({ user: null, isAuthenticated: false });
    }
  },
}));