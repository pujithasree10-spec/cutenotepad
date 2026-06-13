import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWeather } from '../hooks/useWeather';
import { useQuote } from '../hooks/useQuote';
import { supabase } from '../lib/supabase';
import { Habit, HabitLog, Task, Note, MoodLog } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Flame,
  Check
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const { weather, loading: weatherLoading } = useWeather();
  const { quote, loading: quoteLoading } = useQuote();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [todayMood, setTodayMood] = useState<MoodLog | null>(null);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  const moodOptions = [
    { value: 1, emoji: '😢', label: 'Awful' },
    { value: 2, emoji: '😕', label: 'Bad' },
    { value: 3, emoji: '😐', label: 'Okay' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '🤩', label: 'Awesome' },
  ];

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Fetch habits (non-archived)
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .eq('archived', false)
        .order('position', { ascending: true });

      // 2. Fetch today's habit logs
      const { data: logsData } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('completed_at', todayStr);

      // 3. Fetch top 3 incomplete tasks ordered by priority (urgent -> high -> medium -> low)
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'done')
        .order('priority', { ascending: false })
        .limit(3);

      // 4. Fetch last 3 modified notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(3);

      // 5. Fetch today's mood
      const { data: moodData } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('logged_at', todayStr)
        .maybeSingle();

      // 6. Fetch today's focus minutes
      const { data: focusData } = await supabase
        .from('focus_sessions')
        .select('actual_minutes')
        .eq('completed', true)
        .gte('started_at', `${todayStr}T00:00:00Z`);

      setHabits(habitsData || []);
      setHabitLogs(logsData || []);
      setTasks(tasksData || []);
      setRecentNotes(notesData || []);
      setTodayMood(moodData || null);

      const totalMins = (focusData || []).reduce((sum: number, s: any) => sum + (s.actual_minutes || 0), 0);
      setFocusMinutes(totalMins);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHabit = async (habitId: string) => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const existingLog = habitLogs.find((l) => l.habit_id === habitId);

    // Optimistic UI updates
    let updatedLogs = [...habitLogs];
    if (existingLog) {
      updatedLogs = updatedLogs.filter((l) => l.habit_id !== habitId);
    } else {
      updatedLogs.push({ id: 'temp-id', habit_id: habitId, user_id: user.id, completed_at: todayStr, note: null });
    }
    setHabitLogs(updatedLogs);

    try {
      if (existingLog) {
        await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', habitId)
          .eq('completed_at', todayStr);
      } else {
        await supabase.from('habit_logs').insert({
          habit_id: habitId,
          completed_at: todayStr,
        });
      }
      
      const { data: logsData } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('completed_at', todayStr);
      setHabitLogs(logsData || []);
    } catch (e) {
      console.error('Error toggling habit:', e);
      fetchDashboardData();
    }
  };

  const handleToggleTask = async (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
    } catch (e) {
      console.error('Error toggling task:', e);
      fetchDashboardData();
    }
  };

  const handleLogMood = async (moodVal: number) => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    const oldMood = todayMood;
    setTodayMood({
      id: 'temp-id',
      user_id: user.id,
      mood: moodVal,
      tags: [],
      note: null,
      logged_at: todayStr,
    });

    try {
      const { error } = await supabase.from('mood_logs').upsert({
        user_id: user.id,
        mood: moodVal,
        logged_at: todayStr,
      }, { onConflict: 'user_id,logged_at' });

      if (error) throw error;
      
      const { data: moodData } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('logged_at', todayStr)
        .maybeSingle();
      setTodayMood(moodData || null);
    } catch (e) {
      console.error('Error logging mood:', e);
      setTodayMood(oldMood);
    }
  };

  const calculateScore = () => {
    const habitCompletionRate = habits.length > 0 ? habitLogs.length / habits.length : 1.0;
    const focusRate = Math.min(focusMinutes / 60, 1.0); 
    const taskCompletionRate = 1.0; 
    
    const habitsWeight = habitCompletionRate * 40;
    const focusWeight = focusRate * 40;
    const tasksWeight = taskCompletionRate * 20;

    return Math.round(habitsWeight + focusWeight + tasksWeight);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
      </div>
    );
  }

  const productivityScore = calculateScore();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Greetings */}
        <div className="md:col-span-8 bg-surface border border-border rounded-lg p-6 flex flex-col justify-between min-h-[160px] card-hover-effect">
          <div>
            <h2 className="font-display text-4xl italic text-text-primary mb-2">
              {getGreeting()}, {profile?.name || 'Explorer'}
            </h2>
            <p className="text-text-secondary text-sm">
              Today is {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-text-secondary mt-4">
            <span className="flex items-center gap-1">
              <Flame size={14} className="text-accent" /> Active Streak: {habitLogs.length > 0 ? '1 day' : '0 days'}
            </span>
          </div>
        </div>

        {/* Weather */}
        <div className="md:col-span-4 bg-surface border border-border rounded-lg p-6 flex flex-col justify-between min-h-[160px] card-hover-effect">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-text-secondary uppercase">Local Weather</span>
            <span className="text-text-muted text-[10px]">Weather by Open-Meteo</span>
          </div>
          {weatherLoading ? (
            <div className="h-10 w-10 animate-pulse bg-elevated rounded"></div>
          ) : weather ? (
            <div className="flex items-center justify-between mt-2">
              <div>
                <div className="text-3xl font-semibold text-text-primary">
                  {Math.round(weather.temperature)}°C
                </div>
                <div className="text-xs text-text-secondary mt-1">{weather.label}</div>
              </div>
              <div className="text-4xl">{weather.icon}</div>
            </div>
          ) : (
            <div className="text-xs text-text-muted mt-2">Could not retrieve weather</div>
          )}
        </div>

        {/* Quote */}
        <div className="md:col-span-4 bg-surface border border-border rounded-lg p-6 flex flex-col justify-between min-h-[220px] card-hover-effect">
          <span className="text-xs font-mono text-text-secondary uppercase">Inspiration</span>
          {quoteLoading ? (
            <div className="space-y-2 mt-4">
              <div className="h-4 bg-elevated rounded w-full"></div>
              <div className="h-4 bg-elevated rounded w-5/6"></div>
            </div>
          ) : quote ? (
            <div className="mt-4">
              <p className="font-display text-lg italic text-text-primary leading-relaxed">
                "{quote.q}"
              </p>
              <p className="text-xs text-text-secondary mt-2">— {quote.a}</p>
            </div>
          ) : null}
          <div></div>
        </div>

        {/* Habits Checklist */}
        <div className="md:col-span-4 bg-surface border border-border rounded-lg p-6 flex flex-col justify-between min-h-[220px] card-hover-effect">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-text-secondary uppercase">Daily Habits</span>
            <Link to="/habits" className="text-xs text-accent hover:underline flex items-center">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          
          <div className="mt-4 space-y-2.5 max-h-[120px] overflow-y-auto pr-1">
            {habits.length === 0 ? (
              <div className="text-xs text-text-muted italic py-4">No habits set for today.</div>
            ) : (
              habits.map((habit) => {
                const completed = habitLogs.some((l) => l.habit_id === habit.id);
                return (
                  <div key={habit.id} className="flex items-center justify-between py-1 border-b border-border-soft last:border-0">
                    <span className="text-sm text-text-primary flex items-center gap-2">
                      <span>{habit.icon}</span>
                      <span>{habit.name}</span>
                    </span>
                    <button
                      onClick={() => handleToggleHabit(habit.id)}
                      className={`h-6 w-6 rounded-md flex items-center justify-center border transition-all ${
                        completed
                          ? 'bg-accent border-accent text-white'
                          : 'border-border bg-elevated text-transparent hover:border-accent'
                      }`}
                    >
                      <Check size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <div></div>
        </div>

        {/* Productivity Score */}
        <div className="md:col-span-4 bg-surface border border-border rounded-lg p-6 flex flex-col justify-between min-h-[220px] card-hover-effect">
          <span className="text-xs font-mono text-text-secondary uppercase">Productivity Health</span>
          <div className="flex items-center justify-center mt-4">
            <div className="text-center">
              <div className="text-5xl font-semibold text-text-primary font-mono">{productivityScore}%</div>
              <div className="text-xs text-text-secondary mt-2">Daily Alignment Score</div>
            </div>
          </div>
          <div></div>
        </div>

        {/* Focus Timer status */}
        <div className="md:col-span-4 bg-surface border border-border rounded-lg p-6 flex flex-col justify-between min-h-[220px] card-hover-effect">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-text-secondary uppercase">Focus Session</span>
            <Link to="/focus" className="text-xs text-accent hover:underline flex items-center">
              Timer <ChevronRight size={12} />
            </Link>
          </div>
          <div className="mt-4 text-center">
            <div className="text-4xl font-semibold text-text-primary font-mono">{focusMinutes}m</div>
            <p className="text-xs text-text-secondary mt-1">Focused today</p>
          </div>
          <button
            onClick={() => navigate('/focus')}
            className="w-full mt-4 bg-accent/10 border border-accent/20 text-accent text-xs py-2 rounded-md hover:bg-accent/20 transition active:scale-[0.98] font-medium"
          >
            Start Timer
          </button>
        </div>

        {/* Tasks Quick View */}
        <div className="md:col-span-4 bg-surface border border-border rounded-lg p-6 flex flex-col justify-between min-h-[220px] card-hover-effect">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-text-secondary uppercase">Focus Tasks</span>
            <Link to="/tasks" className="text-xs text-accent hover:underline flex items-center">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {tasks.length === 0 ? (
              <div className="text-xs text-text-muted italic py-4">No pending focus tasks.</div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className="h-5 w-5 rounded border border-border bg-elevated hover:border-accent text-transparent flex items-center justify-center transition"
                  >
                    <Check size={10} />
                  </button>
                  <span className="text-sm text-text-primary truncate flex-1">{task.title}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded capitalize ${
                      task.priority === 'urgent'
                        ? 'bg-danger/10 text-danger border border-danger/20'
                        : task.priority === 'high'
                        ? 'bg-warning/10 text-warning border border-warning/20'
                        : 'bg-accent/10 text-accent border border-accent/20'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
          <div></div>
        </div>

        {/* Mood Check-In */}
        <div className="md:col-span-4 bg-surface border border-border rounded-lg p-6 flex flex-col justify-between min-h-[220px] card-hover-effect">
          <span className="text-xs font-mono text-text-secondary uppercase">Today's Mood</span>
          <div className="mt-4">
            <div className="text-center mb-4 text-3xl">
              {todayMood ? moodOptions.find((m) => m.value === todayMood.mood)?.emoji : '😶'}
              <div className="text-xs text-text-secondary mt-1">
                {todayMood ? moodOptions.find((m) => m.value === todayMood.mood)?.label : 'Not Logged'}
              </div>
            </div>
            <div className="flex justify-between gap-1">
              {moodOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLogMood(opt.value)}
                  className={`text-xl p-1.5 rounded-md hover:bg-white/5 transition active:scale-[0.9] ${
                    todayMood?.mood === opt.value ? 'bg-accent/10 border border-accent/30' : ''
                  }`}
                  title={opt.label}
                >
                  {opt.emoji}
                </button>
              ))}
            </div>
          </div>
          <div></div>
        </div>

        {/* Recent Notes */}
        <div className="md:col-span-12 bg-surface border border-border rounded-lg p-6 card-hover-effect">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-mono text-text-secondary uppercase">Recent Journal Entry</span>
            <Link to="/journal" className="text-xs text-accent hover:underline flex items-center">
              Write New Note <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentNotes.length === 0 ? (
              <div className="md:col-span-3 text-center py-6 text-xs text-text-muted italic border border-dashed border-border rounded-md">
                No notes found. Create your first note in the Journal tab.
              </div>
            ) : (
              recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => navigate('/journal')}
                  className="p-4 bg-elevated border border-border hover:border-text-muted rounded-md cursor-pointer transition flex flex-col justify-between h-28"
                >
                  <div>
                    <h3 className="font-medium text-sm text-text-primary truncate">{note.title}</h3>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                      {typeof note.content === 'string'
                        ? note.content
                        : note.content?.text || 'No text contents.'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted self-end">
                    {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};
