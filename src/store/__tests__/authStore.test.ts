import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/auth.service', () => ({
  authService: {
    obtenerPerfil: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock('../sucursalStore', () => ({
  useSucursalStore: { getState: () => ({ clearSucursales: vi.fn() }) },
}));

vi.mock('../tenantConfigStore', () => ({
  useTenantConfigStore: { getState: () => ({ clearConfig: vi.fn() }) },
}));

import { useAuthStore } from '../authStore';
import { authService } from '../../services/auth.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockUser(overrides = {}) {
  return {
    accessToken: 'access-token-abc',
    refreshToken: 'refresh-token-abc',
    email: 'joaquincastillotello2001@gmail.com',
    nombre: 'Joaquin',
    rol: 'ADMIN',
    tenantId: 'tenant-A',
    permisos: ['VER_CITAS', 'CREAR_CITA'],
    suscripcion: { estado: 'ACTIVA' },
    ...overrides,
  };
}

function mockProfile(overrides = {}) {
  return {
    email: 'joaquincastillotello2001@gmail.com',
    nombre: 'Joaquin',
    rol: 'ADMIN',
    tenantId: 'tenant-A',
    permisos: ['VER_CITAS', 'CREAR_CITA'],
    sucursalId: null,
    ...overrides,
  };
}

function clearLocalStorage() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('selectionToken');
  localStorage.removeItem('pendingTenants');
}

function resetStore() {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    suscripcionEstado: null,
    pendingTenantSelection: false,
    availableTenants: [],
    selectionToken: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('authStore', () => {
  beforeEach(() => {
    clearLocalStorage();
    resetStore();
    vi.clearAllMocks();
  });

  // ── 1. Usuario con varias membresías activas que necesita seleccionar tenant ──

  describe('usuario multi-tenant (setPendingSelection)', () => {
    it('establece pendingTenantSelection y limpia la sesión anterior', () => {
      // Simular sesión previa activa en memoria
      useAuthStore.setState({ user: mockUser() as any, isAuthenticated: true });

      const tenants = [
        { tenantId: 'tenant-A', nombreNegocio: 'Vet Lima' },
        { tenantId: 'tenant-B', nombreNegocio: 'Vet Arequipa' },
      ];
      useAuthStore.getState().setPendingSelection('selection-token-xyz', tenants as any);

      const state = useAuthStore.getState();
      expect(state.pendingTenantSelection).toBe(true);
      expect(state.availableTenants).toHaveLength(2);
      expect(state.selectionToken).toBe('selection-token-xyz');
      // CRÍTICO: la sesión anterior debe estar limpia para evitar bucle /dashboard ↔ /select-tenant
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('no queda isAuthenticated=true después de setPendingSelection (previene bucle infinito)', () => {
      // Escenario: usuario previamente logueado, hace login de nuevo con cuenta multi-tenant
      useAuthStore.setState({ user: mockUser() as any, isAuthenticated: true });

      useAuthStore.getState().setPendingSelection('st', [] as any);

      // Si isAuthenticated fuera true aquí, SelectTenantRoute redirige a /dashboard
      // y ProtectedRoute (pendingTenantSelection=true) redirige a /select-tenant → bucle infinito
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('completeTenantSelection establece isAuthenticated=true y limpia el estado pendiente', () => {
      useAuthStore.getState().setPendingSelection('st', [] as any);
      expect(useAuthStore.getState().pendingTenantSelection).toBe(true);

      useAuthStore.getState().completeTenantSelection(mockUser() as any);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.pendingTenantSelection).toBe(false);
      expect(state.selectionToken).toBeNull();
      expect(state.availableTenants).toHaveLength(0);
      expect(state.user?.tenantId).toBe('tenant-A');
    });
  });

  // ── 2. Usuario con una sola membresía activa ──────────────────────────────

  describe('usuario single-tenant (setUser)', () => {
    it('setUser establece isAuthenticated=true con los tokens correctos', () => {
      useAuthStore.getState().setUser(mockUser() as any);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.tenantId).toBe('tenant-A');
      expect(localStorage.getItem('accessToken')).toBe('access-token-abc');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token-abc');
    });

    it('setUser no activa pendingTenantSelection', () => {
      useAuthStore.getState().setUser(mockUser() as any);
      expect(useAuthStore.getState().pendingTenantSelection).toBe(false);
    });
  });

  // ── 3. Selección pendiente durante la inicialización del auth store ───────

  describe('initialize con estado pendiente en localStorage', () => {
    it('restaura el estado pendiente desde localStorage si hay selectionToken', async () => {
      localStorage.setItem('selectionToken', 'st-from-storage');
      localStorage.setItem('pendingTenants', JSON.stringify([
        { tenantId: 'tenant-A', nombreNegocio: 'Vet Lima' },
      ]));

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.pendingTenantSelection).toBe(true);
      expect(state.selectionToken).toBe('st-from-storage');
      expect(state.availableTenants).toHaveLength(1);
      expect(state.isAuthenticated).toBe(false);
    });

    it('initialize() devuelve early si pendingTenantSelection ya está en true (evita sobreescritura)', async () => {
      useAuthStore.setState({ pendingTenantSelection: true, selectionToken: 'st-memory', availableTenants: [{ tenantId: 'x' }] as any });
      // En localStorage no hay nada — si initialize() corriera completamente, limpiaría el store
      // Al devolver early debe preservar el estado en memoria
      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().pendingTenantSelection).toBe(true);
      expect(useAuthStore.getState().selectionToken).toBe('st-memory');
    });
  });

  // ── 4. Sesión previa con tenant persistido ────────────────────────────────

  describe('initialize con sesión completa en localStorage', () => {
    it('restaura usuario desde localStorage y llama /api/auth/me', async () => {
      const user = mockUser();
      localStorage.setItem('accessToken', user.accessToken);
      localStorage.setItem('refreshToken', user.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      vi.mocked(authService.obtenerPerfil).mockResolvedValueOnce(mockProfile() as any);

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe(user.email);
      expect(authService.obtenerPerfil).toHaveBeenCalledOnce();
    });

    it('si /api/auth/me falla, mantiene datos locales y sigue autenticado', async () => {
      const user = mockUser();
      localStorage.setItem('accessToken', user.accessToken);
      localStorage.setItem('refreshToken', user.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      vi.mocked(authService.obtenerPerfil).mockRejectedValueOnce(new Error('Network error'));

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe(user.email);
    });
  });

  // ── 5. Logout y nuevo login con otro usuario ──────────────────────────────

  describe('logout', () => {
    it('limpia todo el estado y localStorage', () => {
      useAuthStore.setState({
        user: mockUser() as any,
        isAuthenticated: true,
        selectionToken: 'some-token',
        pendingTenantSelection: false,
      });
      localStorage.setItem('accessToken', 'access-token-abc');
      localStorage.setItem('refreshToken', 'refresh-token-abc');
      localStorage.setItem('user', JSON.stringify(mockUser()));

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.selectionToken).toBeNull();
      expect(state.pendingTenantSelection).toBe(false);
      expect(state.availableTenants).toHaveLength(0);
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('después de logout, initialize() arranca sin sesión', async () => {
      useAuthStore.getState().logout();
      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  // ── 6. Cambio de tenant sin reutilizar permisos del anterior ─────────────

  describe('startTenantSwitch', () => {
    it('limpia isAuthenticated y permisos al iniciar cambio de tenant', () => {
      useAuthStore.setState({
        user: mockUser() as any,
        isAuthenticated: true,
      });

      useAuthStore.getState().startTenantSwitch([
        { tenantId: 'tenant-B', nombreNegocio: 'Vet Arequipa' } as any,
      ]);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.pendingTenantSelection).toBe(true);
      expect(state.availableTenants[0].tenantId).toBe('tenant-B');
    });

    it('completeTenantSelection después de startTenantSwitch no reutiliza permisos del tenant anterior', () => {
      useAuthStore.setState({ user: mockUser({ permisos: ['PERM_VIEJO'] }) as any, isAuthenticated: true });

      useAuthStore.getState().startTenantSwitch([] as any);

      const nuevoUsuario = mockUser({ tenantId: 'tenant-B', permisos: ['PERM_NUEVO'] });
      useAuthStore.getState().completeTenantSelection(nuevoUsuario as any);

      const state = useAuthStore.getState();
      expect(state.user?.tenantId).toBe('tenant-B');
      expect(state.user?.permisos).toEqual(['PERM_NUEVO']);
      expect(state.user?.permisos).not.toContain('PERM_VIEJO');
    });
  });

  // ── 7. updatePlanCodigo — sincronización de planCodigo tras upgrade ──────────

  describe('updatePlanCodigo', () => {
    it('actualiza planCodigo en el auth store preservando el resto de la suscripción', () => {
      const user = mockUser({
        suscripcion: { planId: 'BASICO', planCodigo: 'VETERINARIA_BASICO', estado: 'ACTIVA', precioMensual: 109, usuarioPrincipalId: 46 },
      });
      useAuthStore.setState({ user: user as any, isAuthenticated: true });

      useAuthStore.getState().updatePlanCodigo('VETERINARIA_PRO');

      const updated = useAuthStore.getState().user;
      expect(updated?.suscripcion?.planCodigo).toBe('VETERINARIA_PRO');
      expect(updated?.suscripcion?.planId).toBe('BASICO');
      expect(updated?.suscripcion?.estado).toBe('ACTIVA');
    });

    it('persiste el planCodigo actualizado en localStorage', () => {
      const user = mockUser({
        suscripcion: { planId: 'BASICO', planCodigo: 'VETERINARIA_BASICO', estado: 'ACTIVA', precioMensual: 109, usuarioPrincipalId: 46 },
      });
      useAuthStore.setState({ user: user as any, isAuthenticated: true });

      useAuthStore.getState().updatePlanCodigo('VETERINARIA_PRO');

      const stored = JSON.parse(localStorage.getItem('user') ?? '{}');
      expect(stored.suscripcion?.planCodigo).toBe('VETERINARIA_PRO');
    });

    it('no sobreescribe con cadena vacía', () => {
      const user = mockUser({
        suscripcion: { planId: 'BASICO', planCodigo: 'VETERINARIA_PRO', estado: 'ACTIVA', precioMensual: 189, usuarioPrincipalId: 46 },
      });
      useAuthStore.setState({ user: user as any, isAuthenticated: true });

      useAuthStore.getState().updatePlanCodigo('');

      expect(useAuthStore.getState().user?.suscripcion?.planCodigo).toBe('VETERINARIA_PRO');
    });

    it('no hace nada si no hay usuario en el store', () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });

      expect(() => useAuthStore.getState().updatePlanCodigo('VETERINARIA_PRO')).not.toThrow();
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('no hace nada si el usuario no tiene suscripción', () => {
      const user = mockUser({ suscripcion: undefined });
      useAuthStore.setState({ user: user as any, isAuthenticated: true });

      expect(() => useAuthStore.getState().updatePlanCodigo('VETERINARIA_PRO')).not.toThrow();
      expect(useAuthStore.getState().user?.suscripcion).toBeUndefined();
    });

    it('no afecta los demás campos del usuario (email, tenantId, permisos)', () => {
      const user = mockUser({
        suscripcion: { planId: 'BASICO', planCodigo: 'VETERINARIA_BASICO', estado: 'ACTIVA', precioMensual: 109, usuarioPrincipalId: 46 },
      });
      useAuthStore.setState({ user: user as any, isAuthenticated: true });

      useAuthStore.getState().updatePlanCodigo('VETERINARIA_PRO');

      const updated = useAuthStore.getState().user;
      expect(updated?.email).toBe('joaquincastillotello2001@gmail.com');
      expect(updated?.tenantId).toBe('tenant-A');
      expect(updated?.permisos).toEqual(['VER_CITAS', 'CREAR_CITA']);
    });
  });

  // ── 8. Invariante: isAuthenticated y pendingTenantSelection son mutuamente excluyentes ──

  describe('invariante de estado', () => {
    it('isAuthenticated=true nunca coexiste con pendingTenantSelection=true', () => {
      useAuthStore.setState({ user: mockUser() as any, isAuthenticated: true });

      useAuthStore.getState().setPendingSelection('st', [] as any);

      const { isAuthenticated, pendingTenantSelection } = useAuthStore.getState();
      expect(isAuthenticated && pendingTenantSelection).toBe(false);
    });

    it('completeTenantSelection produce isAuthenticated=true con pendingTenantSelection=false', () => {
      useAuthStore.getState().setPendingSelection('st', [] as any);
      useAuthStore.getState().completeTenantSelection(mockUser() as any);

      const { isAuthenticated, pendingTenantSelection } = useAuthStore.getState();
      expect(isAuthenticated).toBe(true);
      expect(pendingTenantSelection).toBe(false);
    });
  });
});
