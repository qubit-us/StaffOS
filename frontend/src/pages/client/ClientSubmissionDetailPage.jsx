import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import toast from 'react-hot-toast';
import {
  ArrowLeft, MapPin, Briefcase, Clock, CheckCircle2, XCircle,
  MessageSquare, User, DollarSign, Calendar, Shield, Loader2,
  Building2, GraduationCap, Award
} from 'lucide-react';

const statusColors = {
  pending_review:      'bg-amber-100 text-amber-700 border-amber-200',
  under_review:        'bg-blue-100 text-blue-700 border-blue-200',
  approved:            'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected:            'bg-red-100 text-red-600 border-red-200',
  interview_requested: 'bg-purple-100 text-purple-700 border-purple-200',
};

const statusLabels = {
  pending_review:      'Pending Review',
  under_review:        'Under Review',
  approved:            'Approved',
  rejected:            'Rejected',
  interview_requested: 'Interview Requested',
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

export default function ClientSubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const { data: sub, isLoading } = useQuery({
    queryKey: ['client-submission', id],
    queryFn: () => api.get(`/api/client-portal/submissions/${id}`).then(r => r.data),
    onSuccess: (data) => {
      if (data.client_feedback) setFeedback(data.client_feedback);
    }
  });

  const { mutate: review, isPending } = useMutation({
    mutationFn: ({ client_status, client_feedback }) =>
      api.patch(`/api/client-portal/submissions/${id}/review`, { client_status, client_feedback }).then(r => r.data),
    onSuccess: (updated) => {
      toast.success(`Candidate ${statusLabels[updated.client_status].toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['client-submission', id] });
      qc.invalidateQueries({ queryKey: ['client-submissions'] });
      qc.invalidateQueries({ queryKey: ['client-dashboard'] });
      setReviewing(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Action failed'),
  });

  const handleAction = (status) => {
    review({ client_status: status, client_feedback: feedback });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!sub) return <div className="p-8 text-center text-slate-500">Submission not found.</div>;

  const isLocked = !sub.profile_unlocked;
  const canReview = !['approved', 'rejected'].includes(sub.client_status);

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-slide-up">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={16} /> Back to Submissions
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-brand-700">
              {sub.first_name?.[0]}{sub.last_name?.[0]}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {sub.first_name} {sub.last_name}
                  {isLocked && <span className="ml-2 text-xs font-normal text-slate-400">(identity hidden)</span>}
                </h2>
                <p className="text-slate-500">{sub.candidate_title}</p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusColors[sub.client_status]}`}>
                {statusLabels[sub.client_status]}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              {sub.candidate_city && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin size={14} /> {sub.candidate_city}, {sub.candidate_state}
                </span>
              )}
              {sub.years_of_experience && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Briefcase size={14} /> {sub.years_of_experience} yrs experience
                </span>
              )}
              {sub.sub_rate && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <DollarSign size={14} /> ${sub.sub_rate}/hr
                </span>
              )}
              {sub.visa_status && (
                <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${visaColors[sub.visa_status]}`}>
                  <Shield size={11} /> {sub.visa_status.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact info (only if unlocked) */}
        {!isLocked && (sub.email || sub.phone) && (
          <div className="mt-4 pt-4 border-t border-surface-100 flex gap-6">
            {sub.email && <p className="text-sm text-slate-600"><span className="font-medium">Email:</span> {sub.email}</p>}
            {sub.phone && <p className="text-sm text-slate-600"><span className="font-medium">Phone:</span> {sub.phone}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Candidate details */}
        <div className="col-span-2 space-y-5">
          {/* Summary */}
          {sub.summary && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Summary</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{sub.summary}</p>
            </div>
          )}

          {/* Skills */}
          {sub.skills?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {sub.skills.map(skill => (
                  <span key={skill} className="text-sm bg-brand-50 text-brand-700 px-3 py-1 rounded-full font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {sub.companies_worked?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Work Experience</h3>
              <div className="space-y-4">
                {sub.companies_worked.map((exp, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 size={14} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{exp.title}</p>
                      <p className="text-xs text-slate-500">{exp.company} · {exp.start_date} – {exp.end_date || 'Present'}</p>
                      {exp.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{exp.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {sub.education?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Education</h3>
              <div className="space-y-3">
                {sub.education.map((edu, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <GraduationCap size={14} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{edu.school}</p>
                      <p className="text-xs text-slate-500">{edu.degree} · {edu.graduation_year}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Job info + Review panel */}
        <div className="space-y-5">
          {/* Job details */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Requirement</h3>
            <div className="space-y-2.5">
              <div>
                <p className="text-xs text-slate-400 font-medium">Job Title</p>
                <p className="text-sm font-semibold text-slate-800">{sub.job_title}</p>
              </div>
              {sub.location_city && (
                <div>
                  <p className="text-xs text-slate-400 font-medium">Location</p>
                  <p className="text-sm text-slate-700">{sub.location_city}, {sub.location_state}</p>
                </div>
              )}
              {sub.client_bill_rate && (
                <div>
                  <p className="text-xs text-slate-400 font-medium">Bill Rate</p>
                  <p className="text-sm text-slate-700">${sub.client_bill_rate}/hr</p>
                </div>
              )}
              {sub.start_date && (
                <div>
                  <p className="text-xs text-slate-400 font-medium">Start Date</p>
                  <p className="text-sm text-slate-700">{new Date(sub.start_date).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 font-medium">Submitted by</p>
                <p className="text-sm text-slate-700">{sub.submitted_by_name || 'Agency'}</p>
              </div>
            </div>

            <Link
              to={`/client/submissions?job_id=${sub.job_id}`}
              className="mt-4 block text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              View all submissions for this job →
            </Link>
          </div>

          {/* Review panel */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Your Decision</h3>

            {!canReview ? (
              <div className={`text-sm font-semibold px-3 py-2 rounded-lg text-center ${statusColors[sub.client_status]}`}>
                {statusLabels[sub.client_status]}
                {sub.client_reviewed_at && (
                  <p className="text-xs font-normal mt-0.5 opacity-70">
                    {new Date(sub.client_reviewed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  className="input text-sm resize-none min-h-[80px]"
                  placeholder="Add feedback or notes (optional)..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />

                <button
                  onClick={() => handleAction('approved')}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Approve Candidate
                </button>

                <button
                  onClick={() => handleAction('interview_requested')}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <MessageSquare size={14} />
                  Request Interview
                </button>

                <button
                  onClick={() => handleAction('under_review')}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <Clock size={14} />
                  Mark Under Review
                </button>

                <button
                  onClick={() => handleAction('rejected')}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
            )}

            {sub.client_feedback && canReview && (
              <div className="mt-3 p-3 bg-surface-50 rounded-lg">
                <p className="text-xs text-slate-400 font-medium">Previous feedback</p>
                <p className="text-sm text-slate-600 mt-1">{sub.client_feedback}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
