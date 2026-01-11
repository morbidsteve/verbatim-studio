import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Store operations
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
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // File operations (to be implemented)
  file: {
    openDialog: () => ipcRenderer.invoke('file:openDialog'),
    saveDialog: () => ipcRenderer.invoke('file:saveDialog'),
    readFile: (path: string) => ipcRenderer.invoke('file:read', path),
    writeFile: (path: string, data: unknown) => ipcRenderer.invoke('file:write', path, data),
  },

  // Docker operations (to be implemented)
  docker: {
    isAvailable: () => ipcRenderer.invoke('docker:isAvailable'),
    startServices: () => ipcRenderer.invoke('docker:startServices'),
    stopServices: () => ipcRenderer.invoke('docker:stopServices'),
    getStatus: () => ipcRenderer.invoke('docker:getStatus'),
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
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
      };
      file: {
        openDialog: () => Promise<string[]>;
        saveDialog: () => Promise<string>;
        readFile: (path: string) => Promise<unknown>;
        writeFile: (path: string, data: unknown) => Promise<void>;
      };
      docker: {
        isAvailable: () => Promise<boolean>;
        startServices: () => Promise<void>;
        stopServices: () => Promise<void>;
        getStatus: () => Promise<unknown>;
      };
    };
  }
}
