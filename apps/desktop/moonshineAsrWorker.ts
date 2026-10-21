import {parentPort,workerData} from 'node:worker_threads';
import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {createInterface} from 'node:readline';
import {existsSync} from 'node:fs';

type Config={pythonPath:string;scriptPath:string;modelDir:string};
type Event={type:string;finalText?:string;interimText?:string};
const port=parentPort;
if(!port)throw Error('Moonshine worker requires worker thread');
const cfg=workerData as Config;
let child:ChildProcessWithoutNullStreams|null=null;
let finished=false;
let failed=false;
const fail=()=>{
  if(failed||finished)return;
  failed=true;
  port.postMessage({type:'failure'});
  child?.kill();
};
try{
  if(![cfg.pythonPath,cfg.scriptPath,cfg.modelDir].every(v=>typeof v==='string'&&v.startsWith('/')&&existsSync(v)))
    throw Error('Missing verified local runtime');
  child=spawn(cfg.pythonPath,['-I',cfg.scriptPath,'--model-dir',cfg.modelDir],{
    stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONNOUSERSITE:'1'},shell:false,
  });
  const proc=child;
  // Drain stderr without forwarding native errors, private model paths or audio.
  proc.stderr.resume();
  const lines=createInterface({input:proc.stdout,crlfDelay:Infinity});
  lines.on('line',(line)=>{
    try{
      if(line.length>20000)throw Error('oversized event');
      const event=JSON.parse(line) as Event;
      if(!event||!['ready','drained','result','finished','failure'].includes(event.type))throw Error('invalid event');
      if(event.type==='result'&&(typeof event.finalText!=='string'||typeof event.interimText!=='string'))throw Error('invalid transcript');
      port.postMessage(event);
      if(event.type==='finished'){finished=true;proc.kill();}
      if(event.type==='failure')fail();
    }catch{fail();}
  });
  proc.on('error',fail);
  proc.on('exit',()=>{if(!finished)fail();});
  port.on('message',(msg:unknown)=>{
    if(finished||failed)return;
    if(!msg||typeof msg!=='object'||!('type' in msg))return fail();
    const data=msg as {type:string;samples?:Float32Array};
    if(data.type==='shutdown'){
      finished=true; // Cancellation is not a completed transcript.
      proc.kill();
      return;
    }
    if(data.type==='finish'){
      proc.stdin.write('{"type":"finish"}\n');
      return;
    }
    if(data.type!=='pcm'||!(data.samples instanceof Float32Array)||data.samples.length<1||data.samples.length>3200)return fail();
    const samples=Array.from(data.samples);
    if(samples.some(v=>!Number.isFinite(v)||Math.abs(v)>1))return fail();
    // A false write() return is NORMAL stream backpressure, not failed audio.
    // Node queues that chunk and Python emits 'drained' only after processing.
    // The main-process MAX_PENDING_PCM_CHUNKS limit bounds outstanding audio.
    try{
      proc.stdin.write(JSON.stringify({type:'pcm',samples})+'\n');
      if(proc.stdin.writableLength>1024*1024)fail();
    }catch{fail();}
  });
}catch{fail();}
