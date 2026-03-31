import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import { X, Building2, Scale, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance & Banking', 'Insurance', 'Manufacturing',
  'Retail & E-Commerce', 'Government', 'Education', 'Energy & Utilities',
  'Telecom', 'Consulting', 'Media & Entertainment', 'Non-Profit', 'Other',
];
const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,001–5,000', '5,000+'];

const TABS = [
  { id: 1, label: 'Company', icon: Building2 },
  { id: 2, label: 'Contract', icon: Scale },
];

function Field({ label, required, children }) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
function FieldRow({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export default function EditClientModal({ clientId, onClose }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState(1);
  const [form, setForm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['client-detail', clientId],
    queryFn: () => api.get(`/api/clients/${clientId}`).then(r => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/admin/users').then(r => r.data),
  });
  const agencyUsers = (usersData?.users || []).filter(u => u.is_active);

  useEffect(() => {
    if (data && !form) {
      setForm({
        name:               data.name || '',
        phone:              data.phone || '',
        website:            data.website || '',
        industry:           data.industry || '',
        company_size:       data.company_size || '',
        status:             data.relationship_status || 'active',
        contract_type:      data.contract_type || 'both',
        net_payment_terms:  data.net_payment_terms ?? 30,
        contract_start:     data.contract_start ? data.contract_start.split('T')[0] : '',
        contract_end:       data.contract_end   ? data.contract_end.split('T')[0]   : '',
        notes:              data.notes || '',
        account_manager_id: data.account_manager_id || '',
      });
    }
  }, [data]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: (body) => api.patch(`/api/clients/${clientId}`, body).then(r => r.data),
    onSuccess: () => {
      toast.success('Client updated');
      qc.refetchQueries({ queryKey: ['agency-clients'], type: 'active' });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update client'),
  });

  const handleSubmit = () => {
    if (!form?.name?.trim()) { toast.error('Company name is required'); return; }
    mutate({
      name:               form.name,
      phone:              form.phone || undefined,
      website:            form.website || undefined,
      industry:           form.industry || undefined,
      company_size:       form.company_size || undefined,
      status:             form.status,
      contract_type:      form.contract_type || undefined,
      net_payment_terms:  form.net_payment_terms ? parseInt(form.net_payment_terms) : undefined,
      contract_start:     form.contract_start || undefined,
      contract_end:       form.contract_end   || undefined,
      notes:              form.notes || undefined,
      account_manager_id: form.account_manager_id || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Client</h2>
            <p className="text-xs text-slate-400 mt-0.5">{data?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-200 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                tab === id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              )}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isLoading || !form ? (
            <div className="py-16 flex items-center justify-center text-slate-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : (
            <>
              {tab === 1 && (
                <>
                  <Field label="Company Name" required>
                    <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
                  </Field>
                  <FieldRow>
                    <Field label="Phone">
                      <input className="input" type="tel" value={form.phone}
                        onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
                    </Field>
                    <Field label="Website">
                      <input className="input" value={form.website}
                        onChange={e => set('website', e.target.value)} placeholder="https://acme.com" />
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Industry">
                      <select className="input" value={form.industry} onChange={e => set('industry', e.target.value)}>
                        <option value="">Select industry</option>
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </Field>
                    <Field label="Company Size">
                      <select className="input" value={form.company_size} onChange={e => set('company_size', e.target.value)}>
                        <option value="">Select size</option>
                        {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                      </select>
                    </Field>
                  </FieldRow>
                </>
              )}

              {tab === 2 && (
                <>
                  <FieldRow>
                    <Field label="Status">
                      <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                      </select>
                    </Field>
                    <Field label="Contract Type">
                      <select className="input" value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
                        <option value="both">W2 &amp; Corp-to-Corp</option>
                        <option value="w2">W2 Only</option>
                        <option value="c2c">Corp-to-Corp Only</option>
                      </select>
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Net Payment Terms (days)">
                      <input className="input" type="number" min="0" value={form.net_payment_terms}
                        onChange={e => set('net_payment_terms', e.target.value)} />
                    </Field>
                    <Field label="Account Manager">
                      <select className="input" value={form.account_manager_id} onChange={e => set('account_manager_id', e.target.value)}>
                        <option value="">Unassigned</option>
                        {agencyUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                        ))}
                      </select>
                    </Field>
                  </FieldRow>
                  <FieldRow>
                    <Field label="Contract Start">
                      <input className="input" type="date" value={form.contract_start}
                        onChange={e => set('contract_start', e.target.value)} />
                    </Field>
                    <Field label="Contract End">
                      <input className="input" type="date" value={form.contract_end}
                        onChange={e => set('contract_end', e.target.value)} />
                    </Field>
                  </FieldRow>
                  <Field label="Notes">
                    <textarea className="input resize-none min-h-[80px] text-sm" value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      placeholder="Internal notes about this client..." />
                  </Field>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 flex gap-3 shrink-0">
          {tab === 2 ? (
            <button type="button" onClick={() => setTab(1)}
              className="flex items-center gap-1.5 btn-secondary">
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          )}
          <div className="flex-1" />
          {tab === 1 ? (
            <button type="button" onClick={() => setTab(2)}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={isPending || !form}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
