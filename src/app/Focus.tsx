import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useTimerStore } from '../store/timerStore';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { FocusSession } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  Volume2,
  Timer,
  Coffee,
  Sunset,
  Check,
  Flame,
} from 'lucide-react';

/* ─── constants ───────────────────────────────────────────── */

type TimerMode = 'pomodoro' | 'short_break' | 'long_break';

const MODES: { key: TimerMode; label: string; minutes: number; icon: React.ReactNode }[] = [
  { key: 'pomodoro', label: 'Focus', minutes: 25, icon: <Flame size={14} /> },
  { key: 'short_break', label: 'Short Break', minutes: 5, icon: <Coffee size={14} /> },
  { key: 'long_break', label: 'Long Break', minutes: 15, icon: <Sunset size={14} /> },
];

const SOUNDS: { id: string; label: string; emoji: string }[] = [
  { id: 'rain', label: 'Rain', emoji: '🌧️' },
  { id: 'forest', label: 'Forest', emoji: '🌲' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'ocean', label: 'Ocean', emoji: '🌊' },
  { id: 'lofi', label: 'Lo-fi', emoji: '🎵' },
  { id: 'whitenoise', label: 'White Noise', emoji: '📻' },
];

const SESSIONS_PER_CYCLE = 4;

const RING_SIZE = 280;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/* ─── helpers ─────────────────────────────────────────────── */

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return { m: pad(m), s: pad(s) };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ─── component ───────────────────────────────────────────── */

export const Focus: React.FC = () => {
  const { user } = useAuthStore();
  const timer = useTimerStore();

  const [todaySessions, setTodaySessions] = useState<FocusSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default',
  );

  /* ─── derived ─────────────────────────── */

  const totalSeconds = timer.plannedMinutes * 60;
  const progress = totalSeconds > 0 ? 1 - timer.secondsRemaining / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const { m, s } = formatTime(timer.secondsRemaining);

  const totalFocusMinutesToday = useMemo(
    () =>
      todaySessions
        .filter((s) => s.completed && s.mode === 'pomodoro')
        .reduce((acc, s) => acc + (s.actual_minutes ?? s.planned_minutes), 0),
    [todaySessions],
  );

  const sessionDots = useMemo(() => {
    const completed = timer.sessionsCompleted % SESSIONS_PER_CYCLE;
    return Array.from({ length: SESSIONS_PER_CYCLE }, (_, i) => i < completed);
  }, [timer.sessionsCompleted]);

  const currentSessionNum = (timer.sessionsCompleted % SESSIONS_PER_CYCLE) + 1;

  /* ─── data loading ────────────────────── */

  const loadTodaySessions = useCallback(async () => {
    if (!user) {
      // localStorage fallback
      try {
        const cached = localStorage.getItem('focus_sessions');
        if (cached) {
          const all: FocusSession[] = JSON.parse(cached);
          setTodaySessions(all.filter((s) => s.started_at?.startsWith(todayISO())));
        }
      } catch { /* ignore */ }
      setLoadingSessions(false);
      return;
    }
    setLoadingSessions(true);
    try {
      const today = todayISO();
      const { data } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', `${today}T00:00:00`)
        .lte('started_at', `${today}T23:59:59`)
        .order('started_at', { ascending: false });
      setTodaySessions(data || []);
    } catch {
      // fallback
      try {
        const cached = localStorage.getItem('focus_sessions');
        if (cached) {
          const all: FocusSession[] = JSON.parse(cached);
          setTodaySessions(all.filter((s) => s.started_at?.startsWith(todayISO())));
        }
      } catch { /* ignore */ }
    } finally {
      setLoadingSessions(false);
    }
  }, [user]);

  useEffect(() => {
    loadTodaySessions();
  }, [loadTodaySessions]);

  /* save completed sessions */
  const saveSession = useCallback(
    async (session: Omit<FocusSession, 'id' | 'user_id'>) => {
      if (user) {
        try {
          await supabase.from('focus_sessions').insert({
            ...session,
            user_id: user.id,
          });
        } catch { /* ignore */ }
      }
      // localStorage fallback
      try {
        const cached = localStorage.getItem('focus_sessions');
        const all: FocusSession[] = cached ? JSON.parse(cached) : [];
        all.unshift({
          ...session,
          id: crypto.randomUUID(),
          user_id: user?.id ?? 'local',
        });
        localStorage.setItem('focus_sessions', JSON.stringify(all.slice(0, 200)));
      } catch { /* ignore */ }
      loadTodaySessions();
    },
    [user, loadTodaySessions],
  );

  /* watch for session completion → persist */
  const prevSecondsRef = React.useRef(timer.secondsRemaining);
  useEffect(() => {
    // Detect when timer goes from > 0 to a mode switch (completeSession resets)
    if (
      prevSecondsRef.current > 0 &&
      prevSecondsRef.current <= 1 &&
      !timer.isRunning
    ) {
      // A session just completed — save it
      const prevMode = timer.mode === 'pomodoro' ? 'short_break' : 'pomodoro';
      if (prevMode === 'pomodoro') {
        // a pomodoro was just completed
        saveSession({
          task_id: null,
          mode: 'pomodoro',
          planned_minutes: 25,
          actual_minutes: 25,
          sound_used: timer.soundUsed,
          completed: true,
          started_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          ended_at: new Date().toISOString(),
        });
      }
    }
    prevSecondsRef.current = timer.secondsRemaining;
  }, [timer.secondsRemaining, timer.isRunning, timer.mode, timer.soundUsed, saveSession]);

  /* ─── notification request ────────────── */

  const requestNotification = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    }
  };

  /* ─── mode switch handler ─────────────── */

  const handleModeSwitch = (mode: TimerMode) => {
    timer.setMode(mode);
  };

  /* ─── render ──────────────────────────── */

  return (
    <PageWrapper>
      <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8 text-center"
        >
          <h1
            className="text-3xl md:text-4xl italic mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Focus
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Deep work, one session at a time
          </p>
        </motion.div>

        {/* Main Content — responsive layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ─── LEFT: Timer area ─── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex-1 flex flex-col items-center w-full"
          >
            {/* Mode Switcher */}
            <div
              className="flex items-center gap-1 p-1 rounded-full mb-8"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {MODES.map((m) => {
                const isActive = timer.mode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => handleModeSwitch(m.key)}
                    className="relative px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
                    style={{
                      color: isActive ? '#fff' : 'var(--color-text-secondary)',
                      background: isActive ? 'var(--color-accent)' : 'transparent',
                      boxShadow: isActive ? 'var(--shadow-accent)' : 'none',
                    }}
                  >
                    {m.icon}
                    <span className="hidden sm:inline">{m.label}</span>
                    <span className="sm:hidden">{m.minutes}m</span>
                  </button>
                );
              })}
            </div>

            {/* Session Counter — "Session X of 4" */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 mb-6"
            >
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
              >
                Session {currentSessionNum} of {SESSIONS_PER_CYCLE}
              </span>
              <div className="flex items-center gap-1.5">
                {sessionDots.map((filled, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.06 }}
                    className="rounded-full transition-colors duration-300"
                    style={{
                      width: 8,
                      height: 8,
                      background: filled ? 'var(--color-accent)' : 'var(--color-border)',
                      boxShadow: filled ? '0 0 8px var(--color-accent-glow)' : 'none',
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* ─── Circular Progress Ring ─── */}
            <div className="relative mb-8" style={{ width: RING_SIZE, height: RING_SIZE }}>
              {/* Ambient glow behind the ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)`,
                }}
                animate={
                  !timer.isRunning
                    ? { opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.03, 0.95] }
                    : { opacity: 0.6, scale: 1 }
                }
                transition={
                  !timer.isRunning
                    ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.3 }
                }
              />

              <svg
                width={RING_SIZE}
                height={RING_SIZE}
                className="relative z-10"
                style={{ transform: 'rotate(-90deg)' }}
              >
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-accent)" />
                    <stop offset="50%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Background track */}
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  opacity={0.5}
                />

                {/* Progress ring */}
                <motion.circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="url(#ringGradient)"
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  filter="url(#glow)"
                />
              </svg>

              {/* Center Time Display */}
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center"
              >
                <motion.div
                  animate={
                    !timer.isRunning
                      ? { opacity: [0.7, 1, 0.7] }
                      : { opacity: 1 }
                  }
                  transition={
                    !timer.isRunning
                      ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.2 }
                  }
                >
                  <span
                    className="text-6xl md:text-7xl tracking-tight font-light"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-primary)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {m}
                    <span style={{ color: 'var(--color-accent)', opacity: 0.7 }}>:</span>
                    {s}
                  </span>
                </motion.div>
                <span
                  className="text-[10px] uppercase tracking-widest mt-1"
                  style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  {timer.mode === 'pomodoro' ? 'focusing' : timer.mode === 'short_break' ? 'short break' : 'long break'}
                </span>
              </div>
            </div>

            {/* ─── Control Buttons ─── */}
            <div className="flex items-center gap-4 mb-8">
              {/* Reset */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => timer.reset()}
                className="p-3 rounded-full transition-colors duration-200"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
                aria-label="Reset timer"
              >
                <RotateCcw size={20} />
              </motion.button>

              {/* Play / Pause — hero button */}
              <motion.button
                whileHover={{ scale: 1.06, boxShadow: '0 0 32px var(--color-accent-glow)' }}
                whileTap={{ scale: 0.94 }}
                onClick={() => (timer.isRunning ? timer.pause() : timer.start())}
                className="p-5 rounded-full transition-all duration-200"
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  boxShadow: 'var(--shadow-accent)',
                }}
                aria-label={timer.isRunning ? 'Pause' : 'Start'}
              >
                <AnimatePresence mode="wait">
                  {timer.isRunning ? (
                    <motion.div
                      key="pause"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Pause size={28} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="play"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Play size={28} style={{ marginLeft: 3 }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Notification button */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={requestNotification}
                className="p-3 rounded-full transition-colors duration-200"
                style={{
                  background: 'var(--color-surface)',
                  border: `1px solid ${notifPermission === 'granted' ? 'var(--color-success)' : 'var(--color-border)'}`,
                  color: notifPermission === 'granted' ? 'var(--color-success)' : 'var(--color-text-secondary)',
                }}
                aria-label="Toggle notifications"
                title={
                  notifPermission === 'granted'
                    ? 'Notifications enabled'
                    : notifPermission === 'denied'
                      ? 'Notifications blocked — enable in browser settings'
                      : 'Enable notifications'
                }
              >
                {notifPermission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
              </motion.button>
            </div>

            {/* ─── Today's Stats & Session History ─── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-md rounded-2xl p-5"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Timer size={14} style={{ color: 'var(--color-accent)' }} />
                  <span
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
                  >
                    Today
                  </span>
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}
                >
                  {totalFocusMinutesToday} min focused
                </span>
              </div>

              {loadingSessions ? (
                <div className="flex items-center justify-center py-4">
                  <div
                    className="h-5 w-5 animate-spin rounded-full border-2"
                    style={{
                      borderColor: 'var(--color-accent)',
                      borderTopColor: 'transparent',
                    }}
                  />
                </div>
              ) : todaySessions.filter((s) => s.completed).length === 0 ? (
                <p
                  className="text-xs text-center py-4 italic"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  No sessions completed yet today. Start your first focus!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {todaySessions
                    .filter((s) => s.completed)
                    .map((session, i) => (
                      <motion.div
                        key={session.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center justify-center rounded-full"
                        style={{
                          width: 36,
                          height: 36,
                          background:
                            session.mode === 'pomodoro'
                              ? 'var(--color-accent-soft)'
                              : 'var(--color-elevated)',
                          border: `1px solid ${
                            session.mode === 'pomodoro'
                              ? 'var(--color-accent)'
                              : 'var(--color-border)'
                          }`,
                        }}
                        title={`${session.planned_minutes}min ${session.mode === 'pomodoro' ? 'focus' : 'break'} — ${
                          session.started_at
                            ? new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''
                        }`}
                      >
                        {session.mode === 'pomodoro' ? (
                          <Check size={14} style={{ color: 'var(--color-accent)' }} />
                        ) : (
                          <Coffee size={12} style={{ color: 'var(--color-text-muted)' }} />
                        )}
                      </motion.div>
                    ))}
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* ─── RIGHT: Sound + Volume Panel ─── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="w-full lg:w-80 rounded-2xl p-5 space-y-6"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Sound Selector */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Volume2 size={14} style={{ color: 'var(--color-accent)' }} />
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
                >
                  Ambient Sound
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {SOUNDS.map((sound) => {
                  const isSelected = timer.soundUsed === sound.id;
                  return (
                    <motion.button
                      key={sound.id}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => timer.setSoundUsed(isSelected ? null : sound.id)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200"
                      style={{
                        background: isSelected ? 'var(--color-accent-soft)' : 'var(--color-elevated)',
                        border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        boxShadow: isSelected ? 'var(--shadow-accent)' : 'none',
                      }}
                    >
                      <span className="text-xl leading-none">{sound.emoji}</span>
                      <span
                        className="text-[10px] font-medium"
                        style={{
                          color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {sound.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* None option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => timer.setSoundUsed(null)}
                className="w-full mt-2 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                style={{
                  background: timer.soundUsed === null ? 'var(--color-accent-soft)' : 'var(--color-elevated)',
                  border: `1.5px solid ${timer.soundUsed === null ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: timer.soundUsed === null ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                🔇 Silence
              </motion.button>
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
                >
                  Volume
                </span>
                <span
                  className="text-xs tabular-nums"
                  style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  {Math.round(timer.volume * 100)}%
                </span>
              </div>

              <div className="relative group">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={timer.volume}
                  onChange={(e) => timer.setVolume(parseFloat(e.target.value))}
                  className="w-full appearance-none h-1.5 rounded-full outline-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${timer.volume * 100}%, var(--color-border) ${timer.volume * 100}%, var(--color-border) 100%)`,
                  }}
                />
              </div>
            </div>

            {/* Quick Focus Tips */}
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--color-elevated)',
                border: '1px solid var(--color-border-soft)',
              }}
            >
              <p
                className="text-[11px] leading-relaxed italic"
                style={{ color: 'var(--color-text-muted)' }}
              >
                💡 Tip: After {SESSIONS_PER_CYCLE} focus sessions, take a longer break.
                Your brain consolidates learning during rest periods.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Custom slider thumb styles */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-accent);
          box-shadow: 0 0 8px var(--color-accent-glow);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 14px var(--color-accent-glow);
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-accent);
          box-shadow: 0 0 8px var(--color-accent-glow);
          cursor: pointer;
          border: none;
        }
        input[type='range']::-moz-range-track {
          height: 6px;
          border-radius: 9999px;
        }
      `}</style>
    </PageWrapper>
  );
};
