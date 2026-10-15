export interface VoxneloWindowControls {
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (listener: (maximized: boolean) => void) => () => void;
}

export type DesktopSpeechResult =
  | { ok: true; wavBase64: string }
  | { ok: false; reason: 'not-installed' | 'failed' | 'cancelled' | 'invalid' };

export interface VoxneloDesktopAPI {
  platform: string;
  version: string;
  windowControls: VoxneloWindowControls;
  speech?: {
    synthesizeEnglish(text: string, speed: 'normal' | 'slow'): Promise<DesktopSpeechResult>;
    cancel(): void;
  };
}

declare global {
  interface Window {
    voxneloDesktop?: VoxneloDesktopAPI;
  }
}

export {};
