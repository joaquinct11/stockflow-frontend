import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { LoginDTO, RegistrationRequestDTO, JwtResponse } from '../types';

export const authService = {
  /**
   * Login de usuario existente
   */
  login: async (credentials: LoginDTO): Promise<JwtResponse> => {
    const { data } = await axiosInstance.post<JwtResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
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
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  /**
   * Cerrar sesión
   */
  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
   * Verificar si el usuario está autenticado
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
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