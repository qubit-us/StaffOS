import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Sparkles, User, Linkedin, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

const SkillBadge = ({ skill }) => (
  <span className="badge bg-brand-50 text-brand-700 border border-brand-100">{skill}</span>
);

// ─── Resume Upload Tab ────────────────────────────────────────────────────────

function ResumeUploadTab() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted) => {
    setFiles(prev => [
      ...prev,
      ...accepted.map(f => ({ file: f, status: 'pending', result: null, error: null })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    multiple: true,
  });

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const processAll = async () => {
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'done') continue;
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));
      try {
        const form = new FormData();
        form.append('resume', files[i].file);
        form.append('source', 'recruiter');
        const { data } = await api.post('/api/candidates/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done', result: data } : f));
        if (data.duplicate?.isDuplicate) {
          toast(`⚠️ Possible duplicate: ${data.duplicate.message}`, { duration: 6000, icon: '⚠️' });
        } else {
          toast.success(`Parsed: ${data.candidate.first_name} ${data.candidate.last_name}`);
        }
      } catch (err) {
        const error = err.response?.data?.error || 'Upload failed';
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error } : f));
        toast.error(`Failed: ${files[i].file.name}`);
      }
    }
    setUploading(false);
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={clsx(
          'card p-12 flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed transition-all duration-200',
          isDragActive ? 'border-brand-500 bg-brand-50 scale-[1.01]' : 'border-surface-200 hover:border-brand-400 hover:bg-surface-50'
        )}
      >
        <input {...getInputProps()} />
        <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors', isDragActive ? 'bg-brand-600' : 'bg-brand-50')}>
          <Upload size={28} className={isDragActive ? 'text-white' : 'text-brand-600'} />
        </div>
        <p className="text-lg font-bold text-slate-800">
          {isDragActive ? 'Drop resumes here...' : 'Drag & drop resumes'}
        </p>
        <p className="text-slate-500 mt-1.5 text-sm">or click to browse · PDF, DOCX supported · up to 10MB each</p>
        <div className="flex items-center gap-2 mt-4 text-xs text-brand-600 font-semibold">
          <Sparkles size={14} /> Claude AI extracts skills, experience, education & more
        </div>
      </div>

      {files.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-sm">{files.length} file{files.length > 1 ? 's' : ''} queued</span>
            {pendingCount > 0 && (
              <button onClick={processAll} disabled={uploading} className="btn-primary text-sm py-2">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {uploading ? 'Processing...' : `Parse ${pendingCount} resume${pendingCount > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
          <div className="divide-y divide-surface-100">
            {files.map((item, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-4">
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', {
                  'bg-slate-100': item.status === 'pending',
                  'bg-brand-100': item.status === 'processing',
                  'bg-emerald-100': item.status === 'done',
                  'bg-red-100': item.status === 'error',
                })}>
                  {item.status === 'processing' && <Loader2 size={18} className="text-brand-600 animate-spin" />}
                  {item.status === 'done'       && <CheckCircle2 size={18} className="text-emerald-600" />}
                  {item.status === 'error'      && <AlertCircle size={18} className="text-red-500" />}
                  {item.status === 'pending'    && <FileText size={18} className="text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{item.file.name}</p>
                  <p className="text-xs text-slate-400">{(item.file.size / 1024).toFixed(0)} KB</p>
                  <CandidateResultCard result={item.result} />
                  {item.error && <p className="text-xs text-red-500 mt-1">{item.error}</p>}
                </div>
                {item.status === 'pending' && (
                  <button onClick={() => removeFile(i)} className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LinkedIn Import Tab ──────────────────────────────────────────────────────

function LinkedInImportTab() {
  const [urls, setUrls] = useState([{ url: '', status: 'idle', result: null, error: null }]);
  const [importing, setImporting] = useState(false);

  const setUrl = (i, val) =>
    setUrls(prev => prev.map((u, idx) => idx === i ? { ...u, url: val, error: null } : u));

  const addRow = () =>
    setUrls(prev => [...prev, { url: '', status: 'idle', result: null, error: null }]);

  const removeRow = (i) =>
    setUrls(prev => prev.filter((_, idx) => idx !== i));

  const processAll = async () => {
    const pending = urls.filter(u => u.url.trim() && u.status !== 'done');
    if (!pending.length) return;
    setImporting(true);

    for (let i = 0; i < urls.length; i++) {
      const item = urls[i];
      if (!item.url.trim() || item.status === 'done') continue;

      setUrls(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'processing' } : u));
      try {
        const { data } = await api.post('/api/candidates/import-linkedin', {
          linkedin_url: item.url.trim(),
        });
        setUrls(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'done', result: data } : u));
        if (data.duplicate?.isDuplicate) {
          toast(`⚠️ Possible duplicate: ${data.duplicate.message}`, { duration: 6000, icon: '⚠️' });
        } else {
          toast.success(`Imported: ${data.candidate.first_name} ${data.candidate.last_name}`);
        }
      } catch (err) {
        const error = err.response?.data?.error || 'Import failed';
        setUrls(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'error', error } : u));
        toast.error(`Failed: ${item.url}`);
      }
    }
    setImporting(false);
  };

  const pendingCount = urls.filter(u => u.url.trim() && u.status !== 'done').length;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Linkedin size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Import from LinkedIn</p>
            <p className="text-xs text-slate-500">Paste one or more LinkedIn profile URLs — we'll pull their full profile automatically</p>
          </div>
        </div>

        <div className="space-y-2">
          {urls.map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', {
                  'bg-slate-100':   item.status === 'idle',
                  'bg-blue-100':    item.status === 'processing',
                  'bg-emerald-100': item.status === 'done',
                  'bg-red-100':     item.status === 'error',
                })}>
                  {item.status === 'processing' && <Loader2 size={15} className="text-blue-600 animate-spin" />}
                  {item.status === 'done'        && <CheckCircle2 size={15} className="text-emerald-600" />}
                  {item.status === 'error'       && <AlertCircle size={15} className="text-red-500" />}
                  {item.status === 'idle'        && <Linkedin size={15} className="text-slate-400" />}
                </div>
                <input
                  className="input flex-1"
                  placeholder="https://www.linkedin.com/in/username"
                  value={item.url}
                  onChange={e => setUrl(i, e.target.value)}
                  disabled={item.status === 'done' || item.status === 'processing'}
                />
                {urls.length > 1 && item.status !== 'done' && (
                  <button onClick={() => removeRow(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {item.result && <CandidateResultCard result={item.result} />}
              {item.error && (
                <p className="text-xs text-red-500 ml-10">{item.error}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <Plus size={15} /> Add another URL
          </button>
          {pendingCount > 0 && (
            <button onClick={processAll} disabled={importing} className="btn-primary">
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Linkedin size={15} />}
              {importing ? 'Importing...' : `Import ${pendingCount} profile${pendingCount > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      <div className="card p-5 bg-blue-50 border-blue-100">
        <p className="text-sm font-semibold text-blue-800 mb-1">How it works</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>· Paste any public LinkedIn profile URL (e.g. linkedin.com/in/username)</li>
          <li>· We fetch their headline, summary, work history, education, skills and certifications</li>
          <li>· The candidate is added to your pool and can be enriched or matched to jobs</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Shared result card ───────────────────────────────────────────────────────

function CandidateResultCard({ result }) {
  if (!result) return null;
  const { candidate, duplicate } = result;
  return (
    <div className="mt-3 p-3 bg-surface-50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
          {candidate.first_name?.[0]}{candidate.last_name?.[0]}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{candidate.first_name} {candidate.last_name}</p>
          <p className="text-xs text-slate-500">{candidate.title}</p>
        </div>
        {candidate.profile_completeness > 0 && (
          <span className="ml-auto badge bg-brand-50 text-brand-700">{candidate.profile_completeness}% complete</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {candidate.skills?.slice(0, 8).map(s => <SkillBadge key={s} skill={s} />)}
        {candidate.skills?.length > 8 && (
          <span className="badge bg-slate-100 text-slate-500">+{candidate.skills.length - 8} more</span>
        )}
      </div>
      {duplicate?.isDuplicate && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium flex items-center gap-1.5">
          <AlertCircle size={13} /> {duplicate.message}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadResumePage() {
  const [tab, setTab] = useState('resume');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Add Candidates</h2>
        <p className="text-slate-500 mt-1">Upload resumes to add candidates to your pipeline</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-surface-100 rounded-xl w-fit">
        <button
          onClick={() => setTab('resume')}
          className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all', tab === 'resume'
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-700')}
        >
          <Upload size={15} /> Upload Resume
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 cursor-not-allowed relative"
          title="Coming soon"
        >
          <Linkedin size={15} /> LinkedIn Import
          <span className="ml-1 text-[10px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Soon</span>
        </button>
      </div>

      {tab === 'resume' && <ResumeUploadTab />}

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Sparkles,     title: 'AI Parsing',          text: 'Claude AI extracts skills, experience, education, certifications and visa status automatically.' },
          { icon: User,         title: 'Enrichment',          text: 'Infers industry experience from company names — e.g. Bosch → Automotive.' },
          { icon: AlertCircle,  title: 'Duplicate Detection', text: 'Automatically flags duplicate candidates by email, phone, or LinkedIn.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-5">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center mb-3">
              <Icon size={18} className="text-brand-600" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
