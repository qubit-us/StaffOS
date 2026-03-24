import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Search, MapPin, Briefcase, Clock, Loader2, Zap,
  Globe, Users, ChevronRight, SlidersHorizontal, X,
  LogIn, UserPlus, CheckCircle,
} from 'lucide-react';
import BoardAuthModal from './BoardAuthModal.jsx';

const API = import.meta.env.VITE_API_URL || '';

function fetchPublicJobs(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  return axios.get(`${API}/api/public/jobs?${q}`).then(r => r.data);
}

const JOB_TYPE_LABELS = {
  contract: 'Contract',
  fulltime: 'Full-time',
  parttime: 'Part-time',
  contract_to_hire: 'Contract to Hire',
};

const JOB_TYPE_COLORS = {
  contract: 'bg-violet-50 text-violet-700',
  fulltime: 'bg-emerald-50 text-emerald-700',
  parttime: 'bg-sky-50 text-sky-700',
  contract_to_hire: 'bg-amber-50 text-amber-700',
};

export default function PublicJobsPage() {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showAuth, setShowAuth] = useState(false);
  const [applyJobId, setApplyJobId] = useState(null);
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('public_session') || 'null'); } catch { return null; }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['public-jobs', { search, location, jobType, remoteOnly, page }],
    queryFn: () => fetchPublicJobs({
      search, location, job_type: jobType,
      remote: remoteOnly ? 'true' : '',
      page,
    }),
  });

  const jobs = data?.jobs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const openApply = (jobId) => {
    if (!session) {
      setApplyJobId(jobId);
      setShowAuth(true);
    } else {
      window.location.href = `/board/${jobId}`;
    }
  };

  const handleSessionReady = (sess) => {
    setSession(sess);
    if (applyJobId) window.location.href = `/board/${applyJobId}`;
  };

  const clearFilters = () => {
    setSearch(''); setLocation(''); setJobType(''); setRemoteOnly(false); setPage(1);
  };
  const hasFilters = search || location || jobType || remoteOnly;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link to="/board" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base">StaffOS</span>
              <span className="hidden sm:inline text-slate-400 text-xs ml-1.5 font-medium">Job Board</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {session ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <CheckCircle size={14} /> Signed in
                </span>
                <button
                  onClick={() => { localStorage.removeItem('public_session'); setSession(null); }}
                  className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setApplyJobId(null); setShowAuth(true); }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-brand-600 px-3 py-2 rounded-xl hover:bg-brand-50 transition-colors"
                >
                  <LogIn size={15} /> Sign In
                </button>
                <Link
                  to="/board/register"
                  className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
                >
                  <UserPlus size={15} /> Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 pt-14 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 border border-brand-500/30">
            <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
            {total > 0 ? `${total} open position${total !== 1 ? 's' : ''} available` : 'Browse open positions'}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
            Find Your Next<br />
            <span className="text-brand-400">Career Move</span>
          </h1>
          <p className="text-slate-400 text-base mb-10 max-w-xl mx-auto">
            Browse contract, full-time, and hybrid roles from leading staffing agencies. Apply in minutes.
          </p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 flex-1 px-4 py-2">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                placeholder="Job title, skills, or keywords..."
                className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 sm:border-l border-t sm:border-t-0 border-slate-100">
              <MapPin size={16} className="text-slate-400 shrink-0" />
              <input
                placeholder="City or state..."
                className="w-full sm:w-32 text-sm outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
                value={location}
                onChange={e => { setLocation(e.target.value); setPage(1); }}
              />
            </div>
            <button
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Search size={15} /> Search
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-8 overflow-x-auto">
          {[
            { icon: Briefcase, label: 'Open Roles', value: total || '—' },
            { icon: Globe, label: 'Remote Friendly', value: jobs.filter(j => j.remote_allowed).length || '—' },
            { icon: Users, label: 'Contract Roles', value: jobs.filter(j => j.job_type === 'contract').length || '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                <Icon size={15} className="text-brand-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 leading-none">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <SlidersHorizontal size={15} />
            <span className="font-medium">Filter:</span>
          </div>
          <select
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
            value={jobType}
            onChange={e => { setJobType(e.target.value); setPage(1); }}
          >
            <option value="">All types</option>
            {Object.entries(JOB_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button
            onClick={() => { setRemoteOnly(r => !r); setPage(1); }}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border transition-colors ${
              remoteOnly
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Globe size={14} /> Remote only
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X size={14} /> Clear filters
            </button>
          )}
          <span className="ml-auto text-sm text-slate-500 font-medium">
            {total} result{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-brand-500" size={28} />
            <p className="text-sm text-slate-400">Loading jobs...</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && jobs.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase size={28} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-lg mb-1">No jobs found</p>
            <p className="text-sm text-slate-400 mb-5">Try adjusting your search or clearing filters</p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-sm text-brand-600 hover:underline font-medium">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Job list */}
        <div className="space-y-3">
          {jobs.map(job => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-brand-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Agency logo / avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center shrink-0 text-brand-700 font-bold text-lg">
                  {job.agency_name?.charAt(0) || 'S'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Link
                          to={`/board/${job.id}`}
                          className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors text-base hover:underline"
                        >
                          {job.title}
                        </Link>
                        {job.job_type && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${JOB_TYPE_COLORS[job.job_type] || 'bg-slate-100 text-slate-600'}`}>
                            {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                          </span>
                        )}
                        {job.remote_allowed && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            Remote OK
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mb-2 font-medium">{job.agency_name}</p>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{job.description}</p>
                    </div>

                    {/* Apply button — desktop */}
                    <button
                      onClick={() => openApply(job.id)}
                      className="hidden sm:flex items-center gap-1.5 shrink-0 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                      Apply <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                    {(job.location_city || job.location_state) && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} className="text-slate-400" />
                        {[job.location_city, job.location_state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {job.experience_min && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} className="text-slate-400" />
                        {job.experience_min}+ yrs
                      </span>
                    )}
                    {job.deadline && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        Apply by {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Skills */}
                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.required_skills.slice(0, 6).map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                          {s}
                        </span>
                      ))}
                      {job.required_skills.length > 6 && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md">
                          +{job.required_skills.length - 6} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Apply button — mobile */}
                  <button
                    onClick={() => openApply(job.id)}
                    className="sm:hidden mt-4 w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-medium transition-colors"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 text-sm rounded-xl font-medium transition-colors ${
                      p === page
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-medium transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">StaffOS Job Board</span>
          </div>
          <p className="text-xs text-slate-400">
            Powered by StaffOS · AI-Powered Recruiting Platform
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link to="/login" className="hover:text-brand-600 transition-colors">Recruiter Login</Link>
            <Link to="/board/register" className="hover:text-brand-600 transition-colors">Create Profile</Link>
          </div>
        </div>
      </footer>

      {showAuth && (
        <BoardAuthModal
          applyJobId={applyJobId}
          onClose={() => setShowAuth(false)}
          onSessionReady={handleSessionReady}
        />
      )}
    </div>
  );
}
