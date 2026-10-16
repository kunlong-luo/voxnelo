#!/usr/bin/env node
/**
 * Developer-only REAL local ASR benchmark. No mock addon, hidden downloads,
 * model redistribution, or microphone uploads. WAV must be 16 kHz mono PCM16.
 * Usage:
 * VOXNELO_ASR_MODEL_DIR=/abs/model VOXNELO_ASR_ADDON_PATH=/abs/node-addon \
 *   node --experimental-strip-types scripts/benchmark-offline-asr.mts --wav /abs/sample.wav --expect "how are you"
 */
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';

const argv=process.argv.slice(2);
const option=(name:string):string|undefined=>{
  const index=argv.indexOf('--'+name);
  return index<0?undefined:argv[index+1];
};
const modelDir=process.env.VOXNELO_ASR_MODEL_DIR;
const addonPath=process.env.VOXNELO_ASR_ADDON_PATH;
const wav=option('wav');
if(!modelDir||!addonPath||!isAbsolute(modelDir)||!isAbsolute(addonPath)||!wav||!isAbsolute(wav)){
  console.error('Provide absolute VOXNELO_ASR_MODEL_DIR, VOXNELO_ASR_ADDON_PATH and --wav paths.');
  process.exit(2);
}
const source=readFileSync(wav);
if(source.toString('ascii',0,4)!=='RIFF'||source.toString('ascii',8,12)!=='WAVE'){
  throw Error('Expected WAV RIFF file');
}
type WavFormat = {encoding:number; channels:number;sampleRate:number;bits:number};
let position=12;
let format:WavFormat|null=null;
let data:Buffer|null=null;
while(position+8<=source.length){
  const kind=source.toString('ascii',position,position+4);
  const size=source.readUInt32LE(position+4);
  const start=position+8;
  if(start+size>source.length)throw Error('Truncated WAV chunk');
  if(kind==='fmt '&&size>=16){
    format={
      encoding:source.readUInt16LE(start),
      channels:source.readUInt16LE(start+2),
      sampleRate:source.readUInt32LE(start+4),
      bits:source.readUInt16LE(start+14),
    };
  }
  if(kind==='data')data=source.subarray(start,start+size);
  position=start+size+(size%2);
}
if(!format||!data||format.encoding!==1||format.channels!==1||
   format.sampleRate!==16000||format.bits!==16||data.byteLength%2){
  throw Error('Expected uncompressed 16 kHz, 16-bit, mono PCM WAV');
}
const sampleCount=data.byteLength/2;
if(sampleCount===0||sampleCount>16000*180)throw Error('WAV must contain 0-180 seconds of speech audio');
const duration=sampleCount/16000;
let transcript='',interim='';
let worker: Worker|undefined;
type AsrEvent = {type:string;finalText?:string;interimText?:string;error?:string};
const events:AsrEvent[]=[];
let notify:(()=>void)|null=null;
const emit=(data:AsrEvent)=>{events.push(data);notify?.();};
const waitFor=async(type:string):Promise<void>=>{
  const deadline=Date.now()+30000;
  while(true){
    while(events.length){
      const msg=events.shift();
      if(!msg)continue;
      if(msg.type==='failure')throw Error('Native offline ASR inference failed');
      if(msg.type==='result'){
        transcript=String(msg.finalText??'');
        interim=String(msg.interimText??'');
      }
      if(msg.type===type)return;
    }
    const remaining=deadline-Date.now();
    if(remaining<=0)throw Error('Timed out waiting for ASR '+type);
    await new Promise<void>((resolve,reject)=>{
      const timeout=setTimeout(()=>{notify=null;reject(Error('Timed out waiting for ASR '+type));},remaining);
      notify=()=>{clearTimeout(timeout);notify=null;resolve();};
    });
  }
};
const tokenize=(text:string)=>(text.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)*/g)??[]);
function wordErrorRate(expected:string,actual:string):number|null{
  const a=tokenize(expected),b=tokenize(actual);
  if(!a.length)return null;
  let distances=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const row=[i];
    for(let j=1;j<=b.length;j++){
      row.push(Math.min(row[j-1]!+1,distances[j]!+1,distances[j-1]!+(a[i-1]===b[j-1]?0:1)));
    }
    distances=row;
  }
  return distances[b.length]!/a.length;
}
try{
  worker=new Worker(resolve('dist-electron/offlineAsrWorker.cjs'),{workerData:{modelDir,addonPath}});
  worker.on('message',emit);
  worker.on('error',error=>emit({type:'failure',error:String(error)}));
  worker.on('exit',code=>{if(code!==0)emit({type:'failure'});});
  const start=performance.now();
  await waitFor('ready');
  for(let offset=0;offset<sampleCount;offset+=1600){
    const count=Math.min(1600,sampleCount-offset);
    const samples=new Float32Array(count);
    for(let i=0;i<count;i++)samples[i]=data.readInt16LE(2*(offset+i))/32768;
    worker.postMessage({type:'pcm',samples},[samples.buffer]);
    await waitFor('drained');
  }
  worker.postMessage({type:'finish'});
  await waitFor('finished');
  const elapsed=(performance.now()-start)/1000;
  const expected=option('expect');
  const result={
    realModel:true,
    durationSeconds:Number(duration.toFixed(2)),
    elapsedSeconds:Number(elapsed.toFixed(2)),
    realTimeFactor:Number((elapsed/duration).toFixed(3)),
    transcript:transcript||interim,
    ...(expected?{reference:expected,wordErrorRate:wordErrorRate(expected,transcript||interim)}:{}),
  };
  console.log(JSON.stringify(result,null,2));
}finally{
  if(worker)await worker.terminate();
}
