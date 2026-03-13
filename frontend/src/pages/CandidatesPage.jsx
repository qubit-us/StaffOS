import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';
import { Link } from 'react-router-dom';
import { Users, Search, MapPin, DollarSign, Loader2, Upload, Star } from 'lucide-react';
import { clsx } from 'clsx';

const visaColors = {
  citizen:    'bg-emerald-100 text-emerald-700',
  green_card: 'bg-teal-100 text-teal-700',
  h1b:        'bg-blue-100 text-blue-700',
  opt:        'bg-purple-100 text-purple-700',
  stem_opt:   'bg-violet-100 text-violet-700',
  unknown:    'bg-slate-100 text-slate-600',
};

const sourceColors = {
  direct:    'bg-brand-50 text-brand-700',
  vendor:    'bg-amber-50 text-amber-700',
  recruiter: 'bg-indigo-50 text-indigo-700',
  linkedin:  'bg-blue-50 text-blue-700',
};

function CandidateCard({ candidate }) {
  const initials = `${candidate.first_name?.[0] || '?'}${candidate.last_name?.[0] || ''}`;
  const colors = ['from-brand-400 to-brand-600','from-violet-400 to-purple-600','from-indigo-400 to-blue-600','from-teal-400 to-emerald-600'];
  const colorIdx = (candidate.id?.charCodeAt(0) || 0) % colors.length;

  return (
    <div className="card-hover p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${colors[colorIdx]} rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900">{candidate.first_name} {candidate.last_name}</h3>
          <p className="text-sm text-slate-500 truncate mt-0.5">{candidate.title || 'No title'}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={clsx('badge text-xs', visaColors[candidate.visa_status] || 'bg-slate-100 text-slate-600')}>
              {(candidate.visa_status || 'unknown').replace('_', ' ')}
            </span>
            <span className={clsx('badge text-xs', sourceColors[candidate.upload_source] || 'bg-slate-100 text-slate-600')}>
              {candidate.upload_source}
            </span>
          </div>
        </div>
        {candidate.profile_completeness > 0 && (
          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-brand-600">{candidate.profile_completeness}%</div>
            <div className="text-xs text-slate-400">complete</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {candidate.skills?.slice(0, 5).map(s => (
          <span key={s} className="badge bg-surface-100 text-slate-600">{s}</span>
        ))}
        {candidate.skills?.length > 5 && (
          <span className="badge bg-slate-100 text-slate-400">+{candidate.skills.length - 5}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {candidate.years_of_experience && (
          <span className="flex items-center gap-1"><Star size={11} /> {candidate.years_of_experience}yrs exp</span>
        )}
        {candidate.location_city && (
          <span className="flex items-center gap-1"><MapPin size={11} /> {candidate.location_city}, {candidate.location_state}</span>
        )}
        {candidate.expected_rate_min && (
          <span className="flex items-center gap-1"><DollarSign size={11} /> ${candidate.expected_rate_min}–${candidate.expected_rate_max}/hr</span>
        )}
      </div>

      {candidate.vendor_name && (
        <div className="mt-3 pt-3 border-t border-surface-100 text-xs text-slate-400">
          Via vendor: <span className="font-semibold text-slate-600">{candidate.vendor_name}</span>
        </div>
      )}
    </div>
  );
}

export default function CandidatesPage() {
  const [search, setSearch] = useState('');
  const [visaFilter, setVisaFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, visaFilter],
    queryFn: () => api.get(`/api/candidates?search=${search}&visa_status=${visaFilter}&limit=50`).then(r => r.data),
  });

  const candidates = data?.candidates || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Candidates</h2>
          <p className="text-slate-500 mt-0.5">{total} candidate{total !== 1 ? 's' : ''} in pool</p>
        </div>
        <Link to="/upload" className="btn-primary"><Upload size={16} /> Upload Resume</Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input className="input pl-9" placeholder="Search candidates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={visaFilter} onChange={e => setVisaFilter(e.target.value)}>
          <option value="">All Visa Types</option>
          {['citizen','green_card','h1b','h4_ead','opt','stem_opt','l1','tn'].map(v => (
            <option key={v} value={v}>{v.replace('_', ' ').toUpperCase()}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-500" size={28} /></div>
      ) : candidates.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">No candidates yet</p>
          <p className="text-slate-400 text-sm mt-1">Upload resumes to build your talent pool</p>
          <Link to="/upload" className="btn-primary mt-5 inline-flex mx-auto">
            <Upload size={16} /> Upload First Resume
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {candidates.map(c => <CandidateCard key={c.id} candidate={c} />)}
        </div>
      )}
    </div>
  );
}
