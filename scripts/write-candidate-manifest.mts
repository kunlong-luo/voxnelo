#!/usr/bin/env node
/**
 * Auditable candidate artifact manifest, generated after OS-specific installer
 * validation. This does not certify signatures, notarization, real devices,
 * editorial approval or a working bundled real-time ASR engine.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const release=path.resolve('release');
const platform=process.platform;
const extensions=platform==='linux'?['.deb','.AppImage']:platform==='win32'?['.exe']:['.dmg'];
const entries=(await readdir(release)).filter(name=>name.toLowerCase().includes('voxnelo')&&extensions.some(ext=>name.toLowerCase().endsWith(ext.toLowerCase()))).sort();
if(entries.length!==extensions.length)throw Error('Expected exactly '+extensions.length+' release installers, found '+entries.join(', '));
for(const ext of extensions)if(!entries.some(name=>name.toLowerCase().endsWith(ext.toLowerCase())))throw Error('Release format missing: '+ext);
const files=[];
for(const name of entries){
  const full=path.join(release,name),size=(await stat(full)).size;
  if(size<1024*1024)throw Error('Candidate installer unexpectedly small: '+name);
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(full))hash.update(chunk);
  files.push({name,sizeBytes:size,sha256:hash.digest('hex')});
}
const metadata={
  candidateOnly:true,
  unsigned:true,
  publicReleaseApproved:false,
  offlineAsrValidated:process.env.VOXNELO_ASR_MODEL_VERIFIED==='1',
  commit:process.env.GITHUB_SHA??'local',
  workflowRun:process.env.GITHUB_RUN_ID??'local',
  platform,
  files,
};
await writeFile(path.join(release,'candidate-manifest-'+platform+'.json'),JSON.stringify(metadata,null,2)+'\n');
await writeFile(path.join(release,'SHA256SUMS-'+platform+'.txt'),files.map(file=>file.sha256+'  '+file.name).join('\n')+'\n');
console.log(JSON.stringify(metadata,null,2));
