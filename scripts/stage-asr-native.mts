#!/usr/bin/env node
/**
 * Human-reviewed, offline-only native ASR staging for one target platform.
 * Takes EXISTING model/native inputs; never downloads or executes a vendor file.
 * This prepares assets, NOT proof that the native module can be loaded.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGLISH_MODEL, ENGLISH_MODEL_FILES, type ModelFile } from './prepare-asr-model.mts';

const WRAPPERS=['streaming-asr.js','addon.js','addon-static-import.js'] as const;
const TARGET_MODEL=['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'] as const;
const MAX_NATIVE_BYTES=1024*1024*1024;
const HEX=/^[a-f0-9]{64}$/i;

export interface NativeReview {
  platform:string;
  arch:string;
  modelRevision:string;
  modelTokensSha256:string;
  nativePackage:string;
  nativeVersion:string;
  nativeLicense:string;
  nativeSource:string;
  nativeFilesSha256:Record<string,string>;
}
export interface NativeStagingOptions {
  modelDir:string;
  wrapperDir:string;
  nativeBinary:string;
  libraryDir:string;
  reviewPath:string;
  outputDir:string;
  /** Only injectable for testing the packaging algorithm, not for release CLI. */
  modelFiles?:readonly ModelFile[];
}
function requireAbsolute(value:string,label:string):string {
  if(!path.isAbsolute(value))throw Error(label+' requires an absolute path');
  return path.resolve(value);
}
async function regular(filename:string):Promise<void> {
  const entry=await lstat(filename);
  if(!entry.isFile() || entry.isSymbolicLink())throw Error('ASR input must be a regular non-symlink file: '+filename);
}
async function sha256(filename:string):Promise<string> {
  const hash=createHash('sha256');
  for await(const part of createReadStream(filename))hash.update(part as Buffer);
  return hash.digest('hex');
}
function reviewed(value:unknown):NativeReview {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid native review JSON');
  const v=value as Record<string,unknown>;
  for(const key of ['platform','arch','modelRevision','modelTokensSha256','nativePackage','nativeVersion','nativeLicense','nativeSource']){
    if(typeof v[key]!=='string'||!(v[key] as string).trim())throw Error('Review is missing '+key);
  }
  if(!v.nativeFilesSha256||typeof v.nativeFilesSha256!=='object'||Array.isArray(v.nativeFilesSha256))
    throw Error('Missing nativeFilesSha256 review inventory');
  return v as unknown as NativeReview;
}
function safeFilename(name:string):boolean {
  return /^[a-z0-9][a-z0-9._-]*$/i.test(name)&&name!=='.'&&name!=='..';
}
async function listedLibraries(dir:string):Promise<string[]> {
  const entries=await readdir(dir,{withFileTypes:true});
  const files:string[]=[];
  for(const entry of entries){
    if(!entry.isFile()||entry.isSymbolicLink()||!safeFilename(entry.name))
      throw Error('Native library folder must contain only flat regular files: '+entry.name);
    if(!/\.(?:dll|dylib|so(?:\.\d+)*)$/i.test(entry.name))
      throw Error('Unexpected native library file: '+entry.name);
    files.push(entry.name);
  }
  if(!files.length)throw Error('Missing packaged platform shared libraries');
  return files.sort();
}
function checkReviewedHash(filename:string,hash:string):void {
  if(!HEX.test(hash))throw Error('Review requires SHA-256 for '+filename);
}
async function readReview(filename:string):Promise<NativeReview> {
  await regular(filename);
  return reviewed(JSON.parse(await readFile(filename,'utf8')) as unknown);
}

/**
 * Creates the complete staging manifest LAST. The destination must have
 * nothing except README.md so a failed attempt can be safely rolled back.
 * A real release must separately test ABI, licensing and microphone inference.
 */
export async function stageNativeAsr(options:NativeStagingOptions):Promise<Record<string,string>> {
  const modelDir=requireAbsolute(options.modelDir,'modelDir');
  const wrapperDir=requireAbsolute(options.wrapperDir,'wrapperDir');
  const nativeBinary=requireAbsolute(options.nativeBinary,'nativeBinary');
  const libraryDir=requireAbsolute(options.libraryDir,'libraryDir');
  const outputDir=requireAbsolute(options.outputDir,'outputDir');
  const review=await readReview(requireAbsolute(options.reviewPath,'reviewPath'));
  if(review.platform!==process.platform||review.arch!==process.arch)
    throw Error('Review platform/architecture mismatch: '+review.platform+'/'+review.arch);
  if(review.modelRevision!==ENGLISH_MODEL.revision)
    throw Error('Native release must use the approved pinned model revision');
  if(!HEX.test(review.modelTokensSha256))
    throw Error('Review is missing the tokens.txt SHA-256');

  const files=options.modelFiles??ENGLISH_MODEL_FILES;
  if(files.length!==TARGET_MODEL.length||files.some((file,index)=>file.target!==TARGET_MODEL[index]))
    throw Error('Model manifest layout is not a streaming transducer');
  for(const file of files){
    if(!safeFilename(file.target))throw Error('Unsafe model filename');
    await regular(path.join(modelDir,file.target));
  }
  await regular(nativeBinary);
  for(const wrapper of WRAPPERS)await regular(path.join(wrapperDir,wrapper));
  const libs=await listedLibraries(libraryDir);
  const suppliedNative=['streaming-asr.js','addon.js','addon-static-import.js','sherpa-onnx.node',...libs].sort();
  const auditedNames=Object.keys(review.nativeFilesSha256).sort();
  if(suppliedNative.length!==auditedNames.length||suppliedNative.some((n,i)=>n!==auditedNames[i]))
    throw Error('Review must cover exactly all native wrapper, addon and library inputs');
  for(const name of auditedNames)checkReviewedHash(name,review.nativeFilesSha256[name]??'');

  // Do NOT replace existing staged binaries or touch a nonempty staging tree.
  await mkdir(outputDir,{recursive:true});
  const previous=await readdir(outputDir);
  if(previous.some(name=>name!=='README.md'))
    throw Error('ASR destination already has staged assets; remove them manually after review');
  if(previous.includes('README.md'))await regular(path.join(outputDir,'README.md'));

  // Verify ALL source bytes before touching staging.
  const inputs=new Map<string,string>();
  for(const file of files){
    const source=path.join(modelDir,file.target);
    const size=(await lstat(source)).size;
    if(!size||size>file.maxBytes||(file.exactBytes!==undefined&&size!==file.exactBytes))
      throw Error('Model size verification failed: '+file.target);
    const hash=await sha256(source);
    if(file.sha256 && hash!==file.sha256)throw Error('Pinned model checksum mismatch: '+file.target);
    if(file.target==='tokens.txt'&&hash!==review.modelTokensSha256)
      throw Error('Reviewed tokens.txt checksum mismatch');
    inputs.set('model/'+file.target,source);
  }
  for(const name of suppliedNative){
    const source=name==='sherpa-onnx.node'?nativeBinary:
      (WRAPPERS as readonly string[]).includes(name)?path.join(wrapperDir,name):path.join(libraryDir,name);
    if(!(await lstat(source)).size || (await lstat(source)).size>MAX_NATIVE_BYTES)
      throw Error('Native asset size is empty/excessive: '+name);
    const hash=await sha256(source);
    if(hash!==review.nativeFilesSha256[name])throw Error('Native review checksum mismatch: '+name);
    inputs.set('native/'+name,source);
  }

  // The upstream streaming-asr.js requires local ./addon.js. Placing a native
  // .node beside it allows the upstream loader to find its relative fallback.
  const entry="module.exports = require('./streaming-asr.js');\n";
  const packageJson='{"private":true,"type":"commonjs"}\n';
  const hashes:Record<string,string>={};
  const added=['model','native','manifest.json'];
  try{
    await mkdir(path.join(outputDir,'model'));
    await mkdir(path.join(outputDir,'native'));
    for(const [relative,source] of inputs){
      const dest=path.join(outputDir,relative);
      await copyFile(source,dest);
      const hash=await sha256(dest);
      if(hash!==await sha256(source))throw Error('Asset changed while copying: '+relative);
      hashes[relative]=hash;
    }
    await writeFile(path.join(outputDir,'native','index.cjs'),entry,{flag:'wx'});
    await writeFile(path.join(outputDir,'native','package.json'),packageJson,{flag:'wx'});
    hashes['native/index.cjs']=createHash('sha256').update(entry).digest('hex');
    hashes['native/package.json']=createHash('sha256').update(packageJson).digest('hex');
    const manifest={
      modelId:ENGLISH_MODEL.id,
      modelSource:ENGLISH_MODEL.source,
      modelLicense:ENGLISH_MODEL.license,
      modelRevision:ENGLISH_MODEL.revision,
      nativePackage:review.nativePackage,
      nativeVersion:review.nativeVersion,
      nativeLicense:review.nativeLicense,
      nativeSource:review.nativeSource,
      platform:review.platform,arch:review.arch,
      sha256:Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b))),
    };
    await writeFile(path.join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
    return hashes;
  }catch(error){
    for(const name of added)await rm(path.join(outputDir,name),{recursive:true,force:true});
    throw error;
  }
}

const invoked=process.argv[1]!==undefined&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const args=process.argv.slice(2);
  const allowed=['--model','--wrapper','--binary','--libs','--review','--out'];
  if(args.length!==12||args.some((value,i)=>i%2===0&&!allowed.includes(value)))
    throw Error('Usage: pnpm asr:native:stage --model /absolute/model --wrapper /absolute/node-package/lib --binary /absolute/sherpa-onnx.node --libs /absolute/native-libs --review /absolute/review.json --out /absolute/build/offline-asr');
  const get=(flag:string):string=>{
    const i=args.indexOf(flag);
    if(i<0||!args[i+1])throw Error('Missing '+flag);
    return args[i+1]!;
  };
  const hashes=await stageNativeAsr({
    modelDir:get('--model'),wrapperDir:get('--wrapper'),nativeBinary:get('--binary'),
    libraryDir:get('--libs'),reviewPath:get('--review'),outputDir:get('--out'),
  });
  console.log('Staged',Object.keys(hashes).length,'reviewed asset files. Run pnpm asr:check-staging, then REAL microphone/WAV QA before shipping.');
}
