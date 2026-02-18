import { axiosInstance } from '../api/axios.config';
import { API_ENDPOINTS } from '../api/endpoints';
import type { LoginDTO, Usuario, JwtResponse } from '../types';

export const authService = {
  login: async (credentials: LoginDTO): Promise<JwtResponse> => {
    const { data } = await axiosInstance.post<JwtResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  register: async (userData: Usuario): Promise<JwtResponse> => {
    const { data } = await axiosInstance.post<JwtResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
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
};