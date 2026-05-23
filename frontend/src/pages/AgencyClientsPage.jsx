import { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Plus, Search, Building2, MoreVertical, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown } from 'lucide-react';
import OnboardClientModal from './admin/OnboardClientModal.jsx';
import EditClientModal from './admin/EditClientModal.jsx';

const statusColors = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  pending:  'bg-amber-100 text-amber-700',
};

export default function AgencyClientsPage({ showOnboard = false }) {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const menuRef = useRef(null);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams.get('search')]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
        setConfirmId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['agency-clients', search, statusFilter],
    queryFn: () => api.get('/api/clients', {
      params: { search: search || undefined, status: statusFilter || undefined, limit: 50 }
    }).then(r => r.data),
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/api/clients/${id}`, { status }).then(r => r.data),
    onSuccess: (_, { status }) => {
      toast.success(`Client ${status === 'active' ? 'activated' : 'deactivated'}`);
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const { mutate: togglePortalAccess } = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/api/clients/${id}`, { is_active }).then(r => r.data),
    onSuccess: (_, { is_active }) => {
      toast.success(`Portal access ${is_active ? 'enabled' : 'disabled'}`);
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
      setMenuOpenId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update portal access'),
  });

  const { mutate: deleteClient, isPending: isDeleting } = useMutation({
    mutationFn: (id) => api.delete(`/api/clients/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Client removed');
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
      setMenuOpenId(null);
      setConfirmId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove client'),
  });

  const clients = useMemo(() => {
    const rows = data?.clients || [];
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronUp size={13} className="text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="text-brand-500" />
      : <ChevronDown size={13} className="text-brand-500" />;
  }

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
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
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
        <select className="input text-sm w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
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
        <div className="card overflow-hidden" ref={menuRef}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                <th className="px-4 py-3 text-left">
                  <button type="button" onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-slate-700">
                    Client <SortIcon col="name" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button type="button" onClick={() => toggleSort('relationship_status')} className="flex items-center gap-1 hover:text-slate-700">
                    Status <SortIcon col="relationship_status" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">Portal</th>
                <th className="px-4 py-3 text-center">
                  <button type="button" onClick={() => toggleSort('job_count')} className="flex items-center gap-1 hover:text-slate-700 mx-auto">
                    Requirements <SortIcon col="job_count" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button type="button" onClick={() => toggleSort('submission_count')} className="flex items-center gap-1 hover:text-slate-700 mx-auto">
                    Submissions <SortIcon col="submission_count" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Contract</th>
                <th className="px-4 py-3 text-left">Onboarded By</th>
                <th className="px-4 py-3 text-left">
                  <button type="button" onClick={() => toggleSort('onboarded_at')} className="flex items-center gap-1 hover:text-slate-700">
                    Added <SortIcon col="onboarded_at" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {clients.map(client => (
                <tr key={client.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                        <Building2 size={14} className="text-brand-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{client.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {client.client_code && (
                            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                              {client.client_code}
                            </span>
                          )}
                          {client.domain && <span className="text-xs text-slate-400">{client.domain}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[client.relationship_status] || statusColors.active}`}>
                      {client.relationship_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${client.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {client.is_active ? 'On' : 'Off'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/jobs?client_id=${client.id}`} className="font-semibold text-brand-600 hover:underline">
                      {client.job_count}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/pipeline?client_id=${client.id}`} className="font-semibold text-slate-600 hover:underline">
                      {client.submission_count}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {client.contract_start
                      ? `${new Date(client.contract_start).toLocaleDateString()}${client.contract_end ? ` → ${new Date(client.contract_end).toLocaleDateString()}` : ''}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{client.onboarded_by_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(client.onboarded_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (menuOpenId === client.id) { setMenuOpenId(null); setConfirmId(null); }
                            else { setMenuOpenId(client.id); setConfirmId(null); }
                          }}
                          className="p-1 rounded-lg hover:bg-surface-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <MoreVertical size={15} />
                        </button>
                        {menuOpenId === client.id && (
                          <div className="absolute right-0 top-7 w-48 bg-white rounded-xl shadow-lg border border-surface-200 z-20 py-1">
                            {confirmId === client.id ? (
                              <div className="p-3">
                                <p className="text-xs text-slate-600 mb-1 font-semibold">Remove this client?</p>
                                <p className="text-xs text-slate-400 mb-3">This will deactivate their organization and revoke all portal access.</p>
                                <div className="flex gap-2">
                                  <button type="button"
                                    onClick={() => { setConfirmId(null); setMenuOpenId(null); }}
                                    className="flex-1 text-xs py-1.5 rounded-lg border border-surface-200 text-slate-600 hover:bg-surface-50 font-semibold transition-colors">
                                    Cancel
                                  </button>
                                  <button type="button"
                                    onClick={() => deleteClient(client.id)}
                                    disabled={isDeleting}
                                    className="flex-1 text-xs py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold transition-colors">
                                    {isDeleting ? 'Removing…' : 'Remove'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button type="button"
                                  onClick={() => { setEditId(client.id); setMenuOpenId(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-surface-50 transition-colors">
                                  <Pencil size={14} className="text-slate-400" /> Edit
                                </button>
                                <button type="button"
                                  onClick={() => {
                                    toggleStatus({ id: client.id, status: client.relationship_status === 'active' ? 'inactive' : 'active' });
                                    setMenuOpenId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-surface-50 transition-colors">
                                  {client.relationship_status === 'active'
                                    ? <><ToggleLeft size={14} className="text-slate-400" /> Deactivate</>
                                    : <><ToggleRight size={14} className="text-emerald-500" /> Activate</>}
                                </button>
                                <button type="button"
                                  onClick={() => togglePortalAccess({ id: client.id, is_active: !client.is_active })}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-surface-50 transition-colors">
                                  {client.is_active
                                    ? <><ToggleLeft size={14} className="text-amber-500" /> Disable Login</>
                                    : <><ToggleRight size={14} className="text-emerald-500" /> Enable Login</>}
                                </button>
                                <div className="my-1 border-t border-surface-100" />
                                <button type="button"
                                  onClick={() => setConfirmId(client.id)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                  <Trash2 size={14} /> Remove
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <OnboardClientModal onClose={() => setShowModal(false)} />}
      {editId && <EditClientModal clientId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}
