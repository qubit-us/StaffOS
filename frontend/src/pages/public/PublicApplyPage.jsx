import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  MapPin, Briefcase, Clock, CheckCircle, Loader2,
  Zap, Calendar, LogIn, UserPlus, Eye, EyeOff,
  Wifi, Shield, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const API = import.meta.env.VITE_API_URL || '';

const JOB_TYPE_LABELS = {
  contract: 'Contract', full_time: 'Full Time', part_time: 'Part Time',
  internship: 'Internship', other: 'Other',
};

function formatDeadline(job) {
  if (job.deadline) {
    return new Date(job.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PublicApplyPage() {
  const { jobId } = useParams();
  const [tab, setTab] = useState('login');
  const [applied, setApplied] = useState(false);
  const [appliedName, setAppliedName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [regForm, setRegForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '', title: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['apply-job', jobId],
    queryFn: () => axios.get(`${API}/api/public/apply/${jobId}`).then(r => r.data),
    retry: false,
  });

  const setReg = k => e => setRegForm(f => ({ ...f, [k]: e.target.value }));
  const setLogin = k => e => setLoginForm(f => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/public/apply/${jobId}/register`, regForm);
      setAppliedName(data.user.first_name);
      setApplied(true);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/public/apply/${jobId}/login`, loginForm);
      setAppliedName(data.user.first_name);
      setApplied(true);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50/30">
      {/* Nav bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-2">
        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
          <Zap size={14} className="text-white" fill="white" />
        </div>
        <span className="font-bold text-slate-800">StaffOS</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-brand-500" size={32} />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-semibold text-lg">This position is no longer available.</p>
            <p className="text-red-400 text-sm mt-1">The job may have been filled or the link has expired.</p>
          </div>
        )}

        {job && !applied && (
          <>
            {/* Invitation banner */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-6 text-white shadow-lg">
              {job.org_logo && (
                <img src={job.org_logo} alt={job.org_name} className="h-10 mb-4 rounded-lg object-contain bg-white/10 p-1" />
              )}
              <p className="text-brand-200 text-sm font-medium mb-1">
                {job.org_name} has an exciting opportunity for you
              </p>
              <h1 className="text-2xl font-bold mb-3">{job.title}</h1>
              <div className="flex flex-wrap gap-3 text-sm">
                {(job.location_city || job.location_state) && (
                  <span className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1">
                    <MapPin size={13} /> {[job.location_city, job.location_state].filter(Boolean).join(', ')}
                    {job.remote_allowed && ' · Remote OK'}
                  </span>
                )}
                {job.job_type && (
                  <span className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1">
                    <Briefcase size={13} /> {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-amber-400/20 text-amber-200 border border-amber-400/30 rounded-lg px-3 py-1 font-semibold">
                  <Calendar size={13} /> Apply by {formatDeadline(job)} EOD
                </span>
              </div>
            </div>

            {/* Job details */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5 shadow-sm">
              {/* Quick meta row */}
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                {(job.location_city || job.location_state) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-brand-400" />
                    {[job.location_city, job.location_state].filter(Boolean).join(', ')}
                  </span>
                )}
                {job.remote_allowed && (
                  <span className="flex items-center gap-1.5 text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg font-medium">
                    <Wifi size={13} /> Remote OK
                  </span>
                )}
                {job.hybrid_work && !job.remote_allowed && (
                  <span className="flex items-center gap-1.5 text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg font-medium">
                    <Wifi size={13} /> Hybrid
                  </span>
                )}
                {(job.experience_min || job.experience_max) && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-brand-400" />
                    {job.experience_min}{job.experience_max ? `–${job.experience_max}` : '+'} yrs experience
                  </span>
                )}
              </div>

              {job.description && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Briefcase size={14} className="text-brand-500" /> About the Role
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{job.description}</p>
                </div>
              )}

              {job.required_skills?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2 text-sm flex items-center gap-1.5">
                    <Star size={13} className="text-brand-500" /> Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills.map(s => (
                      <span key={s} className="bg-brand-50 text-brand-700 text-xs px-2.5 py-1 rounded-lg font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {job.nice_to_have_skills?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2 text-sm">Nice to Have</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.nice_to_have_skills.map(s => (
                      <span key={s} className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {job.visa_requirements?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2 text-sm">Work Authorization</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.visa_requirements.map(v => {
                      const labels = { citizen: 'US Citizen', green_card: 'Green Card', h1b: 'H1B', h4_ead: 'H4 EAD', opt: 'OPT', stem_opt: 'STEM OPT', l1: 'L2 EAD', tn: 'TN' };
                      return <span key={v} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-lg font-medium">{labels[v] || v}</span>;
                    })}
                  </div>
                </div>
              )}

              {job.clearance_level && job.clearance_level !== 'none' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <Shield size={15} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Security Clearance Required</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {({ none: '', public_trust: 'Public Trust', secret: 'Secret', top_secret: 'Top Secret', ts_sci: 'TS/SCI', ts_sci_poly: 'TS/SCI + Polygraph' })[job.clearance_level]}
                      {job.clearance_status === 'must_have_active' ? ' — Active clearance required' : job.clearance_status === 'must_be_clearable' ? ' — Must be clearable' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Apply form */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-1">
                <h2 className="text-lg font-bold text-slate-900">Apply for this role</h2>
                <p className="text-sm text-slate-500 mt-0.5">Quick and easy — takes less than 2 minutes</p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 mt-4">
                {[
                  { id: 'login',    label: 'I have an account', icon: <LogIn size={14} /> },
                  { id: 'register', label: "I'm new here",      icon: <UserPlus size={14} /> },
                ].map(t => (
                  <button key={t.id} type="button" onClick={() => setTab(t.id)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors',
                      tab === t.id
                        ? 'text-brand-600 border-b-2 border-brand-600 bg-white'
                        : 'text-slate-500 hover:text-slate-700 bg-slate-50'
                    )}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {tab === 'register' ? (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">First Name *</label>
                        <input className="input" required value={regForm.first_name} onChange={setReg('first_name')} placeholder="Jane" />
                      </div>
                      <div>
                        <label className="label">Last Name *</label>
                        <input className="input" required value={regForm.last_name} onChange={setReg('last_name')} placeholder="Smith" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Email Address *</label>
                      <input className="input" type="email" required value={regForm.email} onChange={setReg('email')} placeholder="jane@email.com" />
                    </div>
                    <div className="relative">
                      <label className="label">Create Password *</label>
                      <input className="input pr-10" type={showPw ? 'text' : 'password'} required minLength={8}
                        value={regForm.password} onChange={setReg('password')} placeholder="Min 8 characters" />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-[2.1rem] text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Current Title</label>
                        <input className="input" value={regForm.title} onChange={setReg('title')} placeholder="e.g. React Developer" />
                      </div>
                      <div>
                        <label className="label">Phone</label>
                        <input className="input" type="tel" value={regForm.phone} onChange={setReg('phone')} placeholder="+1 555 000 0000" />
                      </div>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                      {loading ? 'Submitting...' : `Apply for ${job.title}`}
                    </button>
                    <p className="text-xs text-center text-slate-400">
                      By applying you agree to our terms. Your information is only shared with {job.org_name}.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <p className="text-sm text-slate-600 bg-brand-50 rounded-xl p-3">
                      Sign in with your existing account to apply instantly.
                    </p>
                    <div>
                      <label className="label">Email Address</label>
                      <input className="input" type="email" required value={loginForm.email} onChange={setLogin('email')} placeholder="you@email.com" />
                    </div>
                    <div className="relative">
                      <label className="label">Password</label>
                      <input className="input pr-10" type={showPw ? 'text' : 'password'} required
                        value={loginForm.password} onChange={setLogin('password')} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-[2.1rem] text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                      {loading ? 'Applying...' : `Sign In & Apply`}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </>
        )}

        {/* Success state */}
        {applied && (
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-10 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Great work, {appliedName}! 🎉
            </h2>
            <p className="text-slate-600 mb-1">
              Your application for <strong>{job?.title}</strong> has been submitted successfully.
            </p>
            <p className="text-slate-500 text-sm">
              {job?.org_name} will review your profile and reach out if you're a great fit. Keep an eye on your inbox!
            </p>
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400">Powered by <strong>StaffOS</strong> — AI-Powered Talent Marketplace</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
