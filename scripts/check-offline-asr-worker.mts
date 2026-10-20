#!/usr/bin/env node
/* Contract-only deterministic mock: verifies incremental recognizer output
 * reaches IPC BEFORE endpoint/stop, not real-model transcription quality. */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

const dir=await mkdtemp(path.join(tmpdir(),'voxnelo-offline-asr-contract-'));
type WorkerMessage = {type:string;finalText?:string;interimText?:string};
let worker:Worker|undefined;
try{
  for(const file of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])
    await writeFile(path.join(dir,file),'test fixture');
  const addon=path.join(dir,'addon.cjs');
  await writeFile(addon,`
class OnlineRecognizer {
  constructor(config){
    const model=config?.modelConfig;
    if(config.featConfig?.sampleRate!==16000||
       typeof model?.transducer?.encoder!=='string'||
       typeof model?.transducer?.decoder!=='string'||
       typeof model?.transducer?.joiner!=='string'||
       !model?.tokens||config.decodingMethod!=='greedy_search'||
       config.enableEndpoint!==true){
      throw Error('Incorrect upstream sherpa-onnx-node OnlineRecognizer config');
    }
  }
  createStream(){
    return {packet:0,remaining:0,text:'',
      acceptWaveform(o){this.packet++;this.remaining=16;this.samples=o.samples;},
      inputFinished(){this.finished=true;}};
  }
  isReady(s){return s.remaining>0;}
  decode(s){
    s.remaining--;
    if(s.packet===1)s.text=s.remaining>=8?'hello':'hello there';
    else s.text='hello there friend';
  }
  getResult(s){return {text:s.text||''};}
  isEndpoint(s){return s.packet>=3&&s.text==='hello there friend';}
  reset(s){s.text='';}
}
module.exports={OnlineRecognizer};
`);
  await access(path.resolve('dist/audio/pcm-worklet.js'));
  worker=new Worker(path.resolve('dist-electron/offlineAsrWorker.cjs'),{workerData:{modelDir:dir,addonPath:addon}});
  const inbox:WorkerMessage[]=[];
  let wake:(()=>void)|null=null;
  let workerError:Error|null=null;
  worker.on('message',(msg:WorkerMessage)=>{inbox.push(msg);wake?.();});
  worker.on('error',e=>{workerError=e;wake?.();});
  const next=async():Promise<WorkerMessage>=>{
    const deadline=Date.now()+5000;
    while(!inbox.length){
      if(workerError)throw workerError;
      const remaining=deadline-Date.now();
      if(remaining<=0)throw Error('Offline worker IPC test timed out');
      await new Promise<void>((resolve,reject)=>{
        const timeout=setTimeout(()=>{wake=null;reject(Error('Offline worker IPC test timed out'));},remaining);
        wake=()=>{clearTimeout(timeout);wake=null;resolve();};
      });
    }
    return inbox.shift()!;
  };
  const seen:WorkerMessage[]=[];
  const until=async(type:string):Promise<void>=>{
    while(true){
      const msg=await next();
      if(msg.type==='failure')throw Error('Mock native addon failed to load');
      seen.push(msg);
      if(msg.type===type)return;
    }
  };
  await until('ready');
  worker.postMessage({type:'pcm',samples:new Float32Array(1600)});
  await until('drained');
  const first=seen.findIndex(msg=>msg.type==='result'&&msg.interimText==='hello');
  const revised=seen.findIndex(msg=>msg.type==='result'&&msg.interimText==='hello there');
  const firstDrained=seen.findIndex(msg=>msg.type==='drained');
  assert.ok(first>=0&&revised>first&&revised<firstDrained,
    'Native streaming must deliver first and revised partial BEFORE a packet is drained');
  assert.ok(seen.every(msg=>msg.type!=='result'||msg.finalText===''),
    'Partial words must not be presented as finalized');

  worker.postMessage({type:'pcm',samples:new Float32Array(1600)});
  await until('drained');
  assert.ok(seen.some(msg=>msg.type==='result'&&msg.interimText==='hello there friend'),
    'Second packet should revise the interim hypothesis without an endpoint');
  worker.postMessage({type:'pcm',samples:new Float32Array(1600)});
  await until('drained');
  assert.ok(seen.some(msg=>msg.type==='result'&&msg.finalText==='hello there friend'&&msg.interimText===''),
    'Endpoint must commit the utterance only once');
  worker.postMessage({type:'finish'});
  await until('finished');
  assert.ok(seen.some(msg=>msg.type==='finished'),'Worker must complete cleanly');
  assert.equal(seen.filter(msg=>msg.type==='result'&&msg.finalText==='hello there friend'&&msg.interimText==='').length>=1,true);
  console.log('Streaming IPC contract passed: partial-before-endpoint, revision, finalization (mock addon).');
}finally{
  if(worker)await worker.terminate();
  await rm(dir,{recursive:true,force:true});
}
