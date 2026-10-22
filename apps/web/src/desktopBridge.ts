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

export interface OfflineAsrResult {sessionId:string;finalText:string;interimText:string}
export interface OfflineAsrStopResult {finalText:string;completed:boolean}
export type OfflineAsrFailureReason = 'overloaded' | 'failed';
export interface VoxneloOfflineAsr {
  engines():Promise<null|{zipformer:boolean;moonshineMedium:boolean}>;
  installMoonshine?():Promise<{ok:true}|{ok:false;reason:'unsupported'|'busy'|'verification'|'failed'}>;
  capabilities():Promise<{available:boolean;reason:'ready'|'not-configured'|'missing-addon'|'missing-model'|'invalid-personal-pack'}>;
  start(engine?:'zipformer'|'moonshine-medium'):Promise<{ok:true;sessionId:string}|{ok:false;reason:'not-configured'|'busy'|'failed'}>;
  push(sessionId:string,samples:Float32Array):void;
  stop(sessionId:string):Promise<OfflineAsrStopResult>;
  onResult(listener:(result:OfflineAsrResult)=>void):()=>void;
  onError(listener:(sessionId:string,reason:OfflineAsrFailureReason)=>void):()=>void;
}

export interface VoxneloDesktopAPI {
  platform: string;
  version: string;
  windowControls: VoxneloWindowControls;
  asr?: VoxneloOfflineAsr;
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
