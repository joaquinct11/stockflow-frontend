import axios from 'axios';
import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { LoginDTO, RegistrationRequestDTO, JwtResponse, TenantInfo } from '../types';

export interface CrearNegocioRequest {
  nombreNegocio: string;
  rubro?: string;
  ruc?: string;
  telefono?: string;
  emailContacto?: string;
  planId: string;
}

// ✅ NUEVO: DTO para cambiar contraseña
export interface ChangePasswordRequest {
  contraseñaActual: string;
  nuevaContraseña: string;
  confirmarContraseña: string;
}

// ✅ NUEVO: DTO para recuperar contraseña
export interface ForgotPasswordRequest {
  email: string;
}

// ✅ NUEVO: DTO para resetear contraseña
export interface ResetPasswordRequest {
  token: string;
  nuevaContraseña: string;
  confirmarContraseña: string;
}

// ✅ NUEVO: DTO del perfil del usuario
export interface UserProfile {
  usuarioId: number;
  email: string;
  nombre: string;
  apellido?: string;
  rol: string;
  tenantId: string;
  createdAt: string | null;
  ultimoLogin: string | null;
  activo: boolean;
  nombreFarmacia: string;
  permisos: string[];
  tipoDocumento?: string;
  numeroDocumento?: string;
  numeroCelular?: string;
  sucursalId?: number | null;
}

export const authService = {
  /**
   * Login de usuario existente
   * Retorna: accessToken (15 min) + refreshToken (7 días)
   */
  login: async (credentials: LoginDTO): Promise<JwtResponse> => {
    const { data } = await axiosInstance.post<JwtResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    if (data.selectionToken) {
      // Case B: multi-tenant — limpiar sesión anterior y guardar solo selectionToken
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.setItem('selectionToken', data.selectionToken);
      if (data.tenants) {
        localStorage.setItem('pendingTenants', JSON.stringify(data.tenants));
      }
      if (import.meta.env.DEV) { console.log('🏢 Multi-tenant: selectionToken obtenido, esperando selección de tenant');}
    } else if (data.accessToken && data.refreshToken) {
      // Case A: single-tenant — guardar tokens completos
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data));
      if (import.meta.env.DEV) { console.log('✅ Tokens guardados (single-tenant)');}
    }

    return data;
  },

  /**
   * Registro de nueva farmacia (tenant + admin + suscripción)
   */
  register: async (registrationData: RegistrationRequestDTO): Promise<JwtResponse> => {
    const { data } = await axiosInstance.post<JwtResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      registrationData
    );

    if (data.accessToken && data.refreshToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data));
    }

    return data;
  },

  /**
   * ✅ NUEVO: Obtener perfil del usuario actual
   */
  obtenerPerfil: async (): Promise<UserProfile> => {
    const { data } = await axiosInstance.get<UserProfile>(
      API_ENDPOINTS.AUTH.ME
    );
    return data;
  },

  /**
   * ✅ NUEVO: Cambiar contraseña
   */
  cambiarContraseña: async (request: ChangePasswordRequest): Promise<{ mensaje: string }> => {
    const { data } = await axiosInstance.post<{ mensaje: string }>(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      request
    );
    return data;
  },

  /**
   * ✅ NUEVO: Solicitar recuperación de contraseña
   */
  solicitarRecuperacionContraseña: async (request: ForgotPasswordRequest): Promise<{ mensaje: string }> => {
    const { data } = await axiosInstance.post<{ mensaje: string }>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      request
    );
    return data;
  },

  /**
   * ✅ NUEVO: Resetear contraseña
   */
  resetearContraseña: async (request: ResetPasswordRequest): Promise<{ mensaje: string }> => {
    const { data } = await axiosInstance.post<{ mensaje: string }>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      request
    );
    return data;
  },

  /**
   * Activar cuenta de usuario nuevo (link de bienvenida enviado por el admin)
   */
  activarCuenta: async (request: ResetPasswordRequest): Promise<{ mensaje: string }> => {
    const { data } = await axiosInstance.post<{ mensaje: string }>(
      API_ENDPOINTS.AUTH.ACTIVATE_ACCOUNT,
      request
    );
    return data;
  },

  /**
   * Refrescar tokens
   * Usa el refreshToken para obtener nuevos accessToken + refreshToken
   */
  refresh: async (): Promise<JwtResponse> => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    try {
      const { data } = await axiosInstance.post<JwtResponse>(
        API_ENDPOINTS.AUTH.REFRESH,
        { refreshToken }
      );

      if (data.accessToken && data.refreshToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        const user = localStorage.getItem('user');
        if (user) {
          const parsedUser = JSON.parse(user);
          const updatedUser = { ...parsedUser, ...data };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }

      if (import.meta.env.DEV) { console.log('🔄 Tokens refrescados exitosamente');}
      return data;
    } catch (error) {
      if (import.meta.env.DEV) { console.error('❌ Error refrescando tokens:', error);}
      authService.logout();
      throw error;
    }
  },

  /**
   * Crear nuevo negocio (tenant) para el usuario ya autenticado.
   * Envía selectionToken como Bearer (flujo SelectTenant) o usa axiosInstance si ya hay accessToken.
   */
  crearNegocio: async (request: CrearNegocioRequest): Promise<TenantInfo> => {
    const selectionToken = localStorage.getItem('selectionToken');
    const accessToken = localStorage.getItem('accessToken');

    if (selectionToken && (!accessToken || accessToken === 'null' || accessToken === '')) {
      const { data } = await axios.post<TenantInfo>(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}${API_ENDPOINTS.AUTH.CREATE_TENANT}`,
        request,
        { headers: { Authorization: `Bearer ${selectionToken}` } }
      );
      return data;
    }

    const { data } = await axiosInstance.post<TenantInfo>(
      API_ENDPOINTS.AUTH.CREATE_TENANT,
      request
    );
    return data;
  },

  /**
   * Seleccionar tenant.
   * - Flujo login (Case B): usa selectionToken como Bearer.
   * - Flujo cambio de negocio: no hay selectionToken → usa axiosInstance (accessToken automático).
   */
  selectTenant: async (tenantId: string): Promise<JwtResponse> => {
    const selectionToken = localStorage.getItem('selectionToken');

    let data: JwtResponse;
    if (selectionToken) {
      const response = await axios.post<JwtResponse>(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}${API_ENDPOINTS.AUTH.SELECT_TENANT}`,
        { tenantId },
        { headers: { Authorization: `Bearer ${selectionToken}` } }
      );
      data = response.data;
    } else {
      // Cambio de negocio desde sesión activa: el interceptor añade accessToken automáticamente
      const response = await axiosInstance.post<JwtResponse>(
        API_ENDPOINTS.AUTH.SELECT_TENANT,
        { tenantId }
      );
      data = response.data;
    }

    if (!data.accessToken || !data.refreshToken) {
      throw new Error('Respuesta inválida de select-tenant');
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data));
    localStorage.removeItem('selectionToken');
    localStorage.removeItem('pendingTenants');

    if (import.meta.env.DEV) { console.log('✅ Tenant seleccionado:', tenantId);}
    return data;
  },

  /**
   * Obtener los tenants accesibles para el usuario autenticado.
   * Usa el accessToken actual (sesión activa).
   */
  getMisTenants: async (): Promise<TenantInfo[]> => {
    const { data } = await axiosInstance.get<TenantInfo[]>(API_ENDPOINTS.AUTH.TENANTS);
    return data;
  },

  /**
   * Cerrar sesión
   * Revoca el refreshToken en el backend e limpia localStorage
   */
  logout: async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
        if (import.meta.env.DEV) { console.log('✅ Sesión revocada en el backend');}
      }
    } catch (error) {
      if (import.meta.env.DEV) { console.error('⚠️ Error revocando sesión en backend:', error);}
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('selectionToken');
      localStorage.removeItem('pendingTenants');
      if (import.meta.env.DEV) { console.log('🗑️ Datos de sesión eliminados del localStorage');}
    }
  },

  /**
   * Obtener usuario actual del localStorage
   */
  getCurrentUser: (): JwtResponse | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Obtener el accessToken actual
   */
  getAccessToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },

  /**
   * Obtener el refreshToken actual
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem('refreshToken');
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('accessToken');
    return !!token && token !== 'null' && token !== '' && !!localStorage.getItem('user');
  },

  /**
   * Verificar si la suscripción está activa
   */
  hasActiveSuscripcion: (): boolean => {
    const user = authService.getCurrentUser();
    return user?.suscripcion?.estado === 'ACTIVA';
  },

  /**
   * Obtener tenantId del usuario actual
   */
  getTenantId: (): string | null => {
    const user = authService.getCurrentUser();
    return user?.tenantId || null;
  },
};