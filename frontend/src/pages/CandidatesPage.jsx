import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';
import { Link } from 'react-router-dom';
import { Users, Search, Upload, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';
import { clsx } from 'clsx';

const visaColors = {
  citizen:    'bg-emerald-100 text-emerald-700',
  green_card: 'bg-teal-100 text-teal-700',
  h1b:        'bg-blue-100 text-blue-700',
  h4_ead:     'bg-sky-100 text-sky-700',
  opt:        'bg-purple-100 text-purple-700',
  stem_opt:   'bg-violet-100 text-violet-700',
  l1:         'bg-orange-100 text-orange-700',
  tn:         'bg-pink-100 text-pink-700',
  unknown:    'bg-slate-100 text-slate-600',
};

const sourceColors = {
  direct:    'bg-brand-50 text-brand-700',
  vendor:    'bg-amber-50 text-amber-700',
  recruiter: 'bg-indigo-50 text-indigo-700',
  linkedin:  'bg-blue-50 text-blue-700',
};

const avatarGradients = [
  'from-brand-400 to-brand-600',
  'from-violet-400 to-purple-600',
  'from-indigo-400 to-blue-600',
  'from-teal-400 to-emerald-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-600',
];

function Avatar({ candidate }) {
  const initials = `${candidate.first_name?.[0] || '?'}${candidate.last_name?.[0] || ''}`;
  const grad = avatarGradients[(candidate.id?.charCodeAt(0) || 0) % avatarGradients.length];
  return (
    <div className={`w-8 h-8 bg-gradient-to-br ${grad} rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0`}>
      {initials}
    </div>
  );
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={13} className="text-slate-300" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-brand-600" />
    : <ChevronDown size={13} className="text-brand-600" />;
}

function Th({ field, label, sortField, sortDir, onSort, className = '' }) {
  return (
    <th
      className={clsx('px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-slate-700', className)}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </th>
  );
}

function CompletenessBar({ value }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-500">{value}%</span>
    </div>
  );
}

export default function CandidatesPage() {
  const [search, setSearch]       = useState('');
  const [visaFilter, setVisa]     = useState('');
  const [sourceFilter, setSource] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir]     = useState('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, visaFilter, sourceFilter],
    queryFn: () =>
      api.get('/api/candidates', { params: { search, visa_status: visaFilter, source: sourceFilter, limit: 200 } })
         .then(r => r.data),
  });

  const candidates = data?.candidates || [];
  const total = data?.total || 0;

  const sorted = useMemo(() => {
    const arr = [...candidates];
    arr.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [candidates, sortField, sortDir]);

  const onSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const hasFilters = search || visaFilter || sourceFilter;
  const clearFilters = () => { setSearch(''); setVisa(''); setSource(''); };

  const thProps = { sortField, sortDir, onSort };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Candidates</h2>
          <p className="text-slate-500 mt-0.5">{total} candidate{total !== 1 ? 's' : ''} in pool</p>
        </div>
        <Link to="/upload" className="btn-primary"><Upload size={16} /> Upload Resume</Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input className="input pl-9 w-64" placeholder="Search name, title, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={visaFilter} onChange={e => setVisa(e.target.value)}>
          <option value="">All Visa Types</option>
          {['citizen','green_card','h1b','h4_ead','opt','stem_opt','l1','tn','other','unknown'].map(v => (
            <option key={v} value={v}>{v.replace(/_/g, ' ').toUpperCase()}</option>
          ))}
        </select>
        <select className="input w-auto" value={sourceFilter} onChange={e => setSource(e.target.value)}>
          <option value="">All Sources</option>
          {['recruiter','vendor','direct','linkedin'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">No candidates found</p>
          <p className="text-slate-400 text-sm mt-1">Upload resumes to build your talent pool</p>
          <Link to="/upload" className="btn-primary mt-5 inline-flex mx-auto">
            <Upload size={16} /> Upload First Resume
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-surface-100 bg-surface-50">
                <tr>
                  <Th field="last_name"            label="Name"         {...thProps} className="pl-5" />
                  <Th field="title"                label="Title"        {...thProps} />
                  <Th field="visa_status"          label="Visa"         {...thProps} />
                  <Th field="location_city"        label="Location"     {...thProps} />
                  <Th field="years_of_experience"  label="Exp"          {...thProps} />
                  <Th field="expected_rate_min"    label="Rate"         {...thProps} />
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Skills</th>
                  <Th field="upload_source"        label="Source"       {...thProps} />
                  <Th field="profile_completeness" label="Complete"     {...thProps} />
                  <Th field="created_at"           label="Added"        {...thProps} className="pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {sorted.map(c => (
                  <tr key={c.id} className="hover:bg-surface-50 transition-colors group">
                    {/* Name */}
                    <td className="px-3 py-3 pl-5">
                      <Link to={`/candidates/${c.id}`} className="flex items-center gap-2.5 hover:text-brand-600">
                        <Avatar candidate={c} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 group-hover:text-brand-600 whitespace-nowrap">
                            {c.first_name} {c.last_name}
                          </p>
                          {c.vendor_name && (
                            <p className="text-xs text-slate-400 truncate max-w-[140px]">via {c.vendor_name}</p>
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Title */}
                    <td className="px-3 py-3 text-slate-600 max-w-[180px]">
                      <p className="truncate">{c.title || '—'}</p>
                    </td>

                    {/* Visa */}
                    <td className="px-3 py-3">
                      {c.visa_status ? (
                        <span className={clsx('badge text-xs whitespace-nowrap', visaColors[c.visa_status] || 'bg-slate-100 text-slate-600')}>
                          {c.visa_status.replace(/_/g, ' ')}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Location */}
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                      {c.location_city ? `${c.location_city}${c.location_state ? ', ' + c.location_state : ''}` : '—'}
                    </td>

                    {/* Experience */}
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                      {c.years_of_experience ? `${c.years_of_experience} yr` : '—'}
                    </td>

                    {/* Rate */}
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                      {c.expected_rate_min
                        ? `$${c.expected_rate_min}${c.expected_rate_max ? '–' + c.expected_rate_max : '+'}/hr`
                        : '—'}
                    </td>

                    {/* Skills */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                        {c.skills?.slice(0, 3).map(s => (
                          <span key={s} className="badge bg-surface-100 text-slate-600 text-xs">{s}</span>
                        ))}
                        {c.skills?.length > 3 && (
                          <span className="badge bg-slate-100 text-slate-400 text-xs">+{c.skills.length - 3}</span>
                        )}
                        {!c.skills?.length && <span className="text-slate-400">—</span>}
                      </div>
                    </td>

                    {/* Source */}
                    <td className="px-3 py-3">
                      {c.upload_source ? (
                        <span className={clsx('badge text-xs', sourceColors[c.upload_source] || 'bg-slate-100 text-slate-600')}>
                          {c.upload_source}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Completeness */}
                    <td className="px-3 py-3">
                      {c.profile_completeness > 0
                        ? <CompletenessBar value={c.profile_completeness} />
                        : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Added */}
                    <td className="px-3 py-3 pr-5 text-slate-400 whitespace-nowrap text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
