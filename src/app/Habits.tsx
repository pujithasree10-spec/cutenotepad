import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Habit, HabitLog } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Plus,
  X,
  Check,
  Flame,
  Trophy,
  Target,
  TrendingUp,
  Archive,
  MoreHorizontal,
  Edit3,
  Trash2,
  RotateCcw,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import {
  format,
  subDays,
  startOfWeek,
  eachDayOfInterval,
  isToday,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns';

// ─── Constants ───────────────────────────────────────────────────────────────

const HABIT_COLORS = [
  { name: 'rose', hex: '#f472b6' },
  { name: 'amber', hex: '#fbbf24' },
  { name: 'emerald', hex: '#34d399' },
  { name: 'sky', hex: '#38bdf8' },
  { name: 'violet', hex: '#a78bfa' },
  { name: 'coral', hex: '#fb7185' },
];

const EMOJI_GRID = [
  '💧', '🏃', '📖', '🧘', '💪', '🎯', '✍️', '🧠',
  '🍎', '💤', '🎵', '🌱', '☀️', '🧹', '💊', '🏋️',
  '🚴', '🧪', '📝', '🎨', '🧑‍💻', '📚', '🧃', '🥗',
  '🚿', '😊', '💰', '🛌', '🍳', '🐕', '🎸', '🏊',
];

const FREQUENCY_OPTIONS: { value: Habit['frequency']; label: string; desc: string }[] = [
  { value: 'daily', label: 'Daily', desc: 'Every day' },
  { value: 'weekly', label: 'Weekly', desc: 'Once a week' },
  { value: 'monthly', label: 'Monthly', desc: 'Once a month' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MILESTONE_THRESHOLDS = [7, 14, 30, 60, 100];

const HEATMAP_DAYS = 35; // 5 weeks

const LS_HABITS_KEY = 'lifeos_habits';
const LS_LOGS_KEY = 'lifeos_habit_logs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getLocalHabits(): Habit[] {
  try {
    return JSON.parse(localStorage.getItem(LS_HABITS_KEY) || '[]');
  } catch {
    return [];
  }
}

function setLocalHabits(habits: Habit[]) {
  localStorage.setItem(LS_HABITS_KEY, JSON.stringify(habits));
}

function getLocalLogs(): HabitLog[] {
  try {
    return JSON.parse(localStorage.getItem(LS_LOGS_KEY) || '[]');
  } catch {
    return [];
  }
}

function setLocalLogs(logs: HabitLog[]) {
  localStorage.setItem(LS_LOGS_KEY, JSON.stringify(logs));
}

function calculateStreak(habitId: string, logs: HabitLog[]): { current: number; best: number } {
  const habitLogs = logs
    .filter((l) => l.habit_id === habitId)
    .map((l) => l.completed_at)
    .sort()
    .reverse();

  if (habitLogs.length === 0) return { current: 0, best: 0 };

  const uniqueDates = [...new Set(habitLogs)];

  // Current streak: count consecutive days backwards from today
  let current = 0;
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Streak can start from today or yesterday
  let startIdx = uniqueDates.indexOf(today);
  if (startIdx === -1) {
    startIdx = uniqueDates.indexOf(yesterday);
    if (startIdx === -1) {
      // No recent activity, current streak is 0
      current = 0;
    }
  }

  if (startIdx !== -1) {
    current = 1;
    for (let i = startIdx + 1; i < uniqueDates.length; i++) {
      const prevDate = parseISO(uniqueDates[i - 1]);
      const currDate = parseISO(uniqueDates[i]);
      if (differenceInCalendarDays(prevDate, currDate) === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Best streak: find longest consecutive run
  let best = 0;
  let run = 1;
  const sorted = [...uniqueDates].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1]);
    const curr = parseISO(sorted[i]);
    if (differenceInCalendarDays(curr, prev) === 1) {
      run++;
    } else {
      best = Math.max(best, run);
      run = 1;
    }
  }
  best = Math.max(best, run);

  return { current, best };
}

function getHeatmapDays(): Date[] {
  const today = new Date();
  const start = subDays(today, HEATMAP_DAYS - 1);
  return eachDayOfInterval({ start, end: today });
}

function getCompletionLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-elevated)]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[var(--color-elevated)] rounded w-2/3" />
        <div className="h-3 bg-[var(--color-elevated)] rounded w-1/3" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="h-4 w-full bg-[var(--color-elevated)] rounded-sm" />
      ))}
    </div>
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Stats skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 animate-pulse"
        >
          <div className="h-3 bg-[var(--color-elevated)] rounded w-1/2 mb-3" />
          <div className="h-8 bg-[var(--color-elevated)] rounded w-1/3" />
        </div>
      ))}
    </div>
    {/* Cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
);

// ─── Toast Component ─────────────────────────────────────────────────────────

interface ToastData {
  id: string;
  message: string;
  emoji: string;
}

const MilestoneToast: React.FC<{ toast: ToastData; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 60, scale: 0.85 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    className="flex items-center gap-3 px-5 py-3.5 rounded-[var(--radius-lg)] border border-[var(--color-accent)]/30 shadow-lg"
    style={{
      background: 'linear-gradient(135deg, var(--color-elevated), var(--color-surface))',
      boxShadow: '0 0 30px var(--color-accent-glow)',
    }}
  >
    <motion.span
      className="text-2xl"
      animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
      transition={{ duration: 0.6 }}
    >
      {toast.emoji}
    </motion.span>
    <div className="flex-1">
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {toast.message}
      </p>
    </div>
    <button
      onClick={() => onDismiss(toast.id)}
      className="p-1 rounded-full hover:bg-white/10 transition"
    >
      <X size={14} style={{ color: 'var(--color-text-muted)' }} />
    </button>
  </motion.div>
);

// ─── Heatmap Component ───────────────────────────────────────────────────────

const HabitHeatmap: React.FC<{
  habitId: string;
  color: string;
  logs: HabitLog[];
}> = ({ habitId, color, logs }) => {
  const days = useMemo(() => getHeatmapDays(), []);
  const logsByDate = useMemo(() => {
    const map = new Map<string, number>();
    logs
      .filter((l) => l.habit_id === habitId)
      .forEach((l) => {
        const key = l.completed_at;
        map.set(key, (map.get(key) || 0) + 1);
      });
    return map;
  }, [habitId, logs]);

  const opacityLevels = [0, 0.2, 0.4, 0.65, 0.9];

  return (
    <div className="mt-3">
      <div className="grid grid-cols-7 gap-[3px]">
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const count = logsByDate.get(dateStr) || 0;
          const level = getCompletionLevel(count);
          const today = isToday(day);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.008, duration: 0.2 }}
              title={`${format(day, 'MMM d')}${count > 0 ? ` — ${count} completion${count > 1 ? 's' : ''}` : ''}`}
              className="aspect-square rounded-[3px] transition-colors relative"
              style={{
                backgroundColor:
                  level === 0
                    ? 'var(--color-elevated)'
                    : color,
                opacity: level === 0 ? 1 : opacityLevels[level],
                border: today ? `1.5px solid ${color}` : '1px solid transparent',
              }}
            />
          );
        })}
      </div>
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-[3px] mt-1">
        {DAY_LABELS.map((d) => (
          <span
            key={d}
            className="text-center text-[8px] font-mono"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Stats Summary ───────────────────────────────────────────────────────────

interface StatsProps {
  habits: Habit[];
  logs: HabitLog[];
  todayStr: string;
}

const StatsSummary: React.FC<StatsProps> = ({ habits, logs, todayStr }) => {
  const activeHabits = habits.filter((h) => !h.archived);

  const todayCompleted = useMemo(
    () =>
      activeHabits.filter((h) =>
        logs.some((l) => l.habit_id === h.id && l.completed_at === todayStr)
      ).length,
    [activeHabits, logs, todayStr]
  );

  const completionRate = activeHabits.length > 0
    ? Math.round((todayCompleted / activeHabits.length) * 100)
    : 0;

  const bestActiveStreak = useMemo(() => {
    let best = 0;
    activeHabits.forEach((h) => {
      const s = calculateStreak(h.id, logs);
      if (s.current > best) best = s.current;
    });
    return best;
  }, [activeHabits, logs]);

  // This week completions
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekCompletions = useMemo(
    () => logs.filter((l) => l.completed_at >= weekStartStr).length,
    [logs, weekStartStr]
  );

  const stats = [
    {
      label: 'Active Habits',
      value: activeHabits.length,
      icon: Target,
      color: 'var(--color-accent)',
    },
    {
      label: "Today's Rate",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'var(--color-success)',
    },
    {
      label: 'Best Streak',
      value: bestActiveStreak,
      icon: Flame,
      color: '#fbbf24',
      suffix: bestActiveStreak === 1 ? 'day' : 'days',
    },
    {
      label: 'This Week',
      value: weekCompletions,
      icon: Zap,
      color: 'var(--habit-sky)',
      suffix: 'done',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.35 }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 card-hover-effect"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon size={14} style={{ color: stat.color }} />
            <span
              className="text-[11px] font-mono uppercase tracking-wide"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {stat.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-2xl font-semibold font-mono"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {stat.value}
            </span>
            {stat.suffix && (
              <span
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {stat.suffix}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Habit Card ──────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit;
  logs: HabitLog[];
  todayStr: string;
  onToggle: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onRestore: (habitId: string) => void;
  index: number;
}

const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  logs,
  todayStr,
  onToggle,
  onEdit,
  onArchive,
  onDelete,
  onRestore,
  index,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCompletedToday = useMemo(
    () => logs.some((l) => l.habit_id === habit.id && l.completed_at === todayStr),
    [habit.id, logs, todayStr]
  );

  const streak = useMemo(() => calculateStreak(habit.id, logs), [habit.id, logs]);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const colorHex = HABIT_COLORS.find((c) => c.name === habit.color)?.hex || habit.color;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
      className="relative group rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5 overflow-hidden"
      style={{
        background: `linear-gradient(145deg, var(--color-surface) 0%, var(--color-elevated) 100%)`,
        boxShadow: isCompletedToday
          ? `0 0 24px ${colorHex}15, var(--shadow-sm)`
          : 'var(--shadow-sm)',
      }}
    >
      {/* Subtle color glow background */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
        style={{ backgroundColor: colorHex }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => !habit.archived && onToggle(habit.id)}
            disabled={habit.archived}
            className="relative flex items-center justify-center h-10 w-10 rounded-[var(--radius-md)] border-2 transition-all duration-300"
            style={{
              borderColor: isCompletedToday ? colorHex : 'var(--color-border)',
              backgroundColor: isCompletedToday ? colorHex : 'transparent',
              cursor: habit.archived ? 'not-allowed' : 'pointer',
              opacity: habit.archived ? 0.5 : 1,
            }}
          >
            <AnimatePresence mode="wait">
              {isCompletedToday ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  <Check size={18} color="#fff" strokeWidth={3} />
                </motion.div>
              ) : (
                <motion.span
                  key="emoji"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="text-lg leading-none"
                >
                  {habit.icon}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Pop ring animation */}
            {isCompletedToday && (
              <motion.div
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-[var(--radius-md)]"
                style={{ border: `2px solid ${colorHex}` }}
              />
            )}
          </motion.button>

          <div>
            <h3
              className="font-medium text-sm"
              style={{
                color: habit.archived
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text-primary)',
                textDecoration: habit.archived ? 'line-through' : 'none',
              }}
            >
              {habit.icon} {habit.name}
            </h3>
            <p
              className="text-[11px] font-mono capitalize"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {habit.frequency}
              {habit.frequency === 'weekly' && habit.target_days.length > 0 && (
                <span>
                  {' '}
                  · {habit.target_days.map((d) => DAY_LABELS[d - 1]).join(', ')}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Context menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-[var(--radius-sm)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5"
          >
            <MoreHorizontal size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                className="absolute right-0 top-8 z-50 min-w-[140px] rounded-[var(--radius-md)] border border-[var(--color-border)] p-1 shadow-lg"
                style={{ background: 'var(--color-elevated)' }}
              >
                {!habit.archived && (
                  <button
                    onClick={() => {
                      onEdit(habit);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] hover:bg-white/5 transition"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                )}
                {habit.archived ? (
                  <button
                    onClick={() => {
                      onRestore(habit.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] hover:bg-white/5 transition"
                    style={{ color: 'var(--color-success)' }}
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onArchive(habit.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] hover:bg-white/5 transition"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    <Archive size={12} /> Archive
                  </button>
                )}
                <button
                  onClick={() => {
                    onDelete(habit.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] hover:bg-white/5 transition"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Streak */}
      <div
        className="flex items-center gap-3 mb-3 text-xs font-mono"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <span className="flex items-center gap-1">
          🔥 {streak.current}
          <span style={{ color: 'var(--color-text-muted)' }}>current</span>
        </span>
        <span
          className="w-px h-3"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
        <span className="flex items-center gap-1">
          <Trophy size={11} style={{ color: '#fbbf24' }} /> {streak.best}
          <span style={{ color: 'var(--color-text-muted)' }}>best</span>
        </span>
      </div>

      {/* Heatmap */}
      <HabitHeatmap habitId={habit.id} color={colorHex} logs={logs} />
    </motion.div>
  );
};

// ─── Create/Edit Modal ───────────────────────────────────────────────────────

interface HabitFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  frequency: Habit['frequency'];
  target_days: number[];
}

const initialFormData: HabitFormData = {
  name: '',
  description: '',
  icon: '💧',
  color: 'rose',
  frequency: 'daily',
  target_days: [1, 2, 3, 4, 5, 6, 7],
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HabitFormData) => void;
  editingHabit: Habit | null;
}

const HabitModal: React.FC<ModalProps> = ({ isOpen, onClose, onSave, editingHabit }) => {
  const [form, setForm] = useState<HabitFormData>(initialFormData);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (editingHabit) {
      setForm({
        name: editingHabit.name,
        description: editingHabit.description || '',
        icon: editingHabit.icon,
        color: editingHabit.color,
        frequency: editingHabit.frequency,
        target_days: editingHabit.target_days,
      });
    } else {
      setForm(initialFormData);
    }
    setShowEmojiPicker(false);
  }, [editingHabit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      target_days: prev.target_days.includes(day)
        ? prev.target_days.filter((d) => d !== day)
        : [...prev.target_days, day].sort(),
    }));
  };

  const selectedColorHex = HABIT_COLORS.find((c) => c.name === form.color)?.hex || '#f472b6';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6"
            style={{
              background: 'linear-gradient(160deg, var(--color-surface), var(--color-elevated))',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2
                className="font-display text-2xl italic"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-[var(--radius-sm)] hover:bg-white/5 transition"
              >
                <X size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Emoji + Name */}
              <div>
                <label
                  className="block text-xs font-mono uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Habit Name
                </label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="h-10 w-10 rounded-[var(--radius-md)] border border-[var(--color-border)] flex items-center justify-center text-xl hover:bg-white/5 transition"
                      style={{ background: 'var(--color-elevated)' }}
                    >
                      {form.icon}
                    </button>

                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -8 }}
                          className="absolute top-12 left-0 z-50 p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] grid grid-cols-8 gap-1 shadow-lg"
                          style={{ background: 'var(--color-elevated)', width: '260px' }}
                        >
                          {EMOJI_GRID.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, icon: emoji }));
                                setShowEmojiPicker(false);
                              }}
                              className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-white/10 transition text-base"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Drink 8 glasses of water"
                    className="flex-1 h-10 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm outline-none transition focus:border-[var(--color-accent)]"
                    style={{
                      background: 'var(--color-elevated)',
                      color: 'var(--color-text-primary)',
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  className="block text-xs font-mono uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Description{' '}
                  <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description..."
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm outline-none transition focus:border-[var(--color-accent)]"
                  style={{
                    background: 'var(--color-elevated)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              {/* Color Picker */}
              <div>
                <label
                  className="block text-xs font-mono uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Color
                </label>
                <div className="flex gap-2">
                  {HABIT_COLORS.map((c) => (
                    <motion.button
                      key={c.name}
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setForm((prev) => ({ ...prev, color: c.name }))}
                      className="h-9 w-9 rounded-full flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: c.hex,
                        border:
                          form.color === c.name
                            ? '3px solid var(--color-text-primary)'
                            : '3px solid transparent',
                        boxShadow:
                          form.color === c.name
                            ? `0 0 14px ${c.hex}50`
                            : 'none',
                      }}
                    >
                      {form.color === c.name && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        >
                          <Check size={14} color="#fff" strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label
                  className="block text-xs font-mono uppercase tracking-wide mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Frequency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          frequency: opt.value,
                          target_days:
                            opt.value === 'daily'
                              ? [1, 2, 3, 4, 5, 6, 7]
                              : prev.target_days,
                        }))
                      }
                      className="p-2.5 rounded-[var(--radius-md)] border text-center transition-all"
                      style={{
                        borderColor:
                          form.frequency === opt.value
                            ? selectedColorHex
                            : 'var(--color-border)',
                        backgroundColor:
                          form.frequency === opt.value
                            ? `${selectedColorHex}15`
                            : 'var(--color-elevated)',
                      }}
                    >
                      <div
                        className="text-xs font-medium"
                        style={{
                          color:
                            form.frequency === opt.value
                              ? selectedColorHex
                              : 'var(--color-text-primary)',
                        }}
                      >
                        {opt.label}
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target days for weekly */}
              {form.frequency === 'weekly' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label
                    className="block text-xs font-mono uppercase tracking-wide mb-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Target Days
                  </label>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((day, i) => {
                      const dayNum = i + 1;
                      const isActive = form.target_days.includes(dayNum);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(dayNum)}
                          className="flex-1 py-2 rounded-[var(--radius-sm)] text-[11px] font-mono font-medium transition-all"
                          style={{
                            backgroundColor: isActive ? selectedColorHex : 'var(--color-elevated)',
                            color: isActive ? '#fff' : 'var(--color-text-muted)',
                            border: `1px solid ${isActive ? selectedColorHex : 'var(--color-border)'}`,
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={!form.name.trim()}
                className="w-full py-3 rounded-[var(--radius-md)] text-sm font-medium text-white transition-all disabled:opacity-40 btn-primary-effect"
                style={{
                  backgroundColor: selectedColorHex,
                  boxShadow: `0 0 20px ${selectedColorHex}30`,
                }}
              >
                {editingHabit ? 'Save Changes' : 'Create Habit'}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="text-center py-20 px-6"
  >
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      className="text-6xl mb-6"
    >
      🌱
    </motion.div>
    <h3
      className="font-display text-2xl italic mb-2"
      style={{ color: 'var(--color-text-primary)' }}
    >
      Plant your first habit
    </h3>
    <p
      className="text-sm mb-8 max-w-sm mx-auto leading-relaxed"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      Small actions repeated daily become extraordinary results. Start with something simple — even
      one minute counts.
    </p>
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onAdd}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] text-sm font-medium text-white btn-primary-effect"
      style={{
        backgroundColor: 'var(--color-accent)',
        boxShadow: 'var(--shadow-accent)',
      }}
    >
      <Plus size={16} />
      Create First Habit
    </motion.button>
  </motion.div>
);

// ─── Main Habits Page ────────────────────────────────────────────────────────

export const Habits: React.FC = () => {
  const { user } = useAuthStore();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // ── Data Fetching ──

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .order('position', { ascending: true });

      if (habitsError) throw habitsError;

      // Fetch logs for the last 35 days (heatmap range)
      const rangeStart = format(subDays(new Date(), HEATMAP_DAYS), 'yyyy-MM-dd');
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .gte('completed_at', rangeStart);

      if (logsError) throw logsError;

      setHabits(habitsData || []);
      setLogs(logsData || []);

      // Sync to localStorage as backup
      setLocalHabits(habitsData || []);
      setLocalLogs(logsData || []);
    } catch (e) {
      console.error('Supabase error, falling back to localStorage:', e);
      setHabits(getLocalHabits());
      setLogs(getLocalLogs());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Toast helpers ──

  const showToast = useCallback((message: string, emoji: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, emoji }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const checkMilestone = useCallback(
    (habitName: string, newStreak: number) => {
      for (const threshold of MILESTONE_THRESHOLDS) {
        if (newStreak === threshold) {
          const milestoneMessages: Record<number, { msg: string; emoji: string }> = {
            7: { msg: `🎉 1 week streak for "${habitName}"! Keep it up!`, emoji: '🎉' },
            14: { msg: `💪 2 weeks strong on "${habitName}"! Incredible!`, emoji: '💪' },
            30: { msg: `🏆 30 days! "${habitName}" is now a real habit!`, emoji: '🏆' },
            60: { msg: `⚡ 60 days of "${habitName}"! You're unstoppable!`, emoji: '⚡' },
            100: { msg: `👑 100 days! "${habitName}" — legendary streak!`, emoji: '👑' },
          };
          const m = milestoneMessages[threshold];
          if (m) showToast(m.msg, m.emoji);
          break;
        }
      }
    },
    [showToast]
  );

  // ── CRUD Operations ──

  const handleCreateOrUpdate = async (formData: HabitFormData) => {
    if (!user) return;

    if (editingHabit) {
      // Update
      const updated: Habit = { ...editingHabit, ...formData, description: formData.description || null };
      const optimisticHabits = habits.map((h) => (h.id === editingHabit.id ? updated : h));
      setHabits(optimisticHabits);
      setLocalHabits(optimisticHabits);
      setModalOpen(false);
      setEditingHabit(null);

      try {
        const { error } = await supabase
          .from('habits')
          .update({
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon,
            color: formData.color,
            frequency: formData.frequency,
            target_days: formData.target_days,
          })
          .eq('id', editingHabit.id);
        if (error) throw error;
      } catch (e) {
        console.error('Error updating habit:', e);
      }
    } else {
      // Create
      const newHabit: Habit = {
        id: generateId(),
        user_id: user.id,
        name: formData.name,
        description: formData.description || null,
        icon: formData.icon,
        color: formData.color,
        frequency: formData.frequency,
        target_days: formData.target_days,
        archived: false,
        position: habits.length,
      };

      const optimisticHabits = [...habits, newHabit];
      setHabits(optimisticHabits);
      setLocalHabits(optimisticHabits);
      setModalOpen(false);

      try {
        const { data, error } = await supabase
          .from('habits')
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon,
            color: formData.color,
            frequency: formData.frequency,
            target_days: formData.target_days,
            archived: false,
            position: habits.length,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setHabits((prev) =>
            prev.map((h) => (h.id === newHabit.id ? data : h))
          );
          setLocalHabits(
            optimisticHabits.map((h) => (h.id === newHabit.id ? data : h))
          );
        }
      } catch (e) {
        console.error('Error creating habit:', e);
      }
    }
  };

  const handleToggle = async (habitId: string) => {
    if (!user) return;
    const existingLog = logs.find(
      (l) => l.habit_id === habitId && l.completed_at === todayStr
    );

    let updatedLogs: HabitLog[];
    if (existingLog) {
      updatedLogs = logs.filter((l) => l !== existingLog);
    } else {
      const newLog: HabitLog = {
        id: generateId(),
        habit_id: habitId,
        user_id: user.id,
        completed_at: todayStr,
        note: null,
      };
      updatedLogs = [...logs, newLog];
    }

    setLogs(updatedLogs);
    setLocalLogs(updatedLogs);

    // Check milestone for completion
    if (!existingLog) {
      const habit = habits.find((h) => h.id === habitId);
      if (habit) {
        const newStreak = calculateStreak(habitId, updatedLogs);
        checkMilestone(habit.name, newStreak.current);
        
        // Fire confetti!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: [habit.color, '#FFD700', '#FF69B4']
        });
      }
    }

    try {
      if (existingLog) {
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', habitId)
          .eq('completed_at', todayStr);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('habit_logs')
          .insert({
            habit_id: habitId,
            completed_at: todayStr,
          })
          .select()
          .single();
        if (error) throw error;

        // Replace temp ID with real one
        if (data) {
          setLogs((prev) =>
            prev.map((l) =>
              l.habit_id === habitId && l.completed_at === todayStr && l.id.includes('-')
                ? data
                : l
            )
          );
        }
      }
    } catch (e) {
      console.error('Error toggling habit:', e);
    }
  };

  const handleArchive = async (habitId: string) => {
    const updated = habits.map((h) =>
      h.id === habitId ? { ...h, archived: true } : h
    );
    setHabits(updated);
    setLocalHabits(updated);

    try {
      await supabase.from('habits').update({ archived: true }).eq('id', habitId);
    } catch (e) {
      console.error('Error archiving habit:', e);
    }
  };

  const handleRestore = async (habitId: string) => {
    const updated = habits.map((h) =>
      h.id === habitId ? { ...h, archived: false } : h
    );
    setHabits(updated);
    setLocalHabits(updated);

    try {
      await supabase.from('habits').update({ archived: false }).eq('id', habitId);
    } catch (e) {
      console.error('Error restoring habit:', e);
    }
  };

  const handleDelete = async (habitId: string) => {
    const updated = habits.filter((h) => h.id !== habitId);
    const updatedLogs = logs.filter((l) => l.habit_id !== habitId);
    setHabits(updated);
    setLogs(updatedLogs);
    setLocalHabits(updated);
    setLocalLogs(updatedLogs);

    try {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId);
      await supabase.from('habits').delete().eq('id', habitId);
    } catch (e) {
      console.error('Error deleting habit:', e);
    }
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  // ── Filtered habits ──

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived),
    [habits]
  );
  const archivedHabits = useMemo(
    () => habits.filter((h) => h.archived),
    [habits]
  );

  const displayedHabits = showArchived ? archivedHabits : activeHabits;

  return (
    <PageWrapper>
      <div className="px-4 md:px-6 py-6 space-y-6 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="font-display text-3xl md:text-4xl italic"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Habits
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {format(new Date(), 'EEEE, MMMM d')} — Build your best self, one day at a time
            </p>
          </div>

          <div className="flex items-center gap-2">
            {archivedHabits.length > 0 && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-all border"
                style={{
                  backgroundColor: showArchived
                    ? 'var(--color-accent-soft)'
                    : 'transparent',
                  borderColor: showArchived
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                  color: showArchived
                    ? 'var(--color-accent)'
                    : 'var(--color-text-secondary)',
                }}
              >
                <Archive size={14} />
                Archived ({archivedHabits.length})
              </button>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setEditingHabit(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium text-white btn-primary-effect"
              style={{
                backgroundColor: 'var(--color-accent)',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New Habit</span>
            </motion.button>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : habits.length === 0 ? (
          <EmptyState
            onAdd={() => {
              setEditingHabit(null);
              setModalOpen(true);
            }}
          />
        ) : (
          <>
            {/* Stats Summary */}
            {!showArchived && (
              <StatsSummary habits={habits} logs={logs} todayStr={todayStr} />
            )}

            {/* Section header for archived */}
            {showArchived && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <button
                  onClick={() => setShowArchived(false)}
                  className="p-1.5 rounded-[var(--radius-sm)] hover:bg-white/5 transition"
                >
                  <ChevronLeft size={16} style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <h2
                  className="text-sm font-medium font-mono"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Archived Habits
                </h2>
              </motion.div>
            )}

            {/* Habit Cards Grid */}
            {displayedHabits.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {showArchived
                    ? 'No archived habits.'
                    : 'All habits are archived. Create a new one to get started!'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {displayedHabits.map((habit, index) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      logs={logs}
                      todayStr={todayStr}
                      onToggle={handleToggle}
                      onEdit={handleEdit}
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <HabitModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleCreateOrUpdate}
        editingHabit={editingHabit}
      />

      {/* Milestone Toasts */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-md px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <MilestoneToast key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
};
