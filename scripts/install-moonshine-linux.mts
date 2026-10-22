#!/usr/bin/env node
/** Linux-only explicit personal Moonshine provisioning.
 * This is a developer opt-in path, NOT an audited public app-store downloader.
 * No model/native code is downloaded or executed without an explicit flag.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,rm,cp} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {PINNED_MOONSHINE_MEDIUM_FILES,verifyPinnedMoonshineMediumModel}
  from '../apps/desktop/moonshineIntegrity.ts';

function run(executable:string,args:string[],env:NodeJS.ProcessEnv=process.env):void{
  const result=spawnSync(executable,args,{encoding:'utf8',stdio:'inherit',env,timeout:180000});
  if(result.status!==0||result.error)throw Error('Moonshine installation step failed; do not use partial files');
}
const help=process.argv.includes('--help')||process.argv.includes('-h');
if(help){
  console.log('Usage: pnpm asr:moonshine:install --accept-experimental-runtime');
  console.log('Installs personally opted-in Linux SDK v0.0.65 and pinned Medium Streaming model.');
  process.exit(0);
}
if(process.argv.length!==3||process.argv[2]!=='--accept-experimental-runtime')
  throw Error('Explicit --accept-experimental-runtime required; no automatic installation');
if(process.platform!=='linux'||process.arch!=='x64')
  throw Error('Personal Moonshine runtime currently supports Linux x64 only');
const root=path.join(process.env.XDG_CONFIG_HOME??path.join(homedir(),'.config'),
  'voxnelo','moonshine');
const config=path.dirname(root);
await mkdir(config,{recursive:true});
if(existsSync(root))
  throw Error('Existing Moonshine installation found; refusing overwrite. Inspect it before retrying.');
await mkdir(root,{recursive:false,mode:0o700});
let installed=false;
try{
  const venv=path.join(root,'venv');
  const python=path.join(venv,'bin','python');
  run('python3',['-m','venv',venv]);
  run(python,['-m','pip','install','--disable-pip-version-check','--no-input',
    'moonshine-voice==0.0.65']);
  const cache=path.join(root,'download-cache');
  await mkdir(cache,{recursive:true,mode:0o700});
  // The official SDK downloads from its own documented Moonshine model URL.
  // Nothing is fetched until the user runs this command with the opt-in flag.
  run(python,['-m','moonshine_voice.download','--stt','--language','en'],
    {...process.env,MOONSHINE_VOICE_CACHE:cache,PYTHONNOUSERSITE:'1'});
  const candidate=path.join(cache,'download.moonshine.ai','model',
    'medium-streaming-en','quantized');
  // Copy a precise allowlist; never trust a downloaded manifest or extra files.
  const model=path.join(root,'model');
  await mkdir(model,{recursive:false,mode:0o700});
  for(const filename of Object.keys(PINNED_MOONSHINE_MEDIUM_FILES))
    await cp(path.join(candidate,filename),path.join(model,filename),{dereference:false,errorOnExist:true,force:false});
  if(!await verifyPinnedMoonshineMediumModel(model))
    throw Error('Moonshine file hashes did not match pinned official CI evidence');
  await rm(cache,{recursive:true,force:true});
  installed=true;
  console.log('Moonshine personal runtime and model verified. Restart Voxnelo.');
}finally{
  if(!installed)await rm(root,{recursive:true,force:true});
}
