import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api.js';
import { Shield, Filter, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { clsx } from 'clsx';

const ACTION_COLORS = {
  'user.login':                    'bg-blue-50 text-blue-700',
  'user.activated':                'bg-emerald-50 text-emerald-700',
  'user.deactivated':              'bg-red-50 text-red-700',
  'org.signup':                    'bg-purple-50 text-purple-700',
  'candidate.created':             'bg-emerald-50 text-emerald-700',
  'candidate.updated':             'bg-amber-50 text-amber-700',
  'candidate.enriched':            'bg-sky-50 text-sky-700',
  'candidate.submitted':           'bg-brand-50 text-brand-700',
  'job.created':                   'bg-emerald-50 text-emerald-700',
  'job.updated':                   'bg-amber-50 text-amber-700',
  'job.match_run':                 'bg-purple-50 text-purple-700',
  'submission.created':            'bg-emerald-50 text-emerald-700',
  'submission.stage_changed':      'bg-brand-50 text-brand-700',
  'submission.internal_stage_changed': 'bg-slate-100 text-slate-700',
  'submission.profile_unlocked':   'bg-amber-50 text-amber-700',
  'submission.rates_updated':      'bg-slate-100 text-slate-700',
};

function actionLabel(action) {
  return action.replace('.', ': ').replace(/_/g, ' ');
}

function metaSummary(action, meta) {
  if (!meta) return '';
  if (action === 'user.login') return `${meta.email} via ${meta.method}`;
  if (action === 'org.signup') return `${meta.orgName} (${meta.email})`;
  if (action === 'candidate.created') return `${meta.name || ''}${meta.file ? ` — ${meta.file}` : ''}`;
  if (action === 'candidate.updated') return `${meta.name || ''} — fields: ${(meta.fields || []).join(', ')}`;
  if (action === 'candidate.enriched') return `source: ${meta.source}`;
  if (action === 'candidate.submitted') return `to job: ${meta.job_title || meta.job_id}`;
  if (action === 'job.created') return `${meta.title} (${meta.job_type})`;
  if (action === 'job.updated') return `${meta.title} — fields: ${(meta.fields || []).join(', ')}`;
  if (action === 'job.match_run') return meta.title;
  if (action === 'submission.stage_changed') return `${meta.from_stage} → ${meta.to_stage}`;
  if (action === 'submission.internal_stage_changed') return `${meta.from_stage} → ${meta.to_stage}`;
  if (action === 'submission.profile_unlocked') return `job: ${meta.job_id}`;
  if (action === 'submission.rates_updated') return `agency: $${meta.agency_pay_rate} / vendor: $${meta.vendor_pay_rate}`;
  if (action === 'user.activated' || action === 'user.deactivated') return `${meta.name} (${meta.email})`;
  if (action === 'user.invited') return `${meta.email}`;
  if (action === 'user.updated') return `${meta.name} (${meta.email})`;
  if (action === 'user.deleted') return `${meta.name} (${meta.email})`;
  if (action === 'client.created') return `${meta.name} — POC: ${meta.poc_email}`;
  if (action === 'client.updated') return `${meta.name} — fields: ${(meta.fields || []).join(', ')}`;
  if (action === 'client.activated' || action === 'client.deactivated') return meta.name || '';
  if (action === 'client.deleted') return meta.name || '';
  if (action === 'vendor.created') return `${meta.name} — POC: ${meta.poc_email}`;
  if (action === 'vendor.updated') return `${meta.name} — fields: ${(meta.fields || []).join(', ')}`;
  if (action === 'vendor.activated' || action === 'vendor.deactivated') return meta.name || '';
  if (action === 'vendor.deleted') return meta.name || '';
  if (action === 'settings.updated') return `fields: ${(meta.fields || []).join(', ')}`;
  return '';
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ user_id: '', action: '', entity_type: '', from: '', to: '' });
  const [applied, setApplied] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, applied],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 50, ...Object.fromEntries(Object.entries(applied).filter(([,v]) => v)) });
      return api.get(`/api/audit-logs?${params}`).then(r => r.data);
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const users = data?.users || [];
  const totalPages = Math.ceil(total / 50);

  function applyFilters() { setApplied({ ...filters }); setPage(1); }
  function clearFilters() { setFilters({ user_id: '', action: '', entity_type: '', from: '', to: '' }); setApplied({}); setPage(1); }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Shield size={22} className="text-brand-500" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
          <p className="text-slate-500 mt-0.5">Full activity trail for your organization</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select className="input" value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}>
            <option value="">All users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
          </select>
          <select className="input" value={filters.entity_type} onChange={e => setFilters(f => ({ ...f, entity_type: e.target.value }))}>
            <option value="">All types</option>
            {['candidate','job','submission','user','organization'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input" value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
            <option value="">All actions</option>
            {Object.keys(ACTION_COLORS).map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
          <input type="date" className="input" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} placeholder="From date" />
          <input type="date" className="input" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} placeholder="To date" />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={applyFilters} className="btn-primary text-sm px-4 py-2">Apply</button>
          <button onClick={clearFilters} className="btn-secondary text-sm px-4 py-2">Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{total.toLocaleString()} events</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost p-1 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <span className="text-slate-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost p-1 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">No audit events found</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-4 hover:bg-surface-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={13} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx('badge text-xs font-semibold', ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600')}>
                      {actionLabel(log.action)}
                    </span>
                    {log.entity_type && (
                      <span className="text-xs text-slate-400">{log.entity_type}</span>
                    )}
                  </div>
                  {metaSummary(log.action, log.metadata) && (
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{metaSummary(log.action, log.metadata)}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {log.first_name ? `${log.first_name} ${log.last_name}` : 'System'}
                    {log.email ? ` · ${log.email}` : ''}
                  </p>
                </div>
                <time className="text-xs text-slate-400 shrink-0 mt-0.5">
                  {new Date(log.created_at).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
