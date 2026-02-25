import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { LoginDTO, RegistrationRequestDTO, Usuario, JwtResponse } from '../types';

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
   * Registro de usuario interno (dentro de un tenant existente)
   * NOTA: Este endpoint ya no se usará desde el frontend público
   */
  registerUsuario: async (userData: Usuario): Promise<JwtResponse> => {
    const { data } = await axiosInstance.post<JwtResponse>(
      '/auth/registro',  // Endpoint viejo, mantener para usuarios internos
      userData
    );
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: (): JwtResponse | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

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
};