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

// Interceptor para agregar el accessToken y sucursal activa a cada petición
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    // Solo añadir Authorization si es un accessToken real (nunca selectionToken ni "null")
    if (accessToken && accessToken !== 'null' && accessToken !== '') {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // X-Sucursal-Id: solo enviar si hay sesión completa (no durante pendingTenantSelection)
    // Se detecta pending state por la presencia de selectionToken sin accessToken válido
    const isPendingSelection = !!localStorage.getItem('selectionToken') &&
      (!accessToken || accessToken === 'null' || accessToken === '');
    const sucursalId = localStorage.getItem('sucursalActualId');
    if (sucursalId && !isPendingSelection) {
      config.headers['X-Sucursal-Id'] = sucursalId;
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