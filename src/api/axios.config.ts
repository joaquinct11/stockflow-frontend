import axios from 'axios';
import { setupAxiosInterceptors } from './axios.interceptor';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el accessToken a cada petición
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      if (import.meta.env.DEV) {
        console.log('🔐 Access token agregado al header');
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Configurar interceptor de respuestas para manejar expiración
setupAxiosInterceptors();

export default axiosInstance;