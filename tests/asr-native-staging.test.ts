import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { stageNativeAsr, type NativeStagingOptions, type NativeReview } from '../scripts/stage-asr-native.mts';
import { ENGLISH_MODEL, type ModelFile } from '../scripts/prepare-asr-model.mts';

const roots:string[]=[];
function root():string{
  const result=mkdtempSync(path.join(tmpdir(),'voxnelo-asr-native-stage-'));
  roots.push(result);return result;
}
function put(dir:string,name:string,value:string):string{
  const filename=path.join(dir,name);
  mkdirSync(path.dirname(filename),{recursive:true});
  writeFileSync(filename,value);
  return createHash('sha256').update(value).digest('hex');
}
const models=['encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt'] as const;
function fixture(){
  const dir=root();
  const modelDir=path.join(dir,'model');
  const wrapperDir=path.join(dir,'lib');
  const libraryDir=path.join(dir,'runtime');
  const outputDir=path.join(dir,'output');
  mkdirSync(outputDir);
  put(outputDir,'README.md','Keep this documentation');
  const modelFiles:ModelFile[]=models.map((file)=>({
    source:file,target:file,sha256:put(modelDir,file,'model fixture '+file),
    exactBytes:Buffer.byteLength('model fixture '+file),
    maxBytes:100,
  }));
  const nativeFilesSha256:Record<string,string>={};
  for(const file of ['streaming-asr.js','addon.js','addon-static-import.js'])
    nativeFilesSha256[file]=put(wrapperDir,file,'upstream wrapper '+file);
  const nativeBinary=path.join(dir,'source','sherpa-onnx.node');
  nativeFilesSha256['sherpa-onnx.node']=put(path.dirname(nativeBinary),'sherpa-onnx.node','not a real executable');
  nativeFilesSha256['libsherpa-onnx.so']=put(libraryDir,'libsherpa-onnx.so','test-only library');
  const review:NativeReview={
    platform:process.platform,arch:process.arch,
    modelRevision:ENGLISH_MODEL.revision,
    modelTokensSha256:modelFiles[3]!.sha256!,
    nativePackage:'sherpa-onnx-node',
    nativeVersion:'1.13.6',
    nativeLicense:'Apache-2.0',
    nativeSource:'https://github.com/k2-fsa/sherpa-onnx',
    nativeFilesSha256,
  };
  const reviewPath=path.join(dir,'review.json');
  writeFileSync(reviewPath,JSON.stringify(review));
  const options:NativeStagingOptions={
    modelDir,wrapperDir,nativeBinary,libraryDir,outputDir,reviewPath,modelFiles,
  };
  return {options,review,modelFiles};
}
afterEach(()=>roots.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true})));

describe('Offline sherpa-onnx-node native staging with explicit review',()=>{
  it('copies complete approved wrapper, relative native addon and all shared libs',async()=>{
    const {options}=fixture();
    const hashes=await stageNativeAsr(options);
    const out=options.outputDir;
    expect(Object.keys(hashes)).toHaveLength(11);
    expect(readdirSync(out).sort()).toEqual(['README.md','manifest.json','model','native']);
    expect(readFileSync(path.join(out,'README.md'),'utf8')).toBe('Keep this documentation');
    expect(readFileSync(path.join(out,'native','index.cjs'),'utf8')).toContain("require('./streaming-asr.js')");
    expect(JSON.parse(readFileSync(path.join(out,'native','package.json'),'utf8'))).toEqual({
      private:true,type:'commonjs',
    });
    const m=JSON.parse(readFileSync(path.join(out,'manifest.json'),'utf8')) as {platform:string;arch:string;sha256:Record<string,string>};
    expect(m.platform).toBe(process.platform);
    expect(m.arch).toBe(process.arch);
    expect(m.sha256['native/sherpa-onnx.node']).toBe(hashes['native/sherpa-onnx.node']);
    expect(m.sha256['native/libsherpa-onnx.so']).toBe(hashes['native/libsherpa-onnx.so']);
    expect(m.sha256['model/tokens.txt']).toBe(hashes['model/tokens.txt']);
  });

  it('rejects falsified platform/architecture review before staging',async()=>{
    const {options,review}=fixture();
    review.arch='wrong-arch';
    writeFileSync(options.reviewPath,JSON.stringify(review));
    await expect(stageNativeAsr(options)).rejects.toThrow(/platform\/architecture mismatch/);
    expect(readdirSync(options.outputDir)).toEqual(['README.md']);
  });

  it('fails closed when native review hash does not match the supplied library',async()=>{
    const {options,review}=fixture();
    review.nativeFilesSha256['libsherpa-onnx.so']='0'.repeat(64);
    writeFileSync(options.reviewPath,JSON.stringify(review));
    await expect(stageNativeAsr(options)).rejects.toThrow(/Native review checksum mismatch/);
    expect(readdirSync(options.outputDir)).toEqual(['README.md']);
  });

  it('rejects missing native libraries and refuses to overwrite a staged release',async()=>{
    const {options}=fixture();
    rmSync(path.join(options.libraryDir,'libsherpa-onnx.so'));
    await expect(stageNativeAsr(options)).rejects.toThrow(/Missing packaged platform shared libraries/);
    put(options.libraryDir,'libsherpa-onnx.so','test-only library');
    await stageNativeAsr(options);
    await expect(stageNativeAsr(options)).rejects.toThrow(/already has staged assets/);
  });

  it('does not follow unreviewed symlinks to wrapper code',async()=>{
    const {options}=fixture();
    rmSync(path.join(options.wrapperDir,'addon.js'));
    symlinkSync(path.join(options.wrapperDir,'streaming-asr.js'),path.join(options.wrapperDir,'addon.js'));
    await expect(stageNativeAsr(options)).rejects.toThrow(/non-symlink/);
    expect(readdirSync(options.outputDir)).toEqual(['README.md']);
  });

  it('detects corrupted pinned model bytes and mismatched tokens',async()=>{
    const {options,review}=fixture();
    put(options.modelDir,'encoder.onnx','corrupted');
    await expect(stageNativeAsr(options)).rejects.toThrow(/Model checksum mismatch|size verification failed/);
    put(options.modelDir,'encoder.onnx','model fixture encoder.onnx');
    review.modelTokensSha256='f'.repeat(64);
    writeFileSync(options.reviewPath,JSON.stringify(review));
    await expect(stageNativeAsr(options)).rejects.toThrow(/Reviewed tokens.txt checksum mismatch/);
    expect(readdirSync(options.outputDir)).toEqual(['README.md']);
  });
});
