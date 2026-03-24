import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import api from '../../lib/api.js';
import {
  FileText, Users, Clock, CheckCircle2, ArrowRight,
  MapPin, Briefcase, Calendar
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

function StatCard({ icon: Icon, label, value, color, to }) {
  const inner = (
    <div className="card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 mt-4">{value ?? '—'}</p>
      <p className="text-sm text-slate-500 font-medium mt-0.5">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function ClientDashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: () => api.get('/api/client-portal/dashboard').then(r => r.data),
  });

  const stats = data?.stats || {};
  const recentPending = data?.recent_pending || [];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.firstName} 👋
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Here's a summary of your open requirements and candidate pipeline.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText}     label="Open Requirements" value={stats.open_requirements} color="bg-brand-500"   to="/client/requirements" />
        <StatCard icon={Users}        label="Total Submissions"  value={stats.total_submissions}  color="bg-indigo-500"  to="/client/submissions" />
        <StatCard icon={Clock}        label="Pending Review"     value={stats.pending_review}      color="bg-amber-500"   to="/client/submissions?status=pending_review" />
        <StatCard icon={CheckCircle2} label="Approved"           value={stats.approved}            color="bg-emerald-500" to="/client/submissions?status=approved" />
      </div>

      {/* Pending review */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-surface-100">
          <div>
            <h3 className="font-semibold text-slate-900">Candidates Awaiting Your Review</h3>
            <p className="text-xs text-slate-400 mt-0.5">Review and approve candidates submitted by the agency</p>
          </div>
          <Link
            to="/client/submissions?status=pending_review"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : recentPending.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-medium">All caught up! No candidates awaiting review.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {recentPending.map(sub => (
              <Link
                key={sub.id}
                to={`/client/submissions/${sub.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-brand-700">
                    {sub.first_name?.[0]}{sub.last_name?.[0]}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {sub.first_name} {sub.last_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{sub.candidate_title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Briefcase size={11} /> {sub.job_title}
                    </span>
                    {sub.location_city && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin size={11} /> {sub.location_city}, {sub.location_state}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar size={11} /> {new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusColors[sub.client_status]}`}>
                  {statusLabels[sub.client_status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
