#!/usr/bin/env node
/** Structured Stable approvals are necessary but never substitute real OS signature checks or human review. */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Row = Record<string, unknown>;
const row = (v: unknown): Row => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
const txt = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
const validHash = (v: unknown) => /^[a-f0-9]{64}$/.test(txt(v));
const validUrl = (v: unknown) => /^https:\/\/\S+$/.test(txt(v)) && !/example\.com|tbd|todo/i.test(txt(v));
const validDate = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(txt(v));
const safeFile = (v: unknown) => /^[\w.-]+$/.test(txt(v));

export const FEATURES = Array.from({ length:12 }, (_,i) => 'F' + String(i+1).padStart(3,'0'));
export const GATES = ['contentRights','referenceAudioRights','privacy','linuxDeviceQA','windowsDeviceQA',
  'macosDeviceQA','offlineAsrLicenseAndQuality','accessibilityVisual','upgradeDataIntegrity',
  'publisherSigningAndNotarization'] as const;
export const PLATFORMS = ['linux','win32','darwin'] as const;

function requireReview(errors: string[], id: string, src: unknown): void {
  const item = row(src);
  if (item.status !== 'pass') errors.push(id + ': not approved');
  if (!txt(item.reviewer) || !validDate(item.date) || !validUrl(item.evidenceUrl))
    errors.push(id + ': missing reviewer/date/HTTPS evidence');
}

export function stableBlockers(input: unknown, version: string, tagSha: string): string[] {
  const data=row(input), errors:string[]=[];
  if (data.schemaVersion!==1 || data.version!==version) errors.push('schema/version mismatch');
  if (!/^[a-f0-9]{40}$/.test(tagSha) || data.sourceCommit!==tagSha)
    errors.push('tag target SHA mismatch');
  requireReview(errors,'releaseOwner',data.releaseOwner);
  for(const id of FEATURES) requireReview(errors,id,row(data.features)[id]);
  for(const id of GATES) requireReview(errors,id,row(data.gates)[id]);
  if(!Array.isArray(data.noviceTesters) || data.noviceTesters.length<5) {
    errors.push('five independent novice testers required');
  } else {
    const ids=new Set<string>();
    for(const [i,item] of data.noviceTesters.entries()) {
      const id=txt(row(item).anonymousId);
      if(!id || ids.has(id)) errors.push('duplicate or empty novice tester '+i);
      ids.add(id);
      requireReview(errors,'noviceTesters['+i+']',item);
    }
  }
  const all=row(data.artifacts);
  for(const platform of PLATFORMS){
    const entries=all[platform];
    if(!Array.isArray(entries) || entries.length!==(platform==='linux'?3:1)) {
      errors.push(platform+': wrong artifact count'); continue;
    }
    const names=new Set<string>();
    for(const item of entries){
      const name=txt(row(item).name);
      if(!safeFile(name) || !/voxnelo/i.test(name) || names.has(name)) errors.push(platform+': invalid or duplicated name');
      names.add(name);
      if(!validHash(row(item).sha256)) errors.push(platform+': invalid SHA-256');
    }
    if(platform==='linux'){
      for(const name of ['Voxnelo.deb','voxnelo_'+version+'_amd64.deb','Voxnelo-'+version+'.AppImage'])
        if(!names.has(name)) errors.push('linux: missing '+name);
    } else if(![...names].some(name=>name.includes(version)&&name.toLowerCase().endsWith(platform==='win32'?'.exe':'.dmg'))){
      errors.push(platform+': exact versioned installer missing');
    }
  }
  return errors;
}

async function hashFile(name:string):Promise<string>{
  const hash=createHash('sha256');
  for await (const chunk of createReadStream(name)) hash.update(chunk);
  return hash.digest('hex');
}
export async function stableArtifactBlockers(input:unknown,dir:string):Promise<string[]>{
  const errors:string[]=[],all=row(row(input).artifacts);
  for(const platform of PLATFORMS){
    const entries=all[platform];
    if(!Array.isArray(entries))continue;
    const checksum=path.join(dir,'SHA256SUMS-'+platform+'.txt');
    if(!existsSync(checksum)){errors.push(platform+': missing SHA256SUMS');continue;}
    const manifest=new Map<string,string>();
    for(const line of readFileSync(checksum,'utf8').trim().split(/\r?\n/)){
      const hit=/^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);
      if(!hit || manifest.has(hit[2]!)){errors.push(platform+': invalid checksum entry');continue;}
      manifest.set(hit[2]!,hit[1]!);
    }
    if(manifest.size!==entries.length)errors.push(platform+': unexpected checksum inventory');
    for(const item of entries){
      const name=txt(row(item).name);
      if(!safeFile(name))continue;
      const filename=path.join(dir,name);
      if(!existsSync(filename)){errors.push(platform+': missing '+name);continue;}
      const digest=await hashFile(filename);
      if(digest!==row(item).sha256 || digest!==manifest.get(name))errors.push(platform+': byte hash mismatch '+name);
      manifest.delete(name);
    }
    if(manifest.size)errors.push(platform+': unapproved checksum entries');
  }
  return errors;
}
async function main():Promise<void>{
  const [file,version,sha,dir]=process.argv.slice(2);
  if(!file||!version||!sha||!dir)throw Error('Expected evidence JSON, version, tag commit SHA and downloaded artifact directory');
  const evidence=JSON.parse(readFileSync(file,'utf8')) as unknown;
  const errors=[...stableBlockers(evidence,version,sha),...await stableArtifactBlockers(evidence,dir)];
  if(errors.length)throw Error('STABLE BLOCKED:\n- '+errors.join('\n- '));
  console.log('Evidence schema and actual final installer hashes verified; OS signature verification and independent human approval are still required.');
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(err=>{console.error(String(err));process.exitCode=1;});
