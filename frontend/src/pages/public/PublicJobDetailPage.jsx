import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  MapPin, Briefcase, Clock, Users, Calendar, ArrowLeft,
  CheckCircle, Zap, Globe, Send, Loader2, Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import BoardAuthModal from './BoardAuthModal.jsx';

const API = import.meta.env.VITE_API_URL || '';

const JOB_TYPE_LABELS = {
  contract: 'Contract',
  fulltime: 'Full-time',
  parttime: 'Part-time',
  contract_to_hire: 'Contract to Hire',
};

const JOB_TYPE_COLORS = {
  contract: 'bg-violet-100 text-violet-700',
  fulltime: 'bg-emerald-100 text-emerald-700',
  parttime: 'bg-sky-100 text-sky-700',
  contract_to_hire: 'bg-amber-100 text-amber-700',
};

export default function PublicJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('public_session') || 'null'); } catch { return null; }
  });

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['public-job', id],
    queryFn: () => axios.get(`${API}/api/public/jobs/${id}`).then(r => r.data),
  });

  const handleApply = async (sess = session) => {
    if (!sess?.candidate_id && !sess?.user) {
      setShowAuth(true);
      return;
    }
    const candidateId = sess?.candidate_id;
    if (!candidateId) {
      // Agency/employee user logged in — just show success
      toast('You\'re signed in as a staff user. Contact the agency directly to apply.');
      return;
    }
    setApplying(true);
    try {
      await axios.post(`${API}/api/public/apply`, { job_id: id, candidate_id: candidateId });
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

  const handleSessionReady = (sess) => {
    setSession(sess);
    handleApply(sess);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-brand-500" size={28} />
        <p className="text-sm text-slate-400">Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-12 shadow-sm border border-slate-200 max-w-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={24} className="text-slate-300" />
          </div>
          <p className="font-bold text-slate-700 mb-1">Job not found</p>
          <p className="text-sm text-slate-400 mb-5">This role may have been filled or removed.</p>
          <Link to="/board" className="text-brand-600 text-sm hover:underline font-medium">Browse all jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link to="/board" className="flex items-center gap-2 text-slate-600 hover:text-brand-600 text-sm font-medium transition-colors">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">All Jobs</span>
          </Link>
          <Link to="/board" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">StaffOS Jobs</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Copy link"
            >
              <Share2 size={16} />
            </button>
            {!session && (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0 text-white font-bold text-2xl shadow-lg">
              {job.agency_name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{job.title}</h1>
              <p className="text-brand-300 font-medium mb-4">{job.agency_name}</p>
              <div className="flex flex-wrap gap-2">
                {job.job_type && (
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${JOB_TYPE_COLORS[job.job_type] || 'bg-slate-100 text-slate-600'}`}>
                    {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                  </span>
                )}
                {job.remote_allowed && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    <Globe size={11} /> Remote OK
                  </span>
                )}
                {(job.location_city || job.location_state) && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/80">
                    <MapPin size={11} />
                    {[job.location_city, job.location_state].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Quick stats */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  job.experience_min || job.experience_max ? {
                    icon: Clock,
                    label: 'Experience',
                    value: job.experience_min && job.experience_max
                      ? `${job.experience_min}–${job.experience_max} yrs`
                      : `${job.experience_min || job.experience_max}+ yrs`,
                  } : null,
                  job.positions_count > 0 ? {
                    icon: Users,
                    label: 'Openings',
                    value: job.positions_count,
                  } : null,
                  job.start_date ? {
                    icon: Calendar,
                    label: 'Start Date',
                    value: new Date(job.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  } : null,
                  job.deadline ? {
                    icon: Calendar,
                    label: 'Apply By',
                    value: new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  } : null,
                ].filter(Boolean).map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{label}</p>
                      <p className="text-sm font-bold text-slate-800">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Job Description</h2>
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>
            </div>

            {/* Skills */}
            {job.required_skills?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map(s => (
                    <span key={s} className="px-3 py-1.5 bg-brand-50 text-brand-700 text-sm font-medium rounded-xl border border-brand-100">
                      {s}
                    </span>
                  ))}
                </div>
                {job.nice_to_have_skills?.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-slate-700 mt-5 mb-3">Nice to Have</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.nice_to_have_skills.map(s => (
                        <span key={s} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-xl">
                          {s}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Visa requirements */}
            {job.visa_requirements?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Work Authorization</h2>
                <div className="flex flex-wrap gap-2">
                  {job.visa_requirements.map(v => (
                    <span key={v} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-xl border border-amber-100">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Apply card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-20">
              {applied ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={28} className="text-emerald-500" />
                  </div>
                  <p className="font-bold text-slate-800 text-lg mb-1">Application Submitted!</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The agency will review your profile and reach out if there's a match.
                  </p>
                  <Link
                    to="/board"
                    className="mt-4 block text-sm text-brand-600 hover:underline font-medium"
                  >
                    Browse more jobs
                  </Link>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-slate-900 mb-1">Ready to apply?</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {session
                      ? 'Submit your application with one click.'
                      : 'Sign in or create a free profile to apply.'}
                  </p>
                  <button
                    onClick={() => handleApply()}
                    disabled={applying}
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
                  >
                    {applying
                      ? <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                      : <><Send size={15} /> {session ? 'Apply Now' : 'Sign In to Apply'}</>
                    }
                  </button>

                  {!session && (
                    <>
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400">or</span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      <Link
                        to={`/board/register?apply=${id}`}
                        className="w-full block text-center text-sm font-semibold text-slate-700 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                      >
                        Create Free Profile
                      </Link>
                    </>
                  )}

                  {job.deadline && (
                    <p className="text-xs text-center text-slate-400 mt-4 pt-4 border-t border-slate-100">
                      Application deadline: <span className="font-medium text-slate-600">{new Date(job.deadline).toLocaleDateString()}</span>
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Agency info card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-3">About the Agency</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-brand-700 font-bold">
                  {job.agency_name?.charAt(0) || 'S'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{job.agency_name}</p>
                  <p className="text-xs text-slate-400">Staffing Agency</p>
                </div>
              </div>
              {job.agency_website && (
                <a
                  href={job.agency_website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-brand-600 hover:underline break-all"
                >
                  {job.agency_website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {/* Share */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
            >
              <Share2 size={15} /> Share this job
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" fill="white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">StaffOS Job Board</span>
          </div>
          <Link to="/board" className="text-xs text-slate-400 hover:text-brand-600 transition-colors">
            ← Back to all jobs
          </Link>
        </div>
      </footer>

      {showAuth && (
        <BoardAuthModal
          applyJobId={id}
          onClose={() => setShowAuth(false)}
          onSessionReady={handleSessionReady}
        />
      )}
    </div>
  );
}
