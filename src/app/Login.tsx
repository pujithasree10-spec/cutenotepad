import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { user, loading } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (error) throw error;
        alert('Verification email sent! Check your inbox to activate your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Google OAuth failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-surface p-8 shadow-md">
        <div className="text-center">
          <h2 className="font-display text-3xl italic text-text-primary">
            {isSignUp ? 'Create your space' : 'Welcome back'}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {isSignUp ? 'Start organizing your thoughts and habits' : 'Your safe harbor is ready'}
          </p>
        </div>

        {authError && (
          <div className="rounded-md bg-danger/10 border border-danger/25 p-3 text-xs text-danger">
            {authError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleEmailAuth}>
          {isSignUp && (
            <div>
              <label htmlFor="name-input" className="block text-xs font-medium text-text-secondary mb-1">
                Name
              </label>
              <input
                id="name-input"
                type="text"
                required
                className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label htmlFor="email-input" className="block text-xs font-medium text-text-secondary mb-1">
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              required
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password-input" className="block text-xs font-medium text-text-secondary mb-1">
              Password
            </label>
            <input
              id="password-input"
              type="password"
              required
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-glow"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-accent transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
          >
            {authLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : isSignUp ? (
              'Sign Up'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-4 text-text-muted text-xs">or</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <button
          onClick={handleGoogleAuth}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-elevated hover:text-text-primary"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.386-2.876-6.386-6.386 0-3.51 2.876-6.386 6.386-6.386 1.63 0 3.117.618 4.254 1.629l3.11-3.11C19.16 2.057 15.89 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 10.785-4.55 10.785-11.085 0-.75-.082-1.31-.206-1.805H12.24Z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="text-center text-xs mt-4">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-accent hover:underline bg-transparent border-none outline-none cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};
