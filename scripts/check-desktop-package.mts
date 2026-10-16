#!/usr/bin/env node
/**
 * Inspect actual unpacked macOS/Windows Electron artifacts. No binary launch:
 * hosted runners do not guarantee an interactive OS user session.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const platform=process.platform;
if(platform!=='darwin'&&platform!=='win32')throw Error('Packaging checks require macOS or Windows');
const release=path.resolve('release');
const directories=(await readdir(release,{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);
const base=platform==='win32'
  ? directories.find(name=>name==='win-unpacked')
  : directories.find(name=>/^mac(?:-arm64|-x64)?$/.test(name));
assert.ok(base,'Unpacked '+platform+' desktop output missing from '+release+': '+directories.join(','));
const appRoot=platform==='win32'
  ? path.join(release,base)
  : path.join(release,base,'Voxnelo.app');
const contentDir=platform==='win32'?appRoot:path.join(appRoot,'Contents');
const resources=path.join(contentDir,platform==='win32'?'resources':'Resources');
const executable=platform==='win32'
  ? path.join(appRoot,'Voxnelo.exe')
  : path.join(contentDir,'MacOS','Voxnelo');
const bundle=path.join(resources,'app.asar');
const icon=path.join(resources,'icons','voxnelo.png');
const requiredFiles: Array<[string, string, number]> = [['native executable',executable,1024],['asar archive',bundle,1024],['branded PNG',icon,256]];
for(const [label,filename,minBytes] of requiredFiles){
  const info=await stat(filename);
  assert.ok(info.isFile()&&info.size>minBytes,label+' missing/empty: '+filename);
}
const png=await readFile(icon);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Wrong branded PNG magic');
if(platform==='darwin'){
  const plist=await readFile(path.join(contentDir,'Info.plist'),'utf8');
  assert.match(plist,/<string>app\.voxnelo\.desktop<\/string>/,'Wrong macOS bundle identifier');
  assert.match(plist,/NSMicrophoneUsageDescription/,'macOS microphone consent explanation missing');
}
const asrStagingManifest=path.resolve('build','offline-asr','manifest.json');
const copiedAsrManifest=path.join(resources,'offline-asr','manifest.json');
const asrChecks:string[]=[];
if(existsSync(asrStagingManifest)){
  assert.ok(existsSync(copiedAsrManifest),'Packaged offline ASR manifest is missing');
  const staged=JSON.parse(await readFile(asrStagingManifest,'utf8')) as {sha256:Record<string,string>;platform:string;arch:string};
  const copied=JSON.parse(await readFile(copiedAsrManifest,'utf8')) as typeof staged;
  assert.deepEqual(copied,staged,'Packaged ASR manifest does not match staged release');
  assert.equal(copied.platform,process.platform,'Wrong native ASR operating system in package');
  assert.equal(copied.arch,process.arch,'Wrong native ASR CPU architecture in package');
  for(const [relative,expected] of Object.entries(copied.sha256)){
    const file=path.join(resources,'offline-asr',...relative.split('/'));
    const hash=createHash('sha256').update(await readFile(file)).digest('hex');
    assert.equal(hash,expected,'Packaged native ASR/model hash mismatch: '+relative);
  }
  asrChecks.push('copied offline ASR manifest','all packaged ASR hashes','platform native architecture');
}else{
  assert.equal(existsSync(copiedAsrManifest),false,'Unexpected ASR model manifest in default package');
  asrChecks.push('no unreviewed default ASR payload');
}
const report={
  platform,
  output:base,
  appRoot:path.relative(path.resolve('.'),appRoot),
  icon:path.relative(path.resolve('.'),icon),
  tested:['native executable','asar','bundled branded icon','brand PNG magic',...(platform==='darwin'?['CFBundleIdentifier','NSMicrophoneUsageDescription']:[]),...asrChecks],
  launched:false,
};
console.log('Cross-platform package integrity passed:',JSON.stringify(report));
