import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import { Users, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
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

export default function AdminUsersPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();

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
    onSuccess: (updated) => {
      toast.success(`${updated.first_name} ${updated.is_active ? 'activated' : 'deactivated'}`);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update user'),
  });

  const users = data?.users || [];
  const roles = rolesData?.roles || [];

  return (
    <div className="space-y-6">
      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
          <Users size={16} className="text-slate-500" />
          <h3 className="font-semibold text-slate-800">Team Members</h3>
          <span className="ml-auto text-xs text-slate-400">{users.length} users</span>
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
              {users.map(u => (
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
                        <span key={r} className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{timeAgo(u.last_login_at)}</td>
                  <td className="px-4 py-3">
                    {u.is_active
                      ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 size={13} /> Active</span>
                      : <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold"><XCircle size={13} /> Inactive</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== me?.id && (
                      <button
                        onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          u.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
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
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800">{role.name}</p>
                    <span className="text-xs text-slate-400">{role.user_count} user{role.user_count !== 1 ? 's' : ''}</span>
                  </div>
                  {role.description && (
                    <p className="text-xs text-slate-500 mb-2">{role.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(role.permissions || []).map(p => (
                      <span key={p} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
