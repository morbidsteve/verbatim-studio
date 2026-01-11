import { app as d, BrowserWindow as g, ipcMain as t, nativeTheme as _, dialog as u, shell as c } from "electron";
import s from "path";
import r from "fs/promises";
import { fileURLToPath as D } from "url";
import F from "electron-store";
const m = s.dirname(D(import.meta.url)), h = new F({
  encryptionKey: "verbatim-studio-secure-key",
  // In production, derive from machine ID
  name: "verbatim-config"
});
let a = null;
const f = process.env.VITE_DEV_SERVER_URL, p = d.getPath("userData"), y = s.join(p, "database.sqlite"), l = s.join(p, "storage"), x = s.join(p, "models");
async function A() {
  await r.mkdir(l, { recursive: !0 }), await r.mkdir(x, { recursive: !0 }), await r.mkdir(s.join(l, "recordings"), { recursive: !0 }), await r.mkdir(s.join(l, "exports"), { recursive: !0 }), await r.mkdir(s.join(l, "temp"), { recursive: !0 });
}
function w() {
  a = new g({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: _.shouldUseDarkColors ? "#0a0a0a" : "#ffffff",
    webPreferences: {
      preload: s.join(m, "preload.js"),
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !1
      // Required for file system access
    }
  }), a.webContents.setWindowOpenHandler(({ url: n }) => (c.openExternal(n), { action: "deny" })), f ? (a.loadURL(f), a.webContents.openDevTools()) : a.loadFile(s.join(m, "../dist/index.html")), a.on("closed", () => {
    a = null;
  });
}
d.whenReady().then(async () => {
  await A(), w(), d.on("activate", () => {
    g.getAllWindows().length === 0 && w();
  });
});
d.on("window-all-closed", () => {
  process.platform !== "darwin" && d.quit();
});
t.handle("store:get", (n, e) => h.get(e));
t.handle("store:set", (n, e, i) => {
  h.set(e, i);
});
t.handle("store:delete", (n, e) => {
  h.delete(e);
});
t.handle("app:getVersion", () => d.getVersion());
t.handle("app:getPlatform", () => process.platform);
t.handle("app:getPath", (n, e) => d.getPath(e));
t.handle("app:getPaths", () => ({
  appData: p,
  database: y,
  storage: l,
  models: x,
  recordings: s.join(l, "recordings"),
  exports: s.join(l, "exports"),
  temp: s.join(l, "temp")
}));
t.handle("app:getTheme", () => _.shouldUseDarkColors ? "dark" : "light");
t.handle("window:minimize", () => {
  a == null || a.minimize();
});
t.handle("window:maximize", () => (a != null && a.isMaximized() ? a.unmaximize() : a == null || a.maximize(), a == null ? void 0 : a.isMaximized()));
t.handle("window:close", () => {
  a == null || a.close();
});
t.handle("window:isMaximized", () => (a == null ? void 0 : a.isMaximized()) ?? !1);
t.handle("file:openDialog", async (n, e) => {
  const i = {
    properties: ["openFile"],
    filters: [
      { name: "Audio Files", extensions: ["wav", "mp3", "m4a", "flac", "ogg", "aac"] },
      { name: "Video Files", extensions: ["mp4", "mov", "avi", "mkv", "webm"] },
      { name: "All Files", extensions: ["*"] }
    ]
  };
  return await u.showOpenDialog(a, { ...i, ...e });
});
t.handle("file:openMultipleDialog", async (n, e) => {
  const i = {
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Audio Files", extensions: ["wav", "mp3", "m4a", "flac", "ogg", "aac"] },
      { name: "Video Files", extensions: ["mp4", "mov", "avi", "mkv", "webm"] },
      { name: "All Files", extensions: ["*"] }
    ]
  };
  return await u.showOpenDialog(a, { ...i, ...e });
});
t.handle("file:saveDialog", async (n, e) => await u.showSaveDialog(a, e ?? {}));
t.handle("file:read", async (n, e) => await r.readFile(e));
t.handle("file:readText", async (n, e) => await r.readFile(e, "utf-8"));
t.handle("file:write", async (n, e, i) => {
  await r.writeFile(e, i);
});
t.handle("file:exists", async (n, e) => {
  try {
    return await r.access(e), !0;
  } catch {
    return !1;
  }
});
t.handle("file:stat", async (n, e) => {
  const i = await r.stat(e);
  return {
    size: i.size,
    isFile: i.isFile(),
    isDirectory: i.isDirectory(),
    created: i.birthtime.toISOString(),
    modified: i.mtime.toISOString()
  };
});
t.handle("file:copy", async (n, e, i) => {
  await r.copyFile(e, i);
});
t.handle("file:delete", async (n, e) => {
  await r.unlink(e);
});
t.handle("file:listDir", async (n, e) => (await r.readdir(e, { withFileTypes: !0 })).map((o) => ({
  name: o.name,
  isFile: o.isFile(),
  isDirectory: o.isDirectory(),
  path: s.join(e, o.name)
})));
t.handle("file:showInFolder", async (n, e) => {
  c.showItemInFolder(e);
});
t.handle("audio:getInfo", async (n, e) => {
  const i = await r.stat(e), o = s.extname(e).toLowerCase();
  return {
    path: e,
    name: s.basename(e),
    format: o.slice(1),
    size: i.size,
    // These would come from ffprobe in a real implementation
    duration: null,
    sampleRate: null,
    channels: null,
    bitrate: null
  };
});
let v = {
  whisper: { name: "Whisper Service", status: "stopped", port: 8001 },
  diarization: { name: "Diarization Service", status: "stopped", port: 8003 },
  inflection: { name: "Inflection Analysis", status: "stopped", port: 8004 }
};
t.handle("services:getStatus", () => v);
t.handle("services:checkHealth", async (n, e) => {
  const i = v[e];
  if (!(i != null && i.port)) return !1;
  try {
    return (await fetch(`http://localhost:${i.port}/health`)).ok;
  } catch {
    return !1;
  }
});
t.handle("database:getPath", () => y);
t.handle("shell:openExternal", async (n, e) => {
  await c.openExternal(e);
});
t.handle("shell:openPath", async (n, e) => {
  await c.openPath(e);
});
