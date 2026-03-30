import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import { Building2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance & Banking', 'Insurance', 'Manufacturing',
  'Retail & E-Commerce', 'Government', 'Education', 'Energy & Utilities',
  'Telecom', 'Consulting', 'Media & Entertainment', 'Non-Profit', 'Other',
];

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,001–5,000', '5,000+'];

function toSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  // 11 digits starting with 1 (US country code)
  const d = digits.startsWith('1') ? digits.slice(1, 11) : digits.slice(0, 10);
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { updateUser } = useAuthStore();
  const [form, setForm] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: org, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/api/admin/settings').then(r => r.data),
  });

  if (org && form === null) {
    setForm({
      name:            org.name            || '',
      slug:            org.slug            || '',
      domain:          org.domain          || '',
      website:         org.website         || '',
      phone:           org.phone           || '',
      industry:        org.industry        || '',
      company_size:    org.company_size    || '',
      address_street:  org.address_street  || '',
      address_suite:   org.address_suite   || '',
      address_city:    org.address_city    || '',
      address_state:   org.address_state   || '',
      address_zip:     org.address_zip     || '',
      address_country: org.address_country || 'US',
      ein:             org.ein             || '',
    });
  }

  const handleNameChange = (v) => {
    setForm(f => ({ ...f, name: v, slug: toSlug(v) }));
  };

  const handlePhoneChange = (v) => {
    set('phone', formatPhone(v));
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data) => api.patch('/api/admin/settings', data).then(r => r.data),
    onSuccess: (data) => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      if (data?.name) updateUser({ orgName: data.name });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  if (isLoading || !form) {
    return <div className="p-10 text-center text-slate-400 text-sm">Loading...</div>;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card p-6 space-y-5">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Building2 size={16} className="text-slate-500" /> Organization Details
        </h3>

        {/* Name + Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Organization Name</label>
            <input className="input" value={form.name} onChange={e => handleNameChange(e.target.value)} />
          </div>
          <div>
            <label className="label">Slug</label>
            <input className="input" value={form.slug} onChange={e => set('slug', toSlug(e.target.value))} />
          </div>
        </div>

        {/* EIN */}
        <div className="max-w-xs">
          <label className="label">EIN — Employer Identification Number</label>
          <input className="input" value={form.ein} onChange={e => set('ein', e.target.value)} placeholder="XX-XXXXXXX" />
          <p className="text-xs text-slate-400 mt-1">9-digit federal tax ID assigned by the IRS (format: 12-3456789)</p>
        </div>

        {/* Domain + Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Domain</label>
            <input className="input" value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="company.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="(470) 323-8433" />
          </div>
        </div>

        {/* Website */}
        <div>
          <label className="label">Website</label>
          <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://company.com" />
        </div>

        {/* Industry + Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Industry</label>
            <select className="input" value={form.industry} onChange={e => set('industry', e.target.value)}>
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Company Size</label>
            <select className="input" value={form.company_size} onChange={e => set('company_size', e.target.value)}>
              <option value="">Select size</option>
              {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
            </select>
          </div>
        </div>

        {/* Address */}
        <div className="border-t border-surface-200 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Address</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label">Street</label>
                <input className="input" value={form.address_street} onChange={e => set('address_street', e.target.value)} placeholder="123 Main St" />
              </div>
              <div>
                <label className="label">Suite / Unit</label>
                <input className="input" value={form.address_suite} onChange={e => set('address_suite', e.target.value)} placeholder="Ste 200" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">City</label>
                <input className="input" value={form.address_city} onChange={e => set('address_city', e.target.value)} placeholder="New York" />
              </div>
              <div>
                <label className="label">State</label>
                <input className="input" value={form.address_state} onChange={e => set('address_state', e.target.value)} placeholder="NY" />
              </div>
              <div>
                <label className="label">ZIP</label>
                <input className="input" value={form.address_zip} onChange={e => set('address_zip', e.target.value)} placeholder="10001" />
              </div>
            </div>
            <div className="max-w-xs">
              <label className="label">Country</label>
              <input className="input" value={form.address_country} onChange={e => set('address_country', e.target.value)} placeholder="US" />
            </div>
          </div>
        </div>

        <div className="pt-1">
          <button
            onClick={() => save(form)}
            disabled={isPending}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
            {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
