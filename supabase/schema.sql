-- Supabase Database Schema for Little Pages (Personal Life OS)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  preferences jsonb default '{"theme": "light", "accentColor": "#F4C2C2", "font": "inter", "dashboardLayout": "default"}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Trigger to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger hook for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Folders Table
create table if not exists public.folders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text default '#F4C2C2',
  icon text default '📁',
  parent_id uuid references public.folders on delete cascade,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.folders enable row level security;
drop policy if exists "Users manage own folders" on folders;
create policy "Users manage own folders" on folders for all using (auth.uid() = user_id);

-- 3. Notes (Journal) Table
create table if not exists public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  folder_id uuid references public.folders on delete set null,
  title text not null default 'Untitled',
  content jsonb default '{"elements": [], "bgColor": "#FFF8F0", "bgPattern": "none", "__scrapbook": true}'::jsonb,
  tags text[] default '{}',
  cover_url text,
  template_id uuid,
  is_pinned boolean default false,
  word_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notes enable row level security;
drop policy if exists "Users manage own notes" on notes;
create policy "Users manage own notes" on notes for all using (auth.uid() = user_id);

-- 4. Habits Table
create table if not exists public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  icon text default '🎯',
  color text default '#f472b6',
  frequency text default 'daily',
  target_days integer[] default '{1,2,3,4,5,6,7}',
  archived boolean default false,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.habits enable row level security;
drop policy if exists "Users manage own habits" on habits;
create policy "Users manage own habits" on habits for all using (auth.uid() = user_id);

-- 5. Habit Logs Table
create table if not exists public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  completed_at date not null,
  note text,
  unique (habit_id, completed_at)
);

alter table public.habit_logs enable row level security;
drop policy if exists "Users manage own habit logs" on habit_logs;
create policy "Users manage own habit logs" on habit_logs for all using (auth.uid() = user_id);

-- 6. Tasks Table
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  parent_task_id uuid references public.tasks on delete cascade,
  title text not null,
  description text,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  status text check (status in ('todo', 'in_progress', 'done')) default 'todo',
  due_date date,
  tags text[] default '{}',
  position integer default 0,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;
drop policy if exists "Users manage own tasks" on tasks;
create policy "Users manage own tasks" on tasks for all using (auth.uid() = user_id);

-- 7. Focus Sessions Table
create table if not exists public.focus_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  task_id uuid references public.tasks on delete set null,
  mode text check (mode in ('pomodoro', 'custom')) default 'pomodoro',
  planned_minutes integer not null,
  actual_minutes integer,
  sound_used text,
  completed boolean default false,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone
);

alter table public.focus_sessions enable row level security;
drop policy if exists "Users manage own focus sessions" on focus_sessions;
create policy "Users manage own focus sessions" on focus_sessions for all using (auth.uid() = user_id);

-- 8. Mood Logs Table
create table if not exists public.mood_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  mood integer check (mood >= 1 and mood <= 5) not null,
  tags text[] default '{}',
  note text,
  logged_at date not null,
  unique (user_id, logged_at)
);

alter table public.mood_logs enable row level security;
drop policy if exists "Users manage own mood logs" on mood_logs;
create policy "Users manage own mood logs" on mood_logs for all using (auth.uid() = user_id);

-- 9. Templates Table
create table if not exists public.templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  category text,
  description text,
  content jsonb not null,
  thumbnail text,
  is_system boolean default false,
  uses integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.templates enable row level security;
drop policy if exists "Users view system templates and own templates" on templates;
create policy "Users view system templates and own templates" on templates for select using (is_system = true or auth.uid() = user_id);

drop policy if exists "Users manage own templates" on templates;
create policy "Users manage own templates" on templates for insert with check (auth.uid() = user_id);

drop policy if exists "Users manage own templates update" on templates;
create policy "Users manage own templates update" on templates for update using (auth.uid() = user_id);

drop policy if exists "Users manage own templates delete" on templates;
create policy "Users manage own templates delete" on templates for delete using (auth.uid() = user_id);

-- Realtime subscriptions
alter publication supabase_realtime add table public.profiles, public.folders, public.notes, public.habits, public.habit_logs, public.tasks, public.focus_sessions, public.mood_logs;
