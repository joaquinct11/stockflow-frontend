import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { LoginDTO, RegistrationRequestDTO, JwtResponse } from '../types';

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
    
    // ✅ Guardar AMBOS tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data));
    
    if (import.meta.env.DEV) { console.log('✅ Tokens guardados:', {
      accessToken: data.accessToken.substring(0, 20) + '...',
      refreshToken: data.refreshToken.substring(0, 20) + '...',
      expiresIn: data.expiresIn,
    });}
    
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
    
    // ✅ Guardar AMBOS tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data));
    
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

      // ✅ Guardar NUEVOS tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      // ✅ Actualizar user en localStorage
      const user = localStorage.getItem('user');
      if (user) {
        const parsedUser = JSON.parse(user);
        const updatedUser = { ...parsedUser, ...data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      if (import.meta.env.DEV) { console.log('🔄 Tokens refrescados exitosamente');}
      return data;
    } catch (error) {
      if (import.meta.env.DEV) { console.error('❌ Error refrescando tokens:', error);}
      // Si el refresh falla, limpiar todo
      authService.logout();
      throw error;
    }
  },

  /**
   * Cerrar sesión
   * Revoca el refreshToken en el backend e limpia localStorage
   */
  logout: async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        // Enviar refreshToken al backend para revocarlo
        await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
        if (import.meta.env.DEV) { console.log('✅ Sesión revocada en el backend');}
      }
    } catch (error) {
      if (import.meta.env.DEV) { console.error('⚠️ Error revocando sesión en backend:', error);}
      // Continuar con logout local aunque falle el backend
    } finally {
      // Limpiar localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('token'); // ✅ Eliminar token viejo si existe
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
    return !!localStorage.getItem('accessToken') && !!localStorage.getItem('user');
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