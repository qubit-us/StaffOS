import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { Building2, Store, Users, Settings, ShieldCheck, ScrollText } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { clsx } from 'clsx';

const tabs = [
  { to: '/admin/clients',    label: 'Clients',       icon: Building2,   permission: 'MANAGE_CLIENTS'   },
  { to: '/admin/vendors',    label: 'Vendors',        icon: Store,       permission: 'MANAGE_VENDORS'   },
  { to: '/admin/users',      label: 'Users & Roles',  icon: Users,       permission: 'MANAGE_USERS'     },
  { to: '/admin/audit-log',  label: 'Audit Log',      icon: ScrollText,  permission: 'MANAGE_USERS'     },
  { to: '/admin/settings',   label: 'Settings',       icon: Settings,    permission: 'MANAGE_SETTINGS'  },
];

export default function AdminLayout() {
  const { user } = useAuthStore();
  const perms = user?.permissions || [];

  const visibleTabs = tabs.filter(t => perms.includes(t.permission));

  // Redirect to first accessible tab
  if (visibleTabs.length === 0) return <Navigate to="/" replace />;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
          <ShieldCheck size={18} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Admin</h2>
          <p className="text-sm text-slate-500">Manage your organization, team, and settings</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-surface-200">
        {visibleTabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            )}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Tab content */}
      <Outlet />
    </div>
  );
}
