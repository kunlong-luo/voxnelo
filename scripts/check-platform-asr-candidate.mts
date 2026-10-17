#!/usr/bin/env node
/**
 * Genuine (not mocked) platform-native streaming ASR inference check.
 * Run after installing sherpa-onnx-node@1.13.8 under RUNNER_TEMP/voxnelo-native
 * and downloading the SHA-256-pinned model to RUNNER_TEMP/voxnelo-english-model.
 * A generated non-user reference WAV is copied from the Linux pilot job.
 *
 * This QA proof is not a product package or microphone test. Never silently
 * mark human licensing, ABI and installed-app release gates as passed.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const temp=process.env.RUNNER_TEMP;
if(!temp||!path.isAbsolute(temp))throw Error('RUNNER_TEMP must be an absolute CI working directory');
const staged=process.argv.includes('--staged');
const model=staged?path.resolve('build/offline-asr/model'):path.join(temp,'voxnelo-english-model');
const native=path.join(temp,'voxnelo-native','node_modules','sherpa-onnx-node');
const wav=path.join(temp,'voxnelo-asr-reference.wav');
const requireFromRepo=createRequire(path.join(process.cwd(),'package.json'));
const addon=staged?path.resolve('build/offline-asr/native/index.cjs'):requireFromRepo.resolve('sherpa-onnx-node',{
  paths:[path.join(temp,'voxnelo-native','node_modules')],
});
const libraries=path.join(staged?path.resolve('build/offline-asr/native/node_modules/sherpa-onnx-node'):native,'lib');
if(!existsSync(model)||!existsSync(addon)||!existsSync(wav))
  throw Error('Missing pinned model, native Node adapter or non-user reference WAV');

const env:NodeJS.ProcessEnv={...process.env,
  VOXNELO_ASR_MODEL_DIR:model,
  VOXNELO_ASR_ADDON_PATH:addon,
};
// Some published Windows/macOS variants ship shared libraries beside the
// addon instead of a separate lib directory; let the actual loader decide.
if(existsSync(libraries)){
  env.LD_LIBRARY_PATH=libraries+':'+(env.LD_LIBRARY_PATH??'');
  env.DYLD_LIBRARY_PATH=libraries+':'+(env.DYLD_LIBRARY_PATH??'');
}
const systemPath=env.PATH??env.Path??'';
for(const key of Object.keys(env)){
  if(key.toLowerCase()==='path')delete env[key];
}
env.Path=(existsSync(libraries)?libraries+path.delimiter:'')+systemPath;
console.log('Native candidate:',JSON.stringify({
  platform:process.platform,arch:process.arch,modelPinned:true,staged,
  addon:staged?'offline-asr/native/index.cjs':path.relative(temp,addon),libs:staged?'bundled native libraries':path.relative(temp,libraries),
}));
// The first packaged/relocated run has cold model weights and can be slowed
// by shared hosted-runner I/O. Permit exactly one clearly logged retry, never
// a lower quality or latency threshold. Both results remain in CI logs.
type QA={realModel?:boolean;transcript?:string;realTimeFactor?:number;wordErrorRate?:number};
let qa:QA|null=null;
let measuredAttempts=0;
for(let attempt=1;attempt<=(staged?2:1);attempt++){
  measuredAttempts=attempt;
  const result=spawnSync(process.execPath,[
    '--experimental-strip-types',path.resolve('scripts/benchmark-offline-asr.mts'),
    '--wav',wav,'--expect','please speak English slowly',
  ],{
    cwd:process.cwd(),env,encoding:'utf8',timeout:120000,maxBuffer:1024*1024*3,
  });
  console.log('Native inference attempt',attempt,'exit:',result.status);
  if(result.stdout)process.stdout.write(result.stdout);
  if(result.stderr)process.stderr.write(result.stderr);
  if(result.error)throw result.error;
  if(result.status===0){
    qa=JSON.parse(result.stdout) as QA;
    break;
  }
  if(!staged||attempt===2)
    throw Error('REAL '+process.platform+' ASR inference failed even after cold-start retry (exit '+result.status+')');
  console.warn('Cold-start ASR quality gate failed. Retesting once with warm filesystem cache; criteria unchanged.');
}
if(!qa)throw Error('No passing native inference result');
if(qa.realModel!==true||!qa.transcript||typeof qa.wordErrorRate!=='number')throw Error('Missing genuine model quality evidence');
const output=path.join(temp,'voxnelo-asr-'+process.platform+(staged?'-staged':'')+'-evidence.json');
writeFileSync(output,JSON.stringify({platform:process.platform,arch:process.arch,staged,nativeVersion:'1.13.8',modelRevision:'bfbb11950302dad9955f8ede01f0e768595e4fba',measuredAttempts,...qa},null,2)+'\n');
console.log('Genuine offline inference passed:',output);
