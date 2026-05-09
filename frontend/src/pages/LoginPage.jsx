import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { Zap, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const switchMode = (m) => {
    setMode(m);
    setEmail('');
    setPassword('');
    setForgotSent(false);
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

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setForgotSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset link');
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

          {/* Mode tabs — hidden when in forgot mode */}
          {mode !== 'forgot' && (
            <div className="flex rounded-xl bg-surface-100 p-1 mb-6">
              <button type="button" onClick={() => switchMode('login')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                Sign in
              </button>
              <button type="button" onClick={() => switchMode('signup')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                Create account
              </button>
            </div>
          )}

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Get started' : 'Reset password'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {mode === 'login' ? 'Sign in to your organization account' : mode === 'signup' ? 'Create your staffing agency account' : 'Enter your email and we\'ll send a reset link'}
          </p>

          {mode === 'forgot' ? (
            <form onSubmit={handleForgot} className="space-y-4">
              {forgotSent ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm">
                  Check your inbox — if that email exists, a reset link has been sent.
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">Email address</label>
                    <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@organization.com" required />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                    {loading && <Loader2 className="animate-spin" size={18} />}
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </>
              )}
              <button type="button" onClick={() => switchMode('login')}
                className="w-full text-sm text-slate-500 hover:text-slate-800 transition-colors py-1">
                ← Back to sign in
              </button>
            </form>
          ) : (
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
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign in' : 'Create account')}
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-surface-200" />
                <span className="text-xs text-slate-400 font-medium">or</span>
                <div className="flex-1 h-px bg-surface-200" />
              </div>

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
          )}

        </div>
      </div>
    </div>
  );
}
