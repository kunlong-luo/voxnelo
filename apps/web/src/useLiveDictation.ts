import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';

import {
  BROWSER_SPEECH_LANGUAGE, browserRecognizerClass, createBrowserRecognizer,
  stopBrowserRecognizer, type BrowserRecognizer,
} from './dictation/browserRecognizer';
import { startDesktopDictationSession } from './dictation/desktopSession';
import type { OfflineAsrStopResult } from './desktopBridge';

type DictationStatus = 'idle' | 'checking' | 'listening';
type DictationMode = 'local' | 'browser';
type LocalPack = 'unknown' | 'available' | 'downloadable' | 'unavailable';

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
  const [desktopReason,setDesktopReason] = useState<'ready'|'not-configured'|'missing-model'|'missing-addon'>('not-configured');
  const [noiseReduction,setNoiseReduction] = useState<'unknown'|'enabled'|'unverified'>('unknown');
  const requestId = useRef(0);
  const disposed = useRef(false);
  const active = status !== 'idle';
  // SpeechRecognition can use a vendor network service. The desktop app never
  // opts into that mode, even when the constructor happens to exist.
  const browserModeAvailable = !window.voxneloDesktop && Boolean(browserRecognizerClass());
  // A Web Speech constructor alone often supports only network recognition.
  // Local mode becomes actionable only after a real on-device availability probe.
  const supported = window.voxneloDesktop ? desktopAvailable
    : mode==='browser' ? browserModeAvailable : browserLocalReady;
  useEffect(()=>{
    const bridge=window.voxneloDesktop?.asr;
    if(!bridge)return;
    let alive=true;
    void bridge.capabilities().then(cap=>{
      if(!alive)return;
      setDesktopAvailable(cap.available);
      setDesktopReason(cap.reason);
      setLocalPack(cap.available?'available':'unavailable');
    }).catch(()=>{if(alive){setDesktopAvailable(false);setDesktopReason('not-configured');}});
    return ()=>{alive=false;};
  },[]);
  useEffect(()=>{
    if(window.voxneloDesktop)return;
    const Ctor=browserRecognizerClass();
    if(!Ctor?.available){
      setBrowserLocalReady(false);
      setLocalPack('unavailable');
      return;
    }
    let alive=true;
    void Ctor.available({langs:[BROWSER_SPEECH_LANGUAGE],processLocally:true}).then(value=>{
      if(!alive)return;
      setBrowserLocalReady(value==='available');
      setLocalPack(value==='available'?'available':
        value==='downloadable'||value==='downloading'?'downloadable':'unavailable');
    }).catch(()=>{
      if(!alive)return;
      setBrowserLocalReady(false);
      setLocalPack('unavailable');
    });
    return ()=>{alive=false;};
  },[]);
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
      stop();
    };
  },[stop]);
  useEffect(() => { clear(); },[sentenceId,clear]);
  const chooseMode = useCallback((value:DictationMode) => {
    if(value==='browser' && !browserModeAvailable)return;
    stop();setMode(value);setError('');
  },[browserModeAvailable,stop]);
  const start = useCallback(async() => {
    if(status!=='idle')return;
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
      try {
        const cap=await bridge.capabilities();
        if(!isCurrent())return;
        setDesktopAvailable(cap.available);
        setDesktopReason(cap.reason);
        setLocalPack(cap.available?'available':'unavailable');
        available=cap.available;
      } catch {
        if(!isCurrent())return;
        setDesktopAvailable(false);
        setDesktopReason('not-configured');
      }
      if(!isCurrent())return;
      if(!available){
        setStatus('idle');
        setError(t('dictationLocalRequired'));
        return;
      }
      const started=await startDesktopDictationSession(bridge,{
        isCurrent,
        onStopReady:close=>{desktopStop.current=close;},
        onNoiseReduction:enabled=>setNoiseReduction(enabled?'enabled':'unverified'),
        onTranscript:(final,interim)=>{setFinalText(final);setInterimText(interim);},
        onLevel:setInputLevel,
        onError:reason=>{setFinalText('');setError(t(reason==='overloaded'?'dictationOverloaded':'dictationFailed'));endSession(false);},
        onDeviceEnded:()=>{setFinalText('');setError(t('dictationMicrophone'));endSession(false);},
      });
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
          setLocalPack(available==='downloadable'||available==='downloading'?'downloadable':'unavailable');
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
  },[status,mode,browserModeAvailable,endSession,t]);
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
  return {status,active,mode,chooseMode,supported,browserModeAvailable,desktopReason,localPack,noiseReduction,finalText,interimText,inputLevel,error,start,stop,clear,installLocal};
}
