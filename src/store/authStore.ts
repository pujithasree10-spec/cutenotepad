import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  updateProfilePreferences: (prefs: Partial<Profile['preferences']>) => Promise<void>;
  signOut: () => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      set({ profile: data });
      return data;
    } catch (e) {
      console.error('Error fetching profile:', e);
      return null;
    }
  },
  updateProfilePreferences: async (prefs) => {
    const { user, profile } = get();
    if (!user || !profile) return;
    const updatedPrefs = { ...profile.preferences, ...prefs };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferences: updatedPrefs })
        .eq('id', user.id);
      if (error) throw error;
      set({ profile: { ...profile, preferences: updatedPrefs } });
      
      // Update HTML theme attribute
      if (prefs.theme) {
        document.documentElement.setAttribute('data-theme', prefs.theme);
        localStorage.setItem('lifeos_theme', prefs.theme);
      }
    } catch (e) {
      console.error('Error updating profile preferences:', e);
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
  init: () => {
    if (get().initialized) return;

    // Apply cached theme initially
    const localTheme = localStorage.getItem('lifeos_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', localTheme);

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        set({ user: session.user });
        get().fetchProfile(session.user.id).then((profile) => {
          const activeTheme = profile?.preferences?.theme || localTheme;
          document.documentElement.setAttribute('data-theme', activeTheme);
          localStorage.setItem('lifeos_theme', activeTheme);
          set({ loading: false });
        });
      } else {
        set({ loading: false });
      }
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        set({ user: session.user });
        get().fetchProfile(session.user.id).then((profile) => {
          const activeTheme = profile?.preferences?.theme || localTheme;
          document.documentElement.setAttribute('data-theme', activeTheme);
          localStorage.setItem('lifeos_theme', activeTheme);
          set({ loading: false });
        });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });

    set({ initialized: true });
  },
}));
