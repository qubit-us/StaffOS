import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

const titles = {
  '/':           { title: 'Dashboard',     subtitle: 'Overview of your recruiting activity' },
  '/jobs':       { title: 'Jobs',           subtitle: 'Manage open positions and requirements' },
  '/candidates': { title: 'Candidates',     subtitle: 'All candidates in your talent pool' },
  '/matches':    { title: 'AI Matches',     subtitle: 'Semantic matching results' },
  '/pipeline':   { title: 'Pipeline',       subtitle: 'Track candidate interview progress' },
  '/upload':     { title: 'Upload Resume',  subtitle: 'Add candidates via AI resume parsing' },
};

export default function Header() {
  const location = useLocation();
  const { user } = useAuthStore();
  const meta = titles[location.pathname] || { title: 'StaffOS', subtitle: '' };

  return (
    <header className="h-16 bg-white border-b border-surface-200 px-6 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-slate-900 leading-none">{meta.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        <button className="relative p-2 rounded-xl hover:bg-surface-100 text-slate-500 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

        <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
