import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MapPin, Briefcase, Clock, Users, Calendar, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || '';

export default function PublicJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  // Check if user has a candidate session (stored after registration)
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('public_session') || 'null'); } catch { return null; }
  })();

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['public-job', id],
    queryFn: () => axios.get(`${API}/api/public/jobs/${id}`).then(r => r.data),
  });

  const handleApply = async () => {
    if (!session?.candidate_id) {
      navigate(`/board/register?apply=${id}`);
      return;
    }
    setApplying(true);
    try {
      await axios.post(`${API}/api/public/apply`, {
        job_id: id,
        candidate_id: session.candidate_id,
      });
      setApplied(true);
      toast.success('Application submitted!');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to apply';
      if (msg.includes('already applied')) {
        setApplied(true);
        toast('You have already applied to this job');
      } else {
        toast.error(msg);
      }
    } finally {
      setApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="font-semibold text-slate-700">Job not found or no longer available</p>
          <Link to="/jobs" className="text-brand-600 text-sm mt-2 block hover:underline">Back to jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/board" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm">
            <ArrowLeft size={16} /> All Jobs
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/board/register" className="btn-secondary text-sm">Register</Link>
            <Link to="/login" className="btn-primary text-sm">Sign In</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{job.title}</h1>
              <p className="text-slate-500 mb-4">{job.agency_name}</p>

              <div className="flex flex-wrap gap-4 mb-4 text-sm text-slate-500">
                {(job.location_city || job.location_state) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} /> {[job.location_city, job.location_state, job.location_country].filter(Boolean).join(', ')}
                  </span>
                )}
                {job.job_type && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={14} /> {job.job_type.replace(/_/g, ' ')}
                  </span>
                )}
                {(job.experience_min || job.experience_max) && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {job.experience_min && job.experience_max
                      ? `${job.experience_min}–${job.experience_max} yrs`
                      : `${job.experience_min || job.experience_max}+ yrs`}
                  </span>
                )}
                {job.positions_count > 1 && (
                  <span className="flex items-center gap-1.5">
                    <Users size={14} /> {job.positions_count} openings
                  </span>
                )}
                {job.start_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} /> Starts {new Date(job.start_date).toLocaleDateString()}
                  </span>
                )}
                {job.remote_allowed && (
                  <span className="badge bg-emerald-50 text-emerald-700">Remote OK</span>
                )}
              </div>

              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">{job.description}</div>
            </div>

            {job.required_skills?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map(s => (
                    <span key={s} className="badge bg-brand-50 text-brand-700">{s}</span>
                  ))}
                </div>
                {job.nice_to_have_skills?.length > 0 && (
                  <>
                    <h3 className="font-bold text-slate-800 mt-4 mb-3">Nice to Have</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.nice_to_have_skills.map(s => (
                        <span key={s} className="badge bg-slate-100 text-slate-600">{s}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {job.visa_requirements?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-3">Visa / Work Authorization</h3>
                <div className="flex flex-wrap gap-2">
                  {job.visa_requirements.map(v => (
                    <span key={v} className="badge bg-amber-50 text-amber-700">{v}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-6">
              {applied ? (
                <div className="text-center py-2">
                  <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-800">Application Submitted</p>
                  <p className="text-xs text-slate-500 mt-1">The agency will review your profile and be in touch.</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="btn-primary w-full mb-3"
                  >
                    {applying ? 'Submitting...' : session?.candidate_id ? 'Apply Now' : 'Register & Apply'}
                  </button>
                  {!session?.candidate_id && (
                    <p className="text-xs text-center text-slate-500">
                      Already registered? <Link to="/login" className="text-brand-600 hover:underline">Sign in to apply</Link>
                    </p>
                  )}
                </>
              )}

              {job.deadline && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 text-center">
                  Apply by {new Date(job.deadline).toLocaleDateString()}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-3">About {job.agency_name}</h3>
              {job.agency_website && (
                <a href={job.agency_website} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                  {job.agency_website}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
