import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Loader2, Building2, Scale, Users } from 'lucide-react';
import { clsx } from 'clsx';

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance & Banking', 'Insurance', 'Manufacturing',
  'Retail & E-Commerce', 'Government', 'Education', 'Energy & Utilities',
  'Telecom', 'Consulting', 'Media & Entertainment', 'Non-Profit', 'Other',
];

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,001–5,000', '5,000+'];

const PAYMENT_TERMS = [
  { value: 15,  label: 'Net 15' },
  { value: 30,  label: 'Net 30' },
  { value: 45,  label: 'Net 45' },
  { value: 60,  label: 'Net 60' },
  { value: 90,  label: 'Net 90' },
];

const CLIENT_ROLES = ['Client Admin', 'Hiring Manager', 'Viewer'];

const TABS = [
  { id: 1, label: 'Company & Address', icon: Building2 },
  { id: 2, label: 'Legal & Billing',   icon: Scale      },
  { id: 3, label: 'Team & Access',     icon: Users      },
];

const EMPTY_USER = { first_name: '', last_name: '', email: '', role: 'Hiring Manager' };

function FieldRow({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

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

export default function OnboardClientModal({ onClose }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState(1);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    // Tab 1
    name: '', phone: '', website: '', industry: '', company_size: '',
    address_street: '', address_suite: '', address_city: '',
    address_state: '', address_zip: '', address_country: 'US',
    // Tab 2
    ein: '', contract_type: 'both', net_payment_terms: 30,
    contract_start: '', contract_end: '',
    // Tab 3
    account_manager_id: '', notes: '',
    poc_first_name: '', poc_last_name: '', poc_email: '',
    additional_users: [],
  });

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  // Fetch agency users for account manager dropdown
  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/admin/users').then(r => r.data),
  });
  const agencyUsers = usersData?.users || [];

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => api.post('/api/clients', data).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`${data.organization.name} onboarded! ${data.users_created} user(s) created with password TempPass123!`);
      qc.invalidateQueries({ queryKey: ['agency-clients'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to onboard client'),
  });

  // ── Validation ──────────────────────────────────────────────
  const validate = (tabId) => {
    const e = {};
    if (tabId === 1 && !form.name.trim()) e.name = 'Company name is required';
    if (tabId === 3 && !form.poc_email.trim()) e.poc_email = 'POC email is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => { if (validate(tab)) setTab(t => t + 1); };
  const goBack = () => setTab(t => t - 1);

  const handleSubmit = () => {
    if (!validate(3)) return;
    mutate({
      ...form,
      net_payment_terms: parseInt(form.net_payment_terms),
      account_manager_id: form.account_manager_id || undefined,
      contract_start: form.contract_start || undefined,
      contract_end:   form.contract_end   || undefined,
      additional_users: form.additional_users.filter(u => u.email.trim()),
    });
  };

  // ── Additional users helpers ────────────────────────────────
  const addUser = () => setForm(f => ({ ...f, additional_users: [...f.additional_users, { ...EMPTY_USER }] }));
  const removeUser = (i) => setForm(f => ({ ...f, additional_users: f.additional_users.filter((_, idx) => idx !== i) }));
  const setUser = (i, k, v) => setForm(f => {
    const users = [...f.additional_users];
    users[i] = { ...users[i], [k]: v };
    return { ...f, additional_users: users };
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Onboard New Client</h2>
            <p className="text-xs text-slate-400 mt-0.5">Step {tab} of {TABS.length}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Tab indicators */}
        <div className="flex border-b border-surface-200 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => id < tab && setTab(id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors',
                tab === id
                  ? 'border-brand-600 text-brand-600'
                  : id < tab
                  ? 'border-emerald-500 text-emerald-600 cursor-pointer'
                  : 'border-transparent text-slate-400 cursor-default'
              )}
            >
              <div className={clsx(
                'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                tab === id ? 'bg-brand-600 text-white' : id < tab ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              )}>
                {id < tab ? '✓' : id}
              </div>
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── TAB 1: Company & Address ── */}
          {tab === 1 && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Details</p>
              <Field label="Company Name" required>
                <input className={clsx('input', errors.name && 'border-red-400')} value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="Acme Corporation" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </Field>
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

              <div className="pt-2 border-t border-surface-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Address</p>
              </div>
              <Field label="Street Address">
                <input className="input" value={form.address_street}
                  onChange={e => set('address_street', e.target.value)} placeholder="123 Main Street" />
              </Field>
              <Field label="Suite / Floor / Unit">
                <input className="input" value={form.address_suite}
                  onChange={e => set('address_suite', e.target.value)} placeholder="Suite 400" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Field label="City">
                    <input className="input" value={form.address_city}
                      onChange={e => set('address_city', e.target.value)} placeholder="New York" />
                  </Field>
                </div>
                <div>
                  <Field label="State">
                    <input className="input" value={form.address_state}
                      onChange={e => set('address_state', e.target.value)} placeholder="NY" />
                  </Field>
                </div>
                <div>
                  <Field label="ZIP Code">
                    <input className="input" value={form.address_zip}
                      onChange={e => set('address_zip', e.target.value)} placeholder="10001" />
                  </Field>
                </div>
              </div>
              <Field label="Country">
                <input className="input" value={form.address_country}
                  onChange={e => set('address_country', e.target.value)} placeholder="US" />
              </Field>
            </>
          )}

          {/* ── TAB 2: Legal & Billing ── */}
          {tab === 2 && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legal</p>
              <Field label="EIN (Employer Identification Number)">
                <input className="input font-mono" value={form.ein}
                  onChange={e => set('ein', e.target.value)} placeholder="XX-XXXXXXX" />
              </Field>

              <div className="pt-2 border-t border-surface-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contract</p>
              </div>
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

              <div className="pt-2 border-t border-surface-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Billing</p>
              </div>
              <FieldRow>
                <Field label="Contract Type">
                  <select className="input" value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
                    <option value="both">W2 & Corp-to-Corp</option>
                    <option value="w2">W2 Only</option>
                    <option value="c2c">Corp-to-Corp Only</option>
                  </select>
                </Field>
                <Field label="Net Payment Terms">
                  <select className="input" value={form.net_payment_terms} onChange={e => set('net_payment_terms', e.target.value)}>
                    {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
              </FieldRow>
            </>
          )}

          {/* ── TAB 3: Team & Access ── */}
          {tab === 3 && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Relationship</p>
              <FieldRow>
                <Field label="Account Manager">
                  <select className="input" value={form.account_manager_id} onChange={e => set('account_manager_id', e.target.value)}>
                    <option value="">Unassigned</option>
                    {agencyUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </Field>
                <div />
              </FieldRow>
              <Field label="Notes">
                <textarea className="input resize-none min-h-[70px] text-sm" value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Any special terms, escalation contacts, context for the team..." />
              </Field>

              <div className="pt-2 border-t border-surface-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Primary Point of Contact <span className="text-red-400">*</span>
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  Will be created as <span className="font-semibold text-slate-600">Client Admin</span> with full portal access.
                  Temporary password: <span className="font-mono font-semibold">TempPass123!</span>
                </p>
              </div>
              <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/40 space-y-3">
                <FieldRow>
                  <Field label="First Name">
                    <input className="input bg-white" value={form.poc_first_name}
                      onChange={e => set('poc_first_name', e.target.value)} placeholder="Jane" />
                  </Field>
                  <Field label="Last Name">
                    <input className="input bg-white" value={form.poc_last_name}
                      onChange={e => set('poc_last_name', e.target.value)} placeholder="Smith" />
                  </Field>
                </FieldRow>
                <Field label="Email Address" required>
                  <input className={clsx('input bg-white', errors.poc_email && 'border-red-400')}
                    type="email" value={form.poc_email}
                    onChange={e => set('poc_email', e.target.value)} placeholder="jane@acme.com" />
                  {errors.poc_email && <p className="text-xs text-red-500 mt-1">{errors.poc_email}</p>}
                </Field>
              </div>

              {/* Additional users */}
              <div className="pt-2 border-t border-surface-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Additional Team Members</p>
                  <button onClick={addUser}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    <Plus size={13} /> Add User
                  </button>
                </div>
              </div>

              {form.additional_users.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">
                  No additional users yet. Click "Add User" to invite more team members.
                </p>
              )}

              <div className="space-y-3">
                {form.additional_users.map((u, i) => (
                  <div key={i} className="p-4 rounded-xl border border-surface-200 bg-surface-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600">User {i + 2}</p>
                      <button onClick={() => removeUser(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <FieldRow>
                      <Field label="First Name">
                        <input className="input bg-white text-sm" value={u.first_name}
                          onChange={e => setUser(i, 'first_name', e.target.value)} placeholder="John" />
                      </Field>
                      <Field label="Last Name">
                        <input className="input bg-white text-sm" value={u.last_name}
                          onChange={e => setUser(i, 'last_name', e.target.value)} placeholder="Doe" />
                      </Field>
                    </FieldRow>
                    <FieldRow>
                      <Field label="Email Address">
                        <input className="input bg-white text-sm" type="email" value={u.email}
                          onChange={e => setUser(i, 'email', e.target.value)} placeholder="john@acme.com" />
                      </Field>
                      <Field label="Role">
                        <select className="input bg-white text-sm" value={u.role}
                          onChange={e => setUser(i, 'role', e.target.value)}>
                          {CLIENT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </Field>
                    </FieldRow>
                  </div>
                ))}
              </div>

              {/* Role reference */}
              <div className="rounded-xl border border-surface-200 p-4 bg-surface-50">
                <p className="text-xs font-semibold text-slate-500 mb-2">Role Permissions</p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div><span className="font-semibold text-slate-700">Client Admin</span> — Full access: view, create requirements, review & approve candidates</div>
                  <div><span className="font-semibold text-slate-700">Hiring Manager</span> — View submissions, review & approve candidates, request interviews</div>
                  <div><span className="font-semibold text-slate-700">Viewer</span> — Read-only access to submissions and requirements</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-surface-200 flex gap-3 shrink-0">
          {tab > 1 ? (
            <button onClick={goBack} className="flex items-center gap-1.5 btn-secondary">
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button onClick={onClose} className="btn-secondary">Cancel</button>
          )}
          <div className="flex-1" />
          {tab < TABS.length ? (
            <button onClick={goNext}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isPending}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
              {isPending ? 'Onboarding...' : 'Onboard Client'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
