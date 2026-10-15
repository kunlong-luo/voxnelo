import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { APP_VERSION } from '@voxnelo/core';

// Only the four named window capabilities are accessible in the renderer.
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
});
