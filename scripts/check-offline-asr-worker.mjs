#!/usr/bin/env node
/* Tests native worker IPC shape with a deterministic fake addon only.
 * Does NOT establish that an actual ASR model recognizes real speech. */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';

const dir=await mkdtemp(path.join(tmpdir(),'voxnelo-offline-asr-contract-'));
let worker;
try{
  for(const file of ['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'])await writeFile(path.join(dir,file),'test fixture');
  const addon=path.join(dir,'addon.cjs');
  await writeFile(addon,`
class OnlineRecognizer {
  createStream(){return {acceptWaveform(o){this.samples=o.samples;this.pending=true;},inputFinished(){this.finished=true;}};}
  isReady(stream){return !!stream.pending;}
  decode(stream){stream.pending=false;stream.text='hello world';}
  getResult(stream){return {text:stream.text||''};}
  isEndpoint(stream){return !!stream.text;}
  reset(stream){stream.text='';}
}
module.exports={OnlineRecognizer};
`);
  await access(path.resolve('dist/audio/pcm-worklet.js'));
  const seen=[];
  const next=()=>new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Offline worker IPC test timed out')),5000);
    worker.once('message',data=>{clearTimeout(timeout);resolve(data);});
    worker.once('error',error=>{clearTimeout(timeout);reject(error);});
  });
  worker=new Worker(path.resolve('dist-electron/offlineAsrWorker.cjs'),{workerData:{modelDir:dir,addonPath:addon}});
  assert.equal((await next()).type,'ready');
  worker.postMessage({type:'pcm',samples:new Float32Array(1600)});
  while(true){
    const msg=await next();
    seen.push(msg);
    if(msg.type==='result'&&msg.finalText==='hello world')break;
    if(msg.type==='failure')throw Error('Mock native addon failed to load');
  }
  worker.postMessage({type:'finish'});
  let finished=false;
  for(let i=0;i<4;i++){
    const msg=await next();
    seen.push(msg);
    if(msg.type==='finished'){finished=true;break;}
  }
  assert.ok(finished,'No finished endpoint event');
  assert.ok(seen.some(msg=>msg.type==='result'&&msg.finalText==='hello world'&&msg.interimText===''));
  console.log('Offline ASR worker transport contract passed (mock addon only).');
}finally{
  if(worker)await worker.terminate();
  await rm(dir,{recursive:true,force:true});
}
