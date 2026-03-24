import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import { Plus, Search, Building2, ChevronRight } from 'lucide-react';
import OnboardClientModal from './admin/OnboardClientModal.jsx';

const statusColors = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  pending:  'bg-amber-100 text-amber-700',
};

export default function AgencyClientsPage({ showOnboard = false }) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams.get('search')]);

  const { data, isLoading } = useQuery({
    queryKey: ['agency-clients', search, statusFilter],
    queryFn: () => api.get('/api/clients', {
      params: { search: search || undefined, status: statusFilter || undefined, limit: 50 }
    }).then(r => r.data),
  });

  const clients = data?.clients || [];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clients</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {data?.total ?? 0} client{data?.total !== 1 ? 's' : ''} onboarded
          </p>
        </div>
        {showOnboard && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} /> Onboard Client
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 text-sm" placeholder="Search clients..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-36"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Client cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No clients yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">
            {showOnboard ? 'Onboard your first client to start managing their requirements.' : 'No clients have been onboarded yet.'}
          </p>
          {showOnboard && (
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Plus size={15} /> Onboard Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(client => (
            <div key={client.id} className="card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{client.name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.client_code && (
                        <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                          {client.client_code}
                        </span>
                      )}
                      {client.domain && (
                        <span className="text-xs text-slate-400">{client.domain}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusColors[client.relationship_status] || statusColors.active}`}>
                  {client.relationship_status}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-surface-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{client.job_count}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Requirements</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{client.submission_count}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Submissions</p>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                {client.onboarded_by_name && (
                  <p>Onboarded by <span className="font-medium text-slate-700">{client.onboarded_by_name}</span></p>
                )}
                {client.contract_start && (
                  <p>Contract: {new Date(client.contract_start).toLocaleDateString()}
                    {client.contract_end && ` → ${new Date(client.contract_end).toLocaleDateString()}`}
                  </p>
                )}
                <p>Added {new Date(client.onboarded_at).toLocaleDateString()}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-surface-100">
                <Link
                  to={`/jobs?client_id=${client.id}`}
                  className="flex-1 text-center text-xs font-semibold text-brand-600 hover:text-brand-700 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  View Requirements
                </Link>
                <Link
                  to={`/pipeline?client_id=${client.id}`}
                  className="flex-1 text-center text-xs font-semibold text-slate-600 hover:text-slate-800 py-1.5 rounded-lg hover:bg-surface-100 transition-colors"
                >
                  View Pipeline
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <OnboardClientModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
