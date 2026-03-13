import { create } from 'zustand';

const stored = localStorage.getItem('staffos_user');

export const useAuthStore = create((set) => ({
  user: stored ? JSON.parse(stored) : null,
  token: localStorage.getItem('staffos_token'),

  setAuth: (user, token) => {
    localStorage.setItem('staffos_token', token);
    localStorage.setItem('staffos_user', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('staffos_token');
    localStorage.removeItem('staffos_user');
    set({ user: null, token: null });
  },

  hasPermission: (permission) => {
    const state = useAuthStore.getState();
    return state.user?.permissions?.includes(permission) ?? false;
  },
}));
