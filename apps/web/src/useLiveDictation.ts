import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';

/**
 * Browser speech recognition is NOT an Electron desktop ASR engine. Always
 * request on-device recognition first; cloud is an explicit browser-only opt-in.
 * No synthesized transcript, fake confidence, or background microphone access.
 */
type DictationStatus = 'idle' | 'checking' | 'listening';
type DictationMode = 'local' | 'browser';
type LocalPack = 'unknown' | 'available' | 'downloadable' | 'unavailable';
type SpeechResult = { isFinal: boolean; 0?: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechFailure = { error: string };
interface Recognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: SpeechFailure) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface RecognizerClass {
  new(): Recognizer;
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (options: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
}
function recognizerClass(): RecognizerClass | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as Window & { SpeechRecognition?: RecognizerClass; webkitSpeechRecognition?: RecognizerClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
const language = 'en-US';
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
  const current = useRef<Recognizer | null>(null);
  const desktopStop = useRef<(() => Promise<{finalText:string}>) | null>(null);
  const [desktopAvailable,setDesktopAvailable] = useState(false);
  const [desktopReason,setDesktopReason] = useState<'ready'|'not-configured'|'missing-model'|'missing-addon'>('not-configured');
  const [noiseReduction,setNoiseReduction] = useState<'unknown'|'enabled'|'unverified'>('unknown');
  const requestId = useRef(0);
  const disposed = useRef(false);
  const active = status !== 'idle';
  // SpeechRecognition can use a vendor network service. The desktop app never
  // opts into that mode, even when the constructor happens to exist.
  const browserModeAvailable = !window.voxneloDesktop;
  // Electron has no Chrome on-device speech-service binder. A Chromium
  // constructor/method presence does NOT mean recognition can run in Electron.
  const supported = window.voxneloDesktop ? desktopAvailable : Boolean(recognizerClass());
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
  const stop = useCallback(() => {
    const generation=++requestId.current;
    const closeDesktop=desktopStop.current;
    desktopStop.current=null;
    if(closeDesktop){
      void closeDesktop().then(result=>{
        if(!disposed.current&&requestId.current===generation&&result.finalText){
          setFinalText(result.finalText);
        }
      }).catch(()=>{ /* offline engine may already be gone */ });
    }
    const recognizer=current.current;
    current.current=null;
    if(recognizer) {
      recognizer.onresult=null;
      recognizer.onerror=null;
      recognizer.onstart=null;
      recognizer.onend=null;
      try {recognizer.stop()} catch { /* recognition may already be stopped */ }
    }
    setInterimText('');
    setInputLevel(null);
    setStatus('idle');
  },[]);
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
    const Ctor=recognizerClass();
    setError('');
    const bridge=window.voxneloDesktop?.asr;
    if(window.voxneloDesktop){
      // Fail closed, including on Electron builds exposing an incomplete
      // SpeechRecognition API. Do not invoke Chrome's unsupported local binder.
      if(mode!=='local'||!bridge||!desktopAvailable){setError(t('dictationLocalRequired'));return;}
      const id=++requestId.current;
      setStatus('checking');
      let media:MediaStream|null=null;
      let context:AudioContext|null=null;
      let unsubscribe:(()=>void)|null=null;
      let unsubscribeError:(()=>void)|null=null;
      let sessionId:string|null=null;
      let closed=false;
      let audioTrack:MediaStreamTrack|null=null;
      let onDeviceEnded:(()=>void)|null=null;
      let lastLevelUpdate=0;
      const close=():Promise<{finalText:string}>=>{
        if(closed)return Promise.resolve({finalText:''});
        closed=true;
        unsubscribe?.();unsubscribeError?.();
        if(audioTrack&&onDeviceEnded)audioTrack.removeEventListener('ended',onDeviceEnded);
        const final=sessionId?bridge.stop(sessionId):Promise.resolve({finalText:''});
        media?.getTracks().forEach(track=>track.stop());
        if(context)void context.close();
        return final;
      };
      try{
        media=await navigator.mediaDevices.getUserMedia({
          audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},
          video:false,
        });
        if(disposed.current||id!==requestId.current){void close();return;}
        audioTrack=media.getAudioTracks()[0]??null;
        const settings=audioTrack?.getSettings();
        setNoiseReduction(settings?.noiseSuppression===true?'enabled':'unverified');
        onDeviceEnded=()=>{
          if(closed||id!==requestId.current||disposed.current)return;
          setError(t('dictationMicrophone'));
          stop();
        };
        audioTrack?.addEventListener('ended',onDeviceEnded);
        const opened=await bridge.start();
        if(disposed.current||id!==requestId.current){
          if(opened.ok)bridge.stop(opened.sessionId);
          close();return;
        }
        if(!opened.ok)throw new Error('offline ASR not ready');
        sessionId=opened.sessionId;
        desktopStop.current=close;
        unsubscribe=bridge.onResult(result=>{
          if(id!==requestId.current||result.sessionId!==sessionId||disposed.current)return;
          setFinalText(result.finalText);
          setInterimText(result.interimText);
        });
        unsubscribeError=bridge.onError(failed=>{
          if(id!==requestId.current||failed!==sessionId||disposed.current)return;
          setError(t('dictationFailed'));
          stop();
        });
        // The worklet resamples the actual output sample rate to 16 kHz.
        // Forcing AudioContext({sampleRate:16000}) fails on some sound devices.
        context=new AudioContext({latencyHint:'interactive'});
        await context.audioWorklet.addModule(new URL('audio/pcm-worklet.js',window.location.href).href);
        if(disposed.current||id!==requestId.current){close();return;}
        const source=context.createMediaStreamSource(media);
        const node=new AudioWorkletNode(context,'voxnelo-pcm-16k');
        const silent=context.createGain();
        silent.gain.value=0;
        source.connect(node);
        node.connect(silent);
        silent.connect(context.destination);
        node.port.onmessage=event=>{
          if(id!==requestId.current||closed||typeof sessionId!=='string')return;
          if(event.data instanceof Float32Array){
            const samples=event.data;
            bridge.push(sessionId,samples);
            const now=performance.now();
            if(now-lastLevelUpdate>=100){
              lastLevelUpdate=now;
              let sum=0;
              for(let i=0;i<samples.length;i++)sum+=samples[i]*samples[i];
              const rms=Math.sqrt(sum/Math.max(1,samples.length));
              setInputLevel(Math.min(1,rms*6));
            }
          }
        };
        await context.resume();
        if(disposed.current||id!==requestId.current){close();return;}
        setStatus('listening');
        return;
      }catch(cause){
        close();
        if(desktopStop.current===close)desktopStop.current=null;
        if(disposed.current||id!==requestId.current)return;
        setStatus('idle');
        setInputLevel(null);
        const name=cause instanceof Error?cause.name:'';
        setError(name==='NotAllowedError'?t('dictationPermission')
          :name==='NotFoundError'||name==='NotReadableError'?t('dictationMicrophone'):t('dictationFailed'));
        return;
      }
    }
    if(!Ctor){setError(t(window.voxneloDesktop?'dictationLocalRequired':'dictationUnsupported'));return;}
    if(mode==='browser'&&!browserModeAvailable){setError(t('dictationLocalRequired'));return;}
    const id=++requestId.current;
    setStatus('checking');
    if(mode==='local') {
      if(!Ctor.available){setStatus('idle');setError(t('dictationLocalRequired'));return;}
      try {
        const available=await Ctor.available({langs:[language],processLocally:true});
        if(disposed.current||id!==requestId.current)return;
        if(available!=='available') {
          setLocalPack(available==='downloadable'||available==='downloading'?'downloadable':'unavailable');
          setError(available==='downloadable'||available==='downloading'?t('dictationPackNeeded'):t('dictationLocalRequired'));
          setStatus('idle');
          return;
        }
        setLocalPack('available');
      } catch {
        if(disposed.current||id!==requestId.current)return;
        setStatus('idle');setError(t('dictationLocalRequired'));return;
      }
    }
    if(disposed.current||id!==requestId.current)return;
    const recognition=new Ctor();
    if(mode==='local') {
      if(!('processLocally' in recognition)) {
        setStatus('idle');setError(t('dictationLocalRequired'));return;
      }
      recognition.processLocally=true;
    } else {
      recognition.processLocally=false;
    }
    recognition.lang=language;
    recognition.continuous=true;
    recognition.interimResults=true;
    const collected=new Map<number,string>();
    current.current=recognition;
    recognition.onstart=()=>{if(id===requestId.current&&!disposed.current)setStatus('listening');};
    recognition.onresult=(event)=>{
      if(id!==requestId.current||disposed.current)return;
      const partial:string[]=[];
      for(let i=0;i<event.results.length;i++){
        const result=event.results[i];
        const value=result?.[0]?.transcript?.trim();
        if(!value)continue;
        if(result?.isFinal)collected.set(i,value);
        else partial.push(value);
      }
      setFinalText([...collected.values()].join(' ').trim());
      setInterimText(partial.join(' ').trim());
    };
    recognition.onerror=(event)=>{
      if(id!==requestId.current||disposed.current)return;
      const key=event.error==='not-allowed'||event.error==='service-not-allowed'?'dictationPermission'
        :event.error==='audio-capture'?'dictationMicrophone'
        :event.error==='network'?'dictationServiceUnavailable'
        :event.error==='language-not-supported'?'dictationLocalRequired'
        :event.error==='no-speech'?null:'dictationFailed';
      if(key)setError(t(key));
      setStatus('idle');setInterimText('');current.current=null;
    };
    recognition.onend=()=>{
      if(id!==requestId.current||disposed.current)return;
      setStatus('idle');setInterimText('');current.current=null;
    };
    try {recognition.start()}catch{
      if(id!==requestId.current)return;
      current.current=null;setStatus('idle');setError(t('dictationFailed'));
    }
  },[status,mode,browserModeAvailable,desktopAvailable,stop,t]);
  const installLocal = useCallback(async()=>{
    const Ctor=recognizerClass();
    if(window.voxneloDesktop || !Ctor?.install)return setError(t('dictationLocalRequired'));
    const id=++requestId.current;
    setStatus('checking');setError('');
    try {
      const installed=await Ctor.install({langs:[language],processLocally:true});
      if(disposed.current||id!==requestId.current)return;
      setLocalPack(installed?'available':'unavailable');
      setError(installed?'':t('dictationPackFailed'));
    }catch{
      if(!disposed.current&&id===requestId.current)setError(t('dictationPackFailed'));
    }finally {
      if(!disposed.current&&id===requestId.current)setStatus('idle');
    }
  },[t]);
  return {status,active,mode,chooseMode,supported,browserModeAvailable,desktopReason,localPack,noiseReduction,finalText,interimText,inputLevel,error,start,stop,clear,installLocal};
}
