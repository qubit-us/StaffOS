import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, X, Zap } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const API = import.meta.env.VITE_API_URL || '';

const VISA_OPTIONS = ['USC', 'GC', 'H1B', 'H4 EAD', 'OPT', 'CPT', 'TN', 'L2 EAD', 'Other'];

export default function PublicRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const applyJobId = searchParams.get('apply');

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    phone: '', title: '', location_city: '', location_state: '',
    visa_status: '', years_of_experience: '',
    expected_rate_min: '', expected_rate_max: '',
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.first_name || !form.last_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        years_of_experience: form.years_of_experience ? parseInt(form.years_of_experience) : undefined,
        expected_rate_min: form.expected_rate_min ? parseFloat(form.expected_rate_min) : undefined,
        expected_rate_max: form.expected_rate_max ? parseFloat(form.expected_rate_max) : undefined,
        skills,
      };
      const { data } = await axios.post(`${API}/api/public/register`, payload);

      // Save session for apply flow
      localStorage.setItem('public_session', JSON.stringify({
        candidate_id: data.candidate_id,
        user: data.user,
      }));

      toast.success('Account created!');

      if (applyJobId) {
        // Auto-apply after registration
        try {
          await axios.post(`${API}/api/public/apply`, {
            job_id: applyJobId,
            candidate_id: data.candidate_id,
          });
          toast.success('Application submitted!');
        } catch {}
        navigate(`/board/${applyJobId}`);
      } else {
        navigate('/board');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/google`, {
        credential: credentialResponse.credential,
      });
      localStorage.setItem('public_session', JSON.stringify({
        user: data.user,
        token: data.token,
        candidate_id: null,
      }));
      toast.success(`Welcome, ${data.user.firstName}!`);
      navigate(applyJobId ? `/board/${applyJobId}` : '/board');
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('No account found for this Google account. Please register with email.');
      } else {
        toast.error(err.response?.data?.error || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link to="/board" className="flex items-center gap-2 text-slate-600 hover:text-brand-600 text-sm font-medium transition-colors">
            <ArrowLeft size={16} /> Back to Jobs
          </Link>
          <Link to="/board" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">StaffOS Jobs</span>
          </Link>
          <Link to="/login" className="text-sm text-brand-600 hover:underline font-medium">Sign In</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your profile</h1>
          <p className="text-slate-500 mb-5 text-sm">
            {applyJobId ? 'Register to submit your application.' : 'Register to apply to jobs.'}
          </p>

          {/* Google SSO */}
          <div className="flex justify-center mb-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed. Please try again.')}
              theme="outline"
              size="large"
              width="432"
              text="signup_with"
              shape="rectangular"
            />
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or register with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input className="input" required value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input className="input" required value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              </div>
            </div>

            {/* Email + Password */}
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" required value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input" required minLength={8} value={form.password} onChange={e => set('password', e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">At least 8 characters</p>
            </div>

            {/* Professional info */}
            <hr className="border-slate-100" />
            <div>
              <label className="label">Current/Recent Title</label>
              <input className="input" placeholder="e.g. Senior Software Engineer" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Years of Experience</label>
                <input className="input" type="number" min={0} max={50} value={form.years_of_experience} onChange={e => set('years_of_experience', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">City</label>
                <input className="input" value={form.location_city} onChange={e => set('location_city', e.target.value)} />
              </div>
              <div>
                <label className="label">State</label>
                <input className="input" placeholder="e.g. CA" value={form.location_state} onChange={e => set('location_state', e.target.value)} />
              </div>
            </div>

            {/* Visa */}
            <div>
              <label className="label">Work Authorization</label>
              <select className="input" value={form.visa_status} onChange={e => set('visa_status', e.target.value)}>
                <option value="">Select...</option>
                {VISA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Expected Rate Min ($/hr)</label>
                <input className="input" type="number" min={0} value={form.expected_rate_min} onChange={e => set('expected_rate_min', e.target.value)} />
              </div>
              <div>
                <label className="label">Expected Rate Max ($/hr)</label>
                <input className="input" type="number" min={0} value={form.expected_rate_max} onChange={e => set('expected_rate_max', e.target.value)} />
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="label">Skills</label>
              <div className="flex gap-2 mb-2">
                <input
                  className="input flex-1"
                  placeholder="Add a skill and press Enter"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                />
                <button type="button" onClick={addSkill} className="btn-secondary">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.map(s => (
                  <span key={s} className="badge bg-brand-50 text-brand-700 flex items-center gap-1">
                    {s}
                    <button type="button" onClick={() => setSkills(prev => prev.filter(x => x !== s))}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : applyJobId ? 'Create Account & Apply' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
