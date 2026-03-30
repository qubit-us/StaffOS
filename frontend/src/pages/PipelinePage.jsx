import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { GitPullRequest, Loader2, Lock, Unlock, ShieldCheck, Users } from 'lucide-react';
import { clsx } from 'clsx';

const INTERNAL_STAGES = [
  { key: 'new',               label: 'New',              color: 'bg-slate-100 border-slate-200',    dot: 'bg-slate-400' },
  { key: 'screening',         label: 'Screening',        color: 'bg-blue-50 border-blue-200',       dot: 'bg-blue-400' },
  { key: 'validated',         label: 'Validated',        color: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  { key: 'on_hold',           label: 'On Hold',          color: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-400' },
  { key: 'rejected_internal', label: 'Not a Fit',        color: 'bg-red-50 border-red-200',         dot: 'bg-red-400' },
];

const CLIENT_STAGES = [
  { key: 'submitted',     label: 'Submitted',    color: 'bg-slate-100 border-slate-200',    dot: 'bg-slate-400' },
  { key: 'client_review', label: 'Client Review', color: 'bg-blue-50 border-blue-200',      dot: 'bg-blue-400' },
  { key: 'shortlisted',   label: 'Shortlisted',  color: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-400' },
  { key: 'interview_r1',  label: 'Interview R1', color: 'bg-purple-50 border-purple-200',   dot: 'bg-purple-400' },
  { key: 'interview_r2',  label: 'Interview R2', color: 'bg-violet-50 border-violet-200',   dot: 'bg-violet-400' },
  { key: 'offer',         label: 'Offer',        color: 'bg-brand-50 border-brand-200',     dot: 'bg-brand-500' },
  { key: 'placed',        label: 'Placed',       color: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
];

const SOURCE_BADGE = {
  agency_direct:    { label: 'Agency',   cls: 'bg-brand-50 text-brand-700' },
  vendor_submitted: { label: 'Vendor',   cls: 'bg-purple-50 text-purple-700' },
  self_applied:     { label: 'Self',     cls: 'bg-sky-50 text-sky-700' },
};

function InternalCard({ sub, onStageChange, onUnlock }) {
  const src = SOURCE_BADGE[sub.submission_source] || SOURCE_BADGE.agency_direct;
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-card mb-3 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p className="font-bold text-slate-800 text-sm">{sub.first_name} {sub.last_name}</p>
          <p className="text-xs text-slate-500 truncate">{sub.candidate_title}</p>
        </div>
        <span className={clsx('badge shrink-0', src.cls)}>{src.label}</span>
      </div>

      {sub.vendor_name && (
        <p className="text-xs text-slate-400 mb-1">via {sub.vendor_name}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {sub.skills?.slice(0, 3).map(s => (
          <span key={s} className="badge bg-surface-100 text-slate-600">{s}</span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {!sub.profile_unlocked ? (
          <button onClick={() => onUnlock(sub.id)} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
            <Lock size={11} /> Unlock
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
            <Unlock size={11} /> Unlocked
          </span>
        )}
        <select
          value={sub.internal_stage}
          onChange={e => onStageChange(sub.id, e.target.value)}
          className="ml-auto text-xs border border-surface-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          {INTERNAL_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function ClientCard({ sub, onStageChange, onUnlock }) {
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

      <div className="flex items-center gap-2">
        {!sub.profile_unlocked ? (
          <button onClick={() => onUnlock(sub.id)} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
            <Lock size={11} /> Unlock
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
          {CLIENT_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [searchParams] = useSearchParams();
  const [jobId, setJobId] = useState(searchParams.get('job_id') || '');
  const [tab, setTab] = useState('screening');
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

  const internalStageMutation = useMutation({
    mutationFn: ({ id, internal_stage }) => api.patch(`/api/submissions/${id}/internal-stage`, { internal_stage }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submissions'] }); toast.success('Stage updated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const clientStageMutation = useMutation({
    mutationFn: ({ id, stage }) => api.patch(`/api/submissions/${id}/stage`, { stage }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submissions'] }); toast.success('Stage updated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const unlockMutation = useMutation({
    mutationFn: (id) => api.post(`/api/submissions/${id}/unlock`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submissions'] }); toast.success('Profile unlocked'); },
  });

  const subs = subsData?.submissions || [];
  const validatedCount = subs.filter(s => s.internal_stage === 'validated').length;

  const byInternalStage = INTERNAL_STAGES.reduce((acc, s) => {
    acc[s.key] = subs.filter(sub => sub.internal_stage === s.key);
    return acc;
  }, {});

  const validatedSubs = subs.filter(s => s.internal_stage === 'validated');
  const byClientStage = CLIENT_STAGES.reduce((acc, s) => {
    acc[s.key] = validatedSubs.filter(sub => sub.stage === s.key);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pipeline</h2>
          <p className="text-slate-500 mt-0.5">Screen candidates internally, then advance to client pipeline</p>
        </div>
      </div>

      {/* Job selector */}
      <div className="card p-5">
        <label className="label">Select Job</label>
        <select className="input max-w-sm" value={jobId} onChange={e => setJobId(e.target.value)}>
          <option value="">-- Select a job --</option>
          {jobsData?.jobs?.map(j => (
            <option key={j.id} value={j.id}>{j.title}</option>
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
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab('screening')}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all', tab === 'screening' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <ShieldCheck size={15} />
              Internal Screening
              <span className="badge bg-slate-200 text-slate-600">{subs.length}</span>
            </button>
            <button
              onClick={() => setTab('client')}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all', tab === 'client' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <Users size={15} />
              Client Pipeline
              <span className="badge bg-emerald-100 text-emerald-700">{validatedCount} validated</span>
            </button>
          </div>

          {/* Internal Screening Kanban */}
          {tab === 'screening' && (
            <div className="flex gap-3 overflow-x-auto pb-3">
              {INTERNAL_STAGES.map(stage => (
                <div key={stage.key} className={clsx('flex-shrink-0 w-64 rounded-2xl border p-3', stage.color)}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={clsx('w-2.5 h-2.5 rounded-full', stage.dot)} />
                    <span className="font-bold text-slate-700 text-sm">{stage.label}</span>
                    <span className="ml-auto badge bg-white/70 text-slate-600">{byInternalStage[stage.key]?.length || 0}</span>
                  </div>
                  {byInternalStage[stage.key]?.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">No candidates</div>
                  ) : (
                    byInternalStage[stage.key].map(sub => (
                      <InternalCard
                        key={sub.id}
                        sub={sub}
                        onStageChange={(id, internal_stage) => internalStageMutation.mutate({ id, internal_stage })}
                        onUnlock={(id) => unlockMutation.mutate(id)}
                      />
                    ))
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Client Pipeline Kanban */}
          {tab === 'client' && (
            <>
              {validatedCount === 0 ? (
                <div className="card p-12 text-center">
                  <ShieldCheck size={36} className="text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-slate-600">No validated candidates yet</p>
                  <p className="text-sm text-slate-400 mt-1">Validate candidates in the Screening tab to advance them to the client pipeline.</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-3">
                  {CLIENT_STAGES.map(stage => (
                    <div key={stage.key} className={clsx('flex-shrink-0 w-64 rounded-2xl border p-3', stage.color)}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={clsx('w-2.5 h-2.5 rounded-full', stage.dot)} />
                        <span className="font-bold text-slate-700 text-sm">{stage.label}</span>
                        <span className="ml-auto badge bg-white/70 text-slate-600">{byClientStage[stage.key]?.length || 0}</span>
                      </div>
                      {byClientStage[stage.key]?.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">No candidates</div>
                      ) : (
                        byClientStage[stage.key].map(sub => (
                          <ClientCard
                            key={sub.id}
                            sub={sub}
                            onStageChange={(id, stage) => clientStageMutation.mutate({ id, stage })}
                            onUnlock={(id) => unlockMutation.mutate(id)}
                          />
                        ))
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
