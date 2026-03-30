import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordModal() {
  const { updateUser } = useAuthStore();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => api.post('/api/auth/change-password', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      updateUser({ mustChangePassword: false });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to change password'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-surface-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <KeyRound size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Set Your Password</h2>
              <p className="text-xs text-slate-500">You must change your temporary password before continuing</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Current (Temporary) Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={show.current ? 'text' : 'password'}
                required
                value={form.currentPassword}
                onChange={e => set('currentPassword', e.target.value)}
                placeholder="Password123!"
              />
              <button type="button" onClick={() => setShow(s => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={show.new ? 'text' : 'password'}
                required
                value={form.newPassword}
                onChange={e => set('newPassword', e.target.value)}
                placeholder="Min. 8 characters"
              />
              <button type="button" onClick={() => setShow(s => ({ ...s, new: !s.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={show.confirm ? 'text' : 'password'}
                required
                value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
                placeholder="Repeat new password"
              />
              <button type="button" onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors mt-2">
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            {isPending ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
