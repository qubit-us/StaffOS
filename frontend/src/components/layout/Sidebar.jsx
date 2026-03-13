import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import {
  LayoutDashboard, Briefcase, Users, Sparkles,
  GitPullRequest, Upload, LogOut, Zap
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',   end: true },
  { to: '/jobs',      icon: Briefcase,       label: 'Jobs'               },
  { to: '/candidates',icon: Users,           label: 'Candidates'         },
  { to: '/matches',   icon: Sparkles,        label: 'AI Matches'         },
  { to: '/pipeline',  icon: GitPullRequest,  label: 'Pipeline'           },
  { to: '/upload',    icon: Upload,          label: 'Upload Resume'      },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-64 bg-white border-r border-surface-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-lg leading-none">StaffOS</span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">AI Recruiting</p>
          </div>
        </div>
      </div>

      {/* Org badge */}
      <div className="px-4 py-3 mx-3 mt-4 bg-brand-50 rounded-xl border border-brand-100">
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Organization</p>
        <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{user?.orgName}</p>
        <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full font-semibold capitalize">
          {user?.orgType?.replace('_', ' ')}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-surface-100 hover:text-slate-900'
              )
            }
          >
            <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
