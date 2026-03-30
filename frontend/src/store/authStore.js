import { create } from 'zustand';

const stored = localStorage.getItem('staffos_user');

export const useAuthStore = create((set) => ({
  user: stored ? JSON.parse(stored) : null,
  token: localStorage.getItem('staffos_token'),

  setAuth: (user, token) => {
    const u = { ...user, mustChangePassword: user.mustChangePassword || false };
    localStorage.setItem('staffos_token', token);
    localStorage.setItem('staffos_user', JSON.stringify(u));
    set({ user: u, token });
  },

  updateUser: (partial) => {
    const updated = { ...useAuthStore.getState().user, ...partial };
    localStorage.setItem('staffos_user', JSON.stringify(updated));
    set({ user: updated });
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
