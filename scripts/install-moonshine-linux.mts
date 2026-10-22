#!/usr/bin/env node
/** Explicit, fail-closed Linux personal Moonshine provisioning.
 * Builds a complete verified runtime in a private staging directory.
 * --repair is permitted only after the user explicitly initiates setup;
 * existing unknown user files and symlinks are never deleted.
 */
import {spawnSync} from 'node:child_process';
import {mkdir,rm,cp} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {PINNED_MOONSHINE_MEDIUM_FILES,verifyPinnedMoonshineMediumModel}
  from '../apps/desktop/moonshineIntegrity.ts';
import {verifyMoonshinePythonRuntime} from '../apps/desktop/moonshinePaths.ts';
import {provisionMoonshineDirectory} from './moonshine-install-transaction.mts';
import {moonshineStageLine,type MoonshineInstallStage} from '../apps/desktop/moonshineInstallProgress.ts';

function report(stage:MoonshineInstallStage):void{process.stdout.write(moonshineStageLine(stage));}
function run(executable:string,args:string[],env:NodeJS.ProcessEnv=process.env):void{
  const result=spawnSync(executable,args,{encoding:'utf8',stdio:'inherit',env,timeout:180000});
  if(result.status!==0||result.error)
    throw Error('Moonshine installation step failed; previous files were preserved');
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
  if(process.platform!=='linux'||process.arch!=='x64')
    throw Error('Personal Moonshine runtime currently supports Linux x64 only');
  const repair=flags.includes('--repair');
  const root=path.join(process.env.XDG_CONFIG_HOME??path.join(homedir(),'.config'),
    'voxnelo','moonshine');
  const verify=async(dir:string)=>
    (await verifyPinnedMoonshineMediumModel(path.join(dir,'model')))&&
    (await verifyMoonshinePythonRuntime(path.join(dir,'venv','bin','python')));

  await provisionMoonshineDirectory(root,repair?'repair':'install',async(stage)=>{
    const venv=path.join(stage,'venv');
    const python=path.join(venv,'bin','python');
    report('environment');
    run('python3',['-m','venv',venv]);
    report('dependencies');
    run(python,['-m','pip','install','--isolated','--disable-pip-version-check',
      '--no-input','--only-binary=:all:','--index-url','https://pypi.org/simple',
      'moonshine-voice==0.0.65']);
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
