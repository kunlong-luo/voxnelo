import { app, BrowserWindow, ipcMain, net, shell, protocol, session, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import { Worker } from 'node:worker_threads';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { APP_ORIGIN, APP_SCHEME, THEME_BACKGROUND, WINDOW_SIZE } from '@voxnelo/core';
import { allowsAudioPermissionCheck, allowsAudioPermissionRequest, APP_HOST, isAllowedSupportUrl, isTrustedUrl, resolveLocalFile } from './security';
import { LinuxEnglishSpeech } from './linuxSpeech';
import { LINUX_DESKTOP_FILENAME, resolveLinuxIconPath } from './linuxAppIdentity';
import { OfflineAsr } from './offlineAsr';
import { defaultDesktopAsrEngine, resolveDesktopAsrEngine } from './asrDefault';
import { verifyPinnedMoonshineMediumModel } from './moonshineIntegrity';
import {parseMoonshineInstallStage,type MoonshineInstallStage} from './moonshineInstallProgress';
import { resolveMoonshinePaths, verifyMoonshinePythonRuntime } from './moonshinePaths';
import { RefreshableAsrEngine } from './asrRefresh';
import { resolveVerifiedAsrStatus } from './asrAssets';

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
// No network download or renderer-provided paths. Personal ASR is an explicit,
// pinned user-side install; public installer assets remain separately gated.
// The renderer must never see a personal native addon until its full byte
// inventory has been validated. Stream the ONNX/native files once on startup,
// not on the UI thread and not again for each microphone session.
let invalidPersonalAsr=false;
const offlineAsr=new RefreshableAsrEngine(new OfflineAsr(null,null),async()=>{
  const result=await resolveVerifiedAsrStatus({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    developerModelDir: process.env.VOXNELO_ASR_MODEL_DIR,
    developerAddonPath: process.env.VOXNELO_ASR_ADDON_PATH,
    personalDataDir: path.join(app.getPath('appData'), 'voxnelo'),
  });
  invalidPersonalAsr=result.invalidPersonalPack;
  return new OfflineAsr(result.assets.modelDir,result.assets.addonPath);
});

// Installed Linux apps resolve only one fixed, personal, opt-in runtime path.
// The app does not silently download native code or accept renderer paths.
const moonshinePaths=resolveMoonshinePaths({
  isPackaged:app.isPackaged,platform:process.platform,
  resourcesPath:process.resourcesPath,bundleDir:__dirname,
  personalDataDir:path.join(app.getPath('appData'),'voxnelo'),
  developerPython:process.env.VOXNELO_MOONSHINE_PYTHON,
  developerModelDir:process.env.VOXNELO_MOONSHINE_MODEL_DIR,
});
const moonshinePilot=moonshinePaths&&
  existsSync(moonshinePaths.scriptPath)&&existsSync(moonshinePaths.validationScriptPath)
  ?new OfflineAsr(moonshinePaths.modelDir,moonshinePaths.pythonPath,
    data=>new Worker(path.join(__dirname,'moonshineAsrWorker.cjs'),{
      workerData:{modelDir:data.modelDir,pythonPath:data.addonPath,
        scriptPath:moonshinePaths.scriptPath},
    }),['encoder.ort','adapter.ort','cross_kv.ort','decoder_kv.ort',
      'frontend.ort','streaming_config.json','tokenizer.bin'],true)
  :null;
// Only the exact pinned official model bytes may activate the Linux pilot.
let moonshineModelVerified=false;
let activeAsr:OfflineAsr|null=null;
let openingAsr=false;
let installingMoonshine=false;
async function executeMoonshineInstaller(
  executable:string,onStage:(stage:MoonshineInstallStage)=>void,
):Promise<void>{
  await new Promise<void>((resolve,reject)=>{
    // stderr is deliberately not forwarded; pip, wheel and model output can
    // contain private install paths. Only parse known first-party stage markers.
    const child=spawn(process.execPath,
      [executable,'--accept-experimental-runtime','--repair'],{
        env:{...process.env,ELECTRON_RUN_AS_NODE:'1',NODE_OPTIONS:''},
        stdio:['ignore','pipe','ignore'],timeout:900000,
      });
    if(child.stdout){
      const lines=createInterface({input:child.stdout,crlfDelay:Infinity});
      lines.on('line',line=>{
        const stage=parseMoonshineInstallStage(line);
        if(stage)onStage(stage);
      });
    }
    child.once('error',reject);
    child.once('close',(code,signal)=>{
      if(code===0)resolve();
      else reject(Error('Moonshine installer failed: '+(signal?'interrupted':'nonzero exit')));
    });
  });
}

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
  // Explicit user action only. The Python SDK/model are never fetched during
  // application startup, capability probing, or microphone sessions.
  ipcMain.handle('voxnelo:asr:install-moonshine',async(event)=>{
    const installWindow=authorizedWindow(event);
    if(!installWindow||process.platform!=='linux'||!moonshinePilot||!moonshinePaths)
      return {ok:false,reason:'unsupported'};
    if(installingMoonshine||openingAsr||activeAsr?.hasActiveSession())
      return {ok:false,reason:'busy'};
    if(moonshineModelVerified)return {ok:true};
    installingMoonshine=true;
    try{
      const executable=path.join(__dirname,'moonshineInstaller.cjs');
      if(!existsSync(executable))return {ok:false,reason:'unsupported'};
      // Electron acts as Node for this isolated, first-party bundled installer;
      // no renderer input, arbitrary executable path or shell string accepted.
      const emitProgress=(stage:MoonshineInstallStage)=>{
        if(!installWindow.isDestroyed()&&!installWindow.webContents.isDestroyed())
          installWindow.webContents.send('voxnelo:asr:moonshine-install-progress',stage);
      };
      emitProgress('environment');
      await executeMoonshineInstaller(executable,emitProgress);
      moonshineModelVerified=(await verifyPinnedMoonshineMediumModel(moonshinePaths.modelDir))&&
        (await verifyMoonshinePythonRuntime(moonshinePaths.pythonPath));
      return moonshineModelVerified?{ok:true}:{ok:false,reason:'verification'};
    }catch{return {ok:false,reason:'failed'};}
    finally{installingMoonshine=false;}
  });
  ipcMain.handle('voxnelo:asr:capabilities',async(event)=>{
    if(!authorizedWindow(event))return {available:false,reason:'not-configured'};
    // A personal offline model can be installed while Voxnelo is open.
    // Re-resolve ONLY fully verified main-process assets; never accept a path
    // from renderer IPC or replace a currently active microphone session.
    try{
      if(defaultDesktopAsrEngine(process.platform)==='moonshine-medium'){
        // Linux reports only the selected default's readiness. Existing
        // Zipformer packs must not disguise an absent Moonshine installation.
        return moonshinePilot
          ?moonshineModelVerified?moonshinePilot.capabilities():{available:false,reason:'missing-model'}
          :{available:false,reason:'not-configured'};
      }
      const engine=(await offlineAsr.refreshIfUnavailable()).capabilities();
      return !engine.available&&invalidPersonalAsr
        ? {available:false,reason:'invalid-personal-pack'}
        : engine;
    }catch{return {available:false,reason:'not-configured'};}
  });
  ipcMain.handle('voxnelo:asr:engines',(event)=>{
    if(!authorizedWindow(event))return null;
    return {zipformer:offlineAsr.current().capabilities().available,
      moonshineMedium:moonshineModelVerified&&moonshinePilot?.capabilities().available===true};
  });
  ipcMain.handle('voxnelo:asr:start',async(event,requested:unknown)=>{
    const window=authorizedWindow(event);
    if(!window)return {ok:false,reason:'failed'};
    // Reserve the single native microphone engine before any async asset
    // verification. Concurrent renderer starts must not open two workers.
    if(openingAsr||activeAsr?.hasActiveSession())return {ok:false,reason:'busy'};
    openingAsr=true;
    try{
      const selected=resolveDesktopAsrEngine(process.platform,requested);
      // An unconfigured Moonshine engine is a setup error. Never silently
      // switch to Zipformer when the user's default model is missing.
      const engine=selected==='moonshine-medium'&&moonshineModelVerified?moonshinePilot:
        selected==='zipformer'?(await offlineAsr.refreshIfUnavailable()):null;
      if(!engine)return {ok:false,reason:'not-configured'};
      const opened=await engine.open(window.webContents);
      if(opened.ok)activeAsr=engine;
      return opened;
    }catch{return {ok:false,reason:'failed'};}
    finally{openingAsr=false;}
  });
  ipcMain.on('voxnelo:asr:pcm',(event,id:unknown,samples:unknown)=>{
    const window=authorizedWindow(event);
    if(window)activeAsr?.push(window.webContents,id,samples);
  });
  ipcMain.handle('voxnelo:asr:stop',(event,id:unknown)=>{
    const window=authorizedWindow(event);
    if(!window)return {finalText:'',completed:false};
    return activeAsr?.stop(window.webContents,id)??{finalText:'',completed:false};
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
  // External links are explicit, fixed project destinations. Never let the
  // renderer choose an arbitrary URL or navigate the trusted app window away.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedUrl(window.webContents.getURL(), { isDev }) && isAllowedSupportUrl(url)) {
      void shell.openExternal(url).catch((error: unknown) => {
        console.error('Could not open Voxnelo support link:', error);
      });
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isTrustedUrl(targetUrl, { isDev })) event.preventDefault();
  });
  if (isDev && devServer) await window.loadURL(devServer);
  else await window.loadURL(`${appOrigin}/index.html`);
}

app.whenReady().then(async () => {
  // Full eight-file verification is asynchronous and runs once before any
  // renderer can request capabilities or start a streaming inference worker.
  if(moonshinePilot&&moonshinePaths){
    moonshineModelVerified=(await verifyPinnedMoonshineMediumModel(moonshinePaths.modelDir))&&
      (await verifyMoonshinePythonRuntime(moonshinePaths.pythonPath));
  }
  await offlineAsr.refreshIfUnavailable();
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
  offlineAsr.current().close();
  moonshinePilot?.close();
  if (process.platform !== 'darwin') app.quit();
});
