// YouTube (Liquid Glass) — proceso principal.
// La interfaz se sirve desde http://127.0.0.1 (no file://) para que el reproductor oficial
// de YouTube reciba un origen válido; todo lo que toca la cuenta pasa por IPC.
const { app, BrowserWindow, ipcMain, shell, dialog, clipboard, nativeImage, screen } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

app.setAppUserModelId('com.jaider.youtubeglass');
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const DEMO = process.env.YTG_DEMO === '1';
const auth = require('./auth');
const yt = DEMO ? require('./demo') : require('./youtube');
const UI = path.join(__dirname, 'ui');
const SETTINGS = () => path.join(app.getPath('userData'), 'ajustes.json');

// Liviano: sin funciones que no se usan.
app.commandLine.appendSwitch('disable-features', 'Translate,MediaRouter,SpareRendererForSitePerProcess,AutofillServerCommunication');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let settings = {};
try { settings = JSON.parse(fs.readFileSync(SETTINGS(), 'utf8')); } catch {}
const saveSettings = () => fs.writeFile(SETTINGS(), JSON.stringify(settings, null, 1), () => {});

// ---------- servidor local de la interfaz ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.youtube.com https://s.ytimg.com",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "img-src 'self' data: https://i.ytimg.com https://*.ggpht.com https://*.googleusercontent.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self'",
].join('; ');

function startServer() {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(UI, path.normalize(p).replace(/^([\\/])+/, ''));
    if (!file.startsWith(UI)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  // Puerto fijo: el origen tiene que ser siempre el mismo.
  return new Promise((resolve, reject) => {
    let port = 41917;
    const tryListen = () => server.listen(port, '127.0.0.1');
    server.on('listening', () => resolve(port));
    server.on('error', e => { if (e.code === 'EADDRINUSE' && port < 41930) { port++; tryListen(); } else reject(e); });
    tryListen();
  });
}

// ---------- ventana ----------
let win;
// Si la ventana tapa el monitor completo, Windows la trata como pantalla completa y la barra de
// tareas (sobre todo si se oculta sola) ya no aparece. Por eso nunca se ocupa el monitor entero:
// "maximizar" llena el área de trabajo menos 1 px.
const workArea = r => screen.getDisplayMatching(r).workArea;
const fullArea = wa => ({ x: wa.x, y: wa.y, width: wa.width, height: wa.height - 1 });
function fitInside(b) {
  const wa = workArea(b);
  const w = Math.min(b.width, wa.width), h = Math.min(b.height, wa.height - 1);
  return { width: w, height: h, x: Math.min(Math.max(b.x, wa.x), wa.x + wa.width - w), y: Math.min(Math.max(b.y, wa.y), wa.y + wa.height - h) };
}
let restoreBounds = null;
// tamaño "restaurado" útil: si lo guardado casi llena la pantalla, se usa 82 % centrado
function restoredSize(b) {
  const wa = workArea(b);
  if (b.width < wa.width * 0.95 || b.height < wa.height * 0.95) return fitInside(b);
  const width = Math.round(wa.width * 0.82), height = Math.round(wa.height * 0.85);
  return { width, height, x: wa.x + Math.round((wa.width - width) / 2), y: wa.y + Math.round((wa.height - height) / 2) };
}
function setMax(on) {
  if (on && !restoreBounds) { restoreBounds = win.getBounds(); win.setBounds(fullArea(workArea(restoreBounds))); }
  else if (!on && restoreBounds) { win.setBounds(restoredSize(restoreBounds)); restoreBounds = null; }
  settings.maximized = !!restoreBounds; saveSettings();
  win.webContents.send('win:max', !!restoreBounds);
}

function createWindow(port) {
  const primary = screen.getPrimaryDisplay().workArea;
  const b = settings.bounds ? fitInside(settings.bounds)
    : fitInside({ width: Math.min(1360, primary.width - 80), height: Math.min(860, primary.height - 60), x: primary.x + 40, y: primary.y + 20 });
  win = new BrowserWindow({
    width: b.width, height: b.height, x: b.x, y: b.y,
    minWidth: 960, minHeight: 620, frame: false, show: false, backgroundColor: '#ffffff', title: 'YouTube',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, spellcheck: false, backgroundThrottling: true },
  });
  // una ventana guardada casi del tamaño de la pantalla se abre como maximizada
  const wa0 = workArea(b);
  if (settings.maximized || (b.width >= wa0.width * 0.95 && b.height >= wa0.height * 0.95)) { restoreBounds = b; win.setBounds(fullArea(wa0)); settings.maximized = true; }
  win.loadURL(`http://127.0.0.1:${port}/`);
  win.once('ready-to-show', () => win.show());
  const remember = () => { if (!restoreBounds && !win.isMinimized() && !win.isFullScreen()) { settings.bounds = win.getBounds(); saveSettings(); } };
  win.on('resize', remember); win.on('move', remember);
  // Aero Snap (arrastrar arriba) maximiza de verdad: se cambia por el maximizado propio
  win.on('maximize', () => { win.unmaximize(); setMax(true); });
  win.on('enter-full-screen', () => win.webContents.send('win:fs', true));
  win.on('leave-full-screen', () => win.webContents.send('win:fs', false));
  // Ningún enlace abre ventanas nuevas dentro de la app: van al navegador.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(`http://127.0.0.1:${port}/`)) { e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); } });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());

// ---------- IPC ----------
const handle = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => {
  try { return { ok: true, data: await fn(...a) }; }
  catch (err) { return { ok: false, error: err.message, code: err.code || null }; }
});

handle('win', cmd => {
  if (cmd === 'min') win.minimize();
  else if (cmd === 'max') setMax(!restoreBounds);
  else if (cmd === 'close') win.close();
  else if (cmd === 'fs') win.setFullScreen(!win.isFullScreen());
  else if (cmd === 'fs-off') win.setFullScreen(false);
  return { max: !!restoreBounds, fs: win.isFullScreen() };
});
handle('auth:status', () => DEMO ? { hasClient: true, signedIn: true, demo: true } : auth.status());
handle('auth:importClient', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Elige el archivo de Google (client_secret….json)', defaultPath: app.getPath('downloads'), filters: [{ name: 'Llave de Google', extensions: ['json'] }], properties: ['openFile'] });
  if (r.canceled || !r.filePaths[0]) return false;
  auth.setClientFromJson(fs.readFileSync(r.filePaths[0], 'utf8'));
  return true;
});
handle('auth:signIn', async () => { await auth.signIn(); if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } return true; });
handle('auth:cancel', () => auth.cancel());
handle('auth:signOut', async () => { await auth.signOut(); yt.clearCache(); return true; });
handle('auth:forgetClient', () => { auth.forgetClient(); yt.clearCache(); return true; });
handle('yt', (name, ...args) => {
  const fn = yt.fns[name];
  if (!fn) throw new Error('Función desconocida');
  return fn(...args);
});
handle('settings:get', () => settings.ui || {});
handle('settings:set', ui => { settings.ui = { ...(settings.ui || {}), ...ui }; saveSettings(); return settings.ui; });
handle('open', url => { if (/^https:\/\/(www\.)?(youtube\.com|youtu\.be|console\.cloud\.google\.com)\//.test(url)) shell.openExternal(url); });
handle('copy', text => clipboard.writeText(String(text).slice(0, 500)));
handle('guide', async () => {
  // la guía viaja dentro del paquete (asar): se copia a un .txt normal para abrirla con el Bloc de notas
  const out = path.join(app.getPath('userData'), 'Guia - conectar YouTube.txt');
  fs.writeFileSync(out, fs.readFileSync(path.join(__dirname, '..', 'GUIA-GOOGLE-CLOUD.md'), 'utf8'));
  const err = await shell.openPath(out);
  if (err) throw new Error(err);
});

app.whenReady().then(async () => {
  const port = await startServer();
  createWindow(port);
});
