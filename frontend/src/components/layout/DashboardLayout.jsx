import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import api from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';

export default function DashboardLayout() {
  const { token, setAuth, user } = useAuthStore();

  // Refresh user permissions from server on every app load
  // This ensures sidebar nav reflects latest RBAC state without requiring re-login
  useEffect(() => {
    if (!token) return;
    api.get('/api/auth/me').then(({ data }) => {
      setAuth(data.user, token);
    }).catch(() => {});
  }, [token]);

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
