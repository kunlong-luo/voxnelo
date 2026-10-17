/** Browser SpeechRecognition adapter. Desktop Electron ASR must never use it.
 * Browser online recognition remains an explicit user choice; local is default.
 */
export type BrowserDictationMode='local'|'browser';
export type BrowserSpeechResult={isFinal:boolean;0?:{transcript:string}};
export type BrowserSpeechEvent={resultIndex:number;results:ArrayLike<BrowserSpeechResult>};
export type BrowserSpeechFailure={error:string};
export interface BrowserRecognizer {
  lang:string;
  continuous:boolean;
  interimResults:boolean;
  processLocally?:boolean;
  onresult:((event:BrowserSpeechEvent)=>void)|null;
  onerror:((event:BrowserSpeechFailure)=>void)|null;
  onend:(()=>void)|null;
  onstart:(()=>void)|null;
  start():void;
  stop():void;
  abort():void;
}
export interface BrowserRecognizerClass {
  new():BrowserRecognizer;
  available?:(options:{langs:string[];processLocally:boolean})=>Promise<string>;
  install?:(options:{langs:string[];processLocally:boolean})=>Promise<boolean>;
}
export type BrowserSpeechErrorKey='dictationPermission'|'dictationMicrophone'|'dictationServiceUnavailable'|'dictationLocalRequired'|'dictationFailed';

export const BROWSER_SPEECH_LANGUAGE='en-US';
export function browserRecognizerClass():BrowserRecognizerClass|undefined {
  if(typeof window==='undefined')return undefined;
  const w=window as Window&{
    SpeechRecognition?:BrowserRecognizerClass;
    webkitSpeechRecognition?:BrowserRecognizerClass;
  };
  return w.SpeechRecognition??w.webkitSpeechRecognition;
}

export function browserSpeechFailureKey(error:string):BrowserSpeechErrorKey|null{
  return error==='not-allowed'||error==='service-not-allowed'?'dictationPermission'
    :error==='audio-capture'?'dictationMicrophone'
    :error==='network'?'dictationServiceUnavailable'
    :error==='language-not-supported'?'dictationLocalRequired'
    :error==='no-speech'?null:'dictationFailed';
}

interface BrowserCallbacks {
  isCurrent:()=>boolean;
  onStart:()=>void;
  onTranscript:(finalText:string,interimText:string)=>void;
  onFailure:(key:BrowserSpeechErrorKey|null)=>void;
  onEnd:()=>void;
}

/**
 * A single session owns its result map and browser events. The caller owns
 * cancellation generation tokens and must prohibit this adapter in Electron.
 */
export function createBrowserRecognizer(
  Ctor:BrowserRecognizerClass,
  mode:BrowserDictationMode,
  callbacks:BrowserCallbacks,
):BrowserRecognizer|null {
  const recognition=new Ctor();
  // Lack of processLocally support must NEVER silently enable cloud recognition.
  if(mode==='local'&&!('processLocally' in recognition))return null;
  recognition.processLocally=mode==='local';
  recognition.lang=BROWSER_SPEECH_LANGUAGE;
  recognition.continuous=true;
  recognition.interimResults=true;
  const collected=new Map<number,string>();
  recognition.onstart=()=>{if(callbacks.isCurrent())callbacks.onStart();};
  recognition.onresult=event=>{
    if(!callbacks.isCurrent())return;
    const partial:string[]=[];
    for(let i=0;i<event.results.length;i++){
      const result=event.results[i];
      const value=result?.[0]?.transcript?.trim();
      if(!value)continue;
      if(result?.isFinal)collected.set(i,value);
      else partial.push(value);
    }
    callbacks.onTranscript([...collected.values()].join(' ').trim(),partial.join(' ').trim());
  };
  recognition.onerror=event=>{
    if(callbacks.isCurrent())callbacks.onFailure(browserSpeechFailureKey(event.error));
  };
  recognition.onend=()=>{if(callbacks.isCurrent())callbacks.onEnd();};
  return recognition;
}

export function stopBrowserRecognizer(recognizer:BrowserRecognizer|null):void{
  if(!recognizer)return;
  recognizer.onresult=null;
  recognizer.onerror=null;
  recognizer.onstart=null;
  recognizer.onend=null;
  try{recognizer.stop();}catch{/* already stopped or browser service ended */}
}
