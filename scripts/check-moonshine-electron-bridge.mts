/** End-to-end subprocess transport smoke, without downloadable model binaries.
 * Exercises the Electron-bundled worker -> local Python -> worker messages.
 */
import {Worker} from 'node:worker_threads';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {strict as assert} from 'node:assert';
const root=mkdtempSync(path.join(tmpdir(),'voxnelo-moonshine-bridge-'));
const modelDir=path.join(root,'model');
mkdirSync(modelDir);
const script=path.join(root,'fake-moonshine.py');
writeFileSync(script,`import json,sys
print(json.dumps({"type":"ready"}),flush=True)
for line in sys.stdin:
    message=json.loads(line)
    if message.get("type")=="pcm":
        assert len(message["samples"])==800
        print(json.dumps({"type":"result","finalText":"","interimText":"hello"}),flush=True)
        print(json.dumps({"type":"drained"}),flush=True)
    elif message.get("type")=="finish":
        print(json.dumps({"type":"result","finalText":"hello world","interimText":""}),flush=True)
        print(json.dumps({"type":"finished"}),flush=True)
        break
`);
const workerFile=path.resolve('dist-electron/moonshineAsrWorker.cjs');
async function verify(shouldReject:boolean){
  const worker=new Worker(workerFile,{workerData:{
    pythonPath:'/usr/bin/python3',scriptPath:script,modelDir,
  }});
  return await new Promise<void>((resolve,reject)=>{
    let interim=false,final=false,finished=false;
    const timeout=setTimeout(()=>reject(Error('Moonshine worker timed out')),15000);
    const settle=(error?:Error)=>{
      clearTimeout(timeout);
      void worker.terminate();
      if(error)reject(error);else resolve();
    };
    worker.on('error',settle);
    worker.on('exit',code=>{if(!finished)settle(Error('Unexpected worker exit '+code));});
    worker.on('message',(m:{type:string;finalText?:string;interimText?:string})=>{
      try{
        if(m.type==='ready'){
          worker.postMessage({type:'pcm',samples:shouldReject?
            new Float32Array([NaN]):new Float32Array(800)});
        }else if(m.type==='result'){
          if(m.interimText==='hello')interim=true;
          if(m.finalText==='hello world')final=true;
        }else if(m.type==='drained'){
          worker.postMessage({type:'finish'});
        }else if(m.type==='failure'){
          if(!shouldReject)throw Error('Unexpected Moonshine worker failure');
          finished=true;settle();
        }else if(m.type==='finished'){
          if(shouldReject)throw Error('Malformed PCM was accepted');
          assert(interim&&final,'Missing interim or final transcript');
          finished=true;settle();
        }
      }catch(error){settle(error as Error);}
    });
  });
}
// A child may close stdin before Voxnelo writes audio or Stop. Depending on
// pipe scheduling the parent may receive an asynchronous EPIPE or only the
// subprocess exit; both must cause a single sanitized failure, never an
// unhandled Worker error, hang, or a leaked Python child.
const closedPipeScript=path.join(root,'closed-pipe.py');
writeFileSync(closedPipeScript,`import os,time
os.close(0)
print('{"type":"ready"}',flush=True)
# Exit even when the platform has not emitted EPIPE for a buffered write.
time.sleep(0.35)
`);
async function verifyClosedPipe(kind:'pcm'|'finish'){
  const worker=new Worker(workerFile,{workerData:{
    pythonPath:'/usr/bin/python3',scriptPath:closedPipeScript,modelDir,
  }});
  try{
    await new Promise<void>((resolve,reject)=>{
      let settled=false;
      let sawReady=false;
      const timeout=setTimeout(()=>settle(Error('No failure on closed Moonshine stdin')),5000);
      function settle(error?:Error){
        if(settled)return;
        settled=true;
        clearTimeout(timeout);
        if(error)reject(error);else resolve();
      }
      worker.on('error',error=>settle(Error('Unhandled worker stream error: '+error.name)));
      worker.on('exit',code=>settle(Error('Worker exited before sanitized failure: '+code)));
      worker.on('message',(m:{type:string})=>{
        if(m.type==='ready'){
          sawReady=true;
          worker.postMessage(kind==='pcm'
            ?{type:'pcm',samples:new Float32Array(800)}
            :{type:'finish'});
        }else if(m.type==='failure'){
          settle(sawReady?undefined:Error('Child failed before protocol ready'));
        }else{
          settle(Error('Unexpected event from closed input: '+m.type));
        }
      });
    });
  }finally{await worker.terminate();}
}
try{
  await verify(false);
  await verify(true);
  await verifyClosedPipe('pcm');
  await verifyClosedPipe('finish');
  console.log('Moonshine worker PCM, final, invalid input, and closed pipe checks passed');
}finally{rmSync(root,{recursive:true,force:true});}
