#!/usr/bin/env node
/**
 * Run the REAL packaged Electron executable in Node mode and require its
 * app.asar-bundled worker to start the verified private Moonshine runtime.
 *
 * This checks the installed app's resource/ASAR and Python bootstrap layout,
 * not an unpackaged development worker, and never uses customer audio.
 * It is NOT a physical microphone test or a WER/RTF benchmark.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readdirSync} from 'node:fs';
import {homedir,release as osRelease} from 'node:os';
import path from 'node:path';
import {resolveMoonshinePaths,verifyMoonshinePythonRuntime}
  from '../apps/desktop/moonshinePaths.ts';
import {verifyPinnedMoonshineMediumModel}
  from '../apps/desktop/moonshineIntegrity.ts';

const platform=process.platform;
const releaseRoot=path.resolve('release');
const builds=readdirSync(releaseRoot,{withFileTypes:true})
  .filter(e=>e.isDirectory()).map(e=>e.name);
const folder=platform==='win32'?'win-unpacked':
  platform==='darwin'?builds.find(n=>/^mac(?:-arm64|-x64)?$/.test(n)):
  builds.find(n=>/^linux(?:-arm64|-x64)?-unpacked$/.test(n));
assert.ok(folder,'Missing unpacked native Electron app');
const content=platform==='darwin'
  ?path.join(releaseRoot,folder,'Voxnelo.app','Contents')
  :path.join(releaseRoot,folder);
const resources=path.join(content,platform==='darwin'?'Resources':'resources');
const executable=platform==='win32'?path.join(content,'Voxnelo.exe'):
  platform==='darwin'?path.join(content,'MacOS','Voxnelo'):
  path.join(content,existsSync(path.join(content,'voxnelo'))?'voxnelo':'Voxnelo');
const asar=path.join(resources,'app.asar');
const bundledWorker=path.join(asar,'dist-electron','moonshineAsrWorker.cjs');
const bundledInstaller=path.join(asar,'dist-electron','moonshineInstaller.cjs');
assert.ok(existsSync(executable)&&existsSync(asar),
  'Missing native executable or ASAR bundle');
const personalData=platform==='win32'
  ?process.env.APPDATA??path.join(homedir(),'AppData','Roaming')
  :platform==='darwin'?path.join(homedir(),'Library','Application Support')
  :process.env.XDG_CONFIG_HOME??path.join(homedir(),'.config');
const paths=resolveMoonshinePaths({
  platform,arch:process.arch,systemRelease:osRelease(),
  isPackaged:true,resourcesPath:resources,bundleDir:content,
  personalDataDir:path.join(personalData,'voxnelo'),
});
assert.ok(paths,'Packaged Moonshine runtime cannot target this OS/CPU');
for(const filename of [paths.scriptPath,paths.validationScriptPath,paths.pythonPath])
  assert.ok(existsSync(filename),'Missing pinned packaged script or private interpreter');
assert.equal(await verifyPinnedMoonshineMediumModel(paths.modelDir),true,
  'Missing/corrupt private pinned Moonshine model');
assert.equal(await verifyMoonshinePythonRuntime(paths.pythonPath),true,
  'Missing/unverified private Moonshine SDK 0.0.65');
const env={...process.env,ELECTRON_RUN_AS_NODE:'1',NODE_OPTIONS:''};

// Use the same binary's *actual* embedded Node and virtual ASAR filesystem.
// A status/--help probe is read-only: it must not trigger model installation.
const help=spawnSync(executable,[bundledInstaller,'--help'],{
  env,encoding:'utf8',timeout:25000,maxBuffer:10000,shell:false,
});
assert.equal(help.status,0,'Packaged installer failed the opt-in help probe');
assert.match(help.stdout,/--accept-experimental-runtime/,
  'Packaged installation accidentally lost its explicit-consent guard');

// The transport uses only synthetic silent PCM, to prove the packaged
// worker actually reaches the SDK. Do not echo Python/private transcripts.
const script=`
const {Worker}=require('node:worker_threads');
const worker=new Worker(${JSON.stringify(bundledWorker)},{
  workerData:${JSON.stringify({
    pythonPath:paths.pythonPath,scriptPath:paths.scriptPath,modelDir:paths.modelDir,
  })},
});
const timeout=setTimeout(()=>finish(1),90000);
let sent=0,drained=0,ready=false,result=false,done=false,stopped=false;
function finish(code){
  if(stopped)return;
  stopped=true;
  clearTimeout(timeout);
  worker.terminate().finally(()=>process.exit(code));
}
worker.on('error',()=>finish(1));
worker.on('exit',()=>{if(!done)finish(1)});
worker.on('message',e=>{
  if(!e||typeof e!=='object')return finish(1);
  if(e.type==='failure')return finish(1);
  if(e.type==='ready'){
    if(ready)return finish(1);
    ready=true;sent++;
    worker.postMessage({type:'pcm',samples:new Float32Array(800)});
  }else if(e.type==='drained'){
    if(!ready||++drained>sent)return finish(1);
    if(sent<24){sent++;worker.postMessage({type:'pcm',samples:new Float32Array(800)})}
    else worker.postMessage({type:'finish'});
  }else if(e.type==='result'){
    if(typeof e.finalText!=='string'||typeof e.interimText!=='string')
      return finish(1);
    result=true;
  }else if(e.type==='finished'){
    if(!ready||!result||drained!==24)return finish(1);
    done=true;console.log('PACKAGED_MOONSHINE_NATIVE_OK');finish(0);
  }else finish(1);
});
`;
const test=spawnSync(executable,['-e',script],{
  env,encoding:'utf8',timeout:125000,maxBuffer:12000,shell:false,
});
assert.equal(test.status,0,
  'Packaged Moonshine worker could not complete native SDK inference (private traces omitted)');
assert.match(test.stdout,/PACKAGED_MOONSHINE_NATIVE_OK/,
  'Packaged worker did not publish the terminal proof marker');
console.log('Packaged Electron binary + ASAR Moonshine Worker native PCM protocol verified ('+
  platform+', synthetic silence).');
