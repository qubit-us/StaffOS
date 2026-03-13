import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';
import { Sparkles, Loader2, MapPin, DollarSign, ChevronDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

function ScoreRing({ score }) {
  const pct = Math.round(score * 100);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b';

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="text-sm font-bold text-slate-800">{pct}%</span>
    </div>
  );
}

function MatchCard({ match }) {
  const [expanded, setExpanded] = useState(false);
  const scores = [
    { label: 'Skills',    value: match.skills_score },
    { label: 'Exp',       value: match.experience_score },
    { label: 'Location',  value: match.location_score },
    { label: 'Visa',      value: match.visa_score },
    { label: 'Rate',      value: match.rate_score },
    { label: 'Industry',  value: match.industry_score },
  ].filter(s => s.value != null);

  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ScoreRing score={match.overall_score} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900">{match.first_name} {match.last_name}</h3>
            <p className="text-sm text-slate-500 truncate">{match.candidate_title}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {match.matched_skills?.slice(0, 4).map(s => (
                <span key={s} className="badge bg-emerald-50 text-emerald-700">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
          {match.years_of_experience && <span><TrendingUp size={11} className="inline mr-1" />{match.years_of_experience}yrs</span>}
          {match.location_city && <span><MapPin size={11} className="inline mr-1" />{match.location_city}, {match.location_state}</span>}
          {match.expected_rate_min && <span><DollarSign size={11} className="inline mr-1" />${match.expected_rate_min}–${match.expected_rate_max}/hr</span>}
        </div>

        {match.ai_explanation && (
          <p className="text-xs text-slate-500 mt-3 italic border-l-2 border-brand-200 pl-3 leading-relaxed">{match.ai_explanation}</p>
        )}

        {match.missing_skills?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-400">Missing:</span>
            {match.missing_skills.slice(0, 3).map(s => (
              <span key={s} className="badge bg-red-50 text-red-600">{s}</span>
            ))}
          </div>
        )}
      </div>

      {scores.length > 0 && (
        <div className="border-t border-surface-100">
          <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-slate-500 hover:bg-surface-50 transition-colors">
            <span className="font-semibold">Score breakdown</span>
            <ChevronDown size={14} className={clsx('transition-transform', expanded && 'rotate-180')} />
          </button>
          {expanded && (
            <div className="px-5 pb-4 grid grid-cols-3 gap-2">
              {scores.map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-xs text-slate-400 mb-1">{label}</div>
                  <div className="text-sm font-bold text-slate-700">{Math.round((value || 0) * 100)}%</div>
                  <div className="h-1.5 bg-surface-100 rounded-full mt-1">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(value || 0) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchesPage() {
  const [selectedJobId, setSelectedJobId] = useState('');

  const { data: jobsData } = useQuery({
    queryKey: ['jobs-list'],
    queryFn: () => api.get('/api/jobs?status=open&limit=50').then(r => r.data),
  });

  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches', selectedJobId],
    queryFn: () => api.get(`/api/jobs/${selectedJobId}/matches?limit=30`).then(r => r.data),
    enabled: !!selectedJobId,
  });

  const jobs = jobsData?.jobs || [];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI Matches</h2>
          <p className="text-slate-500 mt-0.5">Semantic matching results powered by Claude</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-600 font-semibold bg-brand-50 px-3 py-2 rounded-xl">
          <Sparkles size={14} /> Powered by Claude AI
        </div>
      </div>

      {/* Job selector */}
      <div className="card p-5">
        <label className="label">Select a Job to View Matches</label>
        <select className="input max-w-md" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>
          <option value="">-- Choose a job --</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>{j.title} ({j.match_count} matches)</option>
          ))}
        </select>
      </div>

      {!selectedJobId && (
        <div className="card p-12 text-center">
          <Sparkles size={40} className="text-brand-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">Select a job above to see AI-powered matches</p>
          <p className="text-slate-400 text-sm mt-1">The engine scores candidates by skills, experience, visa, location, and more</p>
        </div>
      )}

      {selectedJobId && isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-500" size={28} /></div>
      )}

      {selectedJobId && !isLoading && matches?.length === 0 && (
        <div className="card p-12 text-center">
          <Sparkles size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">No matches yet</p>
          <p className="text-slate-400 text-sm mt-1">Run matching from the Jobs page to generate results</p>
        </div>
      )}

      {matches && matches.length > 0 && (
        <>
          <p className="text-sm text-slate-500 font-medium">{matches.length} candidate{matches.length !== 1 ? 's' : ''} matched</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {matches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        </>
      )}
    </div>
  );
}
