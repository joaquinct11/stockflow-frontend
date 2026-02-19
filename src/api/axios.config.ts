import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Variable para evitar múltiples notificaciones
let sessionExpiredShown = false;

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejar token expirado (401 o 403)
    if (error.response?.status === 401 || error.response?.status === 403) {
      // ✅ Evitar mostrar múltiples veces
      if (sessionExpiredShown) {
        return Promise.reject(error);
      }
      sessionExpiredShown = true;
      
      console.log('🔒 Token expirado - Cerrando sesión');
      
      // Limpiar datos
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // ✅ NOTIFICACIÓN CON DURACIÓN LARGA
      toast.error('🔐 Tu sesión ha expirado. Redirigiendo al login...', {
        duration: 2500,
        style: {
          background: '#ef4444',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '16px',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#ef4444',
        },
      });
      
      // ✅ ESPERAR 2.5 SEGUNDOS
      setTimeout(() => {
        window.location.href = '/login';
      }, 2500);
      
      return Promise.reject(new Error('Sesión expirada'));
    }
    return Promise.reject(error);
  }
);