import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../lib/api.js';
import {
  Search, MapPin, Briefcase, Calendar, ChevronRight,
  Users, Clock, CheckCircle2, XCircle, MessageSquare
} from 'lucide-react';

const statusColors = {
  pending_review:      'bg-amber-100 text-amber-700',
  under_review:        'bg-blue-100 text-blue-700',
  approved:            'bg-emerald-100 text-emerald-700',
  rejected:            'bg-red-100 text-red-600',
  interview_requested: 'bg-purple-100 text-purple-700',
};

const statusLabels = {
  pending_review:      'Pending Review',
  under_review:        'Under Review',
  approved:            'Approved',
  rejected:            'Rejected',
  interview_requested: 'Interview Requested',
};

const statusIcons = {
  pending_review:      Clock,
  under_review:        Clock,
  approved:            CheckCircle2,
  rejected:            XCircle,
  interview_requested: MessageSquare,
};

const visaColors = {
  citizen:    'bg-emerald-100 text-emerald-700',
  green_card: 'bg-teal-100 text-teal-700',
  h1b:        'bg-blue-100 text-blue-700',
  h4_ead:     'bg-cyan-100 text-cyan-700',
  opt:        'bg-indigo-100 text-indigo-700',
  stem_opt:   'bg-violet-100 text-violet-700',
  l1:         'bg-purple-100 text-purple-700',
  tn:         'bg-pink-100 text-pink-700',
  unknown:    'bg-slate-100 text-slate-500',
};

export default function ClientSubmissionsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [jobFilter] = useState(searchParams.get('job_id') || '');

  const { data, isLoading } = useQuery({
    queryKey: ['client-submissions', search, statusFilter, jobFilter],
    queryFn: () => api.get('/api/client-portal/submissions', {
      params: {
        search: search || undefined,
        client_status: statusFilter || undefined,
        job_id: jobFilter || undefined,
        limit: 50,
      }
    }).then(r => r.data),
  });

  const submissions = data?.submissions || [];

  const statusTabs = [
    { key: '',                   label: 'All',              count: data?.total },
    { key: 'pending_review',     label: 'Pending Review'  },
    { key: 'under_review',       label: 'Under Review'    },
    { key: 'approved',           label: 'Approved'        },
    { key: 'interview_requested',label: 'Interview Req.'  },
    { key: 'rejected',           label: 'Rejected'        },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Submissions</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Candidates submitted by the agency for your requirements
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === tab.key
                ? 'bg-white shadow text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-slate-400">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9 text-sm" placeholder="Search by job or candidate title..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No submissions found</p>
          <p className="text-slate-400 text-sm mt-1">
            {statusFilter ? `No candidates with status "${statusLabels[statusFilter]}"` : 'The agency hasn\'t submitted any candidates yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => {
            const StatusIcon = statusIcons[sub.client_status] || Clock;
            return (
              <Link
                key={sub.id}
                to={`/client/submissions/${sub.id}`}
                className="card p-5 flex items-start gap-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 block"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-brand-700 font-bold text-sm">
                  {sub.first_name?.[0]}{sub.last_name?.[0]}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {sub.first_name} {sub.last_name}
                      </p>
                      <p className="text-sm text-slate-500">{sub.candidate_title}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusColors[sub.client_status]}`}>
                      <StatusIcon size={11} />
                      {statusLabels[sub.client_status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Briefcase size={11} /> {sub.job_title}
                    </span>
                    {sub.candidate_city && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={11} /> {sub.candidate_city}, {sub.candidate_state}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar size={11} /> Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                    {sub.sub_rate && (
                      <span className="text-xs font-medium text-slate-700">
                        ${sub.sub_rate}/hr
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {sub.visa_status && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${visaColors[sub.visa_status] || 'bg-slate-100 text-slate-600'}`}>
                        {sub.visa_status.replace('_', ' ')}
                      </span>
                    )}
                    {sub.skills?.slice(0, 4).map(skill => (
                      <span key={skill} className="text-xs bg-surface-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {skill}
                      </span>
                    ))}
                    {sub.skills?.length > 4 && (
                      <span className="text-xs text-slate-400">+{sub.skills.length - 4} more</span>
                    )}
                  </div>
                </div>

                <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
