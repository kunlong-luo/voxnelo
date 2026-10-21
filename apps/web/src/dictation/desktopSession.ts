import type { VoxneloOfflineAsr, OfflineAsrFailureReason, OfflineAsrStopResult } from '../desktopBridge';

/**
 * One Electron-only microphone/AudioWorklet/ASR session.
 *
 * This adapter deliberately owns no React state and does not access browser
 * SpeechRecognition. The caller supplies a generation guard so permission
 * prompts, native worker startup and worklet loading can be cancelled safely.
 */
export type DesktopDictationStop=()=>Promise<OfflineAsrStopResult>;
export type DesktopStartError='permission'|'microphone'|'failed'|'engine'|'busy';
export type DesktopStartResult={ok:true}|{ok:false;reason:'cancelled'|DesktopStartError};
/**
 * Diagnostic profile for another device playing speech into this microphone.
 * Keep noise processing ON by default for normal conversational dictation.
 * Neither option starts capture before the user presses the microphone.
 */
export type DesktopCaptureProfile='conversation'|'external-playback';
export function getDesktopCaptureConstraints(profile:DesktopCaptureProfile){
  return {
    audio:{
      echoCancellation:profile==='conversation',
      noiseSuppression:profile==='conversation',
      autoGainControl:profile==='conversation',
      channelCount:1,
    },
    video:false,
  };
}

export interface DesktopDictationCallbacks {
  isCurrent:()=>boolean;
  onStopReady:(stop:DesktopDictationStop)=>void;
  onNoiseReduction:(enabled:boolean)=>void;
  onTranscript:(finalText:string,interimText:string)=>void;
  onLevel:(level:number)=>void;
  onError:(reason:OfflineAsrFailureReason)=>void;
  onDeviceEnded:()=>void;
}

export async function startDesktopDictationSession(
  bridge:VoxneloOfflineAsr,
  callbacks:DesktopDictationCallbacks,
  captureProfile:DesktopCaptureProfile='conversation',
):Promise<DesktopStartResult> {
  let media:MediaStream|null=null;
  let context:AudioContext|null=null;
  let source:MediaStreamAudioSourceNode|null=null;
  let node:AudioWorkletNode|null=null;
  let silent:GainNode|null=null;
  let unsubscribeResult:(()=>void)|null=null;
  let unsubscribeError:(()=>void)|null=null;
  let sessionId:string|null=null;
  let audioTrack:MediaStreamTrack|null=null;
  let closed=false;
  let lastLevelUpdate=0;

  // Idempotence matters: cancellation, device loss and worker failure may race.
  let closePromise:Promise<OfflineAsrStopResult>|null=null;
  const close:DesktopDictationStop=()=>{
    if(closePromise)return closePromise;
    closed=true;
    unsubscribeResult?.();
    unsubscribeError?.();
    if(audioTrack)audioTrack.removeEventListener('ended',onDeviceEnded);

    // End physical capture immediately. Keep the worklet and its zero-gain
    // destination alive only long enough to drain the last (<50 ms) PCM
    // buffer before telling the native recognizer that speech has ended.
    media?.getTracks().forEach(track=>track.stop());
    try{source?.disconnect();}catch{/* already disconnected */}
    const id=sessionId;
    const activeNode=node;
    closePromise=(async()=>{
      if(id&&activeNode){
        await new Promise<void>(resolve=>{
          const port=activeNode.port;
          let settled=false;
          const finish=()=>{
            if(settled)return;
            settled=true;
            window.clearTimeout(timeout);
            port.onmessage=null;
            resolve();
          };
          // The worklet may already be gone (device unplugged / OS sleep).
          // A bounded fallback must release the mic and native worker anyway.
          const timeout=window.setTimeout(finish,350);
          port.onmessage=event=>{
            const data:unknown=event.data;
            if(data instanceof Float32Array){
              if(data.length>=1&&data.length<=3200){
                try{bridge.push(id,data);}catch{/* stop still owns cleanup */}
              }
            }else if(data&&typeof data==='object'&&'type' in data&&data.type==='flushed'){
              finish();
            }
          };
          try{port.postMessage({type:'flush'});}catch{finish();}
        });
      }
      if(activeNode)activeNode.port.onmessage=null;
      for(const item of [activeNode,silent]){
        try{item?.disconnect();}catch{/* already disconnected */}
      }
      if(context)void context.close().catch(()=>{/* browser is already shutting down */});
      try{
        return id?await bridge.stop(id):{finalText:'',completed:false};
      }catch{
        return {finalText:'',completed:false};
      }
    })();
    return closePromise;
  };
  const isCurrent=()=>!closed&&callbacks.isCurrent();
  const onDeviceEnded=()=>{
    if(isCurrent())callbacks.onDeviceEnded();
  };

  try{
    media=await navigator.mediaDevices.getUserMedia(getDesktopCaptureConstraints(captureProfile));
    if(!isCurrent()){void close();return {ok:false,reason:'cancelled'};}
    audioTrack=media.getAudioTracks()[0]??null;
    callbacks.onNoiseReduction(audioTrack?.getSettings().noiseSuppression===true);
    audioTrack?.addEventListener('ended',onDeviceEnded);

    const opened=await bridge.start();
    if(opened.ok)sessionId=opened.sessionId;
    // Stop even an ASR worker that finished starting after the user navigated away.
    if(!isCurrent()){void close();return {ok:false,reason:'cancelled'};}
    if(!opened.ok){
      void close();
      return {ok:false,reason:opened.reason==='busy'?'busy':'engine'};
    }
    callbacks.onStopReady(close);
    unsubscribeResult=bridge.onResult(result=>{
      if(!isCurrent()||result.sessionId!==sessionId)return;
      callbacks.onTranscript(result.finalText,result.interimText);
    });
    unsubscribeError=bridge.onError((id,reason)=>{
      if(isCurrent()&&id===sessionId)callbacks.onError(reason);
    });

    // Worklet does the resampling from the actual device rate to 16 kHz.
    // Forcing a 16kHz AudioContext fails on some Linux audio devices.
    context=new AudioContext({latencyHint:'interactive'});
    await context.audioWorklet.addModule(new URL('audio/pcm-worklet.js',window.location.href).href);
    if(!isCurrent()){void close();return {ok:false,reason:'cancelled'};}
    source=context.createMediaStreamSource(media);
    node=new AudioWorkletNode(context,'voxnelo-pcm-16k');
    silent=context.createGain();
    silent.gain.value=0;
    source.connect(node);
    node.connect(silent);
    silent.connect(context.destination);
    node.port.onmessage=event=>{
      if(!isCurrent()||!sessionId||!(event.data instanceof Float32Array))return;
      const samples=event.data;
      bridge.push(sessionId,samples);
      const now=performance.now();
      if(now-lastLevelUpdate<100)return;
      lastLevelUpdate=now;
      let sum=0;
      for(let i=0;i<samples.length;i++)sum+=(samples[i]??0)*(samples[i]??0);
      callbacks.onLevel(Math.min(1,Math.sqrt(sum/Math.max(1,samples.length))*6));
    };
    await context.resume();
    if(!isCurrent()){void close();return {ok:false,reason:'cancelled'};}
    return {ok:true};
  }catch(error){
    void close();
    if(!callbacks.isCurrent())return {ok:false,reason:'cancelled'};
    const kind=error instanceof Error?error.name:'';
    const reason:DesktopStartError=kind==='NotAllowedError'||kind==='SecurityError'
      ?'permission'
      :kind==='NotFoundError'||kind==='NotReadableError'||kind==='OverconstrainedError'
        ?'microphone':'failed';
    return {ok:false,reason};
  }
}
