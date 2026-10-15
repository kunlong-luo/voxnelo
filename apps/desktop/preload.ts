import { contextBridge } from 'electron';
import { APP_VERSION } from '@voxnelo/core';

// 不暴露 ipcRenderer、文件系统或 shell。V0.1 仅有只读的平台信息。
contextBridge.exposeInMainWorld('voxneloDesktop', {
  platform: process.platform,
  version: APP_VERSION,
});
