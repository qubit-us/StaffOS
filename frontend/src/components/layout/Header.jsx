import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

const titles = {
  '/':           { title: 'Dashboard',     subtitle: 'Overview of your recruiting activity' },
  '/jobs':       { title: 'Jobs',          subtitle: 'Manage open positions and requirements' },
  '/candidates': { title: 'Candidates',    subtitle: 'All candidates in your talent pool' },
  '/clients':    { title: 'Clients',       subtitle: 'Onboard and manage your clients' },
  '/vendors':    { title: 'Vendors',       subtitle: 'Onboard and manage your vendors' },
  '/matches':    { title: 'AI Matches',    subtitle: 'Semantic matching results' },
  '/pipeline':   { title: 'Pipeline',      subtitle: 'Track candidate interview progress' },
  '/upload':     { title: 'Upload Resume', subtitle: 'Add candidates via AI resume parsing' },
  '/reports':    { title: 'Reports',       subtitle: 'Activity and performance overview' },
};

const vendorTitles = {
  '/':           { title: 'Dashboard',       subtitle: 'Overview of your submitted candidates' },
  '/candidates': { title: 'My Candidates',   subtitle: 'Candidates in your pool' },
  '/pipeline':   { title: 'My Submissions',  subtitle: 'Track your submitted candidates' },
  '/upload':     { title: 'Upload Resume',   subtitle: 'Add a candidate to submit' },
};

// Scopes per role
const agencyScopes = [
  { key: 'jobs',       label: 'Jobs',       path: '/jobs'       },
  { key: 'candidates', label: 'Candidates', path: '/candidates' },
  { key: 'clients',    label: 'Clients',    path: '/clients'    },
  { key: 'vendors',    label: 'Vendors',    path: '/vendors'    },
  { key: 'pipeline',   label: 'Pipeline',   path: '/pipeline'   },
];

const vendorScopes = [
  { key: 'candidates', label: 'Candidates', path: '/candidates' },
  { key: 'pipeline',   label: 'Submissions', path: '/pipeline'  },
];

// Role-specific accent colors for header elements
const ROLE_ACCENTS = {
  staffing_agency: {
    avatar:       'from-indigo-500 to-indigo-700',
    bell:         'hover:bg-indigo-50',
    scopeActive:  'bg-indigo-50 text-indigo-700 font-semibold',
    inputFocus:   'focus:ring-indigo-500/20 focus:border-indigo-500',
    dot:          'bg-indigo-500',
  },
  vendor: {
    avatar:       'from-violet-500 to-violet-700',
    bell:         'hover:bg-violet-50',
    scopeActive:  'bg-violet-50 text-violet-700 font-semibold',
    inputFocus:   'focus:ring-violet-500/20 focus:border-violet-500',
    dot:          'bg-violet-500',
  },
};

export default function Header() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();

  const isVendor  = user?.orgType === 'vendor';
  const scopes    = isVendor ? vendorScopes : agencyScopes;
  const titleMap  = isVendor ? { ...titles, ...vendorTitles } : titles;
  const accent    = ROLE_ACCENTS[user?.orgType] || ROLE_ACCENTS.staffing_agency;

  const meta = titleMap[location.pathname] || { title: 'StaffOS', subtitle: '' };

  const [scope,     setScope]     = useState(scopes[0]);
  const [query,     setQuery]     = useState('');
  const [scopeOpen, setScopeOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`${scope.path}?search=${encodeURIComponent(query.trim())}`);
    setScopeOpen(false);
  };

  return (
    <header className="h-16 bg-white border-b border-surface-200 px-6 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-slate-900 leading-none">{meta.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Scoped search */}
        <form onSubmit={handleSearch} className="relative hidden md:flex items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setScopeOpen(o => !o)}
              className="flex items-center gap-1.5 h-9 pl-3 pr-2.5 bg-surface-100 border border-surface-200 border-r-0 rounded-l-xl text-sm font-medium text-slate-700 hover:bg-surface-200 transition-colors whitespace-nowrap"
            >
              {scope.label}
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${scopeOpen ? 'rotate-180' : ''}`} />
            </button>
            {scopeOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-surface-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {scopes.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => { setScope(s); setScopeOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      scope.key === s.key ? accent.scopeActive : 'text-slate-700 hover:bg-surface-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${scope.label.toLowerCase()}...`}
              className={`h-9 pl-8 pr-4 bg-surface-50 border border-surface-200 rounded-r-xl text-sm w-52 focus:outline-none focus:ring-2 transition-all ${accent.inputFocus}`}
            />
          </div>
        </form>

        <button className={`relative p-2 rounded-xl text-slate-500 transition-colors ${accent.bell}`}>
          <Bell size={18} />
          <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${accent.dot}`} />
        </button>

        <div className={`w-8 h-8 bg-gradient-to-br rounded-full flex items-center justify-center text-white font-bold text-xs ${accent.avatar}`}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
