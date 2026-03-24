import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import {
  Users, GitPullRequest, Upload, CheckCircle2, Clock,
  TrendingUp, ArrowRight, Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';

const STAGE_GROUPS = {
  pending:  { stages: ['submitted', 'client_review'],                label: 'Under Review',  color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700'    },
  active:   { stages: ['shortlisted', 'interview_r1', 'interview_r2', 'offer'], label: 'Active',  color: 'bg-violet-500', light: 'bg-violet-50 text-violet-700' },
  placed:   { stages: ['placed'],                                    label: 'Placed',        color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
  rejected: { stages: ['rejected', 'withdrawn'],                     label: 'Rejected',      color: 'bg-slate-400',   light: 'bg-slate-100 text-slate-600'   },
};

const STAGE_LABELS = {
  submitted: 'Submitted', client_review: 'Client Review', shortlisted: 'Shortlisted',
  interview_r1: 'Interview R1', interview_r2: 'Interview R2', offer: 'Offer',
  placed: 'Placed', rejected: 'Rejected', withdrawn: 'Withdrawn',
};

const STAGE_COLORS = {
  submitted: 'bg-slate-100 text-slate-600', client_review: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-amber-100 text-amber-700', interview_r1: 'bg-purple-100 text-purple-700',
  interview_r2: 'bg-violet-100 text-violet-700', offer: 'bg-brand-100 text-brand-700',
  placed: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-600',
  withdrawn: 'bg-slate-100 text-slate-500',
};

function StatCard({ icon: Icon, label, value, sublabel, color, to }) {
  const inner = (
    <div className={clsx(
      'bg-white rounded-2xl border border-slate-100 p-5 shadow-sm transition-all',
      to && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
    )}>
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-semibold text-slate-700 mt-0.5">{label}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function VendorDashboardPage() {
  const { user } = useAuthStore();

  const { data: subsData, isLoading } = useQuery({
    queryKey: ['vendor-submissions'],
    queryFn: () => api.get('/api/submissions?limit=200').then(r => r.data),
  });

  const { data: candidatesData } = useQuery({
    queryKey: ['vendor-candidates'],
    queryFn: () => api.get('/api/candidates?limit=5').then(r => r.data),
  });

  const subs    = subsData?.submissions || [];
  const total   = subsData?.total || 0;

  // Group counts
  const counts = {};
  Object.entries(STAGE_GROUPS).forEach(([key, grp]) => {
    counts[key] = subs.filter(s => grp.stages.includes(s.stage)).length;
  });

  // Recent 8 submissions
  const recent = subs.slice(0, 8);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{greeting}, {user?.firstName}</h2>
          <p className="text-slate-500 mt-0.5">Here's the status of your submitted candidates.</p>
        </div>
        <Link to="/upload" className="btn-primary" style={{ '--btn-bg': '#7c3aed', background: '#7c3aed' }}>
          <Upload size={15} /> Submit Candidate
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total Submitted" value={total}             color="bg-violet-600"  to="/pipeline" />
        <StatCard icon={Clock}        label="Under Review"    value={counts.pending}    sublabel="Awaiting client feedback" color="bg-blue-500" to="/pipeline" />
        <StatCard icon={GitPullRequest} label="In Pipeline"   value={counts.active}     sublabel="Shortlisted or interviewing" color="bg-amber-500" to="/pipeline" />
        <StatCard icon={CheckCircle2} label="Placed"          value={counts.placed}     sublabel="Successfully placed" color="bg-emerald-500" to="/pipeline" />
      </div>

      {/* Pipeline progress bar */}
      {total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Submission Pipeline</h3>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {Object.entries(STAGE_GROUPS).map(([key, grp]) => {
              const pct = total > 0 ? (counts[key] / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={key}
                  className={clsx('h-full transition-all', grp.color)}
                  style={{ width: `${pct}%` }}
                  title={`${grp.label}: ${counts[key]}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {Object.entries(STAGE_GROUPS).map(([key, grp]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={clsx('w-2.5 h-2.5 rounded-full', grp.color)} />
                <span className="text-xs text-slate-500">{grp.label}</span>
                <span className="text-xs font-bold text-slate-700">{counts[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent submissions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recent Submissions</h3>
            <Link to="/pipeline" className="text-sm text-violet-600 font-semibold hover:text-violet-700 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-violet-500" size={24} />
            </div>
          ) : recent.length === 0 ? (
            <div className="py-10 text-center">
              <Users size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No submissions yet</p>
              <Link to="/upload" className="text-sm text-violet-600 hover:underline mt-1 block">
                Upload your first candidate →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recent.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-violet-700">
                    {sub.first_name?.[0]}{sub.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {sub.first_name} {sub.last_name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{sub.job_title}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={clsx('badge text-[10px]', STAGE_COLORS[sub.stage] || 'bg-slate-100 text-slate-600')}>
                      {STAGE_LABELS[sub.stage] || sub.stage}
                    </span>
                    {sub.agency_pay_rate && (
                      <span className="text-[10px] text-slate-400">${sub.agency_pay_rate}/hr</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/upload"
                className="flex items-center gap-3 p-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
              >
                <Upload size={18} />
                <div>
                  <p className="text-sm font-semibold">Upload Resume</p>
                  <p className="text-xs text-violet-200">Add a new candidate</p>
                </div>
              </Link>
              <Link
                to="/candidates"
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <Users size={18} className="text-slate-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">My Candidates</p>
                  <p className="text-xs text-slate-400">View candidate profiles</p>
                </div>
              </Link>
              <Link
                to="/pipeline"
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <GitPullRequest size={18} className="text-slate-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Submission Status</p>
                  <p className="text-xs text-slate-400">Track pipeline progress</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Candidate pool summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800">Candidate Pool</h3>
              <Link to="/candidates" className="text-xs text-violet-600 hover:underline">View all</Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                <Users size={22} className="text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{candidatesData?.total || 0}</p>
                <p className="text-xs text-slate-500">candidates in your pool</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
