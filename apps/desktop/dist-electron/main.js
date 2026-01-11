import { app, BrowserWindow, ipcMain, nativeTheme, dialog, shell } from "electron";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import Store from "electron-store";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const store = new Store({
  encryptionKey: "verbatim-studio-secure-key",
  // In production, derive from machine ID
  name: "verbatim-config"
});
let mainWindow = null;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const APP_DATA_PATH = app.getPath("userData");
const DATABASE_PATH = path.join(APP_DATA_PATH, "database.sqlite");
const STORAGE_PATH = path.join(APP_DATA_PATH, "storage");
const MODELS_PATH = path.join(APP_DATA_PATH, "models");
async function ensureDirectories() {
  await fs.mkdir(STORAGE_PATH, { recursive: true });
  await fs.mkdir(MODELS_PATH, { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, "recordings"), { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, "exports"), { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, "temp"), { recursive: true });
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#ffffff",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
      // Required for file system access
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(async () => {
  await ensureDirectories();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
ipcMain.handle("store:get", (_, key) => {
  return store.get(key);
});
ipcMain.handle("store:set", (_, key, value) => {
  store.set(key, value);
});
ipcMain.handle("store:delete", (_, key) => {
  store.delete(key);
});
ipcMain.handle("app:getVersion", () => {
  return app.getVersion();
});
ipcMain.handle("app:getPlatform", () => {
  return process.platform;
});
ipcMain.handle("app:getPath", (_, name) => {
  return app.getPath(name);
});
ipcMain.handle("app:getPaths", () => {
  return {
    appData: APP_DATA_PATH,
    database: DATABASE_PATH,
    storage: STORAGE_PATH,
    models: MODELS_PATH,
    recordings: path.join(STORAGE_PATH, "recordings"),
    exports: path.join(STORAGE_PATH, "exports"),
    temp: path.join(STORAGE_PATH, "temp")
  };
});
ipcMain.handle("app:getTheme", () => {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
});
ipcMain.handle("window:minimize", () => {
  mainWindow == null ? void 0 : mainWindow.minimize();
});
ipcMain.handle("window:maximize", () => {
  if (mainWindow == null ? void 0 : mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow == null ? void 0 : mainWindow.maximize();
  }
  return mainWindow == null ? void 0 : mainWindow.isMaximized();
});
ipcMain.handle("window:close", () => {
  mainWindow == null ? void 0 : mainWindow.close();
});
ipcMain.handle("window:isMaximized", () => {
  return (mainWindow == null ? void 0 : mainWindow.isMaximized()) ?? false;
});
ipcMain.handle("file:openDialog", async (_, options) => {
  const defaultOptions = {
    properties: ["openFile"],
    filters: [
      { name: "Audio Files", extensions: ["wav", "mp3", "m4a", "flac", "ogg", "aac"] },
      { name: "Video Files", extensions: ["mp4", "mov", "avi", "mkv", "webm"] },
      { name: "All Files", extensions: ["*"] }
    ]
  };
  const result = await dialog.showOpenDialog(mainWindow, { ...defaultOptions, ...options });
  return result;
});
ipcMain.handle("file:openMultipleDialog", async (_, options) => {
  const defaultOptions = {
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Audio Files", extensions: ["wav", "mp3", "m4a", "flac", "ogg", "aac"] },
      { name: "Video Files", extensions: ["mp4", "mov", "avi", "mkv", "webm"] },
      { name: "All Files", extensions: ["*"] }
    ]
  };
  const result = await dialog.showOpenDialog(mainWindow, { ...defaultOptions, ...options });
  return result;
});
ipcMain.handle("file:saveDialog", async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options ?? {});
  return result;
});
ipcMain.handle("file:read", async (_, filePath) => {
  const data = await fs.readFile(filePath);
  return data;
});
ipcMain.handle("file:readText", async (_, filePath) => {
  const data = await fs.readFile(filePath, "utf-8");
  return data;
});
ipcMain.handle("file:write", async (_, filePath, data) => {
  await fs.writeFile(filePath, data);
});
ipcMain.handle("file:exists", async (_, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});
ipcMain.handle("file:stat", async (_, filePath) => {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    created: stats.birthtime.toISOString(),
    modified: stats.mtime.toISOString()
  };
});
ipcMain.handle("file:copy", async (_, src, dest) => {
  await fs.copyFile(src, dest);
});
ipcMain.handle("file:delete", async (_, filePath) => {
  await fs.unlink(filePath);
});
ipcMain.handle("file:listDir", async (_, dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isFile: entry.isFile(),
    isDirectory: entry.isDirectory(),
    path: path.join(dirPath, entry.name)
  }));
});
ipcMain.handle("file:showInFolder", async (_, filePath) => {
  shell.showItemInFolder(filePath);
});
ipcMain.handle("audio:getInfo", async (_, filePath) => {
  const stats = await fs.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  return {
    path: filePath,
    name: path.basename(filePath),
    format: ext.slice(1),
    size: stats.size,
    // These would come from ffprobe in a real implementation
    duration: null,
    sampleRate: null,
    channels: null,
    bitrate: null
  };
});
let servicesStatus = {
  whisper: { name: "Whisper Service", status: "stopped", port: 8001 },
  diarization: { name: "Diarization Service", status: "stopped", port: 8003 },
  inflection: { name: "Inflection Analysis", status: "stopped", port: 8004 }
};
ipcMain.handle("services:getStatus", () => {
  return servicesStatus;
});
ipcMain.handle("services:checkHealth", async (_, serviceName) => {
  const service = servicesStatus[serviceName];
  if (!(service == null ? void 0 : service.port)) return false;
  try {
    const response = await fetch(`http://localhost:${service.port}/health`);
    return response.ok;
  } catch {
    return false;
  }
});
ipcMain.handle("database:getPath", () => {
  return DATABASE_PATH;
});
ipcMain.handle("shell:openExternal", async (_, url) => {
  await shell.openExternal(url);
});
ipcMain.handle("shell:openPath", async (_, filePath) => {
  await shell.openPath(filePath);
});
