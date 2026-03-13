import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Zap, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@talentbridge.io');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      setAuth(data.user, data.token);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
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

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-7">Sign in to your organization account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-surface-50 rounded-xl border border-surface-200">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Demo Credentials</p>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium">Agency Admin:</span>
                <span className="font-mono">admin@talentbridge.io</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Recruiter:</span>
                <span className="font-mono">recruiter@talentbridge.io</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Password:</span>
                <span className="font-mono">Password123!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
