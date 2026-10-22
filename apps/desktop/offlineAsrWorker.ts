import { parentPort, workerData } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { createOnlineRecognizerConfig, type AsrDecodingMethod } from './asrConfig';
import { drainReadyFrames, FINAL_DECODE_STEPS, PCM_DECODE_STEPS } from './asrDecodeDrain';
import { appendRecentWords } from './asrTranscriptHistory';

type Stream = { acceptWaveform(input:{samples:Float32Array;sampleRate:number}):void; inputFinished():void };
type Recognizer = {
  createStream():Stream;isReady(stream:Stream):boolean;decode(stream:Stream):void;
  getResult(stream:Stream):{text?:string};isEndpoint(stream:Stream):boolean;reset(stream:Stream):void;
};
type Module = { OnlineRecognizer:new(config:Record<string,unknown>)=>Recognizer };
type Init = {addonPath:string;modelDir:string;decodingMethod?:AsrDecodingMethod};
type Message = {type:'pcm';samples:Float32Array}|{type:'finish'};
const parent=parentPort;
if(!parent)throw new Error('Offline ASR must run in an isolated worker');
const {addonPath,modelDir,decodingMethod}=workerData as Init;
let recognizer:Recognizer;
let stream:Stream;
const completed:string[]=[];
let currentText='';
let stopping=false;
const report=()=>parent.postMessage({type:'result',finalText:completed.join(' '),interimText:currentText});
const publishPartial=()=>{
  const next=recognizer.getResult(stream).text?.trim()??'';
  // Only actual ASR output, never guessed text. Revised hypotheses can
  // replace an earlier partial without appending duplicate words.
  if(next!==currentText){currentText=next;report();}
};
const decode=(finishing=false)=>{
  // C++ inference stays off Electron's main / UI threads. A packet uses a
  // small fairness budget, but a finished input MUST drain every ready frame.
  // The old 64-step finish could silently truncate the last spoken words
  // if more than 64 decoder frames remained after inputFinished().
  const drain=drainReadyFrames(
    recognizer,stream,finishing?FINAL_DECODE_STEPS:PCM_DECODE_STEPS,
    finishing?undefined:publishPartial,
  );
  if(finishing&&!drain.fullyDrained)throw Error('Offline ASR finish budget exceeded: refusing incomplete transcript');
  publishPartial();
  if(recognizer.isEndpoint(stream)){
    if(currentText)appendRecentWords(completed,currentText);
    currentText='';
    recognizer.reset(stream);
    report();
  }
};
try{
  // The approved CJS adapter provides OnlineRecognizer. The low-level
  // sherpa-onnx.node binary alone does not implement this public API.
  const requireFromHere=createRequire(addonPath);
  const addon=requireFromHere(addonPath) as Partial<Module>;
  if (typeof addon.OnlineRecognizer !== 'function') throw Error('Missing OnlineRecognizer adapter');
  recognizer=new addon.OnlineRecognizer(createOnlineRecognizerConfig(modelDir,
    decodingMethod==='modified_beam_search'?'modified_beam_search':'greedy_search'));
  stream=recognizer.createStream();
  parent.postMessage({type:'ready'});
  parent.on('message',(message:Message)=>{
    if(stopping)return;
    try{
      if(message.type==='pcm'){
        if(!(message.samples instanceof Float32Array)||message.samples.length>3200)return;
        stream.acceptWaveform({samples:message.samples,sampleRate:16000});
        decode();
        parent.postMessage({type:'drained'});
      } else if(message.type==='finish'){
        stopping=true;
        stream.inputFinished();
        decode(true);
        if(currentText)appendRecentWords(completed,currentText);
        parent.postMessage({type:'result',finalText:completed.join(' '),interimText:''});
        parent.postMessage({type:'finished'});
      }
    }catch{parent.postMessage({type:'failure'});}
  });
}catch{
  parent.postMessage({type:'failure'});
}
