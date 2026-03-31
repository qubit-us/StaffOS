import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import {
  ArrowLeft, MapPin, DollarSign, Star, Mail, Phone, Linkedin,
  Briefcase, GraduationCap, Award, Globe, Calendar, RefreshCw,
  CheckCircle, AlertCircle, Loader2, Building2, ChevronRight, Edit2, X, Save,
} from 'lucide-react';
import { clsx } from 'clsx';

const VISA_OPTIONS = [
  { value: 'citizen', label: 'USC' }, { value: 'green_card', label: 'GC' },
  { value: 'h1b', label: 'H1B' }, { value: 'h4_ead', label: 'H4 EAD' },
  { value: 'opt', label: 'OPT' }, { value: 'stem_opt', label: 'STEM OPT' },
  { value: 'l1', label: 'L2 EAD' }, { value: 'tn', label: 'TN' },
  { value: 'other', label: 'Other' }, { value: 'unknown', label: 'Unknown' },
];

function EditCandidateModal({ candidate, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name:           candidate.first_name || '',
    last_name:            candidate.last_name || '',
    email:                candidate.email || '',
    phone:                candidate.phone || '',
    linkedin_url:         candidate.linkedin_url || '',
    title:                candidate.title || '',
    summary:              candidate.summary || '',
    skills:               (candidate.skills || []).join(', '),
    years_of_experience:  candidate.years_of_experience || '',
    location_city:        candidate.location_city || '',
    location_state:       candidate.location_state || '',
    visa_status:          candidate.visa_status || 'unknown',
    relocation_preference: candidate.relocation_preference || 'open',
    remote_preference:    candidate.remote_preference || '',
    expected_rate_min:    candidate.expected_rate_min || '',
    expected_rate_max:    candidate.expected_rate_max || '',
    availability_date:    candidate.availability_date ? candidate.availability_date.split('T')[0] : '',
    industry_experience:  (candidate.industry_experience || []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch(`/api/candidates/${candidate.id}`, {
        ...form,
        skills:              form.skills.split(',').map(s => s.trim()).filter(Boolean),
        industry_experience: form.industry_experience.split(',').map(s => s.trim()).filter(Boolean),
        years_of_experience: form.years_of_experience ? parseFloat(form.years_of_experience) : null,
        expected_rate_min:   form.expected_rate_min ? parseFloat(form.expected_rate_min) : null,
        expected_rate_max:   form.expected_rate_max ? parseFloat(form.expected_rate_max) : null,
        availability_date:   form.availability_date || null,
      });
      onSaved(data);
      onClose();
    } catch (err) {
      import('react-hot-toast').then(({ default: toast }) =>
        toast.error(err.response?.data?.error || 'Failed to update candidate')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">Edit Candidate Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-slate-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name</label><input className="input" value={form.first_name} onChange={set('first_name')} /></div>
            <div><label className="label">Last Name</label><input className="input" value={form.last_name} onChange={set('last_name')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
          </div>
          <div><label className="label">LinkedIn URL</label><input className="input" value={form.linkedin_url} onChange={set('linkedin_url')} /></div>
          <div><label className="label">Current Title</label><input className="input" value={form.title} onChange={set('title')} /></div>
          <div><label className="label">Professional Summary</label><textarea className="input min-h-[80px] resize-none" value={form.summary} onChange={set('summary')} /></div>
          <div><label className="label">Skills (comma-separated)</label><input className="input" value={form.skills} onChange={set('skills')} /></div>
          <div><label className="label">Industries (comma-separated)</label><input className="input" value={form.industry_experience} onChange={set('industry_experience')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Years of Experience</label><input className="input" type="number" step="0.5" value={form.years_of_experience} onChange={set('years_of_experience')} /></div>
            <div>
              <label className="label">Visa / Work Auth</label>
              <select className="input" value={form.visa_status} onChange={set('visa_status')}>
                {VISA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" value={form.location_city} onChange={set('location_city')} /></div>
            <div><label className="label">State</label><input className="input" value={form.location_state} onChange={set('location_state')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Minimum Rate ($/hr)</label>
              <p className="text-xs text-slate-400 mb-1">Won't accept below this</p>
              <input className="input" type="number" value={form.expected_rate_min} onChange={set('expected_rate_min')} />
            </div>
            <div>
              <label className="label">Target Rate ($/hr)</label>
              <p className="text-xs text-slate-400 mb-1">Ideal ask / negotiation ceiling</p>
              <input className="input" type="number" value={form.expected_rate_max} onChange={set('expected_rate_max')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Relocation</label>
              <select className="input" value={form.relocation_preference} onChange={set('relocation_preference')}>
                <option value="willing">Willing to Relocate</option>
                <option value="not_willing">Not Willing</option>
                <option value="open">Open</option>
              </select>
            </div>
            <div>
              <label className="label">Remote Preference</label>
              <select className="input" value={form.remote_preference} onChange={set('remote_preference')}>
                <option value="">No Preference</option>
                <option value="remote_only">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
          </div>
          <div><label className="label">Availability Date</label><input className="input" type="date" value={form.availability_date} onChange={set('availability_date')} /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const visaColors = {
  citizen:    'bg-emerald-100 text-emerald-700',
  green_card: 'bg-teal-100 text-teal-700',
  h1b:        'bg-blue-100 text-blue-700',
  h4_ead:     'bg-cyan-100 text-cyan-700',
  opt:        'bg-purple-100 text-purple-700',
  stem_opt:   'bg-violet-100 text-violet-700',
  l1:         'bg-orange-100 text-orange-700',
  tn:         'bg-yellow-100 text-yellow-700',
  unknown:    'bg-slate-100 text-slate-600',
};

const stageLabels = {
  submitted:      'Submitted',
  client_review:  'Client Review',
  shortlisted:    'Shortlisted',
  interview_r1:   'Interview R1',
  interview_r2:   'Interview R2',
  offer:          'Offer',
  placed:         'Placed',
  rejected:       'Rejected',
  withdrawn:      'Withdrawn',
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

function ScoreRing({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
  const r = 20, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="-rotate-90" width="56" height="56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
        <Icon size={16} className="text-brand-500" /> {title}
      </h3>
      {children}
    </div>
  );
}

export default function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [enrichMsg, setEnrichMsg] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showPasteLinkedIn, setShowPasteLinkedIn] = useState(false);
  const [linkedInText, setLinkedInText] = useState('');
  const { user } = useAuthStore();

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => api.get(`/api/candidates/${id}`).then(r => r.data),
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['candidate-matches', id],
    queryFn: () => api.get(`/api/candidates/${id}/jobs`).then(r => r.data),
    enabled: !!candidate,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['candidate-submissions', id],
    queryFn: () => api.get(`/api/candidates/${id}/submissions`).then(r => r.data),
    enabled: !!candidate,
  });

  const enrichMutation = useMutation({
    mutationFn: () => api.post(`/api/candidates/${id}/enrich-linkedin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      setEnrichMsg({ type: 'success', text: 'Profile enriched from LinkedIn' });
      setTimeout(() => setEnrichMsg(null), 4000);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || '';
      if (msg.includes('PROXYCURL_API_KEY')) {
        setShowPasteLinkedIn(true);
      } else {
        setEnrichMsg({ type: 'error', text: msg || 'Enrichment failed' });
        setTimeout(() => setEnrichMsg(null), 5000);
      }
    },
  });

  const pasteEnrichMutation = useMutation({
    mutationFn: () => api.post(`/api/candidates/${id}/enrich-from-text`, { text: linkedInText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      setShowPasteLinkedIn(false);
      setLinkedInText('');
      setEnrichMsg({ type: 'success', text: 'Profile enriched from LinkedIn text' });
      setTimeout(() => setEnrichMsg(null), 4000);
    },
    onError: (err) => {
      setEnrichMsg({ type: 'error', text: err.response?.data?.error || 'Enrichment failed' });
      setTimeout(() => setEnrichMsg(null), 5000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">Candidate not found.</p>
        <button onClick={() => navigate('/candidates')} className="btn-secondary mt-4">Back to Candidates</button>
      </div>
    );
  }

  const initials = `${candidate.first_name?.[0] || '?'}${candidate.last_name?.[0] || ''}`;
  const colors = ['from-brand-400 to-brand-600', 'from-violet-400 to-purple-600', 'from-indigo-400 to-blue-600', 'from-teal-400 to-emerald-600'];
  const colorIdx = (candidate.id?.charCodeAt(0) || 0) % colors.length;

  const companies = parseJson(candidate.companies_worked);
  const education = parseJson(candidate.education);
  const certifications = parseJson(candidate.certifications);
  const languages = parseJson(candidate.languages);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Back */}
      <button onClick={() => navigate('/candidates')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} /> Back to Candidates
      </button>

      {/* Profile Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className={`w-16 h-16 bg-gradient-to-br ${colors[colorIdx]} rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {candidate.first_name} {candidate.last_name}
                </h1>
                <p className="text-slate-500 mt-0.5">{candidate.title || 'No title'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={clsx('badge', visaColors[candidate.visa_status] || 'bg-slate-100 text-slate-600')}>
                    {(candidate.visa_status || 'unknown').replace(/_/g, ' ')}
                  </span>
                  <span className="badge bg-slate-100 text-slate-600">{candidate.upload_source}</span>
                  {candidate.vendor_name && (
                    <span className="badge bg-amber-50 text-amber-700">Via {candidate.vendor_name}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {(candidate.submitted_by_user_id === user?.id || ['admin','agency_admin','super_admin'].includes(user?.role)) && (
                  <button onClick={() => setShowEdit(true)} className="btn-secondary text-sm flex items-center gap-1.5">
                    <Edit2 size={14} /> Edit Profile
                  </button>
                )}
                {candidate.profile_completeness > 0 && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-600">{candidate.profile_completeness}%</div>
                    <div className="text-xs text-slate-400">profile complete</div>
                  </div>
                )}
                {candidate.linkedin_url && (
                  <div className="flex items-center gap-2">
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-sm flex items-center gap-1.5"
                    >
                      <Linkedin size={14} /> LinkedIn
                    </a>
                    <button
                      disabled
                      className="btn-secondary text-sm flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                      title="LinkedIn enrichment is coming soon"
                    >
                      <RefreshCw size={14} />
                      Enrich
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Soon</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {enrichMsg && (
              <div className={clsx(
                'mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-lg',
                enrichMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              )}>
                {enrichMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {enrichMsg.text}
              </div>
            )}

            {/* Quick info bar */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
              {candidate.email && (
                <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 hover:text-slate-800">
                  <Mail size={13} /> {candidate.email}
                </a>
              )}
              {candidate.phone && (
                <a href={`tel:${candidate.phone}`} className="flex items-center gap-1.5 hover:text-slate-800">
                  <Phone size={13} /> {candidate.phone}
                </a>
              )}
              {candidate.location_city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> {candidate.location_city}{candidate.location_state ? `, ${candidate.location_state}` : ''}
                </span>
              )}
              {candidate.years_of_experience && (
                <span className="flex items-center gap-1.5">
                  <Star size={13} /> {candidate.years_of_experience} yrs experience
                </span>
              )}
              {candidate.expected_rate_min && (
                <span className="flex items-center gap-1.5">
                  <DollarSign size={13} /> ${candidate.expected_rate_min}–${candidate.expected_rate_max}/hr
                </span>
              )}
              {candidate.availability_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} /> Available {formatDate(candidate.availability_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Skills */}
          {candidate.skills?.length > 0 && (
            <Section title="Skills" icon={Star}>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map(s => (
                  <span key={s} className="badge bg-brand-50 text-brand-700">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Industries */}
          {candidate.industry_experience?.length > 0 && (
            <Section title="Industries" icon={Building2}>
              <div className="flex flex-wrap gap-1.5">
                {candidate.industry_experience.map(i => (
                  <span key={i} className="badge bg-surface-100 text-slate-600">{i}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Languages */}
          {languages?.length > 0 && (
            <Section title="Languages" icon={Globe}>
              <div className="space-y-1">
                {languages.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{typeof l === 'string' ? l : l.name}</span>
                    {l.proficiency && <span className="text-slate-400 text-xs">{l.proficiency}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Certifications */}
          {certifications?.length > 0 && (
            <Section title="Certifications" icon={Award}>
              <ul className="space-y-1">
                {certifications.map((c, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                    {typeof c === 'string' ? c : c.name}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Summary */}
          {(candidate.ai_summary || candidate.summary) && (
            <Section title="Summary" icon={Star}>
              <p className="text-sm text-slate-600 leading-relaxed">
                {candidate.ai_summary || candidate.summary}
              </p>
            </Section>
          )}

          {/* Work Experience */}
          {companies?.length > 0 && (
            <Section title="Work Experience" icon={Briefcase}>
              <div className="space-y-4">
                {companies.map((c, i) => (
                  <div key={i} className={clsx('pl-4 border-l-2 border-surface-200', i > 0 && 'pt-4')}>
                    <div className="font-semibold text-slate-800">{c.title}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                      <Building2 size={12} /> {c.company}
                      {c.start && <span className="text-slate-300">·</span>}
                      {c.start && <span>{c.start} – {c.end || 'Present'}</span>}
                      {c.location && <><span className="text-slate-300">·</span><span>{c.location}</span></>}
                    </div>
                    {c.description && (
                      <p className="text-sm text-slate-500 mt-1.5 line-clamp-3">{c.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Education */}
          {education?.length > 0 && (
            <Section title="Education" icon={GraduationCap}>
              <div className="space-y-3">
                {education.map((e, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                      <GraduationCap size={14} className="text-brand-500" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{e.school}</div>
                      <div className="text-sm text-slate-500">
                        {[e.degree, e.field].filter(Boolean).join(' · ')}
                        {e.end && ` · ${e.end}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* AI Matches */}
          {matches.length > 0 && (
            <Section title="AI Job Matches" icon={Star}>
              <div className="space-y-2">
                {matches.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 hover:bg-surface-100 transition-colors">
                    <ScoreRing score={m.overall_score} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{m.title}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        {m.location_city && <><MapPin size={10} /> {m.location_city}</>}
                        {m.pay_rate_min && <><DollarSign size={10} /> ${m.pay_rate_min}–${m.pay_rate_max}/hr</>}
                      </div>
                    </div>
                    <Link to={`/jobs`} className="text-slate-300 hover:text-brand-500 transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Pipeline Submissions */}
          {submissions.length > 0 && (
            <Section title="Pipeline History" icon={Briefcase}>
              <div className="space-y-2">
                {submissions.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{s.job_title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{formatDate(s.created_at)}</div>
                    </div>
                    <span className={clsx('badge', stageColors[s.stage] || 'bg-slate-100 text-slate-600')}>
                      {stageLabels[s.stage] || s.stage}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {showPasteLinkedIn && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Enrich from LinkedIn</h2>
              <button onClick={() => { setShowPasteLinkedIn(false); setLinkedInText(''); }} className="p-1.5 rounded-lg hover:bg-surface-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Go to the candidate's LinkedIn profile, select all text (Ctrl+A), copy it, and paste below. Claude will extract and update the profile.</p>
              <textarea
                className="input min-h-[160px] resize-none text-sm"
                placeholder="Paste LinkedIn profile text here..."
                value={linkedInText}
                onChange={e => setLinkedInText(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowPasteLinkedIn(false); setLinkedInText(''); }} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => pasteEnrichMutation.mutate()}
                  disabled={pasteEnrichMutation.isPending || !linkedInText.trim()}
                  className="btn-primary flex-1"
                >
                  {pasteEnrichMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  {pasteEnrichMutation.isPending ? 'Enriching...' : 'Enrich Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditCandidateModal
          candidate={candidate}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            queryClient.setQueryData(['candidate', id], updated);
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
          }}
        />
      )}
    </div>
  );
}

function parseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
