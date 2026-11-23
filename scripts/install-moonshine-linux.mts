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
import {pinnedMoonshineWheel,verifyPinnedMoonshineWheel}
  from '../apps/desktop/moonshineWheelIntegrity.ts';
import {moonshinePythonConstraints,verifyMoonshineResolvedPackages}
  from '../apps/desktop/moonshinePythonDependencies.ts';

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
function verifyWindowsPython312(python:string):boolean{
  const code='import sys,struct;print("ok" if sys.version_info[:2]==(3,12) and struct.calcsize("P")==8 else "unsupported")';
  return pythonProbe(python,code)==='ok';
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
      // Prefer exactly the native-CI-tested 64-bit Python 3.12, never 'py -3'
      // (which selected 3.15 in a Windows runner despite setup-python 3.12).
      // A PATH-based 3.12 remains supported where the py launcher is absent.
      const launcher=spawnSync('py',['-3.12','-m','venv',venv],{
        encoding:'utf8',stdio:'ignore',timeout:180000,
      });
      if(launcher.status!==0||launcher.error){
        if(!verifyWindowsPython312('python'))
          throw Error('Windows Moonshine setup requires 64-bit Python 3.12');
        run('python',['-m','venv',venv]);
      }
      if(!verifyWindowsPython312(python))
        throw Error('Windows Moonshine runtime must use 64-bit Python 3.12');
    }else run('python3',['-m','venv',venv]);
    report('dependencies');
    // Download exactly one SDK wheel without dependencies and compare it to the
    // pinned platform-specific PyPI checksum *before* pip can install native code.
    // Dependent packages remain a separate license / lockfile review gate.
    const sdkDownload=path.join(stage,'sdk-wheel');
    await mkdir(sdkDownload,{mode:0o700});
    run(python,['-m','pip','download','--isolated','--disable-pip-version-check',
      '--no-input','--only-binary=:all:','--no-deps',
      '--index-url','https://pypi.org/simple','--dest',sdkDownload,
      'moonshine-voice==0.0.65']);
    if(!await verifyPinnedMoonshineWheel(sdkDownload,sdkWheel))
      throw Error('Moonshine SDK wheel integrity check failed; installation aborted');
    const constraints=path.join(stage,'dependency-constraints.txt');
    await writeFile(constraints,moonshinePythonConstraints(),{mode:0o600,flag:'wx'});
    run(python,['-m','pip','install','--isolated','--disable-pip-version-check',
      '--no-input','--only-binary=:all:','--index-url','https://pypi.org/simple',
      '--constraint',constraints,path.join(sdkDownload,sdkWheel.filename)]);
    verifyInstalledDependencies(python);
    run(python,['-m','pip','check','--isolated','--disable-pip-version-check']);
    await rm(constraints);
    await rm(sdkDownload,{recursive:true,force:true});
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
