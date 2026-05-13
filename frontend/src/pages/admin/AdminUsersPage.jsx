import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import {
  Users, ShieldCheck, CheckCircle2, XCircle,
  UserPlus, Copy, X, Eye, EyeOff, Pencil, Trash2, Plus, Lock, Loader2,
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

// ── Invite Modal ─────────────────────────────────────────────────
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

// ── Edit User Modal ──────────────────────────────────────────────
function EditUserModal({ user, roles, onClose, onSuccess }) {
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name:  user.last_name,
    role_id:    user.role_id || '',
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

// ── Credentials Dialog ───────────────────────────────────────────
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

// ── Role Modal ───────────────────────────────────────────────────
function RoleModal({ onClose, editRole = null }) {
  const qc = useQueryClient();
  const [name, setName] = useState(editRole?.name || '');
  const [description, setDescription] = useState(editRole?.description || '');
  const [selectedIds, setSelectedIds] = useState(new Set(editRole?.permission_ids || []));

  const { data: permsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => api.get('/api/admin/permissions').then(r => r.data),
  });

  const toggle = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => editRole
      ? api.patch(`/api/admin/roles/${editRole.id}`, data).then(r => r.data)
      : api.post('/api/admin/roles', data).then(r => r.data),
    onSuccess: () => {
      toast.success(editRole ? 'Role updated' : 'Role created');
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save role'),
  });

  const permissions = permsData?.permissions || [];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <h2 className="text-lg font-bold text-slate-900">{editRole ? 'Edit Role' : 'Create Role'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutate({ name, description, permission_ids: [...selectedIds] }); }} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="label">Role Name *</label>
              <input className="input" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Senior Recruiter" />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label">Permissions</label>
                {permissions.length > 0 && (
                  <button type="button"
                    onClick={() => setSelectedIds(selectedIds.size === permissions.length ? new Set() : new Set(permissions.map(p => p.id)))}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                    {selectedIds.size === permissions.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              {permissions.length === 0 ? (
                <p className="text-sm text-slate-400">Loading permissions...</p>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-surface-200 rounded-xl p-3 space-y-3">
                  {Object.entries(
                    permissions.reduce((acc, p) => {
                      const cat = p.category || 'other';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(p);
                      return acc;
                    }, {})
                  ).map(([category, perms]) => (
                    <div key={category}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 capitalize">{category}</p>
                      <div className="space-y-1">
                        {perms.map(p => (
                          <label key={p.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-surface-50 rounded-lg px-2 py-1.5">
                            <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggle(p.id)}
                              className="rounded border-slate-300 text-indigo-600 shrink-0" />
                            <div>
                              <span className="text-sm text-slate-800">{p.description || p.code}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1.5">{p.code}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">{selectedIds.size} permission{selectedIds.size !== 1 ? 's' : ''} selected</p>
            </div>
          </div>
          <div className="flex gap-3 p-6 border-t border-surface-200">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Saving...' : editRole ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────
function UsersTab() {
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
      if (data.hard_deleted) toast.success('User permanently removed');
      else toast(data.message, { icon: 'ℹ️', duration: 6000 });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove user'),
  });

  const users = data?.users || [];
  const roles = rolesData?.roles || [];
  const roleByName = Object.fromEntries(roles.map(r => [r.name, r.id]));
  const usersWithRoleId = users.map(u => ({ ...u, role_id: u.roles?.[0] ? (roleByName[u.roles[0]] || '') : '' }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
          <UserPlus size={15} /> Invite User
        </button>
      </div>

      <div className="card overflow-hidden">
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
                        <button onClick={() => setEditingUser(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${u.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => setConfirmDelete(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showInvite && (
        <InviteUserModal roles={roles} onClose={() => setShowInvite(false)}
          onSuccess={(data) => { setShowInvite(false); setCredentials({ user: data.user, tempPassword: data.temp_password }); qc.invalidateQueries({ queryKey: ['admin-users'] }); }} />
      )}
      {editingUser && (
        <EditUserModal user={editingUser} roles={roles} onClose={() => setEditingUser(null)}
          onSuccess={() => { setEditingUser(null); qc.invalidateQueries({ queryKey: ['admin-users'] }); }} />
      )}
      {credentials && <CredentialsDialog user={credentials.user} tempPassword={credentials.tempPassword} onClose={() => setCredentials(null)} />}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Remove User?</h3>
            <p className="text-sm text-slate-500 mb-6">
              This will permanently remove <strong>{confirmDelete.first_name} {confirmDelete.last_name}</strong> ({confirmDelete.email}) from your organization.
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
    </div>
  );
}

// ── Roles Tab ─────────────────────────────────────────────────────
function RolesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/api/admin/roles').then(r => r.data),
  });

  const { mutate: deleteRole } = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/roles/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('Role deleted'); qc.invalidateQueries({ queryKey: ['admin-roles'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete role'),
  });

  const roles = rolesData?.roles || [];
  const customRoles = roles.filter(r => !r.is_default);
  const systemRoles = roles.filter(r => r.is_default);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Custom Roles</h3>
          <p className="text-xs text-slate-400 mt-0.5">Roles you've created for your team</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Plus size={15} /> New Role
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading roles...</div>
      ) : customRoles.length === 0 ? (
        <div className="card p-8 text-center">
          <ShieldCheck size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-slate-500 text-sm font-medium">No custom roles yet</p>
          <p className="text-slate-400 text-xs mt-1">Create roles tailored to your team's needs</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customRoles.map(role => (
            <div key={role.id} className="card p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                {role.description && <p className="text-xs text-slate-400 mt-0.5">{role.description}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(role.permissions || []).slice(0, 5).map(p => (
                    <span key={p} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                      {p.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                    </span>
                  ))}
                  {(role.permissions?.length || 0) > 5 && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">+{role.permissions.length - 5} more</span>
                  )}
                  {(!role.permissions || role.permissions.length === 0) && (
                    <span className="text-xs text-slate-400 italic">No permissions</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(role)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={14} /></button>
                <button onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteRole(role.id); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-surface-200 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={13} className="text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Roles</h3>
        </div>
        <div className="space-y-2">
          {systemRoles.map(role => (
            <div key={role.id} className="card p-4 flex items-start gap-4 opacity-70">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-700">{role.name}</p>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">System</span>
                </div>
                {role.description && <p className="text-xs text-slate-400 mt-0.5">{role.description}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(role.permissions || []).map(p => (
                    <span key={p} className="text-[10px] font-mono bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && <RoleModal onClose={() => setShowCreate(false)} />}
      {editing && <RoleModal onClose={() => setEditing(null)} editRole={editing} />}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'roles', label: 'Roles', icon: ShieldCheck },
];

export default function AdminUsersPage() {
  const [tab, setTab] = useState('users');

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-surface-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
    </div>
  );
}
