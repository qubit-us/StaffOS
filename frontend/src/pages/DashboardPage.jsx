import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';
import {
  CheckSquare, Square, Plus, X, ChevronLeft, ChevronRight,
  Briefcase, Users, Upload, GitPullRequest, Sparkles, Building2,
  Store, BarChart2, Calendar as CalIcon,
  Rocket, Activity,
} from 'lucide-react';
import { clsx } from 'clsx';

// ─────────────────────────────────────────────
// EVENT CONFIG
// ─────────────────────────────────────────────
const EVENT_STYLES = {
  candidate_start: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  label: 'Start'       },
  contract_end:    { dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',       label: 'Contract End'},
  deadline:        { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',     label: 'Deadline'    },
  interview_r1:    { dot: 'bg-purple-500',  text: 'text-purple-700',  bg: 'bg-purple-50',    label: 'Interview R1'},
  interview_r2:    { dot: 'bg-violet-500',  text: 'text-violet-700',  bg: 'bg-violet-50',    label: 'Interview R2'},
  milestone_6mo:   { dot: 'bg-teal-500',    text: 'text-teal-700',    bg: 'bg-teal-50',      label: '6-Month'     },
  milestone_1yr:   { dot: 'bg-sky-500',     text: 'text-sky-700',     bg: 'bg-sky-50',       label: '1-Year'      },
  milestone_2yr:   { dot: 'bg-indigo-500',  text: 'text-indigo-700',  bg: 'bg-indigo-50',    label: '2-Year'      },
};

const LAUNCH_DEFAULTS = [
  { id: 'jobs',       label: 'Jobs',          to: '/jobs',       icon: 'Briefcase',  permission: 'VIEW_JOBS'        },
  { id: 'candidates', label: 'Candidates',    to: '/candidates', icon: 'Users',      permission: 'VIEW_CANDIDATES'  },
  { id: 'pipeline',   label: 'Pipeline',      to: '/pipeline',   icon: 'Pipeline',   permission: 'VIEW_PIPELINE'    },
  { id: 'upload',     label: 'Upload Resume', to: '/upload',     icon: 'Upload',     permission: 'UPLOAD_RESUME'    },
  { id: 'matches',    label: 'AI Matches',    to: '/matches',    icon: 'Sparkles',   permission: 'VIEW_MATCHES'     },
  { id: 'clients',    label: 'Clients',       to: '/admin/clients',  icon: 'Building2',  permission: 'MANAGE_CLIENTS'   },
  { id: 'vendors',    label: 'Vendors',       to: '/admin/vendors',  icon: 'Store',      permission: 'MANAGE_VENDORS'   },
  { id: 'reports',    label: 'Reports',       to: '/reports',    icon: 'BarChart2',  permission: 'VIEW_ANALYTICS'   },
];

const LaunchIcons = { Briefcase, Users, Upload, Sparkles, Building2, Store, BarChart2, Pipeline: GitPullRequest };

function getLaunchIcon(name) {
  const Icon = LaunchIcons[name] || Briefcase;
  return Icon;
}

// ─────────────────────────────────────────────
// CALENDAR HELPERS
// ─────────────────────────────────────────────
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}
function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function monthRange(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const last  = getDaysInMonth(year, month);
  const end   = `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { start, end };
}

// ─────────────────────────────────────────────
// TO-DO WIDGET
// ─────────────────────────────────────────────
function TodoWidget() {
  const qc = useQueryClient();
  const [input, setInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: () => api.get('/api/todos').then(r => r.data),
  });
  const todos = data?.todos || [];

  const addTodo = useMutation({
    mutationFn: (text) => api.post('/api/todos', { text }).then(r => r.data),
    onSuccess: () => { setInput(''); qc.invalidateQueries({ queryKey: ['todos'] }); },
  });

  const toggleTodo = useMutation({
    mutationFn: ({ id, done }) => api.patch(`/api/todos/${id}`, { done }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });

  const removeTodo = useMutation({
    mutationFn: (id) => api.delete(`/api/todos/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });

  const add = () => {
    const text = input.trim();
    if (!text) return;
    addTodo.mutate(text);
  };

  const pending   = todos.filter(t => !t.done);
  const completed = todos.filter(t => t.done);

  return (
    <div className="card flex flex-col h-full min-h-0">
      <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-brand-600" />
          <h3 className="font-bold text-slate-800">To-Do</h3>
          {pending.length > 0 && (
            <span className="badge bg-brand-100 text-brand-700">{pending.length}</span>
          )}
        </div>
      </div>

      {/* Add task */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm py-2"
            placeholder="Add a task..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); }}
          />
          <button onClick={add} className="btn-primary py-2 px-3">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 min-h-0">
        {isLoading && <p className="text-sm text-slate-400 text-center py-6">Loading...</p>}
        {!isLoading && todos.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No tasks yet. Add one above.</p>
        )}
        {pending.map(t => (
          <div key={t.id} className="flex items-start gap-2.5 py-2 group">
            <button onClick={() => toggleTodo.mutate({ id: t.id, done: true })} className="mt-0.5 shrink-0 text-slate-300 hover:text-brand-600 transition-colors">
              <Square size={16} />
            </button>
            <span className="flex-1 text-sm text-slate-700 leading-snug">{t.text}</span>
            <button onClick={() => removeTodo.mutate(t.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
              <X size={14} />
            </button>
          </div>
        ))}
        {completed.length > 0 && (
          <>
            <p className="text-xs text-slate-400 font-medium pt-2 pb-1">Completed</p>
            {completed.map(t => (
              <div key={t.id} className="flex items-start gap-2.5 py-1.5 group opacity-50">
                <button onClick={() => toggleTodo.mutate({ id: t.id, done: false })} className="mt-0.5 shrink-0 text-brand-500">
                  <CheckSquare size={16} />
                </button>
                <span className="flex-1 text-sm text-slate-500 line-through leading-snug">{t.text}</span>
                <button onClick={() => removeTodo.mutate(t.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                  <X size={14} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALENDAR WIDGET
// ─────────────────────────────────────────────
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function CalendarWidget() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);

  const { start, end } = monthRange(year, month);

  const { data: events = [] } = useQuery({
    queryKey: ['dashboard-events', year, month],
    queryFn: () => api.get(`/api/dashboard/events?start=${start}&end=${end}`).then(r => r.data),
  });

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  const daysInMonth   = getDaysInMonth(year, month);
  const firstWeekday  = getFirstDayOfWeek(year, month);
  const todayStr      = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const selectedEvents = selected ? (eventsByDate[selected] || []) : [];

  // Upcoming events this month (from today)
  const upcoming = events.filter(e => e.date >= todayStr).slice(0, 6);

  return (
    <div className="card flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CalIcon size={18} className="text-brand-600" />
          <h3 className="font-bold text-slate-800">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-surface-100 text-slate-500">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-700 w-32 text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-surface-100 text-slate-500">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Empty cells for first week offset */}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1;
              const dateStr = isoDate(year, month, day);
              const dayEvts = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSel   = dateStr === selected;

              return (
                <button
                  key={day}
                  onClick={() => setSelected(isSel ? null : dateStr)}
                  className={clsx(
                    'relative flex flex-col items-center rounded-lg py-1 min-h-[40px] transition-all',
                    isToday && !isSel && 'bg-brand-600 text-white',
                    isSel && 'bg-brand-100 ring-2 ring-brand-400',
                    !isToday && !isSel && dayEvts.length > 0 && 'hover:bg-surface-100',
                    !isToday && !isSel && dayEvts.length === 0 && 'hover:bg-surface-50 text-slate-500',
                  )}
                >
                  <span className={clsx(
                    'text-xs font-semibold',
                    isToday ? 'text-white' : 'text-slate-700',
                  )}>
                    {day}
                  </span>
                  {/* Event dots — max 3 */}
                  {dayEvts.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayEvts.slice(0, 3).map((e, idx) => (
                        <span
                          key={idx}
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full',
                            isToday ? 'bg-white/80' : (EVENT_STYLES[e.type]?.dot || 'bg-slate-400')
                          )}
                        />
                      ))}
                      {dayEvts.length > 3 && (
                        <span className={clsx('text-[9px] font-bold', isToday ? 'text-white/80' : 'text-slate-400')}>
                          +{dayEvts.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-surface-100">
            {Object.entries(EVENT_STYLES).map(([type, s]) => (
              <div key={type} className="flex items-center gap-1">
                <span className={clsx('w-2 h-2 rounded-full', s.dot)} />
                <span className="text-[10px] text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: selected day events OR upcoming */}
        <div className="w-52 border-l border-surface-100 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-surface-100 shrink-0">
            <p className="text-xs font-semibold text-slate-500">
              {selected
                ? new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Upcoming this month'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {(selected ? selectedEvents : upcoming).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                {selected ? 'No events' : 'No upcoming events'}
              </p>
            ) : (
              (selected ? selectedEvents : upcoming).map((evt, idx) => {
                const s = EVENT_STYLES[evt.type] || EVENT_STYLES.deadline;
                return (
                  <div key={idx} className={clsx('rounded-lg p-2', s.bg)}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', s.dot)} />
                      <span className={clsx('text-[10px] font-bold uppercase tracking-wide', s.text)}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-snug">{evt.title}</p>
                    {!selected && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(evt.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ACTIVITY WIDGET
// ─────────────────────────────────────────────
const ACTIVITY_STYLES = {
  submission_new: { color: 'bg-brand-500',   icon: Users,     verb: 'Submitted'     },
  stage_change:   { color: 'bg-purple-500',  icon: GitPullRequest, verb: 'Stage →'  },
  job_new:        { color: 'bg-emerald-500', icon: Briefcase, verb: 'New Job'       },
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)        return 'just now';
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const MY_ACTION_LABELS = {
  'user.login': 'Logged in',
  'candidate.created': 'Added candidate',
  'candidate.updated': 'Updated candidate',
  'candidate.enriched': 'Enriched profile',
  'candidate.submitted': 'Submitted to job',
  'job.created': 'Created job',
  'job.updated': 'Updated job',
  'job.match_run': 'Ran AI match',
  'submission.created': 'Created submission',
  'submission.stage_changed': 'Moved pipeline stage',
  'submission.internal_stage_changed': 'Updated internal stage',
  'submission.profile_unlocked': 'Unlocked profile',
  'submission.rates_updated': 'Updated rates',
  'user.activated': 'Activated user',
  'user.deactivated': 'Deactivated user',
};

function myActionContext(action, meta) {
  if (!meta) return '';
  if (meta.name) return meta.name;
  if (meta.title) return meta.title;
  if (meta.from_stage && meta.to_stage) return `${meta.from_stage} → ${meta.to_stage}`;
  if (meta.job_title) return meta.job_title;
  if (meta.email) return meta.email;
  return '';
}

function ActivityWidget() {
  const [tab, setTab] = useState('mine');

  const { data: teamActivity = [], isLoading: teamLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => api.get('/api/dashboard/activity').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ['my-activity'],
    queryFn: () => api.get('/api/audit-logs/my?limit=30').then(r => r.data),
    enabled: true,
  });
  const myActivity = myData?.logs || [];

  return (
    <div className="card flex flex-col h-full min-h-0">
      <div className="px-5 py-3 border-b border-surface-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-brand-600" />
          <h3 className="font-bold text-slate-800">Activity</h3>
        </div>
        <div className="flex gap-1 bg-surface-100 p-0.5 rounded-lg">
          <button onClick={() => setTab('mine')} className={clsx('text-xs px-3 py-1 rounded-md font-semibold transition-all', tab === 'mine' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>Mine</button>
          <button onClick={() => setTab('team')} className={clsx('text-xs px-3 py-1 rounded-md font-semibold transition-all', tab === 'team' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>Team</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'team' && (
          <>
            {teamLoading && <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" /></div>}
            {!teamLoading && teamActivity.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No recent activity</p>}
            {teamActivity.map((item, idx) => {
              const s = ACTIVITY_STYLES[item.type] || ACTIVITY_STYLES.job_new;
              const Icon = s.icon;
              return (
                <div key={idx} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-50 transition-colors border-b border-surface-50 last:border-0">
                  <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', s.color)}>
                    <Icon size={13} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.subject}</p>
                    <p className="text-xs text-slate-500 truncate">{item.context}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{timeAgo(item.ts)}</span>
                </div>
              );
            })}
          </>
        )}
        {tab === 'mine' && (
          <>
            {myLoading && <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" /></div>}
            {!myLoading && myActivity.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No activity yet</p>}
            {myActivity.map((log, idx) => (
              <div key={log.id || idx} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-50 transition-colors border-b border-surface-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity size={13} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{MY_ACTION_LABELS[log.action] || log.action}</p>
                  <p className="text-xs text-slate-500 truncate">{myActionContext(log.action, log.metadata)}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{timeAgo(log.created_at)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LAUNCH PAD WIDGET
// ─────────────────────────────────────────────
const LAUNCH_COLORS = [
  'bg-brand-600', 'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-sky-500', 'bg-teal-500', 'bg-pink-500',
];

function LaunchPadWidget({ permissions = [] }) {
  const allowed = (item) => !item.permission || permissions.includes(item.permission);

  const [links, setLinks] = useState(() => {
    try {
      const saved = localStorage.getItem('staffos_launchpad');
      const base = saved ? JSON.parse(saved) : LAUNCH_DEFAULTS;
      // Always filter by current user's permissions
      return base.filter(allowed);
    } catch { return LAUNCH_DEFAULTS.filter(allowed); }
  });
  const [editing, setEditing] = useState(false);

  const save = (next) => {
    setLinks(next);
    localStorage.setItem('staffos_launchpad', JSON.stringify(next));
  };

  const removeLink = (id) => save(links.filter(l => l.id !== id));

  const reset = () => {
    save(LAUNCH_DEFAULTS.filter(allowed));
    setEditing(false);
  };

  return (
    <div className="card flex flex-col h-full min-h-0">
      <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Rocket size={18} className="text-brand-600" />
          <h3 className="font-bold text-slate-800">Launch Pad</h3>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">Reset</button>
          )}
          <button
            onClick={() => setEditing(e => !e)}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-4 gap-3">
          {links.map((link, idx) => {
            const Icon = getLaunchIcon(link.icon);
            const color = LAUNCH_COLORS[idx % LAUNCH_COLORS.length];
            return (
              <div key={link.id} className="relative">
                {editing && (
                  <button
                    onClick={() => removeLink(link.id)}
                    className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm"
                  >
                    <X size={10} />
                  </button>
                )}
                <Link
                  to={link.to}
                  className={clsx(
                    'flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
                    editing ? 'opacity-60 pointer-events-none' : 'hover:scale-105 hover:shadow-md'
                  )}
                >
                  <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shadow-sm', color)}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 text-center leading-tight">{link.label}</span>
                </Link>
              </div>
            );
          })}

          {/* Add button shown in edit mode */}
          {editing && links.length < 12 && (
            <AddLinkButton onAdd={(link) => { save([...links, link]); }} permissions={permissions} />
          )}
        </div>
      </div>
    </div>
  );
}

function AddLinkButton({ onAdd, permissions = [] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-300 w-full transition-colors"
      >
        <div className="w-11 h-11 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
          <Plus size={18} className="text-slate-300" />
        </div>
        <span className="text-[11px] text-slate-400">Add</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 w-44 z-20">
          {LAUNCH_DEFAULTS.filter(d => !d.permission || permissions.includes(d.permission)).map(opt => {
            const Icon = getLaunchIcon(opt.icon);
            return (
              <button
                key={opt.id}
                onClick={() => { onAdd({ ...opt, id: opt.id + Date.now() }); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-surface-100 text-sm text-slate-700 transition-colors"
              >
                <Icon size={14} className="text-slate-500" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex flex-col h-full space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {greeting}, {user?.firstName}
          </h2>
          <p className="text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* 2×2 widget grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-0" style={{ minHeight: '600px' }}>
        {/* Widget 1: To-Do */}
        <div className="min-h-[300px] max-h-[420px]">
          <TodoWidget />
        </div>

        {/* Widget 2: Calendar */}
        <div className="min-h-[300px] max-h-[420px]">
          <CalendarWidget />
        </div>

        {/* Widget 3: Activity */}
        <div className="min-h-[300px] max-h-[420px]">
          <ActivityWidget />
        </div>

        {/* Widget 4: Launch Pad */}
        <div className="min-h-[300px] max-h-[420px]">
          <LaunchPadWidget permissions={user?.permissions || []} />
        </div>
      </div>
    </div>
  );
}
