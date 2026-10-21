/** Explicit offline-engine selection policy. Never auto-promote an experimental
 * candidate merely because model component filenames exist.
 */
export type OfflineEngineId='zipformer'|'moonshine-medium';
export type OfflineEngineReadiness={
  zipformer:boolean;
  moonshineModelVerified:boolean;
  moonshineRuntimeVerified:boolean;
  moonshineStreamConnected:boolean;
};
export function engineChoices(readiness:OfflineEngineReadiness){
  return {
    zipformer:{available:readiness.zipformer,reason:readiness.zipformer?'ready':'missing-legacy-model'},
    'moonshine-medium':{
      available:readiness.moonshineModelVerified&&readiness.moonshineRuntimeVerified&&readiness.moonshineStreamConnected,
      reason:!readiness.moonshineModelVerified?'unverified-model':
        !readiness.moonshineRuntimeVerified?'unverified-runtime':
        !readiness.moonshineStreamConnected?'missing-stream-adapter':'ready',
    },
  } as const;
}
export function selectOfflineEngine(requested:unknown,readiness:OfflineEngineReadiness):
  {ok:true;engine:OfflineEngineId}|{ok:false;reason:'unsupported'|'unavailable'}{
  if(requested!=='zipformer'&&requested!=='moonshine-medium')return {ok:false,reason:'unsupported'};
  return engineChoices(readiness)[requested].available
    ? {ok:true,engine:requested}:{ok:false,reason:'unavailable'};
}
