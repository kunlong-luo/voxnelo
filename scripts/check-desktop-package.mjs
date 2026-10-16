#!/usr/bin/env node
/**
 * Inspect actual unpacked macOS/Windows Electron artifacts. No binary launch:
 * hosted runners do not guarantee an interactive OS user session.
 */
import assert from 'node:assert/strict';
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
for(const [label,filename,minBytes] of [['native executable',executable,1024],['asar archive',bundle,1024],['branded PNG',icon,256]]){
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
const report={
  platform,
  output:base,
  appRoot:path.relative(path.resolve('.'),appRoot),
  icon:path.relative(path.resolve('.'),icon),
  tested:['native executable','asar','bundled branded icon','brand PNG magic',...(platform==='darwin'?['CFBundleIdentifier','NSMicrophoneUsageDescription']:[])],
  launched:false,
};
console.log('Cross-platform package integrity passed:',JSON.stringify(report));
