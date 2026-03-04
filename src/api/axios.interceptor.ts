import { axiosInstance } from './axios.config';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

/**
 * Configurar interceptor de respuestas para manejar tokens expirados
 */
export function setupAxiosInterceptors() {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Si obtenemos 401, probablemente el accessToken expiró
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Si ya estamos refrescando, esperar a que termine
          return new Promise((resolve) => {
            addRefreshSubscriber((token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(axiosInstance(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          console.log('⏰ Access token expirado, intentando refrescar...');
          
          // Intentar refrescar el token
          const refreshedData = await authService.refresh();
          
          // Actualizar el store
          const store = useAuthStore.getState();
          if (store.user) {
            const updatedUser = {
              ...store.user,
              ...refreshedData,
            };
            store.setUser(updatedUser);
          }

          // Actualizar el header de la petición original
          originalRequest.headers.Authorization = `Bearer ${refreshedData.accessToken}`;
          
          // Notificar a otros subscribers
          onRefreshed(refreshedData.accessToken);
          
          isRefreshing = false;
          
          // Reintentar la petición original con el nuevo token
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error('❌ Error refrescando token:', refreshError);
          
          isRefreshing = false;
          
          // Si el refresh falla, hacer logout
          const store = useAuthStore.getState();
          store.logout();
          
          toast.error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
          window.location.href = '/login';
          
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
}