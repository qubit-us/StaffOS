import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import {
  ArrowLeft, MapPin, DollarSign, Star, Briefcase, Users, Sparkles,
  Loader2, X, Edit2, Calendar, Clock, Building2, ChevronRight,
  CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Wifi, Save,
} from 'lucide-react';
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
  high:     { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: TrendingUp },
  moderate: { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: Minus },
  low:      { bg: 'bg-red-50',     text: 'text-red-600',     icon: TrendingDown },
};

const stageColors = {
  submitted:     'bg-slate-100 text-slate-600',
  client_review: 'bg-blue-100 text-blue-700',
  shortlisted:   'bg-indigo-100 text-indigo-700',
  interview_r1:  'bg-violet-100 text-violet-700',
  interview_r2:  'bg-purple-100 text-purple-700',
  offer:         'bg-amber-100 text-amber-700',
  placed:        'bg-emerald-100 text-emerald-700',
  rejected:      'bg-red-100 text-red-600',
  withdrawn:     'bg-slate-100 text-slate-500',
};

const stageLabels = {
  submitted: 'Submitted', client_review: 'Client Review', shortlisted: 'Shortlisted',
  interview_r1: 'Interview R1', interview_r2: 'Interview R2', offer: 'Offer',
  placed: 'Placed', rejected: 'Rejected', withdrawn: 'Withdrawn',
};

function ScoreRing({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
  const r = 18, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
      <svg className="-rotate-90" width="48" height="48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

function EditJobModal({ job, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:              job.title || '',
    description:        job.description || '',
    required_skills:    (job.required_skills || []).join(', '),
    nice_to_have_skills:(job.nice_to_have_skills || []).join(', '),
    experience_min:     job.experience_min || '',
    experience_max:     job.experience_max || '',
    pay_rate_min:       job.pay_rate_min || '',
    pay_rate_max:       job.pay_rate_max || '',
    location_city:      job.location_city || '',
    location_state:     job.location_state || '',
    remote_allowed:     job.remote_allowed || false,
    status:             job.status || 'open',
    deadline:           job.deadline ? job.deadline.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        required_skills:     form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
        nice_to_have_skills: form.nice_to_have_skills.split(',').map(s => s.trim()).filter(Boolean),
        experience_min: form.experience_min ? parseFloat(form.experience_min) : null,
        experience_max: form.experience_max ? parseFloat(form.experience_max) : null,
        pay_rate_min:   form.pay_rate_min   ? parseFloat(form.pay_rate_min)   : null,
        pay_rate_max:   form.pay_rate_max   ? parseFloat(form.pay_rate_max)   : null,
        deadline:       form.deadline || null,
      };
      const { data } = await api.patch(`/api/jobs/${job.id}`, payload);
      toast.success('Job updated');
      onSaved(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Edit Job</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-slate-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Job Title *</label>
            <input className="input" value={form.title} onChange={set('title')} required />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {['draft','open','matching','submitted','interviewing','filled','closed'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[100px] resize-none" value={form.description} onChange={set('description')} />
          </div>
          <div>
            <label className="label">Required Skills (comma-separated)</label>
            <input className="input" placeholder="React, TypeScript, Node.js" value={form.required_skills} onChange={set('required_skills')} />
          </div>
          <div>
            <label className="label">Nice-to-have Skills (comma-separated)</label>
            <input className="input" placeholder="AWS, Docker, GraphQL" value={form.nice_to_have_skills} onChange={set('nice_to_have_skills')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Min Exp (yrs)</label>
              <input className="input" type="number" value={form.experience_min} onChange={set('experience_min')} />
            </div>
            <div>
              <label className="label">Max Exp (yrs)</label>
              <input className="input" type="number" value={form.experience_max} onChange={set('experience_max')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rate Min ($/hr)</label>
              <input className="input" type="number" value={form.pay_rate_min} onChange={set('pay_rate_min')} />
            </div>
            <div>
              <label className="label">Rate Max ($/hr)</label>
              <input className="input" type="number" value={form.pay_rate_max} onChange={set('pay_rate_max')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" value={form.location_city} onChange={set('location_city')} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" value={form.location_state} onChange={set('location_state')} />
            </div>
          </div>
          <div>
            <label className="label">Deadline</label>
            <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.remote_allowed} onChange={set('remote_allowed')} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
            <span className="text-sm font-medium text-slate-700">Remote work allowed</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => api.get(`/api/jobs/${id}`).then(r => r.data),
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['job-matches', id],
    queryFn: () => api.get(`/api/jobs/${id}/matches?limit=20&min_score=0.3`).then(r => r.data),
    enabled: !!job,
  });

  const { data: submissionsData } = useQuery({
    queryKey: ['job-submissions', id],
    queryFn: () => api.get(`/api/submissions?job_id=${id}&limit=50`).then(r => r.data),
    enabled: !!job,
  });

  const submissions = submissionsData?.submissions || [];

  const matchMutation = useMutation({
    mutationFn: () => api.post(`/api/jobs/${id}/match`),
    onSuccess: () => {
      toast.success('AI matching started — results will appear shortly');
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['job-matches', id] });
    },
    onError: err => toast.error(err.response?.data?.error || 'Match failed'),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-500" size={32} /></div>;
  }

  if (!job) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">Job not found.</p>
        <button onClick={() => navigate('/jobs')} className="btn-secondary mt-4">Back to Jobs</button>
      </div>
    );
  }

  const supply = job.supply_level ? supplyColors[job.supply_level] : null;
  const supplyAnalysis = parseJson(job.supply_analysis);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Back */}
      <button onClick={() => navigate('/jobs')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} /> Back to Jobs
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center shrink-0">
            <Briefcase size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  {job.client_name && <><Building2 size={13} /> {job.client_name}</>}
                  {job.end_client_name && <><span className="text-slate-300">→</span>{job.end_client_name}</>}
                  {job.created_by_name && <span className="text-slate-400">· Posted by {job.created_by_name}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={clsx('badge', statusColors[job.status] || 'bg-slate-100 text-slate-600')}>
                    {job.status}
                  </span>
                  {supply && (
                    <span className={clsx('badge flex items-center gap-1', supply.bg, supply.text)}>
                      <supply.icon size={11} /> {job.supply_level} supply
                    </span>
                  )}
                  {job.remote_allowed && (
                    <span className="badge bg-teal-50 text-teal-700 flex items-center gap-1">
                      <Wifi size={11} /> Remote OK
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEdit(true)}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => matchMutation.mutate()}
                  disabled={matchMutation.isPending}
                  className="btn-primary flex items-center gap-1.5"
                >
                  {matchMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Run Match
                </button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
              {job.location_city && (
                <span className="flex items-center gap-1.5"><MapPin size={13} /> {job.location_city}{job.location_state ? `, ${job.location_state}` : ''}</span>
              )}
              {job.pay_rate_min && (
                <span className="flex items-center gap-1.5"><DollarSign size={13} /> ${job.pay_rate_min}–${job.pay_rate_max}/hr</span>
              )}
              {job.experience_min && (
                <span className="flex items-center gap-1.5"><Star size={13} /> {job.experience_min}{job.experience_max ? `–${job.experience_max}` : '+'} yrs exp</span>
              )}
              {job.deadline && (
                <span className="flex items-center gap-1.5"><Calendar size={13} /> Deadline {formatDate(job.deadline)}</span>
              )}
              <span className="flex items-center gap-1.5"><Clock size={13} /> Posted {formatDate(job.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Required Skills */}
          {job.required_skills?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                <CheckCircle size={15} className="text-brand-500" /> Required Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.required_skills.map(s => (
                  <span key={s} className="badge bg-brand-50 text-brand-700">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Nice-to-have Skills */}
          {job.nice_to_have_skills?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                <Star size={15} className="text-amber-500" /> Nice-to-have
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.nice_to_have_skills.map(s => (
                  <span key={s} className="badge bg-amber-50 text-amber-700">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Supply Analysis */}
          {supplyAnalysis?.level && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-brand-500" /> Supply Analysis
              </h3>
              <div className={clsx('rounded-lg px-3 py-2 text-sm font-medium mb-3 flex items-center gap-2',
                supply?.bg, supply?.text)}>
                {supply && <supply.icon size={14} />}
                {supplyAnalysis.level} supply — {supplyAnalysis.candidateCount || 0} matching candidates
              </div>
              {supplyAnalysis.recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recommendations</p>
                  <ul className="space-y-1.5">
                    {supplyAnalysis.recommendations.slice(0, 4).map((r, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-brand-400 mt-0.5">·</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {supplyAnalysis.alternativeSkills?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Alternative Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {supplyAnalysis.alternativeSkills.map(s => (
                      <span key={s} className="badge bg-surface-100 text-slate-600">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pipeline summary */}
          {submissions.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                <Users size={15} className="text-brand-500" /> Pipeline ({submissions.length})
              </h3>
              <div className="space-y-2">
                {submissions.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-700 truncate">
                      {s.first_name} {s.last_name}
                    </span>
                    <span className={clsx('badge text-xs shrink-0', stageColors[s.stage] || 'bg-slate-100 text-slate-600')}>
                      {stageLabels[s.stage] || s.stage}
                    </span>
                  </div>
                ))}
                <Link to="/pipeline" className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium mt-1">
                  View full pipeline <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {job.description && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                <Briefcase size={15} className="text-brand-500" /> Description
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>
          )}

          {/* AI Matches */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles size={15} className="text-brand-500" /> AI Matches
                {matches.length > 0 && <span className="badge bg-brand-50 text-brand-700">{matches.length}</span>}
              </h3>
              {matches.length === 0 && (
                <button
                  onClick={() => matchMutation.mutate()}
                  disabled={matchMutation.isPending}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  {matchMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Run matching
                </button>
              )}
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Sparkles size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No matches yet. Click "Run Match" to find candidates.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map(m => (
                  <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors">
                    <ScoreRing score={m.overall_score} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">
                          {m.first_name} {m.last_name}
                        </span>
                        {m.visa_status && (
                          <span className="badge bg-slate-100 text-slate-500 text-xs shrink-0">
                            {m.visa_status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{m.candidate_title}</p>

                      {/* Score breakdown */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {[
                          { label: 'Skills', val: m.skills_score },
                          { label: 'Exp', val: m.experience_score },
                          { label: 'Location', val: m.location_score },
                          { label: 'Rate', val: m.rate_score },
                          { label: 'Visa', val: m.visa_score },
                        ].filter(s => s.val != null).map(s => (
                          <span key={s.label} className="text-xs text-slate-400">
                            {s.label}: <span className="font-semibold text-slate-600">{Math.round(s.val * 100)}%</span>
                          </span>
                        ))}
                      </div>

                      {m.matched_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.matched_skills.slice(0, 5).map(s => (
                            <span key={s} className="badge bg-emerald-50 text-emerald-700 text-xs">{s}</span>
                          ))}
                          {m.missing_skills?.length > 0 && m.missing_skills.slice(0, 2).map(s => (
                            <span key={s} className="badge bg-red-50 text-red-600 text-xs line-through">{s}</span>
                          ))}
                        </div>
                      )}

                      {m.ai_explanation && (
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{m.ai_explanation}</p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                        {m.location_city && <span className="flex items-center gap-1"><MapPin size={10} /> {m.location_city}</span>}
                        {m.expected_rate_min && <span className="flex items-center gap-1"><DollarSign size={10} /> ${m.expected_rate_min}–${m.expected_rate_max}/hr</span>}
                        {m.years_of_experience && <span className="flex items-center gap-1"><Star size={10} /> {m.years_of_experience}yrs</span>}
                      </div>
                    </div>

                    {m.is_reviewed && (
                      <Link to={`/candidates/${m.candidate_id}`} className="text-slate-300 hover:text-brand-500 transition-colors mt-1 shrink-0">
                        <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <EditJobModal
          job={job}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            qc.setQueryData(['job', id], updated);
            qc.invalidateQueries({ queryKey: ['jobs'] });
          }}
        />
      )}
    </div>
  );
}

function parseJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
