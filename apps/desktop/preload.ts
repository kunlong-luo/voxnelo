import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { APP_VERSION } from '@voxnelo/core';
import {MOONSHINE_INSTALL_STAGES} from './moonshineInstallProgress';

// Only explicitly named window and local English speech capabilities are exposed.
// The full ipcRenderer, arbitrary channels, filesystem and shell are never exposed.
const windowControls = {
  minimize: () => ipcRenderer.send('voxnelo:window:minimize'),
  toggleMaximize: () => ipcRenderer.send('voxnelo:window:toggle-maximize'),
  close: () => ipcRenderer.send('voxnelo:window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('voxnelo:window:is-maximized') as Promise<boolean>,
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    const listener = (_event: IpcRendererEvent, maximized: unknown) => {
      if (typeof maximized === 'boolean') callback(maximized);
    };
    ipcRenderer.on('voxnelo:window:maximize-changed', listener);
    return () => ipcRenderer.removeListener('voxnelo:window:maximize-changed', listener);
  },
};

contextBridge.exposeInMainWorld('voxneloDesktop', {
  platform: process.platform,
  version: APP_VERSION,
  windowControls,
  asr: {
    engines: () => ipcRenderer.invoke('voxnelo:asr:engines') as Promise<null|{zipformer:boolean;moonshineMedium:boolean}>,
    installMoonshine: () => ipcRenderer.invoke('voxnelo:asr:install-moonshine') as Promise<{ok:boolean;reason?:string}>,
    onMoonshineInstallProgress: (callback:(stage:typeof MOONSHINE_INSTALL_STAGES[number])=>void) => {
      const listener=(_event:IpcRendererEvent,stage:unknown)=>{
        if(typeof stage==='string'&&MOONSHINE_INSTALL_STAGES.some(s=>s===stage))
          callback(stage as typeof MOONSHINE_INSTALL_STAGES[number]);
      };
      ipcRenderer.on('voxnelo:asr:moonshine-install-progress',listener);
      return ()=>ipcRenderer.removeListener('voxnelo:asr:moonshine-install-progress',listener);
    },
    capabilities: (engine?:'zipformer'|'moonshine-medium') => ipcRenderer.invoke('voxnelo:asr:capabilities',engine) as Promise<{available:boolean;reason:'ready'|'not-configured'|'missing-addon'|'missing-model'|'invalid-personal-pack'}>,
    start: (engine?:'zipformer'|'moonshine-medium') => ipcRenderer.invoke('voxnelo:asr:start',engine) as Promise<{ok:true;sessionId:string}|{ok:false;reason:string}>,
    push: (id:string,samples:Float32Array) => ipcRenderer.send('voxnelo:asr:pcm',id,samples),
    stop: (id:string) => ipcRenderer.invoke('voxnelo:asr:stop',id) as Promise<{finalText:string;completed:boolean}>,
    onResult: (callback:(event:{sessionId:string;finalText:string;interimText:string})=>void) => {
      const listener=(_event:IpcRendererEvent,data:unknown)=>{
        if(data&&typeof data==='object'&&'sessionId' in data&&'finalText' in data&&'interimText' in data
          &&typeof data.sessionId==='string'&&typeof data.finalText==='string'&&typeof data.interimText==='string')callback(data as {sessionId:string;finalText:string;interimText:string});
      };
      ipcRenderer.on('voxnelo:asr:result',listener);
      return ()=>ipcRenderer.removeListener('voxnelo:asr:result',listener);
    },
    onError: (callback:(id:string,reason:'overloaded'|'failed')=>void) => {
      const listener=(_event:IpcRendererEvent,data:unknown)=>{
        if(data&&typeof data==='object'&&'sessionId' in data&&typeof data.sessionId==='string'){
          // Only expose a small allowlist of renderer-safe failure reasons,
          // never paths, native exceptions, microphone samples or transcripts.
          const reason=('reason' in data&&data.reason==='overloaded')?'overloaded':'failed';
          callback(data.sessionId,reason);
        }
      };
      ipcRenderer.on('voxnelo:asr:error',listener);
      return ()=>ipcRenderer.removeListener('voxnelo:asr:error',listener);
    },
  },
  speech: {
    synthesizeEnglish: (text: string, speed: 'normal' | 'slow') =>
      ipcRenderer.invoke('voxnelo:speech:synthesize', text, speed) as Promise<
        { ok: true; wavBase64: string } | { ok: false; reason: 'not-installed' | 'failed' | 'cancelled' | 'invalid' }
      >,
    cancel: () => ipcRenderer.send('voxnelo:speech:cancel'),
  },
});
