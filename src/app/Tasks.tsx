import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  Columns3,
  CalendarDays,
  Plus,
  X,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Tag,
  Flame,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Target,
  TrendingUp,
  CalendarCheck,
  AlertCircle,
  Inbox,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns';
import { PageWrapper } from '../components/layout/PageWrapper';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Task } from '../types';

// ─── Constants ──────────────────────────────────────────────────────
const STORAGE_KEY = 'lifeos_tasks';

type ViewMode = 'list' | 'kanban' | 'calendar';
type Priority = Task['priority'];
type Status = Task['status'];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: React.ReactNode; order: number }> = {
  urgent: { label: 'Urgent', color: '#f56565', icon: <Flame size={14} />, order: 0 },
  high:   { label: 'High',   color: '#f5a623', icon: <ArrowUp size={14} />, order: 1 },
  medium: { label: 'Medium', color: '#60a5fa', icon: <ArrowRight size={14} />, order: 2 },
  low:    { label: 'Low',    color: '#3ecf8e', icon: <ArrowDown size={14} />, order: 3 },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  todo:        { label: 'To Do',       color: 'var(--color-text-secondary)', icon: <Circle size={16} /> },
  in_progress: { label: 'In Progress', color: 'var(--color-info)',           icon: <Clock size={16} /> },
  done:        { label: 'Done',        color: 'var(--color-success)',        icon: <CheckCircle2 size={16} /> },
};

const VIEW_TABS: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'list',     label: 'List',    icon: <List size={16} /> },
  { mode: 'kanban',   label: 'Board',   icon: <Columns3 size={16} /> },
  { mode: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
];

// ─── Helpers ────────────────────────────────────────────────────────
function loadFromStorage(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

// ─── Skeleton Loader ────────────────────────────────────────────────
const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-elevated ${className}`}>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-border rounded w-3/4" />
      <div className="h-3 bg-border-soft rounded w-1/2" />
      <div className="flex gap-2">
        <div className="h-5 w-14 bg-border rounded-full" />
        <div className="h-5 w-10 bg-border rounded-full" />
      </div>
    </div>
  </div>
);

const ListSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="animate-pulse h-5 w-24 bg-border rounded" />
        {[...Array(2)].map((_, j) => <SkeletonCard key={j} />)}
      </div>
    ))}
  </div>
);

const KanbanSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-3">
        <div className="animate-pulse h-6 w-24 bg-border rounded" />
        {[...Array(2)].map((_, j) => <SkeletonCard key={j} />)}
      </div>
    ))}
  </div>
);

// ─── Empty State ────────────────────────────────────────────────────
const EmptyState: React.FC<{ view: ViewMode }> = ({ view }) => {
  const messages: Record<ViewMode, { title: string; desc: string }> = {
    list:     { title: 'No tasks yet', desc: 'Create your first task to get started with your productivity journey.' },
    kanban:   { title: 'Board is empty', desc: 'Add tasks and organize them across columns to track progress.' },
    calendar: { title: 'Nothing scheduled', desc: 'Tasks with due dates will appear here on the calendar.' },
  };
  const msg = messages[view];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'var(--color-accent-soft)' }}
      >
        <Inbox size={28} style={{ color: 'var(--color-accent)' }} />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1" style={{ fontFamily: 'var(--font-body)' }}>
        {msg.title}
      </h3>
      <p className="text-sm text-text-muted max-w-xs">{msg.desc}</p>
    </motion.div>
  );
};

// ─── Priority Badge ─────────────────────────────────────────────────
const PriorityBadge: React.FC<{ priority: Priority; compact?: boolean }> = ({ priority, compact }) => {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium rounded-full"
      style={{
        color: cfg.color,
        background: `${cfg.color}18`,
        padding: compact ? '2px 6px' : '2px 10px',
      }}
    >
      {cfg.icon}
      {!compact && cfg.label}
    </span>
  );
};

// ─── Tag Chip ───────────────────────────────────────────────────────
const TagChip: React.FC<{ tag: string }> = ({ tag }) => (
  <span
    className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5"
    style={{ background: 'var(--color-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-soft)' }}
  >
    <Tag size={9} />
    {tag}
  </span>
);

// ─── Stats Bar ──────────────────────────────────────────────────────
const StatsBar: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const total = tasks.length;
  const completedToday = tasks.filter(t => t.completed_at === todayStr()).length;
  const overdue = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    return isBefore(parseISO(t.due_date), startOfDay(new Date()));
  }).length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const stats = [
    { label: 'Total Tasks',      value: total,          icon: <Target size={18} />, color: 'var(--color-accent)' },
    { label: 'Done Today',       value: completedToday, icon: <CalendarCheck size={18} />, color: 'var(--color-success)' },
    { label: 'Overdue',          value: overdue,        icon: <AlertCircle size={18} />, color: 'var(--color-danger)' },
    { label: 'Completion',       value: `${pct}%`,      icon: <TrendingUp size={18} />, color: 'var(--color-warning)' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map(s => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl p-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-soft)' }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: s.color, transform: 'translate(30%,-30%)' }} />
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.color}18`, color: s.color }}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary leading-tight">{s.value}</p>
              <p className="text-[11px] text-text-muted leading-tight">{s.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ─── List View Item ─────────────────────────────────────────────────
const ListTaskItem: React.FC<{
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
}> = ({ task, onToggle, onEdit }) => {
  const isDone = task.status === 'done';
  const isOverdue = !isDone && task.due_date && isBefore(parseISO(task.due_date), startOfDay(new Date()));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onEdit(task)}
      className="group flex items-start gap-3 p-3.5 rounded-xl cursor-pointer card-hover-effect"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-soft)',
        borderLeft: `3px solid ${PRIORITY_CONFIG[task.priority].color}`,
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
        className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
        style={{ color: isDone ? 'var(--color-success)' : 'var(--color-text-muted)' }}
      >
        {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium leading-snug transition-all ${isDone ? 'line-through opacity-50' : 'text-text-primary'}`}
        >
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <PriorityBadge priority={task.priority} compact />
          {task.due_date && (
            <span
              className="text-[11px] flex items-center gap-1"
              style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
            >
              <Clock size={11} />
              {format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}
          {task.tags.slice(0, 3).map(t => <TagChip key={t} tag={t} />)}
        </div>
      </div>
    </motion.div>
  );
};

// ─── List View ──────────────────────────────────────────────────────
const ListView: React.FC<{
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
}> = ({ tasks, onToggle, onEdit }) => {
  const grouped = useMemo(() => {
    const groups: Record<Priority, Task[]> = { urgent: [], high: [], medium: [], low: [] };
    tasks.forEach(t => groups[t.priority].push(t));
    return (['urgent', 'high', 'medium', 'low'] as Priority[])
      .map(p => ({ priority: p, tasks: groups[p] }))
      .filter(g => g.tasks.length > 0);
  }, [tasks]);

  if (tasks.length === 0) return <EmptyState view="list" />;

  return (
    <div className="space-y-6">
      {grouped.map(({ priority, tasks: pts }) => (
        <div key={priority}>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: PRIORITY_CONFIG[priority].color }}
            />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {PRIORITY_CONFIG[priority].label}
            </h3>
            <span className="text-[11px] text-text-muted ml-1">({pts.length})</span>
          </div>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {pts.map(t => (
                <ListTaskItem key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Kanban Card ────────────────────────────────────────────────────
const KanbanCard: React.FC<{
  task: Task;
  onStatusChange: (id: string, status: Status) => void;
  onEdit: (task: Task) => void;
}> = ({ task, onStatusChange, onEdit }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const isDone = task.status === 'done';
  const isOverdue = !isDone && task.due_date && isBefore(parseISO(task.due_date), startOfDay(new Date()));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18 }}
      onClick={() => onEdit(task)}
      className="relative rounded-xl p-3.5 cursor-pointer card-hover-effect"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-soft)',
      }}
    >
      {/* Priority dot */}
      <div
        className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full"
        style={{ background: PRIORITY_CONFIG[task.priority].color }}
      />

      <p className={`text-sm font-medium pr-5 leading-snug ${isDone ? 'line-through opacity-50' : 'text-text-primary'}`}>
        {task.title}
      </p>

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        {task.due_date && (
          <span
            className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{
              background: isOverdue ? 'rgba(245,101,101,0.12)' : 'var(--color-elevated)',
              color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
            }}
          >
            <Clock size={10} />
            {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
        {task.tags.slice(0, 2).map(t => <TagChip key={t} tag={t} />)}
      </div>

      {/* Status dropdown */}
      <div className="mt-3 relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowDropdown(v => !v); }}
          className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
          style={{
            background: `${STATUS_CONFIG[task.status].color}15`,
            color: STATUS_CONFIG[task.status].color,
          }}
        >
          {STATUS_CONFIG[task.status].icon}
          {STATUS_CONFIG[task.status].label}
          <ChevronDown size={11} />
        </button>
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 top-full mt-1 z-30 rounded-lg overflow-hidden"
              style={{
                background: 'var(--color-elevated)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: 140,
              }}
            >
              {(Object.keys(STATUS_CONFIG) as Status[]).map(s => (
                <button
                  key={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, s);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
                  style={{ background: task.status === s ? 'var(--color-border-soft)' : 'transparent' }}
                >
                  <span style={{ color: STATUS_CONFIG[s].color }}>{STATUS_CONFIG[s].icon}</span>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ─── Kanban View ────────────────────────────────────────────────────
const KANBAN_COLUMN_STYLES: Record<Status, string> = {
  todo:        'rgba(138,136,147,0.04)',
  in_progress: 'rgba(96,165,250,0.04)',
  done:        'rgba(62,207,142,0.04)',
};

const KanbanView: React.FC<{
  tasks: Task[];
  onStatusChange: (id: string, status: Status) => void;
  onEdit: (task: Task) => void;
}> = ({ tasks, onStatusChange, onEdit }) => {
  const columns = useMemo(() => {
    const cols: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach(t => cols[t.status].push(t));
    return cols;
  }, [tasks]);

  if (tasks.length === 0) return <EmptyState view="kanban" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {(Object.keys(STATUS_CONFIG) as Status[]).map(status => (
        <div
          key={status}
          className="rounded-xl p-3 min-h-[200px]"
          style={{
            background: KANBAN_COLUMN_STYLES[status],
            border: '1px solid var(--color-border-soft)',
          }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span style={{ color: STATUS_CONFIG[status].color }}>{STATUS_CONFIG[status].icon}</span>
              <h3 className="text-sm font-semibold text-text-primary">{STATUS_CONFIG[status].label}</h3>
            </div>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${STATUS_CONFIG[status].color}18`, color: STATUS_CONFIG[status].color }}
            >
              {columns[status].length}
            </span>
          </div>
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {columns[status].map(t => (
                <KanbanCard key={t.id} task={t} onStatusChange={onStatusChange} onEdit={onEdit} />
              ))}
            </AnimatePresence>
            {columns[status].length === 0 && (
              <p className="text-xs text-text-muted text-center py-8 opacity-60">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Calendar View ──────────────────────────────────────────────────
const CalendarView: React.FC<{
  tasks: Task[];
  onEdit: (task: Task) => void;
}> = ({ tasks, onEdit }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Map tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (t.due_date) {
        (map[t.due_date] ??= []).push(t);
      }
    });
    return map;
  }, [tasks]);

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedTasks = selectedDateStr ? (tasksByDate[selectedDateStr] || []) : [];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {/* Nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-base font-semibold text-text-primary">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Grid */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border-soft)', background: 'var(--color-surface)' }}
      >
        {/* Header row */}
        <div className="grid grid-cols-7">
          {weekDays.map(d => (
            <div
              key={d}
              className="text-center text-[11px] font-semibold uppercase tracking-wider py-2.5"
              style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-soft)' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[dateStr] || [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const hasTasks = dayTasks.length > 0;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay || new Date(0)) ? null : day)}
                className="relative flex flex-col items-center justify-start py-2 md:py-3 transition-colors"
                style={{
                  borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--color-border-soft)' : undefined,
                  borderBottom: idx < calDays.length - 7 ? '1px solid var(--color-border-soft)' : undefined,
                  background: isSelected
                    ? 'var(--color-accent-soft)'
                    : today
                    ? 'rgba(139,124,248,0.04)'
                    : 'transparent',
                  opacity: inMonth ? 1 : 0.3,
                  minHeight: 52,
                }}
              >
                <span
                  className={`text-xs font-medium leading-none ${
                    today ? 'w-6 h-6 rounded-full flex items-center justify-center' : ''
                  }`}
                  style={{
                    color: isSelected
                      ? 'var(--color-accent)'
                      : today
                      ? 'var(--color-bg)'
                      : 'var(--color-text-primary)',
                    background: today ? 'var(--color-accent)' : undefined,
                  }}
                >
                  {format(day, 'd')}
                </span>
                {hasTasks && (
                  <div className="flex gap-0.5 mt-1.5">
                    {dayTasks.slice(0, 3).map((t, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: PRIORITY_CONFIG[t.priority].color }}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[8px] text-text-muted ml-0.5">+{dayTasks.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="mt-4 rounded-xl p-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-soft)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text-primary">
                  {format(selectedDay, 'EEEE, MMM d')}
                </h4>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <X size={14} />
                </button>
              </div>
              {selectedTasks.length === 0 ? (
                <p className="text-xs text-text-muted py-3 text-center">No tasks due on this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map(t => (
                    <div
                      key={t.id}
                      onClick={() => onEdit(t)}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors"
                      style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border-soft)' }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PRIORITY_CONFIG[t.priority].color }}
                      />
                      <span className={`text-sm flex-1 ${t.status === 'done' ? 'line-through opacity-50' : 'text-text-primary'}`}>
                        {t.title}
                      </span>
                      <PriorityBadge priority={t.priority} compact />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tasks.length === 0 && <EmptyState view="calendar" />}
    </div>
  );
};

// ─── Task Modal ─────────────────────────────────────────────────────
const TaskModal: React.FC<{
  task: Task | null;
  onSave: (task: Task) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}> = ({ task, onSave, onDelete, onClose }) => {
  const isEditing = !!task;
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<Priority>(task?.priority || 'medium');
  const [status, setStatus] = useState<Status>(task?.status || 'todo');
  const [dueDate, setDueDate] = useState(task?.due_date || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(task?.tags || []);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const now = new Date().toISOString();
    const result: Task = {
      id: task?.id || crypto.randomUUID(),
      user_id: task?.user_id || '',
      parent_task_id: task?.parent_task_id || null,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      due_date: dueDate || null,
      tags,
      position: task?.position || 0,
      created_at: task?.created_at || now,
      updated_at: now,
      completed_at: status === 'done' ? (task?.completed_at || todayStr()) : null,
    };
    onSave(result);
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-elevated)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 pb-3 sticky top-0 z-10"
          style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border-soft)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              {isEditing ? <Sparkles size={16} /> : <Plus size={16} />}
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              {isEditing ? 'Edit Task' : 'New Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-text-muted mb-1.5 block">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-text-muted mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors resize-none"
              style={inputStyle}
            />
          </div>

          {/* Priority & Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1.5 block">Priority</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
                    style={{
                      background: priority === p ? `${PRIORITY_CONFIG[p].color}22` : 'var(--color-elevated)',
                      color: priority === p ? PRIORITY_CONFIG[p].color : 'var(--color-text-muted)',
                      border: `1px solid ${priority === p ? `${PRIORITY_CONFIG[p].color}44` : 'var(--color-border-soft)'}`,
                    }}
                  >
                    {PRIORITY_CONFIG[p].icon}
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
            {isEditing && (
              <div>
                <label className="text-xs font-medium text-text-muted mb-1.5 block">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STATUS_CONFIG) as Status[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
                      style={{
                        background: status === s ? `${STATUS_CONFIG[s].color}22` : 'var(--color-elevated)',
                        color: status === s ? STATUS_CONFIG[s].color : 'var(--color-text-muted)',
                        border: `1px solid ${status === s ? `${STATUS_CONFIG[s].color}44` : 'var(--color-border-soft)'}`,
                      }}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs font-medium text-text-muted mb-1.5 block">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm outline-none focus:border-accent transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-text-muted mb-1.5 block">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                placeholder="Add a tag and press Enter"
                className="flex-1 px-3.5 py-2 text-sm outline-none focus:border-accent transition-colors"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'var(--color-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-soft)' }}
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setTags(prev => prev.filter(x => x !== t))}
                      className="ml-0.5 opacity-60 hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(task!.id)}
                className="text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-danger)', background: 'rgba(245,101,101,0.08)' }}
              >
                Delete Task
              </button>
            ) : (
              <div />
            )}
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl btn-primary-effect disabled:opacity-40 disabled:pointer-events-none"
              style={{
                background: 'var(--color-accent)',
                color: '#fff',
              }}
            >
              <Check size={15} />
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ═════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ─────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════
export const Tasks: React.FC = () => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('position', { ascending: true });

        if (error) throw error;
        const fetched = (data || []) as Task[];
        setTasks(fetched);
        saveToStorage(fetched);
      } else {
        setTasks(loadFromStorage());
      }
    } catch (err) {
      console.warn('Supabase fetch failed, using localStorage:', err);
      setTasks(loadFromStorage());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ─── Persistence Helper ─────────────────────────────────────────
  const persistTask = useCallback(async (task: Task, action: 'upsert' | 'delete') => {
    const userId = user?.id;
    const taskWithUser = { ...task, user_id: userId || 'local' };

    if (action === 'upsert') {
      if (userId) {
        try {
          const { error } = await supabase.from('tasks').upsert(taskWithUser);
          if (error) throw error;
        } catch (err) {
          console.warn('Supabase upsert failed:', err);
        }
      }
      setTasks(prev => {
        const idx = prev.findIndex(t => t.id === taskWithUser.id);
        const next = idx >= 0 ? prev.map(t => t.id === taskWithUser.id ? taskWithUser : t) : [...prev, taskWithUser];
        saveToStorage(next);
        return next;
      });
    } else {
      if (userId) {
        try {
          const { error } = await supabase.from('tasks').delete().eq('id', task.id);
          if (error) throw error;
        } catch (err) {
          console.warn('Supabase delete failed:', err);
        }
      }
      setTasks(prev => {
        const next = prev.filter(t => t.id !== task.id);
        saveToStorage(next);
        return next;
      });
    }
  }, [user]);

  // ─── Handlers ───────────────────────────────────────────────────
  const handleSave = useCallback((task: Task) => {
    persistTask(task, 'upsert');
    setModalOpen(false);
    setEditingTask(null);
  }, [persistTask]);

  const handleDelete = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) persistTask(task, 'delete');
    setModalOpen(false);
    setEditingTask(null);
  }, [tasks, persistTask]);

  const handleToggle = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus: Status = task.status === 'done' ? 'todo' : 'done';
    persistTask({
      ...task,
      status: newStatus,
      completed_at: newStatus === 'done' ? todayStr() : null,
      updated_at: new Date().toISOString(),
    }, 'upsert');
  }, [tasks, persistTask]);

  const handleStatusChange = useCallback((id: string, status: Status) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    persistTask({
      ...task,
      status,
      completed_at: status === 'done' ? (task.completed_at || todayStr()) : null,
      updated_at: new Date().toISOString(),
    }, 'upsert');
  }, [tasks, persistTask]);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    setEditingTask(null);
    setModalOpen(true);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl italic text-text-primary">Tasks</h1>
            <p className="text-sm text-text-muted mt-1">Organize, prioritize, and conquer your day.</p>
          </div>

          {/* View Switcher */}
          <div
            className="inline-flex rounded-xl p-1 self-start md:self-auto"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-soft)' }}
          >
            {VIEW_TABS.map(tab => (
              <button
                key={tab.mode}
                onClick={() => setView(tab.mode)}
                className="relative flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg transition-all"
                style={{
                  color: view === tab.mode ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  background: view === tab.mode ? 'var(--color-accent-soft)' : 'transparent',
                }}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {!loading && tasks.length > 0 && <StatsBar tasks={tasks} />}

        {/* Views */}
        {loading ? (
          view === 'kanban' ? <KanbanSkeleton /> : <ListSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {view === 'list' && (
                <ListView tasks={tasks} onToggle={handleToggle} onEdit={openEdit} />
              )}
              {view === 'kanban' && (
                <KanbanView tasks={tasks} onStatusChange={handleStatusChange} onEdit={openEdit} />
              )}
              {view === 'calendar' && (
                <CalendarView tasks={tasks} onEdit={openEdit} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* FAB */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={openCreate}
          className="fixed bottom-24 md:bottom-8 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center btn-primary-effect"
          style={{
            background: 'var(--color-accent)',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(139,124,248,0.35)',
          }}
        >
          <Plus size={24} />
        </motion.button>

        {/* Modal */}
        <AnimatePresence>
          {modalOpen && (
            <TaskModal
              task={editingTask}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => { setModalOpen(false); setEditingTask(null); }}
            />
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
};
