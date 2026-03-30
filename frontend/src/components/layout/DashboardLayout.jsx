import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import api from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import ChangePasswordModal from '../ChangePasswordModal.jsx';

export default function DashboardLayout() {
  const { token, setAuth, user } = useAuthStore();

  // Refresh user permissions on every app load.
  // Normalizes both camelCase and snake_case API responses for resilience.
  useEffect(() => {
    if (!token) return;
    api.get('/api/auth/me').then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const normalized = {
        id:          u.id,
        email:       u.email,
        firstName:   u.firstName  || u.first_name,
        lastName:    u.lastName   || u.last_name,
        orgId:       u.orgId      || u.org_id,
        orgName:     u.orgName    || u.org_name,
        orgSlug:     u.orgSlug    || u.org_slug,
        orgType:     u.orgType    || u.org_type,
        permissions: u.permissions || [],
        roles:       u.roles       || [],
      };
      if (normalized.orgType) setAuth(normalized, token);
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
      {user?.mustChangePassword && <ChangePasswordModal />}
    </div>
  );
}
