import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('staffos_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      const isAuthEndpoint = ['/api/auth/login', '/api/auth/signup', '/api/auth/google'].includes(url);
      // Only wipe session if the token itself is invalid/expired (auth/me fails),
      // not for permission-denied on background data queries.
      const isSessionCheck = url.includes('/api/auth/me');
      if (!isAuthEndpoint && isSessionCheck) {
        localStorage.removeItem('staffos_token');
        localStorage.removeItem('staffos_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
