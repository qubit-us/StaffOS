import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore.js';
import api from '../../lib/api.js';
import {
  LayoutDashboard, FileText, Users, LogOut, Zap, Bell,
} from 'lucide-react';

const navItems = [
  { to: '/client',              icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/client/requirements', icon: FileText,        label: 'Requirements'            },
  { to: '/client/submissions',  icon: Users,           label: 'Candidates'              },
];

export default function ClientLayout() {
  const { user, logout, token, setAuth } = useAuthStore();
  const navigate = useNavigate();

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

  const { data: clientMe } = useQuery({
    queryKey: ['client-me'],
    queryFn: () => api.get('/api/client-portal/me').then(r => r.data),
    staleTime: Infinity,
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0fdf9' }}>
      {/* Sidebar — dark teal */}
      <aside className="w-64 bg-teal-950 flex flex-col h-full shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg leading-none">StaffOS</span>
              <p className="text-xs text-white/40 font-medium mt-0.5">Client Portal</p>
            </div>
          </div>
        </div>

        {/* Org badge */}
        <div className="px-4 py-3 mx-3 mt-4 rounded-xl border border-white/10 bg-teal-900/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-300">
            Organization
          </p>
          <p className="text-sm font-bold text-white mt-0.5 truncate">{user?.orgName}</p>
          {clientMe?.client_code && (
            <span className="inline-block mt-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-700/60 text-teal-200">
              {clientMe.client_code}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-teal-500 text-white'
                    : 'text-teal-200 hover:bg-teal-900 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-teal-100 flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Client Portal</h1>
            <p className="text-xs text-slate-400">Post requirements · Review candidates · Track submissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl text-slate-500 hover:bg-teal-50 transition-colors">
              <Bell size={20} />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
