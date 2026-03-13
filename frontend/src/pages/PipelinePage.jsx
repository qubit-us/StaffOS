import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { GitPullRequest, Loader2, ChevronRight, Lock, Unlock } from 'lucide-react';
import { clsx } from 'clsx';

const STAGES = [
  { key: 'submitted',     label: 'Submitted',     color: 'bg-slate-100 border-slate-200',    dot: 'bg-slate-400' },
  { key: 'client_review', label: 'Client Review',  color: 'bg-blue-50 border-blue-200',       dot: 'bg-blue-400' },
  { key: 'shortlisted',   label: 'Shortlisted',    color: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-400' },
  { key: 'interview_r1',  label: 'Interview R1',   color: 'bg-purple-50 border-purple-200',   dot: 'bg-purple-400' },
  { key: 'interview_r2',  label: 'Interview R2',   color: 'bg-violet-50 border-violet-200',   dot: 'bg-violet-400' },
  { key: 'offer',         label: 'Offer',          color: 'bg-brand-50 border-brand-200',     dot: 'bg-brand-500' },
  { key: 'placed',        label: 'Placed',         color: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
];

function SubmissionCard({ sub, onStageChange, onUnlock }) {
  const stage = STAGES.find(s => s.key === sub.stage);

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-card mb-3 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-bold text-slate-800 text-sm">{sub.first_name} {sub.last_name}</p>
          <p className="text-xs text-slate-500 truncate">{sub.candidate_title}</p>
        </div>
        {sub.match_score && (
          <span className="badge bg-brand-50 text-brand-700 shrink-0">{Math.round(sub.match_score * 100)}% match</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {sub.skills?.slice(0, 3).map(s => (
          <span key={s} className="badge bg-surface-100 text-slate-600">{s}</span>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2">
        {!sub.profile_unlocked ? (
          <button onClick={() => onUnlock(sub.id)} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
            <Lock size={11} /> Unlock Profile
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
            <Unlock size={11} /> Unlocked
          </span>
        )}

        <select
          value={sub.stage}
          onChange={e => onStageChange(sub.id, e.target.value)}
          className="ml-auto text-xs border border-surface-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [jobId, setJobId] = useState('');
  const qc = useQueryClient();

  const { data: jobsData } = useQuery({
    queryKey: ['jobs-pipeline'],
    queryFn: () => api.get('/api/jobs?limit=50').then(r => r.data),
  });

  const { data: subsData, isLoading } = useQuery({
    queryKey: ['submissions', jobId],
    queryFn: () => api.get(`/api/submissions?job_id=${jobId}&limit=200`).then(r => r.data),
    enabled: !!jobId,
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }) => api.patch(`/api/submissions/${id}/stage`, { stage }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submissions'] }); toast.success('Stage updated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const unlockMutation = useMutation({
    mutationFn: (id) => api.post(`/api/submissions/${id}/unlock`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submissions'] }); toast.success('Profile unlocked'); },
  });

  const subs = subsData?.submissions || [];

  const byStage = STAGES.reduce((acc, s) => {
    acc[s.key] = subs.filter(sub => sub.stage === s.key);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pipeline</h2>
          <p className="text-slate-500 mt-0.5">Track candidates through your interview pipeline</p>
        </div>
      </div>

      {/* Job selector */}
      <div className="card p-5">
        <label className="label">Select Job</label>
        <select className="input max-w-sm" value={jobId} onChange={e => setJobId(e.target.value)}>
          <option value="">-- Select a job --</option>
          {jobsData?.jobs?.map(j => (
            <option key={j.id} value={j.id}>{j.title} ({j.submission_count} submissions)</option>
          ))}
        </select>
      </div>

      {!jobId && (
        <div className="card p-12 text-center">
          <GitPullRequest size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">Select a job to view its pipeline</p>
        </div>
      )}

      {jobId && isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-500" size={28} /></div>
      )}

      {jobId && !isLoading && (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {STAGES.map(stage => (
            <div key={stage.key} className={clsx('flex-shrink-0 w-64 rounded-2xl border p-3', stage.color)}>
              <div className="flex items-center gap-2 mb-3">
                <span className={clsx('w-2.5 h-2.5 rounded-full', stage.dot)} />
                <span className="font-bold text-slate-700 text-sm">{stage.label}</span>
                <span className="ml-auto badge bg-white/70 text-slate-600">{byStage[stage.key]?.length || 0}</span>
              </div>
              {byStage[stage.key]?.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">No candidates</div>
              ) : (
                byStage[stage.key].map(sub => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    onStageChange={(id, s) => stageMutation.mutate({ id, stage: s })}
                    onUnlock={(id) => unlockMutation.mutate(id)}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
