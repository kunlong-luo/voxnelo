#!/usr/bin/env node
/**
 * Fail-closed validation of the three-OS PRIVATE release draft inventory.
 *
 * A successful per-OS build is insufficient: assets must originate from the
 * exact same checkout/workflow run, have the intended version/architecture and
 * be the only executables staged for upload. Actual bytes are independently
 * checked with sha256sum -c by release-draft.yml after this validation.
 */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export interface DraftIdentity {
  version:string;
  commit:string;
  workflowRun:string;
}
interface CandidateFile {name:string;sizeBytes:number;sha256:string}
interface CandidateManifest {
  candidateOnly?:unknown;
  unsigned?:unknown;
  publicReleaseApproved?:unknown;
  offlineAsrValidated?:unknown;
  commit?:unknown;
  workflowRun?:unknown;
  platform?:unknown;
  files?:unknown;
}
const platforms=['linux','win32','darwin'] as const;
const lowerHex=/^[0-9a-f]{64}$/;
const sourceSha=/^[0-9a-f]{40}$/;
const basenameOnly=/^[A-Za-z0-9._-]+$/;

function exactNames(actual:readonly string[],expected:readonly string[],kind:string):void{
  assert.deepEqual([...actual].sort(),[...expected].sort(),kind+' differs from approved version-specific inventory');
}
function expectedInstallers(version:string):Record<(typeof platforms)[number],string[]>{
  return {
    linux:['Voxnelo.deb','Voxnelo-'+version+'.AppImage','voxnelo_'+version+'_amd64.deb'],
    win32:['Voxnelo.Setup.'+version+'.exe'],
    darwin:['Voxnelo-'+version+'-arm64.dmg'],
  };
}
function readManifest(directory:string,platform:string):CandidateManifest{
  return JSON.parse(readFileSync(path.join(directory,'candidate-manifest-'+platform+'.json'),'utf8')) as CandidateManifest;
}
function validateFiles(items:unknown,expected:string[],platform:string):CandidateFile[]{
  assert.ok(Array.isArray(items),'Missing '+platform+' files inventory');
  const files=items as CandidateFile[];
  for(const file of files){
    assert.ok(file&&typeof file==='object'&&typeof file.name==='string'&&basenameOnly.test(file.name),
      'Invalid '+platform+' installer basename');
    assert.ok(Number.isSafeInteger(file.sizeBytes)&&file.sizeBytes>=1024*1024,
      'Invalid '+platform+' installer size');
    assert.ok(typeof file.sha256==='string'&&lowerHex.test(file.sha256),
      'Invalid '+platform+' installer SHA-256');
  }
  exactNames(files.map(f=>f.name),expected,platform+' installer list');
  return files;
}
function verifyChecksums(directory:string,platform:string,files:CandidateFile[]):void{
  const raw=readFileSync(path.join(directory,'SHA256SUMS-'+platform+'.txt'),'utf8');
  assert.ok(raw.endsWith('\n'),'Invalid '+platform+' SHA256SUMS terminator');
  const lines=raw.trimEnd().split('\n');
  const sums=new Map<string,string>();
  for(const line of lines){
    const match=/^([0-9a-f]{64}) {2}([A-Za-z0-9._-]+)$/.exec(line);
    assert.ok(match,'Invalid '+platform+' SHA256SUMS record');
    assert.ok(!sums.has(match[2]!),'Duplicate '+platform+' SHA256SUMS entry');
    sums.set(match[2]!,match[1]!);
  }
  exactNames([...sums.keys()],files.map(f=>f.name),platform+' checksums');
  for(const file of files){
    assert.equal(sums.get(file.name),file.sha256,platform+' installer digest differs from manifest');
  }
}
export function validateReleaseDraftInventory(directory:string,identity:DraftIdentity):void{
  assert.match(identity.version,/^\d+\.\d+\.\d+$/,'Invalid draft version');
  assert.match(identity.commit,sourceSha,'Invalid full source commit');
  assert.match(identity.workflowRun,/^[1-9][0-9]*$/,'Invalid workflow run ID');
  const expected=expectedInstallers(identity.version);
  const allFiles=Object.values(expected).flat();
  for(const platform of platforms){
    const manifest=readManifest(directory,platform);
    assert.equal(manifest.candidateOnly,true,'Not a private candidate: '+platform);
    assert.equal(manifest.unsigned,true,'Missing unsigned risk disclosure: '+platform);
    assert.equal(manifest.publicReleaseApproved,false,'Unexpected publication approval: '+platform);
    assert.equal(typeof manifest.offlineAsrValidated,'boolean','Invalid ASR evidence marker: '+platform);
    assert.equal(manifest.platform,platform,'Incorrect manifest platform: '+platform);
    assert.equal(manifest.commit,identity.commit,'Mismatched source commit: '+platform);
    assert.equal(manifest.workflowRun,identity.workflowRun,'Mismatched workflow run: '+platform);
    const files=validateFiles(manifest.files,expected[platform],platform);
    verifyChecksums(directory,platform,files);
    if(platform==='linux'){
      const alias=files.find(f=>f.name==='Voxnelo.deb');
      const canonical=files.find(f=>f.name==='voxnelo_'+identity.version+'_amd64.deb');
      assert.ok(alias&&canonical&&alias.sha256===canonical.sha256&&alias.sizeBytes===canonical.sizeBytes,
        'Linux Discover DEB alias differs from canonical installer');
    }
  }
  const uploadNames=readdirSync(directory);
  const executables=uploadNames.filter(name=>/\.(?:deb|AppImage|exe|dmg)$/i.test(name));
  exactNames(executables,allFiles,'Executable upload attachments');
  exactNames(uploadNames.filter(name=>/^SHA256SUMS-.*\.txt$/.test(name)),
    platforms.map(p=>'SHA256SUMS-'+p+'.txt'),'Checksums upload attachments');
  exactNames(uploadNames.filter(name=>/^candidate-manifest-.*\.json$/.test(name)),
    platforms.map(p=>'candidate-manifest-'+p+'.json'),'Manifest upload attachments');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [directory,version,commit,workflowRun]=process.argv.slice(2);
  assert.ok(directory&&version&&commit&&workflowRun,
    'Usage: validate-release-draft.mts <draft-assets> <version> <source-sha> <workflow-run>');
  validateReleaseDraftInventory(path.resolve(directory),{version,commit,workflowRun});
  console.log('Three-platform private draft inventory, provenance and checksums verified');
}
