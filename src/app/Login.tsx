import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { user, loading } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl">🌸</span>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMsg(null);
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setSuccessMsg('✉️ Check your inbox! We sent a verification link to activate your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Background decorative blobs */}
      <div
        className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'var(--color-accent-soft)' }}
      />
      <div
        className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: '#D8BFD8' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-5xl mb-3"
          >
            🌸
          </motion.div>
          <h1
            className="font-display text-3xl italic"
            style={{ color: 'var(--color-text-primary)' }}
          >
            little pages
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            your cozy personal space
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8 shadow-lg"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: '0 8px 40px rgba(201,120,138,0.10)',
          }}
        >
          {/* Tab switcher */}
          <div
            className="flex rounded-xl p-1 mb-6"
            style={{ background: 'var(--color-elevated)' }}
          >
            {['Sign In', 'Sign Up'].map((tab) => {
              const active = tab === 'Sign In' ? !isSignUp : isSignUp;
              return (
                <button
                  key={tab}
                  onClick={() => { setIsSignUp(tab === 'Sign Up'); setAuthError(null); setSuccessMsg(null); }}
                  className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                  style={{
                    background: active ? 'var(--color-accent)' : 'transparent',
                    color: active ? '#fff' : 'var(--color-text-secondary)',
                    boxShadow: active ? 'var(--shadow-accent)' : 'none',
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Error / Success messages */}
          <AnimatePresence mode="wait">
            {authError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-4 py-3 rounded-xl text-sm border"
                style={{
                  background: 'rgba(201,96,106,0.08)',
                  borderColor: 'rgba(201,96,106,0.25)',
                  color: 'var(--color-danger)',
                }}
              >
                {authError}
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                key="success"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-4 py-3 rounded-xl text-sm border"
                style={{
                  background: 'rgba(123,184,154,0.10)',
                  borderColor: 'rgba(123,184,154,0.30)',
                  color: 'var(--color-success)',
                }}
              >
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Name field (sign up only) */}
            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label
                    htmlFor="name-input"
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Your Name
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-text-muted)' }}
                    />
                    <input
                      id="name-input"
                      type="text"
                      required={isSignUp}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border transition-colors outline-none"
                      style={{
                        background: 'var(--color-elevated)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border transition-colors outline-none"
                  style={{
                    background: 'var(--color-elevated)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm border transition-colors outline-none"
                  style={{
                    background: 'var(--color-elevated)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={authLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all mt-2"
              style={{
                background: 'var(--color-accent)',
                color: '#fff',
                boxShadow: 'var(--shadow-accent)',
                opacity: authLoading ? 0.7 : 1,
              }}
            >
              {authLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create my space' : 'Welcome back'}
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>
          </form>

          {/* Demo credentials helper */}
          <div className="mt-4 text-center p-3 rounded-xl" style={{ background: 'var(--color-elevated)', border: '1px dashed var(--color-border)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              🌸 Running in Offline Mode. Log in with <strong style={{ color: 'var(--color-accent)' }}>demo@demo.com</strong> / <strong style={{ color: 'var(--color-accent)' }}>password123</strong>, or sign up for a local account.
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center my-5">
            <div className="flex-grow border-t" style={{ borderColor: 'var(--color-border)' }} />
            <span className="mx-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>or continue with</span>
            <div className="flex-grow border-t" style={{ borderColor: 'var(--color-border)' }} />
          </div>

          {/* Google OAuth */}
          <motion.button
            onClick={handleGoogleAuth}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border text-sm font-medium transition-all"
            style={{
              background: 'var(--color-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.27 12.5c0-.88.14-1.72.4-2.5L2.2 7.46A10.98 10.98 0 0 0 1 12.5c0 1.77.42 3.43 1.18 4.9l3.47-2.7A6.47 6.47 0 0 1 5.27 12.5z"
              />
              <path
                fill="#FBBC05"
                d="M12.27 6c1.55 0 2.93.57 4.02 1.5L19.08 4.7A11 11 0 0 0 12.27 2c-4.2 0-7.85 2.39-9.6 5.92l3.47 2.7C7 8.08 9.4 6 12.27 6z"
              />
              <path
                fill="#34A853"
                d="M12.27 19c-2.87 0-5.27-2.08-5.87-4.8L2.93 17c1.75 3.53 5.4 6 9.34 6a10.97 10.97 0 0 0 7.28-2.73l-3.3-2.56A6.47 6.47 0 0 1 12.27 19z"
              />
              <path
                fill="#4285F4"
                d="M22.54 12.5c0-.73-.07-1.43-.19-2.1h-10.08v4h5.79a4.9 4.9 0 0 1-2.12 3.22l3.3 2.56c1.93-1.79 3.3-4.44 3.3-7.68z"
              />
            </svg>
            Continue with Google
          </motion.button>

          <p className="text-center text-xs mt-5" style={{ color: 'var(--color-text-muted)' }}>
            By continuing you agree to our{' '}
            <span className="underline cursor-pointer" style={{ color: 'var(--color-accent)' }}>
              Terms
            </span>{' '}
            &{' '}
            <span className="underline cursor-pointer" style={{ color: 'var(--color-accent)' }}>
              Privacy Policy
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
