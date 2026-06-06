import { create } from 'zustand';

type TimerMode = 'pomodoro' | 'short_break' | 'long_break';

interface TimerState {
  secondsRemaining: number;
  mode: TimerMode;
  isRunning: boolean;
  plannedMinutes: number;
  sessionsCompleted: number;
  soundUsed: string | null;
  volume: number;
  setMode: (mode: TimerMode) => void;
  setMinutes: (mins: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  setSoundUsed: (sound: string | null) => void;
  setVolume: (vol: number) => void;
  completeSession: () => void;
}

const MODE_DURATIONS = {
  pomodoro: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

export const useTimerStore = create<TimerState>((set, get) => {
  let intervalId: any = null;

  return {
    secondsRemaining: 25 * 60,
    mode: 'pomodoro',
    isRunning: false,
    plannedMinutes: 25,
    sessionsCompleted: 0,
    soundUsed: null,
    volume: 0.4,
    setMode: (mode) => {
      get().pause();
      const secs = MODE_DURATIONS[mode];
      set({
        mode,
        secondsRemaining: secs,
        plannedMinutes: Math.floor(secs / 60),
      });
    },
    setMinutes: (mins) => {
      get().pause();
      set({
        plannedMinutes: mins,
        secondsRemaining: mins * 60,
      });
    },
    start: () => {
      if (get().isRunning) return;
      set({ isRunning: true });
      intervalId = setInterval(() => {
        get().tick();
      }, 1000);
    },
    pause: () => {
      if (!get().isRunning) return;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      set({ isRunning: false });
    },
    reset: () => {
      get().pause();
      const { mode, plannedMinutes } = get();
      set({
        secondsRemaining: mode === 'pomodoro' ? plannedMinutes * 60 : MODE_DURATIONS[mode],
        isRunning: false,
      });
    },
    tick: () => {
      const { secondsRemaining } = get();
      if (secondsRemaining <= 1) {
        get().completeSession();
      } else {
        set({ secondsRemaining: secondsRemaining - 1 });
      }
    },
    setSoundUsed: (sound) => set({ soundUsed: sound }),
    setVolume: (vol) => set({ volume: vol }),
    completeSession: () => {
      get().pause();
      const { mode, sessionsCompleted, plannedMinutes } = get();
      
      // Notify using browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = mode === 'pomodoro' ? 'Focus Session Completed! 🎉' : 'Break Over! ⏱️';
        const body = mode === 'pomodoro' 
          ? `Great work! You focused for ${plannedMinutes} minutes. Time for a break.` 
          : `Break's over, let's get back to work!`;
        new Notification(title, { body, icon: '/icon-192.png' });
      }

      if (mode === 'pomodoro') {
        set({
          sessionsCompleted: sessionsCompleted + 1,
          mode: 'short_break',
          secondsRemaining: MODE_DURATIONS['short_break'],
          plannedMinutes: 5,
        });
      } else {
        set({
          mode: 'pomodoro',
          secondsRemaining: MODE_DURATIONS['pomodoro'],
          plannedMinutes: 25,
        });
      }
    },
  };
});
