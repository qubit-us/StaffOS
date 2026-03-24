import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api.js';
import { Building2, Globe, Mail, Calendar } from 'lucide-react';

export default function AdminSettingsPage() {
  const { data: org, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/api/admin/settings').then(r => r.data),
  });

  if (isLoading) return <div className="p-10 text-center text-slate-400 text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card p-6 space-y-5">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Building2 size={16} className="text-slate-500" /> Organization Details
        </h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Organization Name</p>
            <p className="text-slate-800 font-medium">{org?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Slug</p>
            <p className="text-slate-600 font-mono text-xs">{org?.slug || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Globe size={11} /> Domain
            </p>
            <p className="text-slate-600">{org?.domain || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Website</p>
            <p className="text-slate-600">{org?.website || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar size={11} /> Member Since
            </p>
            <p className="text-slate-600">{org?.created_at ? new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-1">More settings coming soon</h3>
        <p className="text-sm text-slate-500">Branding, notifications, integrations, and billing will be available here.</p>
      </div>
    </div>
  );
}
