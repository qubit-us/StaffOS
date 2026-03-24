import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, MapPin, Briefcase, Clock, ChevronRight, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function fetchPublicJobs(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  return axios.get(`${API}/api/public/jobs?${q}`).then(r => r.data);
}

export default function PublicJobsPage() {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['public-jobs', { search, location, jobType, page }],
    queryFn: () => fetchPublicJobs({ search, location, job_type: jobType, page }),
  });

  const jobs = data?.jobs || [];
  const total = data?.total || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50/30">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-slate-900">StaffOS Jobs</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/board/register" className="btn-secondary text-sm">Register</Link>
            <Link to="/login" className="btn-primary text-sm">Sign In</Link>
          </div>
        </div>
      </header>

      {/* Hero search */}
      <div className="bg-brand-600 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Find Your Next Opportunity</h1>
          <p className="text-brand-200 mb-8">Browse open positions from top companies</p>
          <div className="bg-white rounded-2xl p-2 flex gap-2 shadow-lg">
            <div className="flex items-center gap-2 flex-1 px-3">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search jobs, skills..."
                className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2 px-3 border-l border-slate-200">
              <MapPin size={16} className="text-slate-400 shrink-0" />
              <input
                placeholder="Location"
                className="w-32 text-sm outline-none text-slate-700 placeholder:text-slate-400"
                value={location}
                onChange={e => { setLocation(e.target.value); setPage(1); }}
              />
            </div>
            <button className="btn-primary text-sm rounded-xl">Search</button>
          </div>
        </div>
      </div>

      {/* Filters + Results */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-600 text-sm">{total} job{total !== 1 ? 's' : ''} found</p>
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-600 outline-none focus:ring-2 focus:ring-brand-500/20"
            value={jobType}
            onChange={e => { setJobType(e.target.value); setPage(1); }}
          >
            <option value="">All types</option>
            <option value="contract">Contract</option>
            <option value="fulltime">Full-time</option>
            <option value="parttime">Part-time</option>
            <option value="contract_to_hire">Contract to Hire</option>
          </select>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-brand-500" size={28} />
          </div>
        )}

        {!isLoading && jobs.length === 0 && (
          <div className="text-center py-16">
            <Briefcase size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">No jobs found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search filters</p>
          </div>
        )}

        <div className="space-y-3">
          {jobs.map(job => (
            <Link
              key={job.id}
              to={`/board/${job.id}`}
              className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-brand-200 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{job.title}</h3>
                    {job.remote_allowed && (
                      <span className="badge bg-emerald-50 text-emerald-700">Remote OK</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{job.agency_name}</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{job.description}</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {(job.location_city || job.location_state) && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} /> {[job.location_city, job.location_state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {job.job_type && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Briefcase size={12} /> {job.job_type.replace('_', ' ')}
                      </span>
                    )}
                    {job.experience_min && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} /> {job.experience_min}+ yrs exp
                      </span>
                    )}
                  </div>
                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.required_skills.slice(0, 5).map(s => (
                        <span key={s} className="badge bg-slate-100 text-slate-600">{s}</span>
                      ))}
                      {job.required_skills.length > 5 && (
                        <span className="badge bg-slate-100 text-slate-500">+{job.required_skills.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-500 shrink-0 mt-1 transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-slate-500">Page {page} of {Math.ceil(total / 20)}</span>
            <button
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
