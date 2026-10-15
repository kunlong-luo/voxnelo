import { app, BrowserWindow, net, protocol, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_ORIGIN, APP_SCHEME, THEME_BACKGROUND, WINDOW_SIZE } from '@voxnelo/core';
import { isAudioOnlyRequest, APP_HOST, isTrustedUrl, resolveLocalFile } from './security';

// Electron 推荐的标准安全自定义协议：允许 IndexedDB 使用持久且一致的 origin。
// 注册必须发生在 app ready 之前；不允许 bypassCSP。
protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// 此文件通过 esbuild 构建为 dist-electron/main.cjs，__dirname 在 CJS 中有效。
const devServer = process.env.VOXNELO_DEV_SERVER_URL;
const isDev = !app.isPackaged && Boolean(devServer);
const rendererDir = path.join(__dirname, '..', 'dist');
const appOrigin = APP_ORIGIN;

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
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isTrustedUrl(targetUrl, { isDev })) event.preventDefault();
  });
  if (isDev && devServer) await window.loadURL(devServer);
  else await window.loadURL(`${appOrigin}/index.html`);
}

app.whenReady().then(async () => {
  registerLocalProtocol();
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const { mediaTypes } = details as { mediaTypes?: unknown };
    callback(permission === 'media' && isAudioOnlyRequest(mediaTypes) && isTrustedUrl(webContents.getURL(), { isDev }));
  });
  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission) =>
      permission === 'media' && Boolean(webContents) && isTrustedUrl(webContents?.getURL() ?? '', { isDev }),
  );
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
