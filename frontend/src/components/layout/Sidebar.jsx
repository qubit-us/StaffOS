import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import {
  LayoutDashboard, Briefcase, Users, Sparkles,
  GitPullRequest, Upload, LogOut, Zap,
  Building2, Store, BarChart2, ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

// ── Role configs ──────────────────────────────────────────────
const ROLE_CONFIG = {
  staffing_agency: {
    sidebar:    'bg-slate-900',
    logoBg:     'bg-indigo-600',
    orgBadgeBg: 'bg-indigo-900/60',
    orgBadgeText: 'text-indigo-300',
    orgTypePill: 'bg-indigo-700/60 text-indigo-200',
    activeItem: 'bg-indigo-600 text-white',
    hoverItem:  'text-slate-300 hover:bg-slate-800 hover:text-white',
    tagline:    'Staffing Agency',
    userAvatar: 'from-indigo-500 to-indigo-700',
    navItems: [
      { to: '/',           icon: LayoutDashboard, label: 'Dashboard',  end: true                      },
      { to: '/clients',    icon: Building2,       label: 'Clients',    permission: 'MANAGE_CLIENTS'   },
      { to: '/vendors',    icon: Store,           label: 'Vendors',    permission: 'MANAGE_VENDORS'   },
      { to: '/candidates', icon: Users,           label: 'Candidates', permission: 'VIEW_CANDIDATES'  },
      { to: '/jobs',       icon: Briefcase,       label: 'Jobs',       permission: 'VIEW_JOBS'        },
      { to: '/matches',    icon: Sparkles,        label: 'AI Matches', permission: 'VIEW_MATCHES'     },
      { to: '/pipeline',   icon: GitPullRequest,  label: 'Pipeline',   permission: 'VIEW_PIPELINE'    },
      { to: '/reports',    icon: BarChart2,       label: 'Reports',    permission: 'VIEW_ANALYTICS'   },
      { to: '/admin',      icon: ShieldCheck,     label: 'Admin',      permission: 'MANAGE_USERS'     },
    ],
  },

  vendor: {
    sidebar:    'bg-violet-950',
    logoBg:     'bg-violet-600',
    orgBadgeBg: 'bg-violet-900/60',
    orgBadgeText: 'text-violet-300',
    orgTypePill: 'bg-violet-700/60 text-violet-200',
    activeItem: 'bg-violet-600 text-white',
    hoverItem:  'text-violet-200 hover:bg-violet-900 hover:text-white',
    tagline:    'Vendor Portal',
    userAvatar: 'from-violet-500 to-violet-700',
    navItems: [
      { to: '/',              icon: LayoutDashboard, label: 'Dashboard',      end: true                  },
      { to: '/candidates',    icon: Users,           label: 'My Candidates'                              },
      { to: '/pipeline',      icon: GitPullRequest,  label: 'My Submissions'                             },
      { to: '/upload',        icon: Upload,          label: 'Upload Resume'                              },
      { to: '/vendor-admin',  icon: ShieldCheck,     label: 'Admin',          permission: 'MANAGE_USERS' },
    ],
  },

  // fallback
  default: {
    sidebar:    'bg-slate-900',
    logoBg:     'bg-brand-600',
    orgBadgeBg: 'bg-slate-800',
    orgBadgeText: 'text-slate-300',
    orgTypePill: 'bg-slate-700 text-slate-200',
    activeItem: 'bg-brand-600 text-white',
    hoverItem:  'text-slate-300 hover:bg-slate-800 hover:text-white',
    tagline:    'Portal',
    userAvatar: 'from-brand-400 to-brand-600',
    navItems: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const cfg = ROLE_CONFIG[user?.orgType] || ROLE_CONFIG.default;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={clsx('w-64 flex flex-col h-full shrink-0', cfg.sidebar)}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shadow-md', cfg.logoBg)}>
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg leading-none">StaffOS</span>
            <p className="text-xs text-white/40 font-medium mt-0.5">{user?.roles?.[0] || cfg.tagline}</p>
          </div>
        </div>
      </div>

      {/* Org badge */}
      <div className={clsx('px-4 py-3 mx-3 mt-4 rounded-xl border border-white/10', cfg.orgBadgeBg)}>
        <p className={clsx('text-[10px] font-semibold uppercase tracking-wider', cfg.orgBadgeText)}>
          Organization
        </p>
        <p className="text-sm font-bold text-white mt-0.5 truncate">{user?.orgName}</p>
        <span className={clsx('inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize', cfg.orgTypePill)}>
          {user?.roles?.[0] || user?.orgType?.replace('_', ' ')}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {cfg.navItems.filter(({ permission }) => !permission || user?.permissions?.includes(permission)).map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive ? cfg.activeItem : cfg.hoverItem
              )
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
          <div className={clsx(
            'w-9 h-9 bg-gradient-to-br rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0',
            cfg.userAvatar
          )}>
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
  );
}
