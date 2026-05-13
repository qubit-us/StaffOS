import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, User, Lock, Eye, EyeOff, Camera, Trash2, Phone, Briefcase } from 'lucide-react';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuthStore();

  const [form, setForm] = useState({
    first_name: user?.firstName || '',
    last_name:  user?.lastName  || '',
    phone:      user?.phone     || '',
    title:      user?.title     || '',
  });
  const [pw, setPw]                   = useState({ current: '', next: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext,    setShowNext]    = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const fileRef = useRef(null);

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => api.patch('/api/auth/profile', form).then(r => r.data),
    onSuccess: ({ user: u }) => {
      updateUser({ firstName: u.first_name, lastName: u.last_name, phone: u.phone, title: u.title });
      toast.success('Profile updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update profile'),
  });

  const { mutate: uploadAvatar, isPending: uploadingAvatar } = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.post('/api/auth/profile/avatar', fd).then(r => r.data);
    },
    onSuccess: ({ avatar_url }) => {
      updateUser({ avatarUrl: avatar_url });
      setAvatarPreview(avatar_url);
      toast.success('Profile picture updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to upload picture'),
  });

  const { mutate: deleteAvatar, isPending: deletingAvatar } = useMutation({
    mutationFn: () => api.delete('/api/auth/profile/avatar').then(r => r.data),
    onSuccess: () => {
      updateUser({ avatarUrl: null });
      setAvatarPreview(null);
      toast.success('Profile picture removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove picture'),
  });

  const { mutate: changePassword, isPending: changingPw } = useMutation({
    mutationFn: () => api.post('/api/auth/change-password', {
      currentPassword: pw.current,
      newPassword: pw.next,
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Password changed');
      setPw({ current: '', next: '', confirm: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to change password'),
  });

  const handlePasswordSubmit = () => {
    if (!pw.current || !pw.next) return toast.error('Fill in both password fields');
    if (pw.next.length < 8) return toast.error('New password must be at least 8 characters');
    if (pw.next !== pw.confirm) return toast.error('Passwords do not match');
    changePassword();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    uploadAvatar(file);
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
              <User size={16} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">My Profile</h2>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center overflow-hidden ring-4 ring-surface-100">
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-xl">{initials}</span>
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
              >
                {uploadingAvatar ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            {avatarPreview && (
              <button
                onClick={() => deleteAvatar()}
                disabled={deletingAvatar}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                {deletingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Remove photo
              </button>
            )}
          </div>

          {/* Personal info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personal Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input className="input" value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input" value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Email</label>
              <input className="input bg-surface-50 text-slate-400 cursor-not-allowed" value={user?.email} readOnly />
            </div>
            <div className="mt-3">
              <label className="label flex items-center gap-1.5"><Phone size={12} /> Phone</label>
              <input className="input" placeholder="+1 (555) 000-0000" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="mt-3">
              <label className="label flex items-center gap-1.5"><Briefcase size={12} /> Job Title</label>
              <input className="input" placeholder="e.g. CEO, VP of Recruiting" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <button
              onClick={() => saveProfile()}
              disabled={savingProfile}
              className="mt-4 flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {savingProfile && <Loader2 size={14} className="animate-spin" />}
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Change password */}
          <div className="border-t border-surface-200 pt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Lock size={11} /> Change Password
            </p>
            <div className="space-y-3">
              <div>
                <label className="label">Current Password</label>
                <div className="relative">
                  <input type={showCurrent ? 'text' : 'password'} className="input pr-10"
                    value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input type={showNext ? 'text' : 'password'} className="input pr-10"
                    value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
                  <button type="button" onClick={() => setShowNext(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNext ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" className="input"
                  value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <button
                onClick={handlePasswordSubmit}
                disabled={changingPw}
                className="flex items-center gap-2 border border-slate-200 hover:bg-surface-50 disabled:opacity-60 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {changingPw && <Loader2 size={14} className="animate-spin" />}
                {changingPw ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
