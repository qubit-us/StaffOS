import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Plus, Search, Store, MoreVertical, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import OnboardVendorModal from './admin/OnboardVendorModal.jsx';
import EditVendorModal from './admin/EditVendorModal.jsx';

const statusColors = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  pending:  'bg-amber-100 text-amber-700',
};

export default function AgencyVendorsPage({ showOnboard = false }) {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
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
    queryKey: ['agency-vendors', search, statusFilter],
    queryFn: () => api.get('/api/vendors', {
      params: { search: search || undefined, status: statusFilter || undefined, limit: 50 }
    }).then(r => r.data),
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/api/vendors/${id}`, { status }).then(r => r.data),
    onSuccess: (_, { status }) => {
      toast.success(`Vendor ${status === 'active' ? 'activated' : 'deactivated'}`);
      qc.invalidateQueries({ queryKey: ['agency-vendors'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const { mutate: togglePortalAccess } = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/api/vendors/${id}`, { is_active }).then(r => r.data),
    onSuccess: (_, { is_active }) => {
      toast.success(`Portal access ${is_active ? 'enabled' : 'disabled'}`);
      qc.invalidateQueries({ queryKey: ['agency-vendors'] });
      setMenuOpenId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update portal access'),
  });

  const { mutate: deleteVendor, isPending: isDeleting } = useMutation({
    mutationFn: (id) => api.delete(`/api/vendors/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Vendor removed');
      qc.invalidateQueries({ queryKey: ['agency-vendors'] });
      setMenuOpenId(null);
      setConfirmId(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove vendor'),
  });

  const vendors = data?.vendors || [];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vendors</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {data?.total ?? 0} vendor{data?.total !== 1 ? 's' : ''} onboarded
          </p>
        </div>
        {showOnboard && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
            <Plus size={16} /> Onboard Vendor
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 text-sm" placeholder="Search vendors..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Vendor cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading vendors...</div>
      ) : vendors.length === 0 ? (
        <div className="card p-12 text-center">
          <Store size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No vendors yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">
            {showOnboard ? 'Onboard your first vendor to start sourcing candidates.' : 'No vendors have been onboarded yet.'}
          </p>
          {showOnboard && (
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Plus size={15} /> Onboard Vendor
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" ref={menuRef}>
          {vendors.map(vendor => (
            <div key={vendor.id} className="card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Store size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{vendor.name}</p>
                    {vendor.domain && <p className="text-xs text-slate-400">{vendor.domain}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[vendor.relationship_status] || statusColors.active}`}>
                    {vendor.relationship_status}
                  </span>
                  {/* Action menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (menuOpenId === vendor.id) { setMenuOpenId(null); setConfirmId(null); }
                        else { setMenuOpenId(vendor.id); setConfirmId(null); }
                      }}
                      className="p-1 rounded-lg hover:bg-surface-100 text-slate-400 hover:text-slate-600 transition-colors">
                      <MoreVertical size={15} />
                    </button>
                    {menuOpenId === vendor.id && (
                      <div className="absolute right-0 top-7 w-48 bg-white rounded-xl shadow-lg border border-surface-200 z-20 py-1">
                        {confirmId === vendor.id ? (
                          <div className="p-3">
                            <p className="text-xs text-slate-600 mb-1 font-semibold">Remove this vendor?</p>
                            <p className="text-xs text-slate-400 mb-3">This will deactivate their organization and revoke all portal access.</p>
                            <div className="flex gap-2">
                              <button type="button"
                                onClick={() => { setConfirmId(null); setMenuOpenId(null); }}
                                className="flex-1 text-xs py-1.5 rounded-lg border border-surface-200 text-slate-600 hover:bg-surface-50 font-semibold transition-colors">
                                Cancel
                              </button>
                              <button type="button"
                                onClick={() => deleteVendor(vendor.id)}
                                disabled={isDeleting}
                                className="flex-1 text-xs py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold transition-colors">
                                {isDeleting ? 'Removing…' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button type="button"
                              onClick={() => { setEditId(vendor.id); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-surface-50 transition-colors">
                              <Pencil size={14} className="text-slate-400" /> Edit
                            </button>
                            <button type="button"
                              onClick={() => {
                                toggleStatus({ id: vendor.id, status: vendor.relationship_status === 'active' ? 'inactive' : 'active' });
                                setMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-surface-50 transition-colors">
                              {vendor.relationship_status === 'active'
                                ? <><ToggleLeft size={14} className="text-slate-400" /> Deactivate</>
                                : <><ToggleRight size={14} className="text-emerald-500" /> Activate</>}
                            </button>
                            <button type="button"
                              onClick={() => togglePortalAccess({ id: vendor.id, is_active: !vendor.is_active })}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-surface-50 transition-colors">
                              {vendor.is_active
                                ? <><ToggleLeft size={14} className="text-amber-500" /> Disable Login</>
                                : <><ToggleRight size={14} className="text-emerald-500" /> Enable Login</>}
                            </button>
                            <div className="my-1 border-t border-surface-100" />
                            <button type="button"
                              onClick={() => setConfirmId(vendor.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={14} /> Remove
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-surface-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{vendor.candidate_count}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Candidates</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{vendor.user_count}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Users</p>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                {vendor.onboarded_by_name && (
                  <p>Onboarded by <span className="font-medium text-slate-700">{vendor.onboarded_by_name}</span></p>
                )}
                <p>Added {new Date(vendor.onboarded_at).toLocaleDateString()}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-surface-100">
                <Link to={`/candidates?vendor_id=${vendor.id}`}
                  className="flex-1 text-center text-xs font-semibold text-brand-600 hover:text-brand-700 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                  View Candidates
                </Link>
                <Link to={`/pipeline?vendor_id=${vendor.id}`}
                  className="flex-1 text-center text-xs font-semibold text-slate-600 hover:text-slate-800 py-1.5 rounded-lg hover:bg-surface-100 transition-colors">
                  View Pipeline
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <OnboardVendorModal onClose={() => setShowModal(false)} />}
      {editId && <EditVendorModal vendorId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}
