export interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  preferences: {
    theme: 'dark' | 'light';
    accentColor: string;
    font: string;
    dashboardLayout: string;
  };
  created_at?: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  parent_id: string | null;
  position: number;
  created_at?: string;
}

export interface Note {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: any; // TipTap JSON
  tags: string[];
  cover_url: string | null;
  template_id: string | null;
  is_pinned: boolean;
  word_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  target_days: number[]; // 1-7 for Mon-Sun
  archived: boolean;
  position: number;
  created_at?: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string; // YYYY-MM-DD
  note: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  due_date: string | null; // YYYY-MM-DD
  tags: string[];
  position: number;
  created_at?: string;
  updated_at?: string;
  completed_at: string | null;
  subtasks?: Task[];
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  mode: 'pomodoro' | 'custom';
  planned_minutes: number;
  actual_minutes: number | null;
  sound_used: string | null;
  completed: boolean;
  started_at?: string;
  ended_at?: string;
}

export interface MoodLog {
  id: string;
  user_id: string;
  mood: number; // 1-5
  tags: string[];
  note: string | null;
  logged_at: string; // YYYY-MM-DD
}

export interface Template {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  description: string | null;
  content: any; // TipTap JSON
  thumbnail: string | null;
  is_system: boolean;
  uses: number;
  created_at?: string;
}
