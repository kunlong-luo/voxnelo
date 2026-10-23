import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';

import {
  BROWSER_SPEECH_LANGUAGE, browserRecognizerClass, createBrowserRecognizer,
  stopBrowserRecognizer, type BrowserRecognizer,
} from './dictation/browserRecognizer';
import { startDesktopDictationSession, type DesktopCaptureProfile } from './dictation/desktopSession';
import type { OfflineAsrStopResult } from './desktopBridge';

type DictationStatus = 'idle' | 'checking' | 'listening';
type DictationMode = 'local' | 'browser';
type LocalPack = 'unknown' | 'available' | 'downloadable' | 'downloading' | 'unavailable';

export function useLiveDictation(sentenceId: string) {
  const {t} = useI18n();
  const [status,setStatus] = useState<DictationStatus>('idle');
  const [mode,setMode] = useState<DictationMode>('local');
  const [localPack,setLocalPack] = useState<LocalPack>('unknown');
  const [finalText,setFinalText] = useState('');
  const [interimText,setInterimText] = useState('');
  // Actual PCM amplitude, available only on the local desktop audio path.
  const [inputLevel,setInputLevel] = useState<number | null>(null);
  const [error,setError] = useState('');
  const current = useRef<BrowserRecognizer | null>(null);
  const desktopStop = useRef<(() => Promise<OfflineAsrStopResult>) | null>(null);
  const [desktopAvailable,setDesktopAvailable] = useState(false);
  const [browserLocalReady,setBrowserLocalReady] = useState(false);
  const [desktopReason,setDesktopReason] = useState<'ready'|'not-configured'|'missing-model'|'missing-addon'|'invalid-personal-pack'>('not-configured');
  const [noiseReduction,setNoiseReduction] = useState<'unknown'|'enabled'|'unverified'|'not-requested'>('unknown');
  const [captureProfile,setCaptureProfile]=useState<DesktopCaptureProfile>('conversation');
  const [offlineEngine,setOfflineEngine]=useState<'zipformer'|'moonshine-medium'>(()=>{
    // New Linux desktop builds expose engine discovery and use Moonshine as the
    // sole user-facing default, including while its model is not yet installed.
    // Older preload builds without discovery retain their compatible path.
    return window.voxneloDesktop?.platform==='linux'&&
      typeof window.voxneloDesktop.asr?.engines==='function'?'moonshine-medium':'zipformer';
  });
  const [engineAvailability,setEngineAvailability]=useState<{zipformer:boolean;moonshineMedium:boolean}>({zipformer:false,moonshineMedium:false});
  const chooseOfflineEngine=useCallback((engine:'zipformer'|'moonshine-medium')=>{
    if(status!=='idle'||!engineAvailability[engine==='zipformer'?'zipformer':'moonshineMedium'])return;
    setOfflineEngine(engine);
  },[status,engineAvailability]);
  const requestId = useRef(0);
  const disposed = useRef(false);
  // An earlier model refresh must not override a later explicit refresh.
  const refreshGeneration = useRef(0);
  const active = status !== 'idle';
  // SpeechRecognition can use a vendor network service. The desktop app never
  // opts into that mode, even when the constructor happens to exist.
  const browserModeAvailable = !window.voxneloDesktop && Boolean(browserRecognizerClass());
  // A Web Speech constructor alone often supports only network recognition.
  // Local mode becomes actionable only after a real on-device availability probe.
  const supported = window.voxneloDesktop ? (offlineEngine==='moonshine-medium'?engineAvailability.moonshineMedium:desktopAvailable)
    : mode==='browser' ? browserModeAvailable : browserLocalReady;
  // Centralize capability refresh for the dedicated model management page.
  // Browser installation is always a separate explicit user action.
  const refreshLocal=useCallback(async()=>{
    const generation=++refreshGeneration.current;
    const isCurrent=()=>!disposed.current&&generation===refreshGeneration.current;
    const bridge=window.voxneloDesktop?.asr;
    if(window.voxneloDesktop){
      try{
        const cap=await bridge?.capabilities();
        if(!isCurrent())return;
        const engines=await bridge?.engines?.();
        if(!isCurrent())return;
        // The mount-time initializer chooses the Linux default. Refreshing
        // availability must never discard an explicit user engine selection.
        if(engines)setEngineAvailability(engines);
        const ready=cap?.available===true;
        setDesktopAvailable(ready);
        setDesktopReason(cap?.reason??'not-configured');
        setLocalPack(ready?'available':'unavailable');
      }catch{
        if(isCurrent()){
          setDesktopAvailable(false);
          setDesktopReason('not-configured');
          setLocalPack('unavailable');
        }
      }
      return;
    }
    const Ctor=browserRecognizerClass();
    if(!Ctor?.available){
      if(!isCurrent())return;
      setBrowserLocalReady(false);
      setLocalPack('unavailable');
      return;
    }
    try{
      const value=await Ctor.available({langs:[BROWSER_SPEECH_LANGUAGE],processLocally:true});
      if(!isCurrent())return;
      setBrowserLocalReady(value==='available');
      setLocalPack(value==='available'?'available':
        value==='downloadable'?'downloadable':value==='downloading'?'downloading':'unavailable');
    }catch{
      if(isCurrent()){
        setBrowserLocalReady(false);
        setLocalPack('unavailable');
      }
    }
  },[]);
  useEffect(()=>{void refreshLocal();},[refreshLocal]);
  const endSession = useCallback((acceptFinalText:boolean) => {
    const generation=++requestId.current;
    const closeDesktop=desktopStop.current;
    desktopStop.current=null;
    if(closeDesktop){
      void closeDesktop().then(result=>{
        if(!acceptFinalText||disposed.current||requestId.current!==generation)return;
        if(!result.completed){
          // An 8s timeout or crashed native worker can return the cached
          // *interim* phrase. Never publish it as the finished sentence.
          setFinalText('');
          setError(t('dictationIncomplete'));
        }else if(result.finalText){
          setFinalText(result.finalText);
        }
      }).catch(()=>{
        if(acceptFinalText&&!disposed.current&&requestId.current===generation){
          setFinalText('');
          setError(t('dictationIncomplete'));
        }
      });
    }
    const recognizer=current.current;
    current.current=null;
    stopBrowserRecognizer(recognizer);
    setInterimText('');
    setInputLevel(null);
    setStatus('idle');
  },[t]);
  const stop = useCallback(() => endSession(true),[endSession]);
  const clear = useCallback(() => {
    stop();
    ++requestId.current; // Reject any late final result from the old sentence.
    setFinalText('');
    setNoiseReduction('unknown');
    setError('');
  },[stop]);
  useEffect(() => {
    disposed.current=false;
    return () => {
      disposed.current=true;
      ++refreshGeneration.current;
      stop();
    };
  },[stop]);
  useEffect(() => { clear(); },[sentenceId,clear]);
  const chooseCaptureProfile=useCallback((value:DesktopCaptureProfile)=>{
    if(status!=='idle'||!window.voxneloDesktop)return;
    setCaptureProfile(value);
    setNoiseReduction('unknown');
  },[status]);
  const chooseMode = useCallback((value:DictationMode) => {
    if(value==='browser' && !browserModeAvailable)return;
    stop();setMode(value);setError('');
  },[browserModeAvailable,stop]);
  const start = useCallback(async() => {
    if(status!=='idle')return;
    // A new session starts from a clean transcript; otherwise words from an
    // earlier listening attempt masquerade as the currently spoken phrase.
    setFinalText('');
    setInterimText('');
    const Ctor=browserRecognizerClass();
    setError('');
    const bridge=window.voxneloDesktop?.asr;
    if(window.voxneloDesktop){
      // Fail closed, including on Electron builds exposing an incomplete
      // SpeechRecognition API. Do not invoke Chrome's unsupported local binder.
      if(mode!=='local'||!bridge){setError(t('dictationLocalRequired'));return;}
      // A personal ASR pack may be installed after this view mounted.
      // Re-query on explicit user action instead of trusting stale mount-time state.
      const id=++requestId.current;
      setStatus('checking');
      const isCurrent=()=>!disposed.current&&id===requestId.current;
      let available=false;
      let lastReason:'ready'|'not-configured'|'missing-addon'|'missing-model'|'invalid-personal-pack'='not-configured';
      try {
        const cap=await bridge.capabilities();
        const engines=await bridge.engines?.();
        lastReason=cap.reason;
        if(!isCurrent())return;
        if(engines)setEngineAvailability(engines);
        // New Linux IPC reports Moonshine as its capability; the optional
        // engines() call provides extra diagnostics, not an implicit fallback.
        setDesktopAvailable(cap.available);
        setDesktopReason(cap.reason);
        setLocalPack(cap.available?'available':'unavailable');
        available=offlineEngine==='moonshine-medium'
          ?engines?.moonshineMedium===true
          :cap.available;
      } catch {
        if(!isCurrent())return;
        setDesktopAvailable(false);
        setDesktopReason('not-configured');
      }
      if(!isCurrent())return;
      if(!available){
        setStatus('idle');
        setError(t(lastReason==='invalid-personal-pack'?'dictationModelInvalid':'dictationLocalRequired'));
        return;
      }
      const started=await startDesktopDictationSession(bridge,{
        isCurrent,
        onStopReady:close=>{desktopStop.current=close;},
        onNoiseReduction:enabled=>setNoiseReduction(captureProfile==='external-playback'?'not-requested':enabled?'enabled':'unverified'),
        onTranscript:(final,interim)=>{setFinalText(final);setInterimText(interim);},
        onLevel:setInputLevel,
        onError:reason=>{setFinalText('');setError(t(reason==='overloaded'?'dictationOverloaded':'dictationFailed'));endSession(false);},
        onDeviceEnded:()=>{setFinalText('');setError(t('dictationMicrophone'));endSession(false);},
      },captureProfile,offlineEngine);
      if(!isCurrent())return;
      if(!started.ok){
        desktopStop.current=null;
        setStatus('idle');
        setInputLevel(null);
        if(started.reason!=='cancelled'){
          setError(t(started.reason==='permission'?'dictationPermission'
            :started.reason==='microphone'?'dictationMicrophone':started.reason==='engine'?'dictationEngineFailed':started.reason==='busy'?'dictationBusy':'dictationFailed'));
        }
        return;
      }
      setStatus('listening');
      return;
    }
    if(!Ctor){setError(t(window.voxneloDesktop?'dictationLocalRequired':'dictationUnsupported'));return;}
    if(mode==='browser'&&!browserModeAvailable){setError(t('dictationLocalRequired'));return;}
    const id=++requestId.current;
    setStatus('checking');
    if(mode==='local') {
      if(!Ctor.available){setStatus('idle');setError(t('dictationLocalRequired'));return;}
      try {
        const available=await Ctor.available({langs:[BROWSER_SPEECH_LANGUAGE],processLocally:true});
        if(disposed.current||id!==requestId.current)return;
        if(available!=='available') {
          setBrowserLocalReady(false);
          setLocalPack(available==='downloadable'?'downloadable':available==='downloading'?'downloading':'unavailable');
          setError(available==='downloadable'||available==='downloading'?t('dictationPackNeeded'):t('dictationLocalRequired'));
          setStatus('idle');
          return;
        }
        setLocalPack('available');
        setBrowserLocalReady(true);
      } catch {
        if(disposed.current||id!==requestId.current)return;
        setStatus('idle');setError(t('dictationLocalRequired'));return;
      }
    }
    if(disposed.current||id!==requestId.current)return;
    const recognition=createBrowserRecognizer(Ctor,mode,{
      isCurrent:()=>id===requestId.current&&!disposed.current,
      onStart:()=>setStatus('listening'),
      onTranscript:(final,interim)=>{setFinalText(final);setInterimText(interim);},
      onFailure:key=>{
        if(key)setError(t(key));
        setStatus('idle');setInterimText('');current.current=null;
      },
      onEnd:()=>{setStatus('idle');setInterimText('');current.current=null;},
    });
    if(!recognition){
      setStatus('idle');setError(t('dictationLocalRequired'));
      return;
    }
    current.current=recognition;
    try {recognition.start()}catch{
      if(id!==requestId.current)return;
      current.current=null;setStatus('idle');setError(t('dictationFailed'));
    }
  },[status,mode,browserModeAvailable,endSession,t,captureProfile,offlineEngine]);
  const installLocal = useCallback(async()=>{
    const Ctor=browserRecognizerClass();
    if(window.voxneloDesktop || !Ctor?.install)return setError(t('dictationLocalRequired'));
    const id=++requestId.current;
    setStatus('checking');setError('');
    try {
      const installed=await Ctor.install({langs:[BROWSER_SPEECH_LANGUAGE],processLocally:true});
      if(disposed.current||id!==requestId.current)return;
      setLocalPack(installed?'available':'unavailable');
      setBrowserLocalReady(installed);
      setError(installed?'':t('dictationPackFailed'));
    }catch{
      if(!disposed.current&&id===requestId.current)setError(t('dictationPackFailed'));
    }finally {
      if(!disposed.current&&id===requestId.current)setStatus('idle');
    }
  },[t]);
  return {status,active,mode,chooseMode,offlineEngine,chooseOfflineEngine,engineAvailability,captureProfile,chooseCaptureProfile,supported,browserModeAvailable,desktopReason,localPack,noiseReduction,finalText,interimText,inputLevel,error,start,stop,clear,installLocal,refreshLocal};
}
