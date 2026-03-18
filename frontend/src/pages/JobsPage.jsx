import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Plus, Briefcase, MapPin, DollarSign, Users, Sparkles, Search, Loader2, X, ChevronUp, ChevronDown, ChevronsUpDown, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

const statusColors = {
  open:         'bg-emerald-100 text-emerald-700',
  matching:     'bg-brand-100 text-brand-700',
  draft:        'bg-slate-100 text-slate-600',
  submitted:    'bg-amber-100 text-amber-700',
  interviewing: 'bg-purple-100 text-purple-700',
  filled:       'bg-teal-100 text-teal-700',
  closed:       'bg-red-100 text-red-600',
};

const supplyColors = {
  high:     'text-emerald-600 bg-emerald-50',
  moderate: 'text-amber-600 bg-amber-50',
  low:      'text-red-600 bg-red-50',
};

const jobTypeColors = {
  full_time:  'bg-emerald-50 text-emerald-700',
  part_time:  'bg-blue-50 text-blue-700',
  contract:   'bg-brand-50 text-brand-700',
  internship: 'bg-violet-50 text-violet-700',
  other:      'bg-slate-100 text-slate-600',
};

const jobTypeLabels = {
  full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract',
  internship: 'Internship', other: 'Other',
};

const visaLabels = {
  citizen: 'Citizen', green_card: 'Green Card', h1b: 'H1B', h4_ead: 'H4 EAD',
  opt: 'OPT', stem_opt: 'STEM OPT', l1: 'L1', tn: 'TN',
};

const VISA_OPTIONS = [
  { value: 'citizen', label: 'US Citizen' }, { value: 'green_card', label: 'Green Card' },
  { value: 'h1b', label: 'H1B' }, { value: 'h4_ead', label: 'H4 EAD' },
  { value: 'opt', label: 'OPT' }, { value: 'stem_opt', label: 'STEM OPT' },
  { value: 'l1', label: 'L1' }, { value: 'tn', label: 'TN' },
];

const JOB_TYPES = [
  { value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' }, { value: 'internship', label: 'Internship' },
  { value: 'other', label: 'Other' },
];

// ─── Sort helper ─────────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={13} className="text-slate-300" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-brand-500" />
    : <ChevronDown size={13} className="text-brand-500" />;
}

function Th({ col, label, sortCol, sortDir, onSort, className = '' }) {
  return (
    <th
      className={clsx('px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-800 whitespace-nowrap', className)}
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label} <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </span>
    </th>
  );
}

// ─── New Job Modal ────────────────────────────────────────────────────────────

function VisaCheckboxes({ selected, onChange }) {
  const toggle = val =>
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  return (
    <div className="flex flex-wrap gap-2">
      {VISA_OPTIONS.map(o => (
        <button key={o.value} type="button" onClick={() => toggle(o.value)}
          className={clsx('px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
            selected.includes(o.value)
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-slate-600 border-surface-200 hover:border-brand-400')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NewJobModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', required_skills: '',
    experience_min: '', pay_rate_min: '', pay_rate_max: '',
    location_city: '', location_state: '', remote_allowed: false,
    job_type: 'contract', visa_requirements: [],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
        experience_min: form.experience_min ? parseFloat(form.experience_min) : null,
        pay_rate_min: form.pay_rate_min ? parseFloat(form.pay_rate_min) : null,
        pay_rate_max: form.pay_rate_max ? parseFloat(form.pay_rate_max) : null,
      };
      const { data } = await api.post('/api/jobs', payload);
      toast.success('Job created! AI matching will run automatically.');
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Post New Job</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-slate-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Job Title *</label>
            <input className="input" placeholder="e.g. Senior React Developer" value={form.title} onChange={set('title')} required />
          </div>
          <div>
            <label className="label">Job Type</label>
            <select className="input" value={form.job_type} onChange={set('job_type')}>
              {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[90px] resize-none" placeholder="Job description, responsibilities..." value={form.description} onChange={set('description')} />
          </div>
          <div>
            <label className="label">Required Skills (comma-separated)</label>
            <input className="input" placeholder="React, TypeScript, Node.js, AWS" value={form.required_skills} onChange={set('required_skills')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Min Exp (yrs)</label><input className="input" type="number" placeholder="3" value={form.experience_min} onChange={set('experience_min')} /></div>
            <div><label className="label">Rate Min ($/hr)</label><input className="input" type="number" placeholder="60" value={form.pay_rate_min} onChange={set('pay_rate_min')} /></div>
            <div><label className="label">Rate Max ($/hr)</label><input className="input" type="number" placeholder="90" value={form.pay_rate_max} onChange={set('pay_rate_max')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" placeholder="New York" value={form.location_city} onChange={set('location_city')} /></div>
            <div><label className="label">State</label><input className="input" placeholder="NY" value={form.location_state} onChange={set('location_state')} /></div>
          </div>
          <div>
            <label className="label">Visa / Work Authorization</label>
            <p className="text-xs text-slate-400 mb-2">Select all that are acceptable</p>
            <VisaCheckboxes selected={form.visa_requirements} onChange={vals => setForm(f => ({ ...f, visa_requirements: vals }))} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.remote_allowed} onChange={set('remote_allowed')} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
            <span className="text-sm font-medium text-slate-700">Remote work allowed</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {saving ? 'Creating...' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRemote, setFilterRemote] = useState('');
  const [sortCol, setSortCol] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', search, filterStatus],
    queryFn: () => api.get(`/api/jobs?search=${search}&status=${filterStatus}&limit=100`).then(r => r.data),
  });

  const matchMutation = useMutation({
    mutationFn: jobId => api.post(`/api/jobs/${jobId}/match`),
    onSuccess: () => { toast.success('AI matching started'); qc.invalidateQueries({ queryKey: ['jobs'] }); },
    onError: err => toast.error(err.response?.data?.error || 'Match failed'),
  });

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const jobs = useMemo(() => {
    let list = data?.jobs || [];

    if (filterType) list = list.filter(j => j.job_type === filterType);
    if (filterRemote === 'yes') list = list.filter(j => j.remote_allowed);
    if (filterRemote === 'no')  list = list.filter(j => !j.remote_allowed);

    list = [...list].sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') av = av.toLowerCase(), bv = (bv || '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [data, filterType, filterRemote, sortCol, sortDir]);

  const total = data?.total || 0;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Jobs</h2>
          <p className="text-slate-500 mt-0.5">{total} position{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Post Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input className="input pl-9" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {['open','matching','draft','submitted','interviewing','filled','closed'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select className="input w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="input w-auto" value={filterRemote} onChange={e => setFilterRemote(e.target.value)}>
          <option value="">Remote: All</option>
          <option value="yes">Remote Only</option>
          <option value="no">On-site Only</option>
        </select>
        {(filterStatus || filterType || filterRemote || search) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterRemote(''); }}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 underline"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-500" size={28} /></div>
      ) : jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">No jobs found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting filters or post a new job</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-5 mx-auto"><Plus size={16} /> Post First Job</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  <Th col="title"          label="Job Title"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="min-w-[200px]" />
                  <Th col="status"         label="Status"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th col="job_type"       label="Type"         sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th col="location_city"  label="Location"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th col="pay_rate_max"   label="Rate"         sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th col="experience_min" label="Exp"          sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Visa</th>
                  <Th col="submission_count" label="Submitted"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th col="match_count"    label="Matches"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th col="supply_level"   label="Supply"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th col="created_at"     label="Posted"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-surface-50 transition-colors group">
                    {/* Title */}
                    <td className="px-4 py-3">
                      <Link to={`/jobs/${job.id}`} className="font-semibold text-slate-900 hover:text-brand-600 transition-colors block truncate max-w-[240px]">
                        {job.title}
                      </Link>
                      {(job.client_name || job.remote_allowed) && (
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          {job.client_name && <span>{job.client_name}</span>}
                          {job.remote_allowed && <span className="flex items-center gap-0.5 text-teal-600"><Wifi size={10} /> Remote</span>}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={clsx('badge', statusColors[job.status] || 'bg-slate-100 text-slate-600')}>
                        {job.status}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      {job.job_type && (
                        <span className={clsx('badge', jobTypeColors[job.job_type] || 'bg-slate-100 text-slate-600')}>
                          {jobTypeLabels[job.job_type] || job.job_type}
                        </span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {job.location_city ? (
                        <span className="flex items-center gap-1"><MapPin size={11} className="text-slate-400" /> {job.location_city}{job.location_state ? `, ${job.location_state}` : ''}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Rate */}
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {job.pay_rate_min ? (
                        <span className="flex items-center gap-0.5"><DollarSign size={11} className="text-slate-400" />{job.pay_rate_min}–{job.pay_rate_max}/hr</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Experience */}
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {job.experience_min ? `${job.experience_min}${job.experience_max ? `–${job.experience_max}` : '+'}y` : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Visa */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {job.visa_requirements?.slice(0, 2).map(v => (
                          <span key={v} className="badge bg-slate-100 text-slate-600 text-xs">{visaLabels[v] || v}</span>
                        ))}
                        {job.visa_requirements?.length > 2 && (
                          <span className="badge bg-slate-100 text-slate-400 text-xs">+{job.visa_requirements.length - 2}</span>
                        )}
                        {!job.visa_requirements?.length && <span className="text-slate-300 text-xs">—</span>}
                      </div>
                    </td>

                    {/* Submitted */}
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-slate-600">
                        <Users size={12} className="text-slate-400" /> {job.submission_count || 0}
                      </span>
                    </td>

                    {/* Matches */}
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-slate-600">
                        <Sparkles size={12} className="text-slate-400" /> {job.match_count || 0}
                      </span>
                    </td>

                    {/* Supply */}
                    <td className="px-4 py-3">
                      {job.supply_level
                        ? <span className={clsx('badge', supplyColors[job.supply_level])}>{job.supply_level}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>

                    {/* Posted */}
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                      {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => matchMutation.mutate(job.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap"
                      >
                        <Sparkles size={12} /> Run Match
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-surface-100 text-xs text-slate-400">
            Showing {jobs.length} of {total} jobs
          </div>
        </div>
      )}

      {showModal && (
        <NewJobModal
          onClose={() => setShowModal(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['jobs'] })}
        />
      )}
    </div>
  );
}
