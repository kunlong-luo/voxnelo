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
try{
  await verify(false);
  await verify(true);
  console.log('Moonshine worker PCM, interim/final, and invalid-input checks passed');
}finally{rmSync(root,{recursive:true,force:true});}
