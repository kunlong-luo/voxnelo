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
import { DISCOVER_LOCAL_DEB_NAME } from './release-installer-selection.mts';

const release=path.resolve('release');
const platform=process.platform;
const extensions=platform==='linux'?['.deb','.AppImage']:platform==='win32'?['.exe']:['.dmg'];
const entries=(await readdir(release)).filter(name=>name.toLowerCase().includes('voxnelo')&&extensions.some(ext=>name.toLowerCase().endsWith(ext.toLowerCase()))).sort();
const expectedCount=platform==='linux'?extensions.length+1:extensions.length;
if(entries.length!==expectedCount)throw Error('Expected exactly '+expectedCount+' release installer files, found '+entries.join(', '));
if(platform==='linux'&&!entries.includes(DISCOVER_LOCAL_DEB_NAME))
  throw Error('Missing user-friendly local Discover installer: '+DISCOVER_LOCAL_DEB_NAME);
for(const ext of extensions)if(!entries.some(name=>name.toLowerCase().endsWith(ext.toLowerCase())))throw Error('Release format missing: '+ext);
const files=[];
for(const name of entries){
  const full=path.join(release,name),size=(await stat(full)).size;
  if(size<1024*1024)throw Error('Candidate installer unexpectedly small: '+name);
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(full))hash.update(chunk);
  files.push({name,sizeBytes:size,sha256:hash.digest('hex')});
}
if(platform==='linux'){
  const discover=files.find(item=>item.name===DISCOVER_LOCAL_DEB_NAME);
  const versioned=files.find(item=>/^voxnelo_\\d+\\.\\d+\\.\\d+_.*\\.deb$/.test(item.name));
  if(!discover||!versioned||discover.sha256!==versioned.sha256)
    throw Error('Discover DEB alias must hash-identically match the canonical versioned installer');
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
