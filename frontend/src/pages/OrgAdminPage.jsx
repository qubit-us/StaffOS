import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';
import {
  Users, Settings, Plus, X, Loader2,
  ToggleLeft, ToggleRight, UserCheck, UserX, ShieldCheck,
} from 'lucide-react';

// ── Add User Modal ───────────────────────────────────────────
function AddUserModal({ onClose, roles }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', role_id: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => api.post('/api/org-admin/users', data).then(r => r.data),
    onSuccess: ({ message }) => {
      toast.success(message || 'User added');
      qc.invalidateQueries({ queryKey: ['org-admin-users'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add user'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate({ ...form, role_id: form.role_id || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <h2 className="text-lg font-bold text-slate-900">Add Team Member</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jane" />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" required value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="jane@company.com" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role_id} onChange={e => set('role_id', e.target.value)}>
              <option value="">No role assigned</option>
              {(roles || []).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400">Temporary password: <span className="font-mono font-semibold text-slate-600">Password123!</span></p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isPending ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Users Tab ────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['org-admin-users'],
    queryFn: () => api.get('/api/org-admin/users').then(r => r.data),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['org-admin-roles'],
    queryFn: () => api.get('/api/org-admin/roles').then(r => r.data),
  });

  const { mutate: updateUser } = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/api/org-admin/users/${id}`, data).then(r => r.data),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['org-admin-users'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update user'),
  });

  const users = usersData?.users || [];
  const roles = rolesData?.roles || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Plus size={15} /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No users yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                {['User', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="input text-xs py-1 w-40"
                      value={u.role_ids?.[0] || ''}
                      onChange={e => updateUser({ id: u.id, role_id: e.target.value || null })}
                      disabled={u.id === me?.id}
                    >
                      <option value="">No role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== me?.id && (
                      <button
                        onClick={() => updateUser({ id: u.id, is_active: !u.is_active })}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                          u.is_active
                            ? 'text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active
                          ? <><UserX size={13} /> Deactivate</>
                          : <><UserCheck size={13} /> Activate</>
                        }
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} roles={roles} />}
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────
function SettingsTab() {
  const qc = useQueryClient();
  const { data: org, isLoading } = useQuery({
    queryKey: ['org-admin-settings'],
    queryFn: () => api.get('/api/org-admin/settings').then(r => r.data),
  });

  const [form, setForm] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Init form once loaded
  if (org && form === null) {
    setForm({
      name: org.name || '',
      domain: org.domain || '',
      website: org.website || '',
      phone: org.phone || '',
      industry: org.industry || '',
      company_size: org.company_size || '',
    });
  }

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: (data) => api.patch('/api/org-admin/settings', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['org-admin-settings'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save settings'),
  });

  if (isLoading || !form) {
    return <div className="p-10 text-center text-slate-400 text-sm">Loading settings...</div>;
  }

  return (
    <div className="card p-6 max-w-lg space-y-4">
      <div>
        <label className="label">Organization Name</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Domain</label>
          <input className="input" value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="company.com" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" />
        </div>
      </div>
      <div>
        <label className="label">Website</label>
        <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://company.com" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Industry</label>
          <input className="input" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Technology" />
        </div>
        <div>
          <label className="label">Company Size</label>
          <select className="input" value={form.company_size} onChange={e => set('company_size', e.target.value)}>
            <option value="">Select size</option>
            {['1-10','11-50','51-200','201-500','501-1000','1000+'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="pt-2">
        <button
          onClick={() => saveSettings(form)}
          disabled={isPending}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
          {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
const TABS = [
  { id: 'users',    label: 'Users & Roles', icon: Users },
  { id: 'settings', label: 'Settings',      icon: Settings },
];

export default function OrgAdminPage() {
  const [tab, setTab] = useState('users');

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
          <ShieldCheck size={18} className="text-brand-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Admin</h2>
          <p className="text-sm text-slate-500">Manage your team and organization settings</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-surface-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'users'    && <UsersTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
