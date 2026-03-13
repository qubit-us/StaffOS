import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import { Briefcase, Users, Sparkles, TrendingUp, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Link } from 'react-router-dom';

const activityData = [
  { day: 'Mon', matches: 12, uploads: 5 },
  { day: 'Tue', matches: 19, uploads: 8 },
  { day: 'Wed', matches: 15, uploads: 12 },
  { day: 'Thu', matches: 27, uploads: 6 },
  { day: 'Fri', matches: 23, uploads: 9 },
  { day: 'Sat', matches: 8,  uploads: 2 },
  { day: 'Sun', matches: 5,  uploads: 1 },
];

const pipelineData = [
  { stage: 'Submitted', count: 34 },
  { stage: 'Review',    count: 21 },
  { stage: 'Shortlist', count: 14 },
  { stage: 'Interview', count: 8  },
  { stage: 'Offer',     count: 3  },
];

function StatCard({ icon: Icon, label, value, change, color, to }) {
  const card = (
    <div className={`card p-5 ${to ? 'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {change && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <ArrowUpRight size={12} /> {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-slate-900 mt-4">{value}</p>
      <p className="text-sm text-slate-500 font-medium mt-0.5">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: jobsData } = useQuery({
    queryKey: ['jobs-summary'],
    queryFn: () => api.get('/api/jobs?limit=5').then(r => r.data),
  });

  const { data: candidatesData } = useQuery({
    queryKey: ['candidates-summary'],
    queryFn: () => api.get('/api/candidates?limit=5').then(r => r.data),
  });

  const totalJobs = jobsData?.total || 0;
  const totalCandidates = candidatesData?.total || 0;
  const recentJobs = jobsData?.jobs?.slice(0, 5) || [];

  const statusColors = {
    open:        'bg-emerald-100 text-emerald-700',
    matching:    'bg-brand-100 text-brand-700',
    draft:       'bg-slate-100 text-slate-600',
    submitted:   'bg-amber-100 text-amber-700',
    interviewing:'bg-purple-100 text-purple-700',
    filled:      'bg-teal-100 text-teal-700',
    closed:      'bg-red-100 text-red-600',
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* TEMP DEBUG BANNER - remove after confirming render */}
      <div style={{ background: '#22c55e', color: '#fff', padding: '12px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>
        Hello World! Dashboard is rendering. User: {user?.email || 'unknown'} | Token: {useAuthStore.getState().token ? 'present' : 'missing'}
      </div>

      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Good morning, {user?.firstName} 👋
          </h2>
          <p className="text-slate-500 mt-1">Here's what's happening at {user?.orgName} today.</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Users size={16} /> Add Candidate
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase}   label="Open Jobs"       value={totalJobs}       change="+3"  color="bg-brand-600"  to="/jobs" />
        <StatCard icon={Users}       label="Candidates"      value={totalCandidates} change="+12" color="bg-indigo-500" to="/candidates" />
        <StatCard icon={Sparkles}    label="AI Matches"      value="247"             change="+28" color="bg-violet-500" to="/matches" />
        <StatCard icon={TrendingUp}  label="Placements YTD"  value="34"              change="+5"  color="bg-emerald-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', fontSize: '13px' }} />
              <Bar dataKey="matches" fill="#6366f1" radius={[4, 4, 0, 0]} name="AI Matches" />
              <Bar dataKey="uploads" fill="#c7d2fe" radius={[4, 4, 0, 0]} name="Uploads" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline funnel */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4">Pipeline Overview</h3>
          <div className="space-y-2.5">
            {pipelineData.map((item, i) => (
              <div key={item.stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 font-medium">{item.stage}</span>
                  <span className="font-bold text-slate-800">{item.count}</span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
                    style={{ width: `${(item.count / 34) * 100}%`, opacity: 1 - i * 0.12 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Recent Jobs</h3>
          <Link to="/jobs" className="text-sm text-brand-600 font-semibold hover:text-brand-700">View all →</Link>
        </div>
        <div className="divide-y divide-surface-100">
          {recentJobs.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">No jobs yet. <Link to="/jobs" className="text-brand-600 font-medium">Create one →</Link></div>
          ) : recentJobs.map((job) => (
            <div key={job.id} className="px-6 py-4 flex items-center gap-4 hover:bg-surface-50 transition-colors">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                <Briefcase size={18} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{job.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{job.location_city}, {job.location_state} · {job.submission_count} submissions · {job.match_count} matches</p>
              </div>
              <span className={`badge ${statusColors[job.status] || 'bg-slate-100 text-slate-600'}`}>
                {job.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
