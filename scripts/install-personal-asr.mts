#!/usr/bin/env node
/**
 * Linux user-initiated offline ASR PILOT provisioning, NOT a public installer.
 * Downloads a pinned, checksummed model and official sherpa-onnx-node package
 * into the user's own app-data directory. Never stages build/offline-asr,
 * changes a public release, uploads data, or starts microphone capture.
 *
 * Run only after reviewing the upstream model/native license and accepting
 * that this is an engineering-quality model, not pronunciation assessment.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { ENGLISH_MODEL, prepareEnglishModel } from './prepare-asr-model.mts';
import { stageInternalAsrCandidate } from './stage-asr-pilot.mts';

function personalRoot(env:NodeJS.ProcessEnv):string{
  if(process.platform!=='linux')throw Error('Personal ASR pilot installer is currently Linux only');
  const root=env.XDG_CONFIG_HOME&&path.isAbsolute(env.XDG_CONFIG_HOME)
    ?env.XDG_CONFIG_HOME:path.join(homedir(),'.config');
  return path.join(root,'voxnelo');
}

export function personalAsrDir(env:NodeJS.ProcessEnv=process.env):string{
  return path.join(personalRoot(env),'offline-asr');
}

export async function installPersonalAsr(
  options:{appDataDir?:string;runtime?:string}={},
):Promise<string>{
  if(process.platform!=='linux')throw Error('Linux only for this user-installed ASR pilot');
  const base=options.appDataDir??personalRoot(process.env);
  if(!path.isAbsolute(base))throw Error('App-data directory must be absolute');
  const destination=path.join(base,'offline-asr');
  if(existsSync(destination))throw Error('Existing local ASR data found; refusing to overwrite: '+destination);
  await mkdir(base,{recursive:true});
  const temporary=path.join(tmpdir(),'voxnelo-personal-asr-'+randomUUID());
  const staged=path.join(base,'.offline-asr-incomplete-'+randomUUID());
  await mkdir(temporary,{recursive:true,mode:0o700});
  try{
    const model=path.join(temporary,'english-model');
    const npmRoot=path.join(temporary,'official-native');
    console.log('Downloading pinned English model with SHA-256 verification...');
    await prepareEnglishModel(model);
    console.log('Installing pinned official native recognizer; this is not a Voxnelo release binary...');
    const npm=spawnSync(options.runtime??'npm',[
      'install','--no-save','--no-audit','--no-fund','--prefix',npmRoot,
      'sherpa-onnx-node@1.13.8',
    ],{stdio:'inherit',timeout:600000,env:process.env});
    if(npm.error)throw npm.error;
    if(npm.status!==0)throw Error('Native npm installation failed with code '+String(npm.status));
    const result=await stageInternalAsrCandidate(model,path.join(npmRoot,'node_modules'),staged);
    await writeFile(path.join(staged,'personal-install.json'),JSON.stringify({
      optIn:true,platform:process.platform,arch:process.arch,
      modelRevision:ENGLISH_MODEL.revision,nativeVersion:'1.13.8',
      notice:'Personal, experimental ASR pilot; NOT authorized for public redistribution',
    },null,2)+'\n',{flag:'wx',mode:0o600});
    await rename(staged,destination);
    console.log(JSON.stringify({
      installed:true,localPath:destination,modelId:result.modelId,
      files:result.stagedFiles,releaseReady:false,
      instructions:'Fully quit and reopen installed Voxnelo. The real local dictation button will be enabled if the native model loads.',
      warning:'Engineering candidate only: real-speaker recognition accuracy/noise performance are not production-approved.',
    },null,2));
    return destination;
  }finally{
    await rm(temporary,{recursive:true,force:true});
    await rm(staged,{recursive:true,force:true});
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){
  if(process.argv.length!==2)throw Error('Usage: pnpm asr:personal:install (Linux only)');
  await installPersonalAsr();
}
