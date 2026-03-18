import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Plus, Briefcase, MapPin, DollarSign, Users, Sparkles, Search, Loader2, X, ChevronDown } from 'lucide-react';
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

function JobCard({ job, onMatch }) {
  return (
    <div className="card-hover p-5 relative">
      <Link to={`/jobs/${job.id}`} className="absolute inset-0 rounded-2xl" aria-label={job.title} />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{job.title}</h3>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{job.client_name || 'Internal'} {job.end_client_name ? `→ ${job.end_client_name}` : ''}</p>
        </div>
        <span className={clsx('badge shrink-0', statusColors[job.status] || 'bg-slate-100 text-slate-600')}>
          {job.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {job.required_skills?.slice(0, 4).map(s => (
          <span key={s} className="badge bg-slate-100 text-slate-600">{s}</span>
        ))}
        {job.required_skills?.length > 4 && (
          <span className="badge bg-slate-100 text-slate-500">+{job.required_skills.length - 4}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        {job.location_city && (
          <span className="flex items-center gap-1"><MapPin size={12} /> {job.location_city}, {job.location_state}</span>
        )}
        {job.pay_rate_max && (
          <span className="flex items-center gap-1"><DollarSign size={12} /> ${job.pay_rate_min}–${job.pay_rate_max}/hr</span>
        )}
        {job.remote_allowed && (
          <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-semibold">Remote OK</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-100">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Users size={12} /> {job.submission_count} submitted</span>
          <span className="flex items-center gap-1"><Sparkles size={12} /> {job.match_count} matches</span>
          {job.supply_level && (
            <span className={clsx('badge text-xs', supplyColors[job.supply_level])}>
              {job.supply_level} supply
            </span>
          )}
        </div>
        <button
          onClick={e => { e.preventDefault(); onMatch(job.id); }}
          className="relative z-10 flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Sparkles size={13} /> Run Match
        </button>
      </div>
    </div>
  );
}

const VISA_OPTIONS = [
  { value: 'citizen',    label: 'US Citizen' },
  { value: 'green_card', label: 'Green Card' },
  { value: 'h1b',        label: 'H1B' },
  { value: 'h4_ead',     label: 'H4 EAD' },
  { value: 'opt',        label: 'OPT' },
  { value: 'stem_opt',   label: 'STEM OPT' },
  { value: 'l1',         label: 'L1' },
  { value: 'tn',         label: 'TN' },
];

const JOB_TYPES = [
  { value: 'full_time',   label: 'Full Time' },
  { value: 'part_time',   label: 'Part Time' },
  { value: 'contract',    label: 'Contract' },
  { value: 'internship',  label: 'Internship' },
  { value: 'other',       label: 'Other' },
];

function VisaCheckboxes({ selected, onChange }) {
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {VISA_OPTIONS.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => toggle(o.value)}
          className={clsx(
            'px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
            selected.includes(o.value)
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-slate-600 border-surface-200 hover:border-brand-400'
          )}
        >
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

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

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
            <div>
              <label className="label">Min Exp (yrs)</label>
              <input className="input" type="number" placeholder="3" value={form.experience_min} onChange={set('experience_min')} />
            </div>
            <div>
              <label className="label">Rate Min ($/hr)</label>
              <input className="input" type="number" placeholder="60" value={form.pay_rate_min} onChange={set('pay_rate_min')} />
            </div>
            <div>
              <label className="label">Rate Max ($/hr)</label>
              <input className="input" type="number" placeholder="90" value={form.pay_rate_max} onChange={set('pay_rate_max')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" placeholder="New York" value={form.location_city} onChange={set('location_city')} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" placeholder="NY" value={form.location_state} onChange={set('location_state')} />
            </div>
          </div>
          <div>
            <label className="label">Visa / Work Authorization</label>
            <p className="text-xs text-slate-400 mb-2">Select all that are acceptable</p>
            <VisaCheckboxes
              selected={form.visa_requirements}
              onChange={vals => setForm(f => ({ ...f, visa_requirements: vals }))}
            />
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

export default function JobsPage() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', search, filter],
    queryFn: () => api.get(`/api/jobs?search=${search}&status=${filter}&limit=50`).then(r => r.data),
  });

  const matchMutation = useMutation({
    mutationFn: (jobId) => api.post(`/api/jobs/${jobId}/match`),
    onSuccess: () => {
      toast.success('AI matching started in background');
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Match failed'),
  });

  const jobs = data?.jobs || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Jobs</h2>
          <p className="text-slate-500 mt-0.5">{total} active position{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Post Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input className="input pl-9" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Status</option>
          {['open','matching','draft','submitted','interviewing','filled','closed'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">No jobs found</p>
          <p className="text-slate-400 text-sm mt-1">Post your first job to start matching candidates</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-5 mx-auto">
            <Plus size={16} /> Post First Job
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} onMatch={(id) => matchMutation.mutate(id)} />
          ))}
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
