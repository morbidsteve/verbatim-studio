import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
  // Store operations (encrypted local storage)
  store: {
    get: (key) => ipcRenderer.invoke("store:get", key),
    set: (key, value) => ipcRenderer.invoke("store:set", key, value),
    delete: (key) => ipcRenderer.invoke("store:delete", key)
  },
  // App info
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
    getPlatform: () => ipcRenderer.invoke("app:getPlatform"),
    getPath: (name) => ipcRenderer.invoke("app:getPath", name),
    getPaths: () => ipcRenderer.invoke("app:getPaths"),
    getTheme: () => ipcRenderer.invoke("app:getTheme")
  },
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized")
  },
  // File operations
  file: {
    openDialog: (options) => ipcRenderer.invoke("file:openDialog", options),
    openMultipleDialog: (options) => ipcRenderer.invoke("file:openMultipleDialog", options),
    saveDialog: (options) => ipcRenderer.invoke("file:saveDialog", options),
    read: (path) => ipcRenderer.invoke("file:read", path),
    readText: (path) => ipcRenderer.invoke("file:readText", path),
    write: (path, data) => ipcRenderer.invoke("file:write", path, data),
    exists: (path) => ipcRenderer.invoke("file:exists", path),
    stat: (path) => ipcRenderer.invoke("file:stat", path),
    copy: (src, dest) => ipcRenderer.invoke("file:copy", src, dest),
    delete: (path) => ipcRenderer.invoke("file:delete", path),
    listDir: (path) => ipcRenderer.invoke("file:listDir", path),
    showInFolder: (path) => ipcRenderer.invoke("file:showInFolder", path)
  },
  // Audio operations
  audio: {
    getInfo: (path) => ipcRenderer.invoke("audio:getInfo", path)
  },
  // Service management
  services: {
    getStatus: () => ipcRenderer.invoke("services:getStatus"),
    checkHealth: (serviceName) => ipcRenderer.invoke("services:checkHealth", serviceName)
  },
  // Database
  database: {
    getPath: () => ipcRenderer.invoke("database:getPath")
  },
  // Shell operations
  shell: {
    openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
    openPath: (path) => ipcRenderer.invoke("shell:openPath", path)
  }
});
