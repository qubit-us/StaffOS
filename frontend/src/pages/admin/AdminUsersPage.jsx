import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import {
  Users, ShieldCheck, CheckCircle2, XCircle,
  UserPlus, Copy, X, Eye, EyeOff, Pencil, Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

function timeAgo(ts) {
  if (!ts) return 'Never';
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)         return 'Just now';
  if (diff < 3600)       return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)      return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Invite Modal ────────────────────────────────────────────────
function InviteUserModal({ roles, onClose, onSuccess }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role_id: '' });

  const invite = useMutation({
    mutationFn: (data) => api.post('/api/admin/users', data).then(r => r.data),
    onSuccess,
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to invite user'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Invite Team Member</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); invite.mutate({ ...form, role_id: form.role_id || undefined }); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name *</label>
              <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Jane" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name *</label>
              <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Smith" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address *</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="jane@yourcompany.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
            <select value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">No role assigned</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-400">The user will be given a temporary password and prompted to change it on first login.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={invite.isPending}
              className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {invite.isPending ? 'Inviting…' : 'Invite User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ──────────────────────────────────────────────────
function EditUserModal({ user, roles, onClose, onSuccess }) {
  const currentRoleId = user.role_id || '';
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name:  user.last_name,
    role_id:    currentRoleId,
  });

  const update = useMutation({
    mutationFn: (data) => api.patch(`/api/admin/users/${user.id}`, data).then(r => r.data),
    onSuccess: () => { toast.success('User updated'); onSuccess(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update user'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Edit User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); update.mutate({ ...form, role_id: form.role_id || null }); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name *</label>
              <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name *</label>
              <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
            <input disabled value={user.email}
              className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400" />
            <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
            <select value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">No role</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={update.isPending}
              className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {update.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Credentials Dialog ──────────────────────────────────────────
function CredentialsDialog({ user, tempPassword, onClose }) {
  const [showPw, setShowPw] = useState(false);
  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">User Created</h2>
              <p className="text-xs text-slate-400">Share these credentials securely</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">NAME</p>
            <p className="text-sm font-semibold text-slate-800">{user.first_name} {user.last_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">EMAIL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800">{user.email}</code>
              <button onClick={() => copy(user.email)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Copy size={15} /></button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">TEMPORARY PASSWORD</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800">
                {showPw ? tempPassword : '••••••••••••'}
              </code>
              <button onClick={() => setShowPw(v => !v)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button onClick={() => copy(tempPassword)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Copy size={15} /></button>
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            The user will be required to change this password on first login.
          </p>
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 text-sm">Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [showInvite, setShowInvite]     = useState(false);
  const [editingUser, setEditingUser]   = useState(null);
  const [credentials, setCredentials]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/admin/users').then(r => r.data),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/api/admin/roles').then(r => r.data),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/api/admin/users/${id}`, { is_active }).then(r => r.data),
    onSuccess: (u) => { toast.success(`${u.first_name} ${u.is_active ? 'activated' : 'deactivated'}`); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteUser = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/users/${id}`).then(r => r.data),
    onSuccess: (data) => {
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      if (data.hard_deleted) {
        toast.success('User permanently removed');
      } else {
        toast(data.message, { icon: 'ℹ️', duration: 6000 });
      }
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove user'),
  });

  const users = data?.users || [];
  const roles = rolesData?.roles || [];

  // Build a role_id lookup for each user by matching their role names to role objects
  const roleByName = Object.fromEntries(roles.map(r => [r.name, r.id]));
  const usersWithRoleId = users.map(u => ({
    ...u,
    role_id: u.roles?.[0] ? (roleByName[u.roles[0]] || '') : '',
  }));

  return (
    <>
      <div className="space-y-6">
        {/* Users table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <h3 className="font-semibold text-slate-800">Team Members</h3>
            <span className="ml-2 text-xs text-slate-400">{users.length} users</span>
            <button onClick={() => setShowInvite(true)}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
              <UserPlus size={13} /> Invite User
            </button>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  {['Name', 'Email', 'Roles', 'Last Login', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {usersWithRoleId.map(u => (
                  <tr key={u.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">
                          {u.first_name} {u.last_name}
                          {u.id === me?.id && <span className="ml-1.5 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">You</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles || []).map(r => (
                          <span key={r} className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{timeAgo(u.last_login_at)}</td>
                    <td className="px-4 py-3">
                      {u.is_active
                        ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 size={13} /> Active</span>
                        : <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold"><XCircle size={13} /> Inactive</span>}
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== me?.id && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditingUser(u)} title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                              u.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => setConfirmDelete(u)} title="Remove user"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Roles table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <ShieldCheck size={16} className="text-slate-500" />
            <h3 className="font-semibold text-slate-800">Roles</h3>
            <span className="ml-auto text-xs text-slate-400">{roles.length} roles</span>
          </div>
          <div className="divide-y divide-surface-50">
            {roles.map(role => (
              <div key={role.id} className="px-5 py-4 hover:bg-surface-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800">{role.name}</p>
                      <span className="text-xs text-slate-400">{role.user_count} user{role.user_count !== 1 ? 's' : ''}</span>
                    </div>
                    {role.description && <p className="text-xs text-slate-500 mb-2">{role.description}</p>}
                    <div className="flex flex-wrap gap-1">
                      {(role.permissions || []).map(p => (
                        <span key={p} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteUserModal
          roles={roles}
          onClose={() => setShowInvite(false)}
          onSuccess={(data) => {
            setShowInvite(false);
            setCredentials({ user: data.user, tempPassword: data.temp_password });
            qc.invalidateQueries({ queryKey: ['admin-users'] });
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onSuccess={() => { setEditingUser(null); qc.invalidateQueries({ queryKey: ['admin-users'] }); }}
        />
      )}

      {credentials && (
        <CredentialsDialog
          user={credentials.user}
          tempPassword={credentials.tempPassword}
          onClose={() => setCredentials(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Remove User?</h3>
            <p className="text-sm text-slate-500 mb-6">
              This will permanently remove <strong>{confirmDelete.first_name} {confirmDelete.last_name}</strong> ({confirmDelete.email}) from your organization. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={() => deleteUser.mutate(confirmDelete.id)} disabled={deleteUser.isPending}
                className="px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50">
                {deleteUser.isPending ? 'Removing…' : 'Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
