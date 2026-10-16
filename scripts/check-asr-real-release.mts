#!/usr/bin/env node
/**
 * A packaged native ASR build is only a release candidate after genuine
 * reference WAV inference succeeds. Never accept mock IPC as release evidence.
 * Default README-only desktop builds have NO engine and skip this gate.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface RealReleasePlan {
  kind:'skip'|'run';
  description:string;
  args?:string[];
  env?:NodeJS.ProcessEnv;
}
export function planRealAsrRelease(
  staging:string,
  env:NodeJS.ProcessEnv=process.env,
  workingDir:string=process.cwd(),
):RealReleasePlan {
  const manifest=path.join(staging,'manifest.json');
  if(!existsSync(manifest)){
    return {kind:'skip',description:'No native ASR model shipped; real-model release check not applicable'};
  }
  const wav=env.VOXNELO_ASR_QA_WAV;
  const expected=env.VOXNELO_ASR_QA_EXPECT;
  if(!wav||!path.isAbsolute(wav)||!existsSync(wav)||!statSync(wav).isFile()){
    throw Error('A staged ASR engine requires VOXNELO_ASR_QA_WAV: an absolute existing 16 kHz mono reference WAV');
  }
  if(!expected||expected.trim().split(/\s+/).length<2){
    throw Error('A staged ASR engine requires VOXNELO_ASR_QA_EXPECT: the known spoken English reference transcript');
  }
  const modelDir=path.join(staging,'model');
  const addonPath=path.join(staging,'native','index.cjs');
  if(!existsSync(modelDir)||!existsSync(addonPath))
    throw Error('Incomplete ASR staging: model and official Node adapter are required');
  const worker=path.join(workingDir,'dist-electron','offlineAsrWorker.cjs');
  if(!existsSync(worker))throw Error('Build Electron worker before real offline ASR release check');
  return {
    kind:'run',
    description:'Require real, nonempty and accurate English transcript from bundled native engine',
    args:[
      '--experimental-strip-types',
      path.join(workingDir,'scripts','benchmark-offline-asr.mts'),
      '--wav',wav,'--expect',expected,
    ],
    env:{
      ...env,
      VOXNELO_ASR_MODEL_DIR:path.resolve(modelDir),
      VOXNELO_ASR_ADDON_PATH:path.resolve(addonPath),
    },
  };
}

const invoked=process.argv[1]!==undefined&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const plan=planRealAsrRelease(path.resolve('build/offline-asr'));
  if(plan.kind==='skip')console.log('ASR release gate:',plan.description);
  else{
    const result=spawnSync(process.execPath,plan.args!,{
      cwd:process.cwd(),env:plan.env,encoding:'utf8',timeout:120000,
    });
    if(result.stdout)process.stdout.write(result.stdout);
    if(result.stderr)process.stderr.write(result.stderr);
    if(result.error)throw result.error;
    if(result.status!==0)
      throw Error('Native ASR real-WAV acceptance FAILED; refusing to package candidate (code '+result.status+')');
    console.log('Native ASR real-WAV acceptance passed; physical microphone and signed installer testing still required.');
  }
}
