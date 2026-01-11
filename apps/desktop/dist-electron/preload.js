import { contextBridge as t, ipcRenderer as e } from "electron";
t.exposeInMainWorld("electronAPI", {
  // Store operations
  store: {
    get: (i) => e.invoke("store:get", i),
    set: (i, o) => e.invoke("store:set", i, o),
    delete: (i) => e.invoke("store:delete", i)
  },
  // App info
  app: {
    getVersion: () => e.invoke("app:getVersion"),
    getPlatform: () => e.invoke("app:getPlatform"),
    getPath: (i) => e.invoke("app:getPath", i)
  },
  // Window controls
  window: {
    minimize: () => e.invoke("window:minimize"),
    maximize: () => e.invoke("window:maximize"),
    close: () => e.invoke("window:close")
  },
  // File operations (to be implemented)
  file: {
    openDialog: () => e.invoke("file:openDialog"),
    saveDialog: () => e.invoke("file:saveDialog"),
    readFile: (i) => e.invoke("file:read", i),
    writeFile: (i, o) => e.invoke("file:write", i, o)
  },
  // Docker operations (to be implemented)
  docker: {
    isAvailable: () => e.invoke("docker:isAvailable"),
    startServices: () => e.invoke("docker:startServices"),
    stopServices: () => e.invoke("docker:stopServices"),
    getStatus: () => e.invoke("docker:getStatus")
  }
});
