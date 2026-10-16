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
  const [error,setError] = useState('');
  const current = useRef<Recognizer | null>(null);
  const requestId = useRef(0);
  const disposed = useRef(false);
  const active = status !== 'idle';
  // SpeechRecognition can use a vendor network service. The desktop app never
  // opts into that mode, even when the constructor happens to exist.
  const browserModeAvailable = !window.voxneloDesktop;
  const supported = Boolean(recognizerClass());
  const stop = useCallback(() => {
    ++requestId.current;
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
    setStatus('idle');
  },[]);
  const clear = useCallback(() => {
    stop();
    setFinalText('');
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
    if(!Ctor){setError(t('dictationUnsupported'));return;}
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
  },[status,mode,browserModeAvailable,t]);
  const installLocal = useCallback(async()=>{
    const Ctor=recognizerClass();
    if(!Ctor?.install)return setError(t('dictationLocalRequired'));
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
  return {status,active,mode,chooseMode,supported,browserModeAvailable,localPack,finalText,interimText,error,start,stop,clear,installLocal};
}
