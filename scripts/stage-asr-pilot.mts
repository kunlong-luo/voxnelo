#!/usr/bin/env node
/**
 * INTERNAL ONLY: assemble a real pinned model and the official platform npm
 * addon into the same resource layout Electron uses. No model/native resources
 * are committed or published. This is an engineering candidate pending
 * third-party licensing/distribution and physical device approval.
 *
 * The input npm prefix must have been installed in disposable CI space from
 * sherpa-onnx-node@1.13.8. The complete dependency tree is staged, because
 * Windows/macOS builds may load their own platform-specific sibling package.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGLISH_MODEL, ENGLISH_MODEL_FILES } from './prepare-asr-model.mts';

const MAX_FILES=300;
const MAX_BYTES=1024*1024*1024;
const SAFE=/^[a-zA-Z0-9_.@+/-]+$/;
const digest=async(filename:string):Promise<string>=>{
  const h=createHash('sha256');
  for await(const chunk of createReadStream(filename))h.update(chunk as Buffer);
  return h.digest('hex');
};
const isSafe=(relative:string)=>SAFE.test(relative)&&!relative.split('/').some(s=>s===''||s==='.'||s==='..');
const regular=async(filename:string)=>{
  const info=await lstat(filename);
  if(!info.isFile()||info.isSymbolicLink())throw Error('Not an ordinary ASR file: '+filename);
  return info;
};

/** Stage only from isolated CI-owned paths. No executable is downloaded here. */
export async function stageInternalAsrCandidate(modelDir:string,npmNodeModules:string,destination:string) {
  if(![modelDir,npmNodeModules,destination].every(path.isAbsolute))
    throw Error('All ASR staging paths must be absolute');
  const target=path.resolve(destination);
  const entries=await readdir(target).catch((e:NodeJS.ErrnoException)=>{
    if(e.code==='ENOENT')return [] as string[];
    throw e;
  });
  if(entries.some(name=>name!=='README.md'))
    throw Error('Refusing to overwrite an already staged ASR candidate');
  const packageFile=path.join(npmNodeModules,'sherpa-onnx-node','package.json');
  const npmPackage=JSON.parse(await readFile(packageFile,'utf8')) as {
    name?:string;version?:string;license?:string;
  };
  if(npmPackage.name!=='sherpa-onnx-node'||npmPackage.version!=='1.13.8')
    throw Error('Unexpected native ASR package name or version');
  if(!npmPackage.license || !/apache[ -]?2/i.test(npmPackage.license))
    throw Error('Native ASR package has no recognized upstream Apache 2.0 license claim');

  const modelFiles=new Map<string,string>();
  for(const file of ENGLISH_MODEL_FILES){
    const filename=path.join(modelDir,file.target);
    const info=await regular(filename);
    if(info.size<1||info.size>file.maxBytes||(file.exactBytes!==undefined&&file.exactBytes!==info.size))
      throw Error('Pinned model file size mismatch: '+file.target);
    const sha=await digest(filename);
    if(file.sha256&&file.sha256!==sha)throw Error('Pinned model SHA-256 mismatch: '+file.target);
    modelFiles.set('model/'+file.target,filename);
  }

  const nativeFiles=new Map<string,string>();
  let bytes=0;
  const walk=async(dir:string,prefix='')=>{
    for(const entry of await readdir(dir,{withFileTypes:true})){
      // npm-generated executable links and lock state are irrelevant to the
      // application runtime, and must not be embedded as dangling symlinks.
      if(!prefix&&(entry.name==='.bin'||entry.name==='.package-lock.json'))continue;
      const relative=prefix?prefix+'/'+entry.name:entry.name;
      if(!isSafe(relative))throw Error('Unsafe native npm path: '+relative);
      const source=path.join(dir,entry.name);
      if(entry.isSymbolicLink())throw Error('Unexpected symlink in native package: '+relative);
      if(entry.isDirectory()){await walk(source,relative);continue;}
      if(!entry.isFile())throw Error('Unexpected native package input: '+relative);
      const stat=await regular(source);
      bytes+=stat.size;
      if(!stat.size||bytes>MAX_BYTES)throw Error('Native package exceeds safe resource size');
      nativeFiles.set('native/node_modules/'+relative,source);
      if(nativeFiles.size>MAX_FILES)throw Error('Native npm package has too many files');
    }
  };
  await walk(npmNodeModules);
  if(![...nativeFiles.keys()].some(name=>name.endsWith('.node')))
    throw Error('No actual native ASR .node binary found in pinned npm package');
  const entry="module.exports = require('./node_modules/sherpa-onnx-node');\n";
  await mkdir(path.join(target,'native'),{recursive:true});
  await mkdir(path.join(target,'model'),{recursive:true});
  const files=new Map([...modelFiles,...nativeFiles]);
  const hashes:Record<string,string>={};
  for(const [relative,source] of files){
    const dest=path.join(target,...relative.split('/'));
    await mkdir(path.dirname(dest),{recursive:true});
    await copyFile(source,dest);
    hashes[relative]=await digest(dest);
    if(hashes[relative]!==await digest(source))
      throw Error('ASR file changed during staging: '+relative);
  }
  const entryPath=path.join(target,'native','index.cjs');
  await writeFile(entryPath,entry,{flag:'wx'});
  hashes['native/index.cjs']=createHash('sha256').update(entry).digest('hex');
  const manifest={
    modelId:ENGLISH_MODEL.id,modelSource:ENGLISH_MODEL.source,
    modelLicense:ENGLISH_MODEL.license,modelRevision:ENGLISH_MODEL.revision,
    nativePackage:'sherpa-onnx-node',nativeVersion:npmPackage.version,
    nativeLicense:npmPackage.license,
    nativeSource:'https://www.npmjs.com/package/sherpa-onnx-node',
    platform:process.platform,arch:process.arch,
    reviewState:'engineering-only; native redistribution and signing not approved',
    releaseReady:false,
    sha256:Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b))),
  };
  await writeFile(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  return {stagedFiles:Object.keys(hashes).length,bytes,modelId:manifest.modelId,releaseReady:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=process.env.RUNNER_TEMP;
  if(!root||!path.isAbsolute(root))throw Error('Only isolated RUNNER_TEMP CI paths are supported');
  const report=await stageInternalAsrCandidate(
    path.join(root,'voxnelo-english-model'),
    path.join(root,'voxnelo-native','node_modules'),
    path.resolve('build/offline-asr'),
  );
  console.log(JSON.stringify(report,null,2));
}
