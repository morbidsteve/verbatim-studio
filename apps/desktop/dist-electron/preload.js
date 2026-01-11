import { contextBridge as t, ipcRenderer as i } from "electron";
t.exposeInMainWorld("electronAPI", {
  // Store operations (encrypted local storage)
  store: {
    get: (e) => i.invoke("store:get", e),
    set: (e, o) => i.invoke("store:set", e, o),
    delete: (e) => i.invoke("store:delete", e)
  },
  // App info
  app: {
    getVersion: () => i.invoke("app:getVersion"),
    getPlatform: () => i.invoke("app:getPlatform"),
    getPath: (e) => i.invoke("app:getPath", e),
    getPaths: () => i.invoke("app:getPaths"),
    getTheme: () => i.invoke("app:getTheme")
  },
  // Window controls
  window: {
    minimize: () => i.invoke("window:minimize"),
    maximize: () => i.invoke("window:maximize"),
    close: () => i.invoke("window:close"),
    isMaximized: () => i.invoke("window:isMaximized")
  },
  // File operations
  file: {
    openDialog: (e) => i.invoke("file:openDialog", e),
    openMultipleDialog: (e) => i.invoke("file:openMultipleDialog", e),
    saveDialog: (e) => i.invoke("file:saveDialog", e),
    read: (e) => i.invoke("file:read", e),
    readText: (e) => i.invoke("file:readText", e),
    write: (e, o) => i.invoke("file:write", e, o),
    exists: (e) => i.invoke("file:exists", e),
    stat: (e) => i.invoke("file:stat", e),
    copy: (e, o) => i.invoke("file:copy", e, o),
    delete: (e) => i.invoke("file:delete", e),
    listDir: (e) => i.invoke("file:listDir", e),
    showInFolder: (e) => i.invoke("file:showInFolder", e)
  },
  // Audio operations
  audio: {
    getInfo: (e) => i.invoke("audio:getInfo", e)
  },
  // Service management
  services: {
    getStatus: () => i.invoke("services:getStatus"),
    checkHealth: (e) => i.invoke("services:checkHealth", e)
  },
  // Database
  database: {
    getPath: () => i.invoke("database:getPath")
  },
  // Shell operations
  shell: {
    openExternal: (e) => i.invoke("shell:openExternal", e),
    openPath: (e) => i.invoke("shell:openPath", e)
  }
});
