import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the exposed API
export interface AppPaths {
  appData: string;
  database: string;
  storage: string;
  models: string;
  recordings: string;
  exports: string;
  temp: string;
}

export interface FileDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface FileStat {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  created: string;
  modified: string;
}

export interface DirEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  path: string;
}

export interface AudioInfo {
  path: string;
  name: string;
  format: string;
  size: number;
  duration: number | null;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'error';
  port?: number;
  error?: string;
}

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Store operations (encrypted local storage)
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
    getPaths: () => ipcRenderer.invoke('app:getPaths'),
    getTheme: () => ipcRenderer.invoke('app:getTheme'),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // File operations
  file: {
    openDialog: (options?: unknown) => ipcRenderer.invoke('file:openDialog', options),
    openMultipleDialog: (options?: unknown) => ipcRenderer.invoke('file:openMultipleDialog', options),
    saveDialog: (options?: unknown) => ipcRenderer.invoke('file:saveDialog', options),
    read: (path: string) => ipcRenderer.invoke('file:read', path),
    readText: (path: string) => ipcRenderer.invoke('file:readText', path),
    write: (path: string, data: Buffer | string) => ipcRenderer.invoke('file:write', path, data),
    exists: (path: string) => ipcRenderer.invoke('file:exists', path),
    stat: (path: string) => ipcRenderer.invoke('file:stat', path),
    copy: (src: string, dest: string) => ipcRenderer.invoke('file:copy', src, dest),
    delete: (path: string) => ipcRenderer.invoke('file:delete', path),
    listDir: (path: string) => ipcRenderer.invoke('file:listDir', path),
    showInFolder: (path: string) => ipcRenderer.invoke('file:showInFolder', path),
  },

  // Audio operations
  audio: {
    getInfo: (path: string) => ipcRenderer.invoke('audio:getInfo', path),
  },

  // Service management
  services: {
    getStatus: () => ipcRenderer.invoke('services:getStatus'),
    checkHealth: (serviceName: string) => ipcRenderer.invoke('services:checkHealth', serviceName),
  },

  // Database
  database: {
    getPath: () => ipcRenderer.invoke('database:getPath'),
  },

  // Shell operations
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
  },
});

// Type declarations for the renderer
declare global {
  interface Window {
    electronAPI: {
      store: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<void>;
        delete: (key: string) => Promise<void>;
      };
      app: {
        getVersion: () => Promise<string>;
        getPlatform: () => Promise<string>;
        getPath: (name: string) => Promise<string>;
        getPaths: () => Promise<AppPaths>;
        getTheme: () => Promise<'dark' | 'light'>;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<boolean>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
      };
      file: {
        openDialog: (options?: unknown) => Promise<FileDialogResult>;
        openMultipleDialog: (options?: unknown) => Promise<FileDialogResult>;
        saveDialog: (options?: unknown) => Promise<SaveDialogResult>;
        read: (path: string) => Promise<Buffer>;
        readText: (path: string) => Promise<string>;
        write: (path: string, data: Buffer | string) => Promise<void>;
        exists: (path: string) => Promise<boolean>;
        stat: (path: string) => Promise<FileStat>;
        copy: (src: string, dest: string) => Promise<void>;
        delete: (path: string) => Promise<void>;
        listDir: (path: string) => Promise<DirEntry[]>;
        showInFolder: (path: string) => Promise<void>;
      };
      audio: {
        getInfo: (path: string) => Promise<AudioInfo>;
      };
      services: {
        getStatus: () => Promise<Record<string, ServiceStatus>>;
        checkHealth: (serviceName: string) => Promise<boolean>;
      };
      database: {
        getPath: () => Promise<string>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
        openPath: (path: string) => Promise<void>;
      };
    };
  }
}
