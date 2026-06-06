import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  activeModal: string | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveModal: (modal: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: localStorage.getItem('lifeos_sidebar_collapsed') === 'true',
  theme: (localStorage.getItem('lifeos_theme') as 'dark' | 'light') || 'dark',
  activeModal: null,
  toggleSidebar: () =>
    set((state) => {
      const collapsed = !state.sidebarCollapsed;
      localStorage.setItem('lifeos_sidebar_collapsed', String(collapsed));
      return { sidebarCollapsed: collapsed };
    }),
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('lifeos_sidebar_collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },
  setTheme: (theme) => {
    localStorage.setItem('lifeos_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  setActiveModal: (modal) => set({ activeModal: modal }),
}));
