export interface VoxneloWindowControls {
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (listener: (maximized: boolean) => void) => () => void;
}

export interface VoxneloDesktopAPI {
  platform: string;
  version: string;
  windowControls: VoxneloWindowControls;
}

declare global {
  interface Window {
    voxneloDesktop?: VoxneloDesktopAPI;
  }
}

export {};
