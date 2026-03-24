import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, Zap, Loader2, LogIn } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

const API = import.meta.env.VITE_API_URL || '';

export default function BoardAuthModal({ onClose, onSessionReady, applyJobId = null }) {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [tab, setTab] = useState('signin'); // 'signin' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAfterAuth = (user, token) => {
    // Agency/client users → redirect to the main app
    if (user.orgType !== 'public' && user.orgType) {
      setAuth(user, token);
      navigate(user.orgType === 'client' ? '/client' : '/');
      return;
    }
    // Public-org candidate → store session, stay on board
    const candidateSession = { user, token };
    localStorage.setItem('public_session', JSON.stringify(candidateSession));
    onSessionReady?.(candidateSession);
    onClose();
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/google`, {
        credential: credentialResponse.credential,
      });
      handleAfterAuth(data.user, data.token);
      toast.success(`Welcome, ${data.user.firstName}!`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Google sign-in failed';
      if (err.response?.status === 404) {
        toast.error('No account found. Please register first.');
        setTab('register');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
      handleAfterAuth(data.user, data.token);
      toast.success(`Welcome back, ${data.user.firstName}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-brand-900 px-8 pt-8 pb-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg">StaffOS</span>
              <p className="text-xs text-brand-300">Job Board</p>
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">
            {tab === 'signin' ? 'Sign in to apply' : 'Create your profile'}
          </h2>
          <p className="text-sm text-brand-300 mt-1">
            {applyJobId ? 'Sign in to submit your application.' : 'Access your applications and profile.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === 'signin'
                ? 'text-brand-600 border-b-2 border-brand-600 bg-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === 'register'
                ? 'text-brand-600 border-b-2 border-brand-600 bg-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            New Candidate
          </button>
        </div>

        <div className="px-8 py-6">
          {tab === 'signin' ? (
            <div className="space-y-4">
              {/* Google SSO */}
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google sign-in failed. Please try again.')}
                  theme="outline"
                  size="large"
                  width="352"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or continue with email</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Create a free candidate profile to apply to jobs and track your applications.
              </p>

              {/* Google register */}
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google sign-in failed. Please try again.')}
                  theme="outline"
                  size="large"
                  width="352"
                  text="signup_with"
                  shape="rectangular"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or register with email</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <a
                href={applyJobId ? `/board/register?apply=${applyJobId}` : '/board/register'}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                onClick={onClose}
              >
                Register with Email
              </a>
            </div>
          )}

          <p className="text-xs text-center text-slate-400 mt-5">
            Are you a recruiter or agency?{' '}
            <a href="/login" className="text-brand-600 hover:underline font-medium">
              Sign in to StaffOS
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
