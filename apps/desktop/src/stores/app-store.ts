/**
 * App-level state management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppPaths {
  appData: string;
  database: string;
  storage: string;
  models: string;
  recordings: string;
  exports: string;
  temp: string;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'error';
  port?: number;
  error?: string;
}

interface AppState {
  // App info
  version: string;
  platform: string;
  theme: 'light' | 'dark' | 'system';
  paths: AppPaths | null;

  // Services
  services: Record<string, ServiceStatus>;
  servicesLoading: boolean;

  // UI state
  sidebarCollapsed: boolean;
  currentView: 'dashboard' | 'projects' | 'recording' | 'settings';

  // Actions
  setVersion: (version: string) => void;
  setPlatform: (platform: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setPaths: (paths: AppPaths) => void;
  setServices: (services: Record<string, ServiceStatus>) => void;
  setServicesLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setCurrentView: (view: AppState['currentView']) => void;

  // Initialize app
  initialize: () => Promise<void>;
  refreshServices: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      version: '',
      platform: '',
      theme: 'system',
      paths: null,
      services: {},
      servicesLoading: false,
      sidebarCollapsed: false,
      currentView: 'dashboard',

      // Actions
      setVersion: (version) => set({ version }),
      setPlatform: (platform) => set({ platform }),
      setTheme: (theme) => set({ theme }),
      setPaths: (paths) => set({ paths }),
      setServices: (services) => set({ services }),
      setServicesLoading: (loading) => set({ servicesLoading: loading }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setCurrentView: (currentView) => set({ currentView }),

      // Initialize app
      initialize: async () => {
        if (typeof window.electronAPI === 'undefined') {
          console.warn('Running in browser mode, electron APIs not available');
          return;
        }

        try {
          const [version, platform, paths] = await Promise.all([
            window.electronAPI.app.getVersion(),
            window.electronAPI.app.getPlatform(),
            window.electronAPI.app.getPaths(),
          ]);

          set({ version, platform, paths });

          // Refresh services status
          await get().refreshServices();
        } catch (error) {
          console.error('Failed to initialize app:', error);
        }
      },

      refreshServices: async () => {
        if (typeof window.electronAPI === 'undefined') return;

        set({ servicesLoading: true });
        try {
          const services = await window.electronAPI.services.getStatus();
          set({ services });
        } catch (error) {
          console.error('Failed to refresh services:', error);
        } finally {
          set({ servicesLoading: false });
        }
      },
    }),
    {
      name: 'verbatim-app-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
