import { app as o, BrowserWindow as p, ipcMain as t, shell as m } from "electron";
import i from "path";
import { fileURLToPath as c } from "url";
import f from "electron-store";
const a = i.dirname(c(import.meta.url)), l = new f({
  encryptionKey: "verbatim-studio-secure-key"
  // In production, use a proper key
});
let e = null;
const s = process.env.VITE_DEV_SERVER_URL;
function d() {
  e = new p({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: i.join(a, "preload.js"),
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !0
    }
  }), e.webContents.setWindowOpenHandler(({ url: r }) => (m.openExternal(r), { action: "deny" })), s ? (e.loadURL(s), e.webContents.openDevTools()) : e.loadFile(i.join(a, "../dist/index.html")), e.on("closed", () => {
    e = null;
  });
}
o.whenReady().then(() => {
  d(), o.on("activate", () => {
    p.getAllWindows().length === 0 && d();
  });
});
o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
});
t.handle("store:get", (r, n) => l.get(n));
t.handle("store:set", (r, n, h) => {
  l.set(n, h);
});
t.handle("store:delete", (r, n) => {
  l.delete(n);
});
t.handle("app:getVersion", () => o.getVersion());
t.handle("app:getPlatform", () => process.platform);
t.handle("app:getPath", (r, n) => o.getPath(n));
t.handle("window:minimize", () => {
  e == null || e.minimize();
});
t.handle("window:maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
t.handle("window:close", () => {
  e == null || e.close();
});
