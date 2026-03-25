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
      // Don't auto-redirect for auth endpoints — a 401 there means wrong
      // credentials, not an expired session, so let the form handle it.
      const url = err.config?.url || '';
      const isAuthEndpoint = ['/api/auth/login', '/api/auth/signup', '/api/auth/google'].includes(url);
      if (!isAuthEndpoint) {
        localStorage.removeItem('staffos_token');
        localStorage.removeItem('staffos_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
