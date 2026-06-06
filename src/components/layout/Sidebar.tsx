import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import {
  LayoutDashboard,
  BookOpen,
  CheckCircle2,
  ListTodo,
  Timer,
  BarChart3,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/journal', label: 'Journal', icon: BookOpen },
    { path: '/habits', label: 'Habits', icon: CheckCircle2 },
    { path: '/tasks', label: 'Tasks', icon: ListTodo },
    { path: '/focus', label: 'Focus', icon: Timer },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen bg-surface border-r border-border-soft transition-all duration-300 ease-in-out relative ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border-soft overflow-hidden">
          <span className="font-display text-2xl italic font-semibold text-accent whitespace-nowrap">
            {sidebarCollapsed ? 'LN' : 'Life OS'}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center h-10 px-3 rounded-md transition-colors duration-150 relative group ${
                    isActive
                      ? 'bg-accent/10 text-accent font-medium border-l-2 border-accent rounded-l-none'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  }`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="ml-3 text-sm transition-opacity duration-200">{item.label}</span>
                )}
                {sidebarCollapsed && (
                  <div className="absolute left-16 bg-elevated border border-border px-2 py-1 rounded text-xs text-text-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute bottom-4 -right-3 h-6 w-6 rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary flex items-center justify-center shadow-sm z-10"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Mobile Bottom Navigation Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border-soft flex items-center justify-around px-2 z-40 shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full text-xs gap-1 ${
                  isActive ? 'text-accent font-medium' : 'text-text-secondary'
                }`
              }
            >
              <Icon size={18} />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          );
        })}
        {/* Settings button on mobile */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full text-xs gap-1 ${
              isActive ? 'text-accent font-medium' : 'text-text-secondary'
            }`
          }
        >
          <Settings2 size={18} />
          <span className="text-[10px]">Settings</span>
        </NavLink>
      </nav>
    </>
  );
};
