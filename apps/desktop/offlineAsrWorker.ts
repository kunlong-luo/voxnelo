import { parentPort, workerData } from 'node:worker_threads';
import { createRequire } from 'node:module';
import path from 'node:path';

type Stream = { acceptWaveform(input:{samples:Float32Array;sampleRate:number}):void; inputFinished():void };
type Recognizer = {
  createStream():Stream;isReady(stream:Stream):boolean;decode(stream:Stream):void;
  getResult(stream:Stream):{text?:string};isEndpoint(stream:Stream):boolean;reset(stream:Stream):void;
};
type Module = { OnlineRecognizer:new(config:Record<string,unknown>)=>Recognizer };
type Init = {addonPath:string;modelDir:string};
type Message = {type:'pcm';samples:Float32Array}|{type:'finish'};
const parent=parentPort;
if(!parent)throw new Error('Offline ASR must run in an isolated worker');
const {addonPath,modelDir}=workerData as Init;
let recognizer:Recognizer;
let stream:Stream;
let completed:string[]=[];
let currentText='';
let stopping=false;
const report=()=>parent.postMessage({type:'result',finalText:completed.join(' '),interimText:currentText});
const decode=()=>{
  // C++ inference stays off Electron's main / UI threads.
  for(let n=0;n<64&&recognizer.isReady(stream);n++) recognizer.decode(stream);
  const next=recognizer.getResult(stream).text?.trim()??'';
  if(next!==currentText){currentText=next;report();}
  if(recognizer.isEndpoint(stream)){
    if(currentText)completed.push(currentText);
    currentText='';
    recognizer.reset(stream);
    report();
  }
};
try{
  // Package is opt-in and resolved only from developer-configured absolute path.
  const requireFromHere=createRequire(path.join(modelDir,'package.json'));
  const addon=requireFromHere(addonPath) as Module;
  recognizer=new addon.OnlineRecognizer({
    featConfig:{sampleRate:16000,featureDim:80},
    modelConfig:{
      transducer:{
        encoder:path.join(modelDir,'encoder.onnx'),
        decoder:path.join(modelDir,'decoder.onnx'),
        joiner:path.join(modelDir,'joiner.onnx'),
      },
      tokens:path.join(modelDir,'tokens.txt'),
      numThreads:2,
      debug:0,
      provider:'cpu',
    },
    decodingMethod:'greedy_search',
    enableEndpoint:true,
    rule1MinTrailingSilence:2.4,
    rule2MinTrailingSilence:1.2,
    rule3MinUtteranceLength:15,
  });
  stream=recognizer.createStream();
  parent.postMessage({type:'ready'});
  parent.on('message',(message:Message)=>{
    if(stopping)return;
    try{
      if(message.type==='pcm'){
        if(!(message.samples instanceof Float32Array)||message.samples.length>3200)return;
        stream.acceptWaveform({samples:message.samples,sampleRate:16000});
        decode();
      } else if(message.type==='finish'){
        stopping=true;
        stream.inputFinished();
        decode();
        if(currentText)completed.push(currentText);
        parent.postMessage({type:'result',finalText:completed.join(' '),interimText:''});
        parent.postMessage({type:'finished'});
      }
    }catch{parent.postMessage({type:'failure'});}
  });
}catch{
  parent.postMessage({type:'failure'});
}
