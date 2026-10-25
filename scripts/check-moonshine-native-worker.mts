#!/usr/bin/env node
/** Run the ACTUAL Moonshine SDK/model/worker protocol for supported OSes.
 * Synthetic silence is transport-only: this is not a WER, microphone or
 * latency benchmark. No personal recordings, paths or transcripts are logged.
 */
import {Worker} from 'node:worker_threads';
import {existsSync} from 'node:fs';
import {homedir,release as osRelease} from 'node:os';
import path from 'node:path';
import {resolveMoonshinePaths} from '../apps/desktop/moonshinePaths.ts';
import {verifyPinnedMoonshineMediumModel} from '../apps/desktop/moonshineIntegrity.ts';
import {verifyMoonshinePythonRuntime} from '../apps/desktop/moonshinePaths.ts';

const personalData=process.platform==='win32'
  ?process.env.APPDATA??path.join(homedir(),'AppData','Roaming')
  :process.platform==='darwin'
    ?path.join(homedir(),'Library','Application Support')
    :process.env.XDG_CONFIG_HOME??path.join(homedir(),'.config');
const paths=resolveMoonshinePaths({
  platform:process.platform,arch:process.arch,systemRelease:osRelease(),
  isPackaged:false,resourcesPath:process.cwd(),
  bundleDir:path.resolve('dist-electron'),personalDataDir:path.join(personalData,'voxnelo'),
});
if(!paths)throw Error('Unsupported Moonshine host; native smoke cannot claim ASR support');
if(!existsSync(paths.scriptPath)||!existsSync(paths.pythonPath))
  throw Error('Moonshine script or installed Python interpreter missing');
if(!(await verifyPinnedMoonshineMediumModel(paths.modelDir))||
   !(await verifyMoonshinePythonRuntime(paths.pythonPath)))
  throw Error('Moonshine pinned native/model verifier rejected installed assets');
const workerFile=path.resolve('dist-electron/moonshineAsrWorker.cjs');
if(!existsSync(workerFile))throw Error('Moonshine Worker was not built');
const worker=new Worker(workerFile,{workerData:{
  pythonPath:paths.pythonPath,scriptPath:paths.scriptPath,modelDir:paths.modelDir,
}});
const packetCount=24;
let sent=0;
let drained=0;
let sawReady=false;
let sawResult=false;
let finished=false;
try{
  await new Promise<void>((resolve,reject)=>{
    let settled=false;
    const timeout=setTimeout(()=>settle(Error('Native Moonshine worker stalled')),120000);
    function settle(error?:Error){
      if(settled)return;
      settled=true;clearTimeout(timeout);
      if(error)reject(error);else resolve();
    }
    worker.on('error',()=>settle(Error('Native Moonshine worker thread failed')));
    worker.on('exit',()=>{if(!finished)settle(Error('Native Moonshine worker exited before finished'));});
    worker.on('message',(data:unknown)=>{
      if(!data||typeof data!=='object'||!('type' in data))return settle(Error('Invalid worker event'));
      const event=data as {type:unknown;finalText?:unknown;interimText?:unknown};
      if(event.type==='failure')return settle(Error('Native Moonshine subprocess signaled failure'));
      if(event.type==='ready'){
        if(sawReady)return settle(Error('Duplicate ready event'));
        sawReady=true;sent++;
        worker.postMessage({type:'pcm',samples:new Float32Array(800)});
      }else if(event.type==='drained'){
        if(!sawReady||++drained>sent)return settle(Error('Invalid PCM drain event'));
        if(sent<packetCount){sent++;worker.postMessage({type:'pcm',samples:new Float32Array(800)});}
        else worker.postMessage({type:'finish'});
      }else if(event.type==='result'){
        if(typeof event.finalText!=='string'||typeof event.interimText!=='string')
          return settle(Error('Invalid native transcript protocol'));
        sawResult=true;
      }else if(event.type==='finished'){
        if(!sawReady||!sawResult||drained!==packetCount)
          return settle(Error('Recognizer finished before all native PCM/drained events'));
        finished=true;
        settle();
      }else settle(Error('Unknown worker event'));
    });
  });
  console.log('Verified pinned Moonshine native Worker: ready, '+drained+
    ' real SDK PCM packets, sanitized result, finished (synthetic audio only).');
}finally{await worker.terminate();}
