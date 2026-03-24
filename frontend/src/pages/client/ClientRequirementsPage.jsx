import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import {
  Plus, Search, MapPin, Briefcase, Calendar, Users,
  Clock, ChevronRight, Loader2, X, DollarSign, FileText
} from 'lucide-react';

const statusColors = {
  open:         'bg-emerald-100 text-emerald-700',
  matching:     'bg-brand-100 text-brand-700',
  draft:        'bg-slate-100 text-slate-600',
  submitted:    'bg-amber-100 text-amber-700',
  interviewing: 'bg-purple-100 text-purple-700',
  filled:       'bg-teal-100 text-teal-700',
  closed:       'bg-red-100 text-red-600',
};

const visaOptions = ['citizen','green_card','h1b','h4_ead','opt','stem_opt','l1','tn'];

function NewRequirementModal({ onClose, agencyOrgId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', location_city: '', location_state: '',
    remote_allowed: false, client_bill_rate: '', positions_count: 1,
    start_date: '', client_poc: '', is_carry_forward: false,
    experience_min: '', experience_max: '', deadline: '',
    job_type: 'contract', rate_type: 'hourly',
    required_skills: '', visa_requirements: [],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => api.post('/api/client-portal/requirements', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Requirement submitted to agency!');
      qc.invalidateQueries({ queryKey: ['client-requirements'] });
      qc.invalidateQueries({ queryKey: ['client-dashboard'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create requirement'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate({
      ...form,
      agency_org_id: agencyOrgId,
      client_bill_rate: form.client_bill_rate ? parseFloat(form.client_bill_rate) : undefined,
      experience_min: form.experience_min ? parseFloat(form.experience_min) : undefined,
      experience_max: form.experience_max ? parseFloat(form.experience_max) : undefined,
      positions_count: parseInt(form.positions_count) || 1,
      required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <h2 className="text-lg font-bold text-slate-900">New Requirement</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="label">Job Title *</label>
            <input className="input" required value={form.title}
              onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Java Developer" />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px] resize-none" value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the role, responsibilities, and any specific requirements..." />
          </div>

          {/* Location row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" value={form.location_city}
                onChange={e => set('location_city', e.target.value)} placeholder="New York" />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" value={form.location_state}
                onChange={e => set('location_state', e.target.value)} placeholder="NY" />
            </div>
          </div>

          {/* Rate + Positions */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Bill Rate ($/hr)</label>
              <input className="input" type="number" step="0.01" value={form.client_bill_rate}
                onChange={e => set('client_bill_rate', e.target.value)} placeholder="75.00" />
            </div>
            <div>
              <label className="label">Positions</label>
              <input className="input" type="number" min="1" value={form.positions_count}
                onChange={e => set('positions_count', e.target.value)} />
            </div>
            <div>
              <label className="label">Job Type</label>
              <select className="input" value={form.job_type} onChange={e => set('job_type', e.target.value)}>
                <option value="contract">Contract</option>
                <option value="full_time">Full Time (FTE)</option>
                <option value="part_time">Part Time</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>

          {/* Experience + Start date */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Exp Min (yrs)</label>
              <input className="input" type="number" step="0.5" value={form.experience_min}
                onChange={e => set('experience_min', e.target.value)} placeholder="3" />
            </div>
            <div>
              <label className="label">Exp Max (yrs)</label>
              <input className="input" type="number" step="0.5" value={form.experience_max}
                onChange={e => set('experience_max', e.target.value)} placeholder="8" />
            </div>
            <div>
              <label className="label">Start Date</label>
              <input className="input" type="date" value={form.start_date}
                onChange={e => set('start_date', e.target.value)} />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="label">Required Skills (comma-separated)</label>
            <input className="input" value={form.required_skills}
              onChange={e => set('required_skills', e.target.value)}
              placeholder="Java, Spring Boot, AWS, Kubernetes" />
          </div>

          {/* Visa */}
          <div>
            <label className="label">Visa Requirements</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {visaOptions.map(v => (
                <button key={v} type="button"
                  onClick={() => set('visa_requirements',
                    form.visa_requirements.includes(v)
                      ? form.visa_requirements.filter(x => x !== v)
                      : [...form.visa_requirements, v]
                  )}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.visa_requirements.includes(v)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-surface-300 text-slate-600 hover:border-brand-400'
                  }`}
                >
                  {v.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* CPOC + Carry forward */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Client POC (your name)</label>
              <input className="input" value={form.client_poc}
                onChange={e => set('client_poc', e.target.value)} placeholder="John Smith" />
            </div>
            <div>
              <label className="label">Deadline</label>
              <input className="input" type="date" value={form.deadline}
                onChange={e => set('deadline', e.target.value)} />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.remote_allowed}
                onChange={e => set('remote_allowed', e.target.checked)} />
              <span className="text-sm text-slate-700">Remote OK</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.is_carry_forward}
                onChange={e => set('is_carry_forward', e.target.checked)} />
              <span className="text-sm text-slate-700">Carry Forward</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isPending ? 'Submitting...' : 'Submit Requirement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientRequirementsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['client-requirements', search, statusFilter],
    queryFn: () => api.get('/api/client-portal/requirements', {
      params: { search: search || undefined, status: statusFilter || undefined, limit: 50 }
    }).then(r => r.data),
  });

  const { data: clientMe } = useQuery({
    queryKey: ['client-me'],
    queryFn: () => api.get('/api/client-portal/me').then(r => r.data),
    staleTime: Infinity,
  });

  const requirements = data?.requirements || [];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Requirements</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {data?.total ?? 0} total requirement{data?.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <Plus size={16} /> New Requirement
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 text-sm" placeholder="Search requirements..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-40"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['open','matching','submitted','interviewing','filled','closed'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading requirements...</div>
        ) : requirements.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No requirements yet</p>
            <p className="text-slate-400 text-sm mt-1">Click "New Requirement" to submit your first job requirement.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                {['Title', 'Status', 'Location', 'Type', 'Bill Rate', 'Positions', 'Start Date', 'Pending', 'Approved', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {requirements.map(req => (
                <tr key={req.id} className="hover:bg-surface-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{req.title}</p>
                      {req.is_carry_forward && (
                        <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">CF</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={11} />
                      {req.location_city ? `${req.location_city}, ${req.location_state}` : '—'}
                      {req.remote_allowed && <span className="text-brand-600 font-medium ml-1">Remote</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600 capitalize">{req.job_type?.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-700">
                      {req.client_bill_rate ? `$${req.client_bill_rate}/hr` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{req.positions_count}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {req.start_date ? new Date(req.start_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {req.pending_review_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {req.approved_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/client/submissions?job_id=${req.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-brand-600 font-medium">
                      View <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <NewRequirementModal
          onClose={() => setShowModal(false)}
          agencyOrgId={clientMe?.agency_org_id}
        />
      )}
    </div>
  );
}
