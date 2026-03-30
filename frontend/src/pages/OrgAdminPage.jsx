import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';
import {
  Users, Settings, Plus, X, Loader2, Pencil, Trash2,
  UserCheck, UserX, ShieldCheck, Lock,
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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <h2 className="text-lg font-bold text-slate-900">Add Team Member</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutate({ ...form, role_id: form.role_id || undefined }); }} className="p-6 space-y-4">
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
            <input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role_id} onChange={e => set('role_id', e.target.value)}>
              <option value="">No role assigned</option>
              {(roles || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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

// ── Role Modal (create / edit) ───────────────────────────────
function RoleModal({ onClose, editRole = null }) {
  const qc = useQueryClient();
  const [name, setName] = useState(editRole?.name || '');
  const [description, setDescription] = useState(editRole?.description || '');
  const [selectedIds, setSelectedIds] = useState(new Set(editRole?.permission_ids || []));

  const { data: permsData } = useQuery({
    queryKey: ['org-admin-permissions'],
    queryFn: () => api.get('/api/org-admin/permissions').then(r => r.data),
  });

  const toggle = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => editRole
      ? api.patch(`/api/org-admin/roles/${editRole.id}`, data).then(r => r.data)
      : api.post('/api/org-admin/roles', data).then(r => r.data),
    onSuccess: () => {
      toast.success(editRole ? 'Role updated' : 'Role created');
      qc.invalidateQueries({ queryKey: ['org-admin-roles'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save role'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate({ name, description, permission_ids: [...selectedIds] });
  };

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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="label">Role Name *</label>
              <input className="input" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Junior Recruiter" />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this role" />
            </div>
            <div>
              <label className="label mb-2">Permissions</label>
              {permissions.length === 0 ? (
                <p className="text-sm text-slate-400">Loading permissions...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-surface-200 rounded-xl p-3">
                  {permissions.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-50 rounded-lg p-1.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="rounded border-slate-300 text-brand-600"
                      />
                      <span className="text-xs font-mono text-slate-700">{p.code}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">{selectedIds.size} permission{selectedIds.size !== 1 ? 's' : ''} selected</p>
            </div>
          </div>
          <div className="flex gap-3 p-6 border-t border-surface-200">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {isPending ? 'Saving...' : editRole ? 'Save Changes' : 'Create Role'}
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
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['org-admin-users'] }); },
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
                    <select className="input text-xs py-1 w-40" value={u.role_ids?.[0] || ''}
                      onChange={e => updateUser({ id: u.id, role_id: e.target.value || null })}
                      disabled={u.id === me?.id}>
                      <option value="">No role</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== me?.id && (
                      <button onClick={() => updateUser({ id: u.id, is_active: !u.is_active })}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${u.is_active ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>
                        {u.is_active ? <><UserX size={13} /> Deactivate</> : <><UserCheck size={13} /> Activate</>}
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

// ── Roles Tab ─────────────────────────────────────────────────
function RolesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['org-admin-roles'],
    queryFn: () => api.get('/api/org-admin/roles').then(r => r.data),
  });

  const { mutate: deleteRole } = useMutation({
    mutationFn: (id) => api.delete(`/api/org-admin/roles/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('Role deleted'); qc.invalidateQueries({ queryKey: ['org-admin-roles'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete role'),
  });

  const roles = rolesData?.roles || [];
  const systemRoles = roles.filter(r => r.is_default);
  const customRoles = roles.filter(r => !r.is_default);

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Custom roles */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Custom Roles</h3>
          <p className="text-xs text-slate-400 mt-0.5">Roles you've created for your organization</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
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
                  {(role.permissions || []).map(p => (
                    <span key={p} className="text-[10px] font-mono bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                  {(!role.permissions || role.permissions.length === 0) && (
                    <span className="text-xs text-slate-400 italic">No permissions</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(role)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteRole(role.id); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System roles — read only */}
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

// ── Settings Tab ─────────────────────────────────────────────
function SettingsTab() {
  const qc = useQueryClient();
  const { data: org, isLoading } = useQuery({
    queryKey: ['org-admin-settings'],
    queryFn: () => api.get('/api/org-admin/settings').then(r => r.data),
  });

  const [form, setForm] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (org && form === null) {
    setForm({
      name: org.name || '', domain: org.domain || '', website: org.website || '',
      phone: org.phone || '', industry: org.industry || '', company_size: org.company_size || '',
      address_street: org.address_street || '', address_suite: org.address_suite || '',
      address_city: org.address_city || '', address_state: org.address_state || '',
      address_zip: org.address_zip || '', address_country: org.address_country || 'US',
      ein: org.ein || '',
    });
  }

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: (data) => api.patch('/api/org-admin/settings', data).then(r => r.data),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['org-admin-settings'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save settings'),
  });

  if (isLoading || !form) return <div className="p-10 text-center text-slate-400 text-sm">Loading settings...</div>;

  return (
    <div className="card p-6 max-w-lg space-y-4">
      <div>
        <label className="label">Organization Name</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Domain</label><input className="input" value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="company.com" /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" /></div>
      </div>
      <div><label className="label">Website</label><input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://company.com" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Industry</label><input className="input" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Technology" /></div>
        <div>
          <label className="label">Company Size</label>
          <select className="input" value={form.company_size} onChange={e => set('company_size', e.target.value)}>
            <option value="">Select size</option>
            {['1-10','11-50','51-200','201-500','501-1000','1000+'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="border-t border-surface-200 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Address</p>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className="label">Street</label><input className="input" value={form.address_street} onChange={e => set('address_street', e.target.value)} placeholder="123 Main St" /></div>
            <div><label className="label">Suite</label><input className="input" value={form.address_suite} onChange={e => set('address_suite', e.target.value)} placeholder="Ste 200" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">City</label><input className="input" value={form.address_city} onChange={e => set('address_city', e.target.value)} /></div>
            <div><label className="label">State</label><input className="input" value={form.address_state} onChange={e => set('address_state', e.target.value)} /></div>
            <div><label className="label">ZIP</label><input className="input" value={form.address_zip} onChange={e => set('address_zip', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Country</label><input className="input" value={form.address_country} onChange={e => set('address_country', e.target.value)} /></div>
            <div><label className="label">EIN</label><input className="input" value={form.ein} onChange={e => set('ein', e.target.value)} placeholder="XX-XXXXXXX" /></div>
          </div>
        </div>
      </div>
      <div className="pt-2">
        <button onClick={() => saveSettings(form)} disabled={isPending}
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
  { id: 'users',    label: 'Users',    icon: Users },
  { id: 'roles',    label: 'Roles',    icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function OrgAdminPage() {
  const [tab, setTab] = useState('users');

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
          <ShieldCheck size={18} className="text-brand-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Admin</h2>
          <p className="text-sm text-slate-500">Manage your team, roles, and organization settings</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-surface-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'users'    && <UsersTab />}
      {tab === 'roles'    && <RolesTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
