import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { APP_VERSION } from '@voxnelo/core';

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
    capabilities: () => ipcRenderer.invoke('voxnelo:asr:capabilities') as Promise<{available:boolean;reason:'ready'|'not-configured'}>,
    start: () => ipcRenderer.invoke('voxnelo:asr:start') as Promise<{ok:true;sessionId:string}|{ok:false;reason:string}>,
    push: (id:string,samples:Float32Array) => ipcRenderer.send('voxnelo:asr:pcm',id,samples),
    stop: (id:string) => ipcRenderer.send('voxnelo:asr:stop',id),
    onResult: (callback:(event:{sessionId:string;finalText:string;interimText:string})=>void) => {
      const listener=(_event:IpcRendererEvent,data:unknown)=>{
        if(data&&typeof data==='object'&&'sessionId' in data&&'finalText' in data&&'interimText' in data
          &&typeof data.sessionId==='string'&&typeof data.finalText==='string'&&typeof data.interimText==='string')callback(data as {sessionId:string;finalText:string;interimText:string});
      };
      ipcRenderer.on('voxnelo:asr:result',listener);
      return ()=>ipcRenderer.removeListener('voxnelo:asr:result',listener);
    },
    onError: (callback:(id:string)=>void) => {
      const listener=(_event:IpcRendererEvent,data:unknown)=>{
        if(data&&typeof data==='object'&&'sessionId' in data&&typeof data.sessionId==='string')callback(data.sessionId);
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
