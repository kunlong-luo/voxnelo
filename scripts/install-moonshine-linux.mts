#!/usr/bin/env node
/** Explicit, fail-closed desktop personal Moonshine provisioning.
 * Builds a complete verified runtime in a private staging directory.
 * --repair is permitted only after the user explicitly initiates setup;
 * existing unknown user files and symlinks are never deleted.
 */
import {spawnSync} from 'node:child_process';
import {mkdir,rm,cp,writeFile} from 'node:fs/promises';
import {writeSync} from 'node:fs';
import {homedir,release as osRelease} from 'node:os';
import path from 'node:path';
import {PINNED_MOONSHINE_MEDIUM_FILES,verifyPinnedMoonshineMediumModel}
  from '../apps/desktop/moonshineIntegrity.ts';
import {verifyMoonshinePythonRuntime} from '../apps/desktop/moonshinePaths.ts';
import {provisionMoonshineDirectory} from './moonshine-install-transaction.mts';
import {moonshineStageLine,type MoonshineInstallStage} from '../apps/desktop/moonshineInstallProgress.ts';
import {pinnedMoonshineWheel} from '../apps/desktop/moonshineWheelIntegrity.ts';
import {verifyMoonshineResolvedPackages}
  from '../apps/desktop/moonshinePythonDependencies.ts';
import {moonshineHashedRequirements,pinnedMoonshineWheelhouse,verifyPinnedMoonshineWheelhouse}
  from '../apps/desktop/moonshinePythonWheelLock.ts';

// A synchronous marker must leave the process before spawnSync blocks Node's event loop.
function report(stage:MoonshineInstallStage):void{writeSync(1,moonshineStageLine(stage));}
function run(executable:string,args:string[],env:NodeJS.ProcessEnv=process.env):void{
  const result=spawnSync(executable,args,{encoding:'utf8',stdio:'inherit',env,timeout:180000});
  if(result.status!==0||result.error)
    throw Error('Moonshine installation step failed; previous files were preserved');
}
/** No shell interpolation or renderer-supplied commands. All diagnostics are
 * generic so private interpreter paths cannot enter the app event stream. */
function pythonProbe(python:string,source:string):string|null{
  const r=spawnSync(python,['-I','-c',source],{
    encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:10000,
    maxBuffer:65536,env:{PATH:process.env.PATH??'',PYTHONNOUSERSITE:'1'},
  });
  return r.status===0&&!r.error?r.stdout.trim():null;
}
function verifyInstalledDependencies(python:string):void{
  const code='import importlib.metadata,json;print(json.dumps(sorted((d.metadata.get("Name", ""),d.version) for d in importlib.metadata.distributions())))';
  const stdout=pythonProbe(python,code);
  if(stdout===null)throw Error('Moonshine Python dependency inventory unavailable');
  let installed:unknown;
  try{installed=JSON.parse(stdout);}catch{
    throw Error('Moonshine Python dependency inventory invalid');
  }
  if(!verifyMoonshineResolvedPackages(installed,process.platform))
    throw Error('Moonshine pinned dependency versions differ; installation aborted');
}
/** The hash catalog is tested only for 64-bit CPython 3.12. A user with another
 * Python minor version must not silently receive unverified native wheels.
 */
function verifiedPython312Version(python:string):string|null{
  const code='import sys,struct;print(".".join(map(str,sys.version_info[:3])) if sys.version_info[:2]==(3,12) and struct.calcsize("P")==8 else "unsupported")';
  const version=pythonProbe(python,code);
  return version&&/^3\.12\.\d+$/.test(version)?version:null;
}
async function main():Promise<void>{
  if(process.argv.includes('--help')||process.argv.includes('-h')){
    console.log('Usage: pnpm asr:moonshine:install --accept-experimental-runtime [--repair]');
    console.log('Installs/repairs verified Moonshine Voice 0.0.65 English Medium Streaming.');
    return;
  }
  const flags=process.argv.slice(2);
  if(flags.length<1||flags.length>2||flags[0]!=='--accept-experimental-runtime'||
    (flags.length===2&&flags[1]!=='--repair'))
    throw Error('Explicit consent required; use --accept-experimental-runtime [--repair]');
  const sdkWheel=pinnedMoonshineWheel(process.platform,process.arch,osRelease());
  if(!sdkWheel)
    throw Error('Moonshine requires Linux x64, Windows x64 or macOS 15+ ARM64');
  const repair=flags.includes('--repair');
  const personalData=process.platform==='win32'
    ?process.env.APPDATA??path.join(homedir(),'AppData','Roaming')
    :process.platform==='darwin'
      ?path.join(homedir(),'Library','Application Support')
      :process.env.XDG_CONFIG_HOME??path.join(homedir(),'.config');
  const root=path.join(personalData,'voxnelo','moonshine');
  const interpreter=(venv:string)=>process.platform==='win32'
    ?path.join(venv,'Scripts','python.exe'):path.join(venv,'bin','python');
  const verify=async(dir:string)=>
    (await verifyPinnedMoonshineMediumModel(path.join(dir,'model')))&&
    (await verifyMoonshinePythonRuntime(interpreter(path.join(dir,'venv'))));

  await provisionMoonshineDirectory(root,repair?'repair':'install',async(stage)=>{
    const venv=path.join(stage,'venv');
    const python=interpreter(venv);
    report('environment');
    if(process.platform==='win32'){
      // The py -3 launcher drifted to Python 3.15 in CI. Require x64 3.12.
      const launcher=spawnSync('py',['-3.12','-m','venv',venv],{
        encoding:'utf8',stdio:'ignore',timeout:180000,
      });
      if(launcher.status!==0||launcher.error){
        if(!verifiedPython312Version('python'))
          throw Error('Moonshine setup requires 64-bit Python 3.12');
        run('python',['-m','venv',venv]);
      }
    }else{
      // Do not silently use system Python 3.11/3.13 with CPython 3.12 hashes.
      // Previous already-installed verified user models are left untouched.
      const executable=verifiedPython312Version('python3.12')?'python3.12':
        verifiedPython312Version('python3')?'python3':null;
      if(!executable)throw Error('Moonshine setup requires 64-bit Python 3.12');
      run(executable,['-m','venv',venv]);
    }
    const pythonVersion=verifiedPython312Version(python);
    if(!pythonVersion)throw Error('Moonshine private runtime requires 64-bit Python 3.12');
    const wheels=pinnedMoonshineWheelhouse(process.platform,process.arch,osRelease(),pythonVersion);
    if(!wheels||!wheels.some(item=>item.filename===sdkWheel.filename&&
      item.sha256===sdkWheel.sha256))
      throw Error('Moonshine Python wheel lock does not match this host or SDK');
    report('dependencies');
    // Download the *entire* exact platform Wheel set. Pip enforces the hashes
    // before we independently rehash the directory and permit ANY installation.
    const wheelhouse=path.join(stage,'sdk-wheelhouse');
    const requirements=path.join(stage,'wheel-requirements.txt');
    await mkdir(wheelhouse,{mode:0o700});
    await writeFile(requirements,moonshineHashedRequirements(wheels),
      {mode:0o600,flag:'wx'});
    run(python,['-m','pip','download','--isolated','--disable-pip-version-check',
      '--no-input','--no-cache-dir','--only-binary=:all:','--require-hashes',
      '--index-url','https://pypi.org/simple','--dest',wheelhouse,'-r',requirements]);
    if(!await verifyPinnedMoonshineWheelhouse(wheelhouse,wheels))
      throw Error('Moonshine SDK/dependency Wheel integrity check failed');
    // Fully offline, no dependency resolver network and no source archives.
    run(python,['-m','pip','install','--isolated','--disable-pip-version-check',
      '--no-input','--no-cache-dir','--no-index','--find-links',wheelhouse,
      '--only-binary=:all:','--require-hashes','--no-deps','-r',requirements]);
    verifyInstalledDependencies(python);
    run(python,['-m','pip','check','--isolated','--disable-pip-version-check']);
    await rm(requirements);
    await rm(wheelhouse,{recursive:true,force:true});
    const cache=path.join(stage,'download-cache');
    await mkdir(cache,{mode:0o700});
    report('model-download');
    run(python,['-m','moonshine_voice.download','--stt','--language','en'],
      {...process.env,MOONSHINE_VOICE_CACHE:cache,PYTHONNOUSERSITE:'1'});
    report('model-verification');
    const candidate=path.join(cache,'download.moonshine.ai','model',
      'medium-streaming-en','quantized');
    const model=path.join(stage,'model');
    await mkdir(model,{mode:0o700});
    for(const filename of Object.keys(PINNED_MOONSHINE_MEDIUM_FILES))
      await cp(path.join(candidate,filename),path.join(model,filename),
        {dereference:false,errorOnExist:true,force:false});
    if(!await verifyPinnedMoonshineMediumModel(model))
      throw Error('Moonshine downloaded model hashes did not match pinned CI evidence');
    await rm(cache,{recursive:true,force:true});
    report('activation');
  },verify);
  report('complete');
  console.log('Moonshine personal runtime and model verified. Restart Voxnelo if needed.');
}
void main().catch(()=>{
  console.error('Moonshine installation/repair failed; existing files were preserved.');
  process.exitCode=1;
});
