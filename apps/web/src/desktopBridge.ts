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

export type MoonshineInstallStage='environment'|'dependencies'|'model-download'|'model-verification'|'activation'|'complete';
export interface OfflineAsrResult {sessionId:string;finalText:string;interimText:string}
export interface OfflineAsrStopResult {finalText:string;completed:boolean}
export type OfflineAsrFailureReason = 'overloaded' | 'failed';
export interface VoxneloOfflineAsr {
  engines():Promise<null|{zipformer:boolean;moonshineMedium:boolean;moonshineInstallable?:boolean}>;
  installMoonshine?():Promise<{ok:true}|{ok:false;reason:'unsupported'|'busy'|'verification'|'failed'}>;
  onMoonshineInstallProgress?(listener:(stage:MoonshineInstallStage)=>void):()=>void;
  capabilities(engine?:'zipformer'|'moonshine-medium'):Promise<{available:boolean;reason:'ready'|'not-configured'|'missing-addon'|'missing-model'|'invalid-personal-pack'}>;
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
