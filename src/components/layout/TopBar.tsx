import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Sun, Moon, Search, LogOut } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const TopBar: React.FC = () => {
  const { profile, signOut } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return 'Dashboard';
      case '/journal':
        return 'Journal';
      case '/habits':
        return 'Habits';
      case '/tasks':
        return 'Tasks';
      case '/focus':
        return 'Focus Timer';
      case '/analytics':
        return 'Analytics';
      case '/settings':
        return 'Settings';
      default:
        return 'Life OS';
    }
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <header className="h-16 border-b border-border-soft bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Title */}
      <h1 className="font-display text-2xl italic font-medium text-text-primary">
        {getPageTitle(location.pathname)}
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Global Search Bar (Visual trigger) */}
        <div className="hidden sm:flex items-center gap-2 bg-elevated border border-border rounded-md px-3 py-1.5 w-60 text-text-secondary focus-within:border-accent group">
          <Search size={14} className="group-focus-within:text-accent" />
          <input
            type="text"
            placeholder="Search notes, habits..."
            className="bg-transparent border-none outline-none text-xs text-text-primary placeholder-text-muted w-full"
            disabled
          />
          <span className="text-[10px] bg-border px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={handleThemeToggle}
          className="h-9 w-9 rounded-md hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 focus:outline-none"
            aria-label="User menu"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile Avatar"
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/30 text-accent flex items-center justify-center font-mono text-sm font-semibold">
                {profile?.name ? profile.name[0].toUpperCase() : 'U'}
              </div>
            )}
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-md shadow-lg py-1 z-20">
                <div className="px-4 py-2 border-b border-border-soft">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {profile?.name || 'User'}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    Personal Life OS
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary flex items-center gap-2 border-none outline-none bg-transparent cursor-pointer"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
