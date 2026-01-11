import { app, BrowserWindow, ipcMain, shell, dialog, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize electron store for secure local storage
const store = new Store({
  encryptionKey: 'verbatim-studio-secure-key', // In production, derive from machine ID
  name: 'verbatim-config',
});

let mainWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

// Get app data paths
const APP_DATA_PATH = app.getPath('userData');
const DATABASE_PATH = path.join(APP_DATA_PATH, 'database.sqlite');
const STORAGE_PATH = path.join(APP_DATA_PATH, 'storage');
const MODELS_PATH = path.join(APP_DATA_PATH, 'models');

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(STORAGE_PATH, { recursive: true });
  await fs.mkdir(MODELS_PATH, { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, 'recordings'), { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, 'exports'), { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, 'temp'), { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for file system access
    },
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await ensureDirectories();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================================================
// IPC Handlers - Store Operations
// ============================================================================

ipcMain.handle('store:get', (_, key: string) => {
  return store.get(key);
});

ipcMain.handle('store:set', (_, key: string, value: unknown) => {
  store.set(key, value);
});

ipcMain.handle('store:delete', (_, key: string) => {
  store.delete(key);
});

// ============================================================================
// IPC Handlers - App Info
// ============================================================================

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

ipcMain.handle('app:getPath', (_, name: string) => {
  return app.getPath(name as Parameters<typeof app.getPath>[0]);
});

ipcMain.handle('app:getPaths', () => {
  return {
    appData: APP_DATA_PATH,
    database: DATABASE_PATH,
    storage: STORAGE_PATH,
    models: MODELS_PATH,
    recordings: path.join(STORAGE_PATH, 'recordings'),
    exports: path.join(STORAGE_PATH, 'exports'),
    temp: path.join(STORAGE_PATH, 'temp'),
  };
});

ipcMain.handle('app:getTheme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

// ============================================================================
// IPC Handlers - Window Controls
// ============================================================================

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
  return mainWindow?.isMaximized();
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// ============================================================================
// IPC Handlers - File Operations
// ============================================================================

ipcMain.handle('file:openDialog', async (_, options?: Electron.OpenDialogOptions) => {
  const defaultOptions: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg', 'aac'] },
      { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  };

  const result = await dialog.showOpenDialog(mainWindow!, { ...defaultOptions, ...options });
  return result;
});

ipcMain.handle('file:openMultipleDialog', async (_, options?: Electron.OpenDialogOptions) => {
  const defaultOptions: Electron.OpenDialogOptions = {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg', 'aac'] },
      { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  };

  const result = await dialog.showOpenDialog(mainWindow!, { ...defaultOptions, ...options });
  return result;
});

ipcMain.handle('file:saveDialog', async (_, options?: Electron.SaveDialogOptions) => {
  const result = await dialog.showSaveDialog(mainWindow!, options ?? {});
  return result;
});

ipcMain.handle('file:read', async (_, filePath: string) => {
  const data = await fs.readFile(filePath);
  return data;
});

ipcMain.handle('file:readText', async (_, filePath: string) => {
  const data = await fs.readFile(filePath, 'utf-8');
  return data;
});

ipcMain.handle('file:write', async (_, filePath: string, data: Buffer | string) => {
  await fs.writeFile(filePath, data);
});

ipcMain.handle('file:exists', async (_, filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('file:stat', async (_, filePath: string) => {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    created: stats.birthtime.toISOString(),
    modified: stats.mtime.toISOString(),
  };
});

ipcMain.handle('file:copy', async (_, src: string, dest: string) => {
  await fs.copyFile(src, dest);
});

ipcMain.handle('file:delete', async (_, filePath: string) => {
  await fs.unlink(filePath);
});

ipcMain.handle('file:listDir', async (_, dirPath: string) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isFile: entry.isFile(),
    isDirectory: entry.isDirectory(),
    path: path.join(dirPath, entry.name),
  }));
});

ipcMain.handle('file:showInFolder', async (_, filePath: string) => {
  shell.showItemInFolder(filePath);
});

// ============================================================================
// IPC Handlers - Audio Info (using ffprobe)
// ============================================================================

ipcMain.handle('audio:getInfo', async (_, filePath: string) => {
  // In a real implementation, this would use ffprobe
  // For now, return basic file info
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
    bitrate: null,
  };
});

// ============================================================================
// IPC Handlers - Service Status (Docker/Local)
// ============================================================================

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'error';
  port?: number;
  error?: string;
}

// Track service status
let servicesStatus: Record<string, ServiceStatus> = {
  whisper: { name: 'Whisper Service', status: 'stopped', port: 8001 },
  diarization: { name: 'Diarization Service', status: 'stopped', port: 8003 },
  inflection: { name: 'Inflection Analysis', status: 'stopped', port: 8004 },
};

ipcMain.handle('services:getStatus', () => {
  return servicesStatus;
});

ipcMain.handle('services:checkHealth', async (_, serviceName: string) => {
  const service = servicesStatus[serviceName];
  if (!service?.port) return false;

  try {
    const response = await fetch(`http://localhost:${service.port}/health`);
    return response.ok;
  } catch {
    return false;
  }
});

// ============================================================================
// IPC Handlers - Database Path
// ============================================================================

ipcMain.handle('database:getPath', () => {
  return DATABASE_PATH;
});

// ============================================================================
// IPC Handlers - Shell Operations
// ============================================================================

ipcMain.handle('shell:openExternal', async (_, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle('shell:openPath', async (_, filePath: string) => {
  await shell.openPath(filePath);
});
