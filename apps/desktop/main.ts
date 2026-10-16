import { app, BrowserWindow, ipcMain, net, protocol, session, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_ORIGIN, APP_SCHEME, THEME_BACKGROUND, WINDOW_SIZE } from '@voxnelo/core';
import { allowsAudioPermissionCheck, allowsAudioPermissionRequest, APP_HOST, isTrustedUrl, resolveLocalFile } from './security';
import { LinuxEnglishSpeech } from './linuxSpeech';
import { LINUX_DESKTOP_FILENAME, resolveLinuxIconPath } from './linuxAppIdentity';
import { OfflineAsr } from './offlineAsr';
import { resolveAsrAssets } from './asrAssets';

// Electron 推荐的标准安全自定义协议：允许 IndexedDB 使用持久且一致的 origin。
// 注册必须发生在 app ready 之前；不允许 bypassCSP。
protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// 此文件通过 esbuild 构建为 dist-electron/main.cjs，__dirname 在 CJS 中有效。
// Set before Electron is ready: keeps the X11 WM_CLASS / Wayland app_id
// consistent with the Linux .desktop launcher supplied by electron-builder.
if (process.platform === 'linux') app.setDesktopName(LINUX_DESKTOP_FILENAME);

const devServer = process.env.VOXNELO_DEV_SERVER_URL;
const isDev = !app.isPackaged && Boolean(devServer);
const rendererDir = path.join(__dirname, '..', 'dist');
const appOrigin = APP_ORIGIN;
const linuxSpeech = new LinuxEnglishSpeech();
// Production may use vetted resources bundled explicitly by the release builder.
// No network download, renderer-provided paths, or implicit native loading.
const asrAssets = resolveAsrAssets({
  isPackaged: app.isPackaged,
  resourcesPath: process.resourcesPath,
  developerModelDir: process.env.VOXNELO_ASR_MODEL_DIR,
  developerAddonPath: process.env.VOXNELO_ASR_ADDON_PATH,
});
const offlineAsr = new OfflineAsr(asrAssets.modelDir, asrAssets.addonPath);

/**
 * Window IPC is intentionally narrower than a general-purpose ipcRenderer bridge.
 * Requests must come from this app's own top-level renderer, never an iframe
 * or an untrusted navigation.
 */
function authorizedWindow(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
  const contents = event.sender;
  if (!event.senderFrame || event.senderFrame !== contents.mainFrame) return null;
  if (!isTrustedUrl(contents.getURL(), { isDev })) return null;
  const window = BrowserWindow.fromWebContents(contents);
  return window && !window.isDestroyed() && window.webContents === contents ? window : null;
}

function registerWindowControls(): void {
  ipcMain.on('voxnelo:window:minimize', (event) => authorizedWindow(event)?.minimize());
  ipcMain.on('voxnelo:window:toggle-maximize', (event) => {
    const window = authorizedWindow(event);
    if (!window) return;
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
  ipcMain.on('voxnelo:window:close', (event) => authorizedWindow(event)?.close());
  ipcMain.handle('voxnelo:window:is-maximized', (event) => authorizedWindow(event)?.isMaximized() ?? false);
}

function registerLinuxSpeech(): void {
  // Never expose a general exec/process interface to untrusted page code.
  ipcMain.handle('voxnelo:speech:synthesize', async (event, text: unknown, speed: unknown) => {
    if (process.platform !== 'linux' || !authorizedWindow(event)) {
      return { ok: false, reason: 'invalid' };
    }
    return linuxSpeech.synthesize(text, speed);
  });
  ipcMain.on('voxnelo:speech:cancel', (event) => {
    if (process.platform === 'linux' && authorizedWindow(event)) linuxSpeech.cancel();
  });
}

function registerOfflineAsr():void{
  ipcMain.handle('voxnelo:asr:capabilities',(event)=>{
    if(!authorizedWindow(event))return {available:false,reason:'not-configured'};
    return offlineAsr.capabilities();
  });
  ipcMain.handle('voxnelo:asr:start',async(event)=>{
    const window=authorizedWindow(event);
    if(!window)return {ok:false,reason:'failed'};
    return offlineAsr.open(window.webContents);
  });
  ipcMain.on('voxnelo:asr:pcm',(event,id:unknown,samples:unknown)=>{
    const window=authorizedWindow(event);
    if(window)offlineAsr.push(window.webContents,id,samples);
  });
  ipcMain.handle('voxnelo:asr:stop',(event,id:unknown)=>{
    const window=authorizedWindow(event);
    if(!window)return {finalText:''};
    return offlineAsr.stop(window.webContents,id);
  });
}

function registerLocalProtocol(): void {
  protocol.handle(APP_SCHEME, (request) => {
    try {
      const url = new URL(request.url);
      if (
        url.protocol !== `${APP_SCHEME}:` ||
        url.hostname !== APP_HOST ||
        url.port ||
        url.username ||
        url.password ||
        request.method !== 'GET'
      ) {
        return new Response('Forbidden', { status: 403 });
      }
      const file = resolveLocalFile(rendererDir, url.pathname);
      if (!file) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response('Bad Request', { status: 400 });
    }
  });
}

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: WINDOW_SIZE.width,
    height: WINDOW_SIZE.height,
    minWidth: WINDOW_SIZE.minWidth,
    minHeight: WINDOW_SIZE.minHeight,
    backgroundColor: THEME_BACKGROUND,
    title: 'Voxnelo',
    // Linux taskbars need the native window icon as well as a matching app_id.
    ...(process.platform === 'linux' ? {
      icon: resolveLinuxIconPath({
        isPackaged: app.isPackaged,
        bundleDir: __dirname,
        resourcesPath: process.resourcesPath,
      }),
    } : {}),
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  const sendMaximize = () => {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send('voxnelo:window:maximize-changed', window.isMaximized());
    }
  };
  window.on('maximize', sendMaximize);
  window.on('unmaximize', sendMaximize);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isTrustedUrl(targetUrl, { isDev })) event.preventDefault();
  });
  if (isDev && devServer) await window.loadURL(devServer);
  else await window.loadURL(`${appOrigin}/index.html`);
}

app.whenReady().then(async () => {
  registerWindowControls();
  registerLinuxSpeech();
  registerOfflineAsr();
  registerLocalProtocol();
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    callback(allowsAudioPermissionRequest(webContents.getURL(), permission, details, { isDev }));
  });
  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) =>
      allowsAudioPermissionCheck(
        webContents?.getURL() ?? null, permission, requestingOrigin, details, { isDev },
      ),
  );
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  linuxSpeech.cancel();
  offlineAsr.close();
  if (process.platform !== 'darwin') app.quit();
});
