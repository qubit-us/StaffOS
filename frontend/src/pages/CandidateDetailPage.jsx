import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import {
  ArrowLeft, MapPin, DollarSign, Star, Mail, Phone, Linkedin,
  Briefcase, GraduationCap, Award, Globe, Calendar, RefreshCw,
  CheckCircle, AlertCircle, Loader2, Building2, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

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
                      onClick={() => enrichMutation.mutate()}
                      disabled={enrichMutation.isPending}
                      className="btn-secondary text-sm flex items-center gap-1.5"
                      title="Pull latest data from LinkedIn"
                    >
                      {enrichMutation.isPending
                        ? <Loader2 size={14} className="animate-spin" />
                        : <RefreshCw size={14} />}
                      Enrich
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
