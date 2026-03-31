import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { Zap, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const switchMode = (m) => {
    setMode(m);
    setEmail('');
    setPassword('');
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/google', { credential: credentialResponse.credential });
      setAuth(data.user, data.token);
      toast.success(`Welcome, ${data.user.firstName}!`);
      navigate(data.user.orgType === 'client' ? '/client' : '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { data } = await api.post('/api/auth/login', { email, password });
        setAuth(data.user, data.token);
        toast.success(`Welcome back, ${data.user.firstName}!`);
        navigate(data.user.orgType === 'client' ? '/client' : '/');
      } else {
        const { data } = await api.post('/api/auth/signup', { firstName, lastName, email, password, orgName });
        setAuth(data.user, data.token);
        toast.success(`Welcome, ${data.user.firstName}! Your account is ready.`);
        navigate(data.user.orgType === 'client' ? '/client' : '/');
      }
    } catch (err) {
      console.error('Auth error:', err.response?.status, err.response?.data, err.message);
      toast.error(err.response?.data?.error || err.message || (mode === 'login' ? 'Login failed' : 'Signup failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-xl">StaffOS</span>
              <p className="text-xs text-slate-500 font-medium">AI-Powered Recruiting Platform</p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-xl bg-surface-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Create account
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Get started'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {mode === 'login' ? 'Sign in to your organization account' : 'Create your staffing agency account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">First name</label>
                    <input type="text" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" required />
                  </div>
                  <div>
                    <label className="label">Last name</label>
                    <input type="text" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" required />
                  </div>
                </div>
                <div>
                  <label className="label">Organization name</label>
                  <input type="text" className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Staffing" required />
                </div>
              </>
            )}

            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-surface-200" />
              <span className="text-xs text-slate-400 font-medium">or</span>
              <div className="flex-1 h-px bg-surface-200" />
            </div>

            {/* Google SSO */}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google sign-in failed. Please try again.')}
                theme="outline"
                size="large"
                width="368"
                text={mode === 'login' ? 'signin_with' : 'signup_with'}
                shape="rectangular"
              />
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
