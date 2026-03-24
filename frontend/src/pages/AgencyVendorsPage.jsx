import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Plus, Search, Store, Users, X, Loader2 } from 'lucide-react';

const statusColors = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  pending:  'bg-amber-100 text-amber-700',
};

function OnboardVendorModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', domain: '', website: '',
    poc_first_name: '', poc_last_name: '', poc_email: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => api.post('/api/vendors', data).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`${data.organization.name} onboarded! Login: ${data.poc_user.email} / TempPass123!`);
      qc.invalidateQueries({ queryKey: ['agency-vendors'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to onboard vendor'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Onboard New Vendor</h2>
            <p className="text-xs text-slate-400 mt-0.5">Create a vendor org and their point-of-contact login</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Company info */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Vendor Details</p>
            <div className="space-y-3">
              <div>
                <label className="label">Vendor Name *</label>
                <input className="input" required value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="TechTalent Vendors Inc" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Domain</label>
                  <input className="input" value={form.domain}
                    onChange={e => set('domain', e.target.value)} placeholder="techtalent.com" />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input className="input" value={form.website}
                    onChange={e => set('website', e.target.value)} placeholder="https://techtalent.com" />
                </div>
              </div>
            </div>
          </div>

          {/* POC info */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Point of Contact</p>
            <p className="text-xs text-slate-400 mb-3">
              A login will be created with temporary password <span className="font-mono font-semibold">TempPass123!</span>
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First Name</label>
                  <input className="input" value={form.poc_first_name}
                    onChange={e => set('poc_first_name', e.target.value)} placeholder="John" />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="input" value={form.poc_last_name}
                    onChange={e => set('poc_last_name', e.target.value)} placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input className="input" type="email" required value={form.poc_email}
                  onChange={e => set('poc_email', e.target.value)} placeholder="john@techtalent.com" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isPending ? 'Onboarding...' : 'Onboard Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AgencyVendorsPage({ showOnboard = false }) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams.get('search')]);

  const { data, isLoading } = useQuery({
    queryKey: ['agency-vendors', search, statusFilter],
    queryFn: () => api.get('/api/vendors', {
      params: { search: search || undefined, status: statusFilter || undefined, limit: 50 }
    }).then(r => r.data),
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
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
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
        <select className="input text-sm w-36"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    {vendor.domain && (
                      <p className="text-xs text-slate-400">{vendor.domain}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusColors[vendor.relationship_status] || statusColors.active}`}>
                  {vendor.relationship_status}
                </span>
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
                <Link
                  to={`/candidates?vendor_id=${vendor.id}`}
                  className="flex-1 text-center text-xs font-semibold text-brand-600 hover:text-brand-700 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  View Candidates
                </Link>
                <Link
                  to={`/pipeline?vendor_id=${vendor.id}`}
                  className="flex-1 text-center text-xs font-semibold text-slate-600 hover:text-slate-800 py-1.5 rounded-lg hover:bg-surface-100 transition-colors"
                >
                  View Pipeline
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <OnboardVendorModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
