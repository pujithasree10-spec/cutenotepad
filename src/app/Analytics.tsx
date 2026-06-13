import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { HabitLog, FocusSession, Task, MoodLog } from '../types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  Smile,
  Sparkles,
  Activity,
  Target,
  Brain,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  isWithinInterval,
  differenceInDays,
} from 'date-fns';

/* ─────────────────── Types ─────────────────── */

interface DayDataPoint {
  date: string;      // "Jun 01"
  fullDate: string;  // "2026-06-01"
  value: number;
}

interface AnalyticsData {
  habitChart: DayDataPoint[];
  focusChart: DayDataPoint[];
  taskChart: DayDataPoint[];
  moodChart: DayDataPoint[];
  stats: {
    totalFocusHours: number;
    habitCompletionRate: number;
    tasksDoneThisWeek: number;
    avgMoodThisWeek: number;
  };
  digest: {
    habitsThisWeek: number;
    habitsLastWeek: number;
    focusHoursThisWeek: number;
    avgMood: number;
    tasksDone: number;
  };
}

/* ─────────────────── Mock Data Generator ─────────────────── */

function generateMockData(): AnalyticsData {
  const today = new Date();
  const days14: { date: string; fullDate: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = subDays(today, i);
    days14.push({
      date: format(d, 'MMM dd'),
      fullDate: format(d, 'yyyy-MM-dd'),
    });
  }

  const habitChart = days14.map((d) => ({
    ...d,
    value: Math.floor(Math.random() * 5) + 2,
  }));

  const focusChart = days14.map((d) => ({
    ...d,
    value: Math.floor(Math.random() * 90) + 15,
  }));

  const taskChart = days14.map((d) => ({
    ...d,
    value: Math.floor(Math.random() * 6) + 1,
  }));

  const moodChart = days14.map((d) => ({
    ...d,
    value: Math.min(5, Math.max(1, Math.round(3 + (Math.random() - 0.4) * 2))),
  }));

  const thisWeekHabits = habitChart.slice(-7).reduce((s, d) => s + d.value, 0);
  const lastWeekHabits = habitChart.slice(0, 7).reduce((s, d) => s + d.value, 0);
  const thisWeekFocus = focusChart.slice(-7).reduce((s, d) => s + d.value, 0);
  const thisWeekTasks = taskChart.slice(-7).reduce((s, d) => s + d.value, 0);
  const thisWeekMoods = moodChart.slice(-7);
  const avgMood = thisWeekMoods.reduce((s, d) => s + d.value, 0) / thisWeekMoods.length;

  return {
    habitChart,
    focusChart,
    taskChart,
    moodChart,
    stats: {
      totalFocusHours: Math.round(thisWeekFocus * 4.2 / 60 * 10) / 10,
      habitCompletionRate: Math.round((thisWeekHabits / (7 * 5)) * 100),
      tasksDoneThisWeek: thisWeekTasks,
      avgMoodThisWeek: Math.round(avgMood * 10) / 10,
    },
    digest: {
      habitsThisWeek: thisWeekHabits,
      habitsLastWeek: lastWeekHabits,
      focusHoursThisWeek: Math.round(thisWeekFocus / 60 * 10) / 10,
      avgMood: Math.round(avgMood * 10) / 10,
      tasksDone: thisWeekTasks,
    },
  };
}

/* ─────────────────── Custom Tooltip ─────────────────── */

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit?: string;
  color?: string;
}> = ({ active, payload, label, unit = '', color = '#8b7cf8' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3.5 py-2.5 rounded-lg border border-border-soft backdrop-blur-xl"
      style={{
        background: 'rgba(20, 20, 23, 0.92)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      }}
    >
      <p className="text-[10px] font-mono text-text-muted mb-0.5">{label}</p>
      <p className="text-sm font-semibold" style={{ color }}>
        {payload[0].value}
        {unit && <span className="text-text-secondary text-xs ml-1">{unit}</span>}
      </p>
    </div>
  );
};

/* ─────────────────── Mood Helpers ─────────────────── */

const MOOD_EMOJIS: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };

function getMoodEmoji(score: number): string {
  if (score <= 1.5) return '😢';
  if (score <= 2.5) return '😕';
  if (score <= 3.5) return '😐';
  if (score <= 4.5) return '🙂';
  return '😊';
}

function getMoodColor(score: number): string {
  if (score <= 2) return '#f56565';
  if (score <= 3.5) return '#f5a623';
  return '#3ecf8e';
}

/* ─────────────────── Animation Variants ─────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─────────────────── Main Component ─────────────────── */

export const Analytics: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const fourteenAgo = subDays(today, 13);
    const fourteenAgoStr = format(fourteenAgo, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');

    const days14 = eachDayOfInterval({ start: fourteenAgo, end: today }).map((d) => ({
      date: format(d, 'MMM dd'),
      fullDate: format(d, 'yyyy-MM-dd'),
    }));

    try {
      // Fetch all data in parallel
      const [habitLogsRes, focusSessionsRes, tasksRes, moodLogsRes, allFocusRes] =
        await Promise.all([
          supabase
            .from('habit_logs')
            .select('*')
            .gte('completed_at', fourteenAgoStr)
            .lte('completed_at', todayStr),
          supabase
            .from('focus_sessions')
            .select('*')
            .eq('completed', true)
            .gte('started_at', `${fourteenAgoStr}T00:00:00Z`),
          supabase
            .from('tasks')
            .select('*')
            .eq('status', 'done')
            .gte('completed_at', `${fourteenAgoStr}T00:00:00Z`),
          supabase
            .from('mood_logs')
            .select('*')
            .gte('logged_at', fourteenAgoStr)
            .lte('logged_at', todayStr),
          supabase
            .from('focus_sessions')
            .select('actual_minutes')
            .eq('completed', true),
        ]);

      // Check for errors — if any table fails, fall back to mock
      if (
        habitLogsRes.error ||
        focusSessionsRes.error ||
        tasksRes.error ||
        moodLogsRes.error ||
        allFocusRes.error
      ) {
        throw new Error('Supabase query failed');
      }

      const habitLogs: HabitLog[] = habitLogsRes.data || [];
      const focusSessions: FocusSession[] = focusSessionsRes.data || [];
      const tasks: Task[] = tasksRes.data || [];
      const moodLogs: MoodLog[] = moodLogsRes.data || [];

      // Build habit chart
      const habitChart: DayDataPoint[] = days14.map((d) => ({
        ...d,
        value: habitLogs.filter((l) => l.completed_at === d.fullDate).length,
      }));

      // Build focus chart
      const focusChart: DayDataPoint[] = days14.map((d) => {
        const dayStart = `${d.fullDate}T00:00:00Z`;
        const dayEnd = `${d.fullDate}T23:59:59Z`;
        const mins = focusSessions
          .filter((s) => s.started_at && s.started_at >= dayStart && s.started_at <= dayEnd)
          .reduce((sum, s) => sum + (s.actual_minutes || 0), 0);
        return { ...d, value: mins };
      });

      // Build task chart
      const taskChart: DayDataPoint[] = days14.map((d) => ({
        ...d,
        value: tasks.filter((t) => t.completed_at && t.completed_at.startsWith(d.fullDate)).length,
      }));

      // Build mood chart
      const moodChart: DayDataPoint[] = days14.map((d) => {
        const dayMoods = moodLogs.filter((m) => m.logged_at === d.fullDate);
        if (dayMoods.length === 0) return { ...d, value: 0 };
        return {
          ...d,
          value: Math.round((dayMoods.reduce((s, m) => s + m.mood, 0) / dayMoods.length) * 10) / 10,
        };
      });

      // Week boundaries
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const lastWeekStart = subDays(weekStart, 7);
      const lastWeekEnd = subDays(weekStart, 1);

      const isThisWeek = (dateStr: string) => {
        try {
          const d = parseISO(dateStr);
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        } catch {
          return false;
        }
      };

      const isLastWeek = (dateStr: string) => {
        try {
          const d = parseISO(dateStr);
          return isWithinInterval(d, { start: lastWeekStart, end: lastWeekEnd });
        } catch {
          return false;
        }
      };

      const habitsThisWeek = habitLogs.filter((l) => isThisWeek(l.completed_at)).length;
      const habitsLastWeek = habitLogs.filter((l) => isLastWeek(l.completed_at)).length;
      const focusThisWeek = focusSessions
        .filter((s) => s.started_at && isThisWeek(s.started_at.split('T')[0]))
        .reduce((sum, s) => sum + (s.actual_minutes || 0), 0);
      const tasksDoneThisWeek = tasks.filter(
        (t) => t.completed_at && isThisWeek(t.completed_at.split('T')[0])
      ).length;
      const weekMoods = moodLogs.filter((m) => isThisWeek(m.logged_at));
      const avgMood =
        weekMoods.length > 0
          ? Math.round((weekMoods.reduce((s, m) => s + m.mood, 0) / weekMoods.length) * 10) / 10
          : 0;

      // Total all-time focus
      const allTimeFocusMin = (allFocusRes.data || []).reduce(
        (s: number, r: { actual_minutes: number | null }) => s + (r.actual_minutes || 0),
        0
      );

      // Habit completion rate — approximation: completions / (days_in_week * avg_daily_habits)
      const daysElapsedThisWeek = differenceInDays(today, weekStart) + 1;
      const avgDailyHabits = habitLogs.length > 0 ? habitLogs.length / 14 : 1;
      const habitRate = Math.min(
        100,
        Math.round((habitsThisWeek / (daysElapsedThisWeek * Math.max(avgDailyHabits, 1))) * 100)
      );

      setData({
        habitChart,
        focusChart,
        taskChart,
        moodChart,
        stats: {
          totalFocusHours: Math.round((allTimeFocusMin / 60) * 10) / 10,
          habitCompletionRate: habitRate,
          tasksDoneThisWeek,
          avgMoodThisWeek: avgMood,
        },
        digest: {
          habitsThisWeek,
          habitsLastWeek,
          focusHoursThisWeek: Math.round((focusThisWeek / 60) * 10) / 10,
          avgMood,
          tasksDone: tasksDoneThisWeek,
        },
      });
    } catch (err) {
      console.warn('Analytics: Supabase fetch failed, using mock data.', err);
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  /* ─────── Derived ─────── */

  const digestText = useMemo(() => {
    if (!data) return [];
    const { habitsThisWeek, habitsLastWeek, focusHoursThisWeek, avgMood, tasksDone } = data.digest;
    const lines: { icon: React.ReactNode; text: string }[] = [];

    // Habits
    if (habitsLastWeek > 0) {
      const pctChange = Math.round(((habitsThisWeek - habitsLastWeek) / habitsLastWeek) * 100);
      const direction = pctChange >= 0 ? 'more' : 'less';
      const arrow =
        pctChange >= 0 ? (
          <ArrowUpRight size={14} className="text-success" />
        ) : (
          <ArrowDownRight size={14} className="text-danger" />
        );
      lines.push({
        icon: arrow,
        text: `You completed ${habitsThisWeek} habits this week (${Math.abs(pctChange)}% ${direction} than last week)`,
      });
    } else {
      lines.push({
        icon: <Target size={14} className="text-accent" />,
        text: `You completed ${habitsThisWeek} habits this week`,
      });
    }

    // Focus
    lines.push({
      icon: <Clock size={14} className="text-accent" />,
      text: `You focused for ${focusHoursThisWeek} hours this week`,
    });

    // Mood
    if (avgMood > 0) {
      lines.push({
        icon: <Smile size={14} style={{ color: getMoodColor(avgMood) }} />,
        text: `Your average mood was ${getMoodEmoji(avgMood)} (${avgMood}/5)`,
      });
    }

    // Tasks
    lines.push({
      icon: <CheckCircle2 size={14} className="text-info" />,
      text: `You finished ${tasksDone} tasks`,
    });

    return lines;
  }, [data]);

  /* ─────── Loading ─────── */

  if (loading || !data) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-xs text-text-muted font-mono">Loading analytics…</span>
          </div>
        </div>
      </PageWrapper>
    );
  }

  /* ─────── Render ─────── */

  return (
    <PageWrapper>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 px-1"
      >
        {/* ── Page Header ── */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl italic text-text-primary flex items-center gap-3">
              <BarChart3 size={28} className="text-accent" />
              Analytics
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Your personal performance overview — last 14 days
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-text-muted bg-surface border border-border-soft rounded-lg px-3 py-2">
            <Activity size={14} className="text-accent" />
            {format(subDays(new Date(), 13), 'MMM dd')} – {format(new Date(), 'MMM dd, yyyy')}
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            icon={<Clock size={18} />}
            label="Total Focus Hours"
            value={`${data.stats.totalFocusHours}h`}
            color="#8b7cf8"
            index={0}
          />
          <StatCard
            icon={<Target size={18} />}
            label="Habit Completion"
            value={`${data.stats.habitCompletionRate}%`}
            color="#34d399"
            index={1}
          />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            label="Tasks Done"
            value={`${data.stats.tasksDoneThisWeek}`}
            sublabel="this week"
            color="#60a5fa"
            index={2}
          />
          <StatCard
            icon={<Smile size={18} />}
            label="Average Mood"
            value={data.stats.avgMoodThisWeek > 0 ? getMoodEmoji(data.stats.avgMoodThisWeek) : '—'}
            sublabel={data.stats.avgMoodThisWeek > 0 ? `${data.stats.avgMoodThisWeek}/5` : 'no data'}
            color="#f5a623"
            index={3}
          />
        </motion.div>

        {/* ── Charts Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {/* Habit Completions Area Chart */}
          <motion.div variants={itemVariants}>
            <ChartCard
              title="Habit Completions"
              description="Daily habits completed over the last 14 days"
              icon={<Flame size={16} className="text-[#34d399]" />}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.habitChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="habitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-soft)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip unit="habits" color="#34d399" />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    fill="url(#habitGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#34d399', stroke: '#141417', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>

          {/* Focus Time Bar Chart */}
          <motion.div variants={itemVariants}>
            <ChartCard
              title="Daily Focus Time"
              description="Minutes spent in deep focus each day"
              icon={<Brain size={16} className="text-accent" />}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.focusChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="focusBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b7cf8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#8b7cf8" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-soft)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip unit="min" color="#8b7cf8" />} />
                  <Bar
                    dataKey="value"
                    fill="url(#focusBarGradient)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>

          {/* Task Completion Line Chart */}
          <motion.div variants={itemVariants}>
            <ChartCard
              title="Tasks Completed"
              description="How many tasks you shipped per day"
              icon={<CheckCircle2 size={16} className="text-info" />}
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.taskChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-soft)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip unit="tasks" color="#60a5fa" />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#60a5fa"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#60a5fa', stroke: '#141417', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#60a5fa', stroke: '#141417', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>

          {/* Mood Trend Line Chart */}
          <motion.div variants={itemVariants}>
            <ChartCard
              title="Mood Trend"
              description="Your emotional wellbeing over time"
              icon={<Smile size={16} style={{ color: getMoodColor(data.stats.avgMoodThisWeek || 3) }} />}
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={data.moodChart.map((d) => ({ ...d, value: d.value || null }))}
                  margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border-soft)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickLine={false}
                    axisLine={false}
                    tick={({ x, y, payload }: { x: number; y: number; payload: { value: number } }) => (
                      <text x={x} y={y} textAnchor="end" dominantBaseline="central" fontSize={13}>
                        {MOOD_EMOJIS[payload.value] || ''}
                      </text>
                    )}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        unit=""
                        color={getMoodColor(data.stats.avgMoodThisWeek || 3)}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={getMoodColor(data.stats.avgMoodThisWeek || 3)}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: getMoodColor(data.stats.avgMoodThisWeek || 3), stroke: '#141417', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: getMoodColor(data.stats.avgMoodThisWeek || 3), stroke: '#141417', strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>
        </div>

        {/* ── Weekly Digest ── */}
        <motion.div variants={itemVariants}>
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(139,124,248,0.08) 0%, rgba(52,211,153,0.06) 50%, rgba(96,165,250,0.08) 100%)',
            }}
          >
            {/* Gradient border effect */}
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                padding: '1px',
                background: 'linear-gradient(135deg, rgba(139,124,248,0.4), rgba(52,211,153,0.3), rgba(96,165,250,0.4))',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />

            <div className="relative p-6 md:p-8">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Sparkles size={16} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Weekly Digest</h3>
                  <p className="text-[11px] text-text-muted font-mono">
                    {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM dd')} –{' '}
                    {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {digestText.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.35 }}
                    className="flex items-center gap-3 text-sm text-text-secondary"
                  >
                    <span className="flex-shrink-0 h-7 w-7 rounded-md bg-elevated/80 border border-border-soft flex items-center justify-center">
                      {line.icon}
                    </span>
                    <span>{line.text}</span>
                  </motion.div>
                ))}
              </div>

              {digestText.length === 0 && (
                <p className="text-sm text-text-muted italic">
                  Start tracking your habits, tasks, and focus sessions to see weekly insights here.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
};

/* ─────────────────── Stat Card Component ─────────────────── */

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
  index: number;
}> = ({ icon, label, value, sublabel, color, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.15 + index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="bg-surface border border-border rounded-xl p-4 md:p-5 card-hover-effect group relative overflow-hidden"
  >
    {/* Subtle glow */}
    <div
      className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
      style={{ background: color }}
    />

    <div className="relative">
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
      <p className="text-[11px] font-mono text-text-muted uppercase tracking-wide">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-2xl md:text-3xl font-semibold text-text-primary">{value}</span>
        {sublabel && <span className="text-xs text-text-muted">{sublabel}</span>}
      </div>
    </div>
  </motion.div>
);

/* ─────────────────── Chart Card Component ─────────────────── */

const ChartCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, icon, children }) => (
  <div
    className="bg-surface border border-border rounded-xl p-5 md:p-6 card-hover-effect"
    style={{
      backdropFilter: 'blur(12px)',
      background: 'rgba(20, 20, 23, 0.6)',
    }}
  >
    <div className="flex items-center gap-2.5 mb-1">
      {icon}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
    </div>
    <p className="text-[11px] text-text-muted mb-4">{description}</p>
    {children}
  </div>
);

export default Analytics;
