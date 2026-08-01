import axios from 'axios';

const SA_TOKEN_KEY = 'sa_access_token';

export const superAdminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
});

superAdminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(SA_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

superAdminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem(SA_TOKEN_KEY);
      window.location.href = '/superadmin/login';
    }
    return Promise.reject(err);
  }
);

export const saTokenKey = SA_TOKEN_KEY;
