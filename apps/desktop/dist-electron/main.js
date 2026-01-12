var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, shell, BrowserWindow, ipcMain, nativeTheme, dialog } from "electron";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import Store from "electron-store";
import { exec, spawn } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
const SERVICES = [
  { name: "whisper-service", port: 8001, healthPath: "/health" },
  { name: "diarization", port: 8003, healthPath: "/health" },
  { name: "api-server", port: 8e3, healthPath: "/api/health" }
];
const HEALTH_CHECK_TIMEOUT = 5e3;
const HEALTH_CHECK_INTERVAL = 1e3;
const MAX_STARTUP_TIME = 12e4;
class DockerManager {
  constructor() {
    __publicField(this, "status", { state: "not-installed" });
    __publicField(this, "events", {});
    __publicField(this, "composeFilePath");
    __publicField(this, "projectName", "verbatim-studio");
    if (app.isPackaged) {
      this.composeFilePath = path.join(process.resourcesPath, "docker-compose.yml");
    } else {
      this.composeFilePath = path.join(app.getAppPath(), "..", "..", "docker", "basic", "docker-compose.yml");
    }
  }
  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------
  on(event, handler) {
    this.events[event] = handler;
  }
  setStatus(status) {
    var _a, _b;
    this.status = status;
    (_b = (_a = this.events).onStatusChange) == null ? void 0 : _b.call(_a, status);
  }
  getStatus() {
    return this.status;
  }
  // --------------------------------------------------------------------------
  // Docker Detection
  // --------------------------------------------------------------------------
  async checkDockerInstalled() {
    try {
      await execAsync("docker --version");
      return true;
    } catch {
      return false;
    }
  }
  async checkDockerRunning() {
    try {
      await execAsync("docker info", { timeout: 1e4 });
      return true;
    } catch {
      return false;
    }
  }
  async getDockerVersion() {
    try {
      const { stdout } = await execAsync("docker --version");
      return stdout.trim();
    } catch {
      return null;
    }
  }
  // --------------------------------------------------------------------------
  // Docker Control
  // --------------------------------------------------------------------------
  async startDocker() {
    const platform = process.platform;
    try {
      if (platform === "darwin") {
        await shell.openPath("/Applications/Docker.app");
      } else if (platform === "win32") {
        await execAsync('start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"');
      } else {
        await execAsync("systemctl start docker");
      }
      const maxWait = 6e4;
      const startTime = Date.now();
      while (Date.now() - startTime < maxWait) {
        if (await this.checkDockerRunning()) {
          return true;
        }
        await this.sleep(2e3);
      }
      return false;
    } catch {
      return false;
    }
  }
  openDockerDownloadPage() {
    const platform = process.platform;
    let url = "https://www.docker.com/products/docker-desktop/";
    if (platform === "darwin") {
      url = "https://desktop.docker.com/mac/main/arm64/Docker.dmg";
    } else if (platform === "win32") {
      url = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe";
    }
    shell.openExternal(url);
  }
  // --------------------------------------------------------------------------
  // Image Management
  // --------------------------------------------------------------------------
  async pullImages(onProgress) {
    try {
      await fs.access(this.composeFilePath);
    } catch {
      throw new Error(`Docker Compose file not found: ${this.composeFilePath}`);
    }
    const composeDir = path.dirname(this.composeFilePath);
    const composeFile = path.basename(this.composeFilePath);
    return new Promise((resolve, reject) => {
      var _a, _b;
      const proc = spawn("docker", ["compose", "-f", composeFile, "-p", this.projectName, "pull"], {
        cwd: composeDir,
        stdio: ["ignore", "pipe", "pipe"]
      });
      let currentService = "";
      let errorOutput = "";
      const parseProgress = (data) => {
        var _a2, _b2;
        const lines = data.toString().split("\n");
        for (const line of lines) {
          const pullMatch = line.match(/Pulling (\S+)/i);
          if (pullMatch && pullMatch[1]) {
            currentService = pullMatch[1];
          }
          const progressMatch = line.match(/(\d+(?:\.\d+)?%)/);
          const percent = progressMatch && progressMatch[1] ? parseFloat(progressMatch[1]) : 0;
          if (currentService) {
            const progress = {
              service: currentService,
              percent,
              status: line.trim() || "Downloading..."
            };
            onProgress == null ? void 0 : onProgress(progress);
            (_b2 = (_a2 = this.events).onPullProgress) == null ? void 0 : _b2.call(_a2, progress);
          }
        }
      };
      (_a = proc.stdout) == null ? void 0 : _a.on("data", parseProgress);
      (_b = proc.stderr) == null ? void 0 : _b.on("data", (data) => {
        parseProgress(data);
        errorOutput += data.toString();
      });
      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to pull images: ${errorOutput}`));
        }
      });
      proc.on("error", (err) => {
        reject(new Error(`Failed to run docker compose pull: ${err.message}`));
      });
    });
  }
  async imagesExist() {
    try {
      const composeDir = path.dirname(this.composeFilePath);
      const composeFile = path.basename(this.composeFilePath);
      const { stdout } = await execAsync(
        `docker compose -f ${composeFile} -p ${this.projectName} images -q`,
        { cwd: composeDir }
      );
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
  // --------------------------------------------------------------------------
  // Service Management
  // --------------------------------------------------------------------------
  async startServices() {
    const composeDir = path.dirname(this.composeFilePath);
    const composeFile = path.basename(this.composeFilePath);
    this.setStatus({ state: "starting", message: "Starting services..." });
    try {
      await execAsync(
        `docker compose -f ${composeFile} -p ${this.projectName} up -d`,
        { cwd: composeDir, timeout: 6e4 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to start services: ${message}`);
    }
  }
  async stopServices() {
    const composeDir = path.dirname(this.composeFilePath);
    const composeFile = path.basename(this.composeFilePath);
    try {
      await execAsync(
        `docker compose -f ${composeFile} -p ${this.projectName} down`,
        { cwd: composeDir, timeout: 3e4 }
      );
    } catch (error) {
      console.error("Error stopping services:", error);
    }
  }
  async restartServices() {
    await this.stopServices();
    await this.startServices();
  }
  async cleanupOrphaned() {
    const composeDir = path.dirname(this.composeFilePath);
    const composeFile = path.basename(this.composeFilePath);
    try {
      await execAsync(
        `docker compose -f ${composeFile} -p ${this.projectName} down --remove-orphans`,
        { cwd: composeDir, timeout: 3e4 }
      );
    } catch {
    }
  }
  // --------------------------------------------------------------------------
  // Health Checks
  // --------------------------------------------------------------------------
  async checkServiceHealth(service) {
    const url = `http://localhost:${service.port}${service.healthPath}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return {
        name: service.name,
        port: service.port,
        healthy: response.ok
      };
    } catch (error) {
      return {
        name: service.name,
        port: service.port,
        healthy: false,
        error: error instanceof Error ? error.message : "Connection failed"
      };
    }
  }
  async healthCheck() {
    const results = await Promise.all(SERVICES.map((s) => this.checkServiceHealth(s)));
    return results;
  }
  async waitForHealthy() {
    const startTime = Date.now();
    while (Date.now() - startTime < MAX_STARTUP_TIME) {
      const health = await this.healthCheck();
      const allHealthy = health.every((s) => s.healthy);
      if (allHealthy) {
        return health;
      }
      const healthyCount = health.filter((s) => s.healthy).length;
      this.setStatus({
        state: "starting",
        message: `Starting services... (${healthyCount}/${health.length} ready)`
      });
      await this.sleep(HEALTH_CHECK_INTERVAL);
    }
    const finalHealth = await this.healthCheck();
    const unhealthy = finalHealth.filter((s) => !s.healthy);
    throw new Error(
      `Services failed to start: ${unhealthy.map((s) => s.name).join(", ")}`
    );
  }
  // --------------------------------------------------------------------------
  // Logs
  // --------------------------------------------------------------------------
  async getLogs(service, lines = 100) {
    try {
      const { stdout } = await execAsync(
        `docker compose -p ${this.projectName} logs --tail=${lines} ${service}`,
        { cwd: path.dirname(this.composeFilePath) }
      );
      return stdout;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to get logs";
    }
  }
  async getAllLogs(lines = 50) {
    try {
      const { stdout } = await execAsync(
        `docker compose -p ${this.projectName} logs --tail=${lines}`,
        { cwd: path.dirname(this.composeFilePath) }
      );
      return stdout;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to get logs";
    }
  }
  // --------------------------------------------------------------------------
  // Full Startup Sequence
  // --------------------------------------------------------------------------
  async ensureReady() {
    if (!await this.checkDockerInstalled()) {
      this.setStatus({ state: "not-installed" });
      throw new Error("Docker is not installed");
    }
    if (!await this.checkDockerRunning()) {
      this.setStatus({ state: "not-running" });
      throw new Error("Docker is not running");
    }
    if (!await this.imagesExist()) {
      this.setStatus({ state: "pulling", progress: { service: "", percent: 0, status: "Preparing..." } });
      await this.pullImages((progress) => {
        this.setStatus({ state: "pulling", progress });
      });
    }
    await this.cleanupOrphaned();
    await this.startServices();
    const health = await this.waitForHealthy();
    this.setStatus({ state: "ready", services: health });
  }
  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
const dockerManager = new DockerManager();
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
      sandbox: false,
      // Required for file system access
      webSecurity: !VITE_DEV_SERVER_URL
      // Disable in dev for API calls
    }
  });
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:* ws://localhost:*; img-src 'self' data: blob:; media-src 'self' http://localhost:* blob:; style-src 'self' 'unsafe-inline';"
        ]
      }
    });
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
let isQuitting = false;
app.on("before-quit", async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    console.log("Stopping Docker services...");
    try {
      await dockerManager.stopServices();
    } catch (error) {
      console.error("Error stopping services:", error);
    }
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
dockerManager.on("onStatusChange", (status) => {
  mainWindow == null ? void 0 : mainWindow.webContents.send("docker:statusChange", status);
});
ipcMain.handle("docker:getStatus", () => {
  return dockerManager.getStatus();
});
ipcMain.handle("docker:checkInstalled", async () => {
  return dockerManager.checkDockerInstalled();
});
ipcMain.handle("docker:checkRunning", async () => {
  return dockerManager.checkDockerRunning();
});
ipcMain.handle("docker:startDocker", async () => {
  return dockerManager.startDocker();
});
ipcMain.handle("docker:openDownloadPage", () => {
  dockerManager.openDockerDownloadPage();
});
ipcMain.handle("docker:startServices", async () => {
  await dockerManager.startServices();
});
ipcMain.handle("docker:stopServices", async () => {
  await dockerManager.stopServices();
});
ipcMain.handle("docker:restartServices", async () => {
  await dockerManager.restartServices();
});
ipcMain.handle("docker:healthCheck", async () => {
  return dockerManager.healthCheck();
});
ipcMain.handle("docker:getLogs", async (_, service) => {
  if (service) {
    return dockerManager.getLogs(service);
  }
  return dockerManager.getAllLogs();
});
ipcMain.handle("docker:ensureReady", async () => {
  await dockerManager.ensureReady();
});
