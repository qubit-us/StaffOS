import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../lib/api.js';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Sparkles, User } from 'lucide-react';
import { clsx } from 'clsx';

const SkillBadge = ({ skill }) => (
  <span className="badge bg-brand-50 text-brand-700 border border-brand-100">{skill}</span>
);

const ScoreBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-700">{value}%</span>
    </div>
    <div className="h-1.5 bg-surface-100 rounded-full">
      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${value}%` }} />
    </div>
  </div>
);

export default function UploadResumePage() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);

  const onDrop = useCallback((accepted) => {
    setFiles(prev => [
      ...prev,
      ...accepted.map(f => ({ file: f, status: 'pending', result: null, error: null }))
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
    const processed = [];

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
        processed.push(data);

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

    setResults(processed);
    setUploading(false);
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Upload Resumes</h2>
        <p className="text-slate-500 mt-1">AI will parse and structure candidate profiles automatically</p>
      </div>

      {/* Drop zone */}
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
          <Sparkles size={14} />
          Claude AI extracts skills, experience, education & more
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-sm">{files.length} file{files.length > 1 ? 's' : ''} queued</span>
            {pendingCount > 0 && (
              <button
                onClick={processAll}
                disabled={uploading}
                className="btn-primary text-sm py-2"
              >
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

                  {item.result && (
                    <div className="mt-3 p-3 bg-surface-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {item.result.candidate.first_name?.[0]}{item.result.candidate.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {item.result.candidate.first_name} {item.result.candidate.last_name}
                          </p>
                          <p className="text-xs text-slate-500">{item.result.candidate.title}</p>
                        </div>
                        {item.result.candidate.profile_completeness && (
                          <span className="ml-auto badge bg-brand-50 text-brand-700">
                            {item.result.candidate.profile_completeness}% complete
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.result.candidate.skills?.slice(0, 8).map(s => <SkillBadge key={s} skill={s} />)}
                        {item.result.candidate.skills?.length > 8 && (
                          <span className="badge bg-slate-100 text-slate-500">+{item.result.candidate.skills.length - 8} more</span>
                        )}
                      </div>
                      {item.result.duplicate?.isDuplicate && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium flex items-center gap-1.5">
                          <AlertCircle size={13} /> {item.result.duplicate.message}
                        </div>
                      )}
                    </div>
                  )}

                  {item.error && (
                    <p className="text-xs text-red-500 mt-1">{item.error}</p>
                  )}
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

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Sparkles, title: 'AI Parsing',   text: 'Claude AI extracts skills, experience, education, certifications and visa status automatically.' },
          { icon: User,     title: 'Enrichment',   text: 'Infers industry experience from company names — e.g. Bosch → Automotive.' },
          { icon: AlertCircle, title: 'Duplicate Detection', text: 'Automatically flags duplicate candidates by email, phone, or LinkedIn.' },
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
