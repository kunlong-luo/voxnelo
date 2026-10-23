import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FEATURES, GATES, stableArtifactBlockers, stableBlockers } from '../scripts/check-stable-evidence.mts';
import { stableDraftBlockers } from '../scripts/check-stable-draft.mts';

const tag='a'.repeat(40),version='0.1.7';
const sum=(s:string)=>createHash('sha256').update(s).digest('hex');
const pass=()=>({status:'pass',reviewer:'reviewed human',date:'2026-10-22',
  evidenceUrl:'https://github.com/kunlong-luo/voxnelo/issues/141'});
const windowsThumbprint='A'.repeat(40),appleTeamId='AB12CD34EF';
const files={linux:['Voxnelo.deb','voxnelo_0.1.7_amd64.deb','Voxnelo-0.1.7.AppImage'],
  win32:['Voxnelo.Setup.0.1.7.exe'],darwin:['Voxnelo-0.1.7-arm64.dmg']};
const example=()=>({schemaVersion:1,version,sourceCommit:tag,releaseOwner:pass(),
  signingIdentity:{windowsCertificateSha1:windowsThumbprint,appleTeamId},
  features:Object.fromEntries(FEATURES.map(id=>[id,pass()])),
  gates:Object.fromEntries(GATES.map(id=>[id,pass()])),
  noviceTesters:Array.from({length:5},(_,i)=>({...pass(),anonymousId:'volunteer-'+i})),
  artifacts:Object.fromEntries(Object.entries(files).map(([key,names])=>
    [key,names.map(name=>({name,sha256:sum(name)}))]))});
const temporary:string[]=[];
afterEach(()=>temporary.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true})));

describe('Fail-closed Stable release approval gate',()=>{
  it('rejects missing evidence and mismatched source',()=>{
    expect(stableBlockers({},version,tag).length).toBeGreaterThan(20);
    expect(stableBlockers(example(),version,'b'.repeat(40))).toContain('tag target SHA mismatch');
  });
  it('rejects missing or malformed publisher identities, even if remaining evidence is approved',()=>{
    const evidence=example();
    evidence.signingIdentity.windowsCertificateSha1='';
    evidence.signingIdentity.appleTeamId='FAKE';
    expect(stableBlockers(evidence,version,tag).join(' ')).toMatch(/Windows certificate SHA-1 thumbprint missing/);
    expect(stableBlockers(evidence,version,tag).join(' ')).toMatch(/Apple Team ID missing/);
  });
  it('rejects pending F004, missing model rights and repeated tester identities',()=>{
    const evidence=example();
    evidence.features.F004!.status='pending';
    evidence.gates.offlineAsrLicenseAndQuality!.status='pending';
    evidence.noviceTesters[1]!.anonymousId=evidence.noviceTesters[0]!.anonymousId;
    expect(stableBlockers(evidence,version,tag).join(' ')).toMatch(/F004: not approved/);
    expect(stableBlockers(evidence,version,tag).join(' ')).toMatch(/offlineAsrLicenseAndQuality: not approved/);
    expect(stableBlockers(evidence,version,tag).join(' ')).toMatch(/duplicate or empty novice tester/);
  });
  it('rejects unsigned byte substitutions despite a claimed pass',async()=>{
    const data=example(),dir=mkdtempSync(path.join(tmpdir(),'voxnelo-gate-'));
    temporary.push(dir);
    for(const [platform,items] of Object.entries(data.artifacts)){
      for(const item of items)writeFileSync(path.join(dir,item.name),item.name);
      writeFileSync(path.join(dir,'SHA256SUMS-'+platform+'.txt'),
        items.map(item=>item.sha256+'  '+item.name).join('\n')+'\n');
    }
    expect(await stableArtifactBlockers(data,dir)).toEqual([]);
    writeFileSync(path.join(dir,files.win32[0]!),'tampered');
    expect((await stableArtifactBlockers(data,dir)).join(' ')).toMatch(/byte hash mismatch/);
  });
  it('accepts a private draft with an approved target SHA before GitHub creates its tag',()=>{
    const evidence=example();
    const assets=Object.values(evidence.artifacts).flat().map((item,index)=>({
      id:index+1,name:item.name,size:1024,state:'uploaded',
    }));
    for(const [index,platform] of ['linux','win32','darwin'].entries())
      assets.push({id:index+20,name:'SHA256SUMS-'+platform+'.txt',size:64,state:'uploaded'});
    const draft={
      id:12,tag_name:'v0.1.7',target_commitish:tag,draft:true,prerelease:true,assets,
    };
    expect(stableDraftBlockers([draft],evidence,version)).toEqual([]);
    expect(stableDraftBlockers([{...draft,target_commitish:'b'.repeat(40)}],evidence,version))
      .toContain('Draft target_commitish must equal the exact approved full source SHA');
    expect(stableDraftBlockers([{...draft,draft:false}],evidence,version))
      .toContain('Candidate must remain a private prerelease draft');
    expect(stableDraftBlockers([draft,draft],evidence,version))
      .toContain('Exactly one draft for the exact version is required');
    expect(stableDraftBlockers([{...draft,assets:assets.slice(1)}],evidence,version).join(' '))
      .toMatch(/Required approved draft attachment is missing/);
  });
  it('rejects executable attachments that were not approved for Stable',()=>{
    const evidence=example();
    const assets=Object.values(evidence.artifacts).flat().map((item,index)=>({
      id:index+1,name:item.name,size:1024,state:'uploaded',
    }));
    for(const [index,platform] of ['linux','win32','darwin'].entries())
      assets.push({id:index+20,name:'SHA256SUMS-'+platform+'.txt',size:64,state:'uploaded'});
    assets.push({id:55,name:'Voxnelo-unreviewed.exe',size:8192,state:'uploaded'});
    const draft={id:12,tag_name:'v0.1.7',target_commitish:tag,draft:true,prerelease:true,assets};
    expect(stableDraftBlockers([draft],evidence,version).join(' ')).toMatch(/Unapproved executable attachment/);
  });

  it('uses release draft target_commitish rather than demanding a prepublication tag',()=>{
    const yml=readFileSync('.github/workflows/stable-readiness.yml','utf8');
    expect(yml).toContain('scripts/check-stable-draft.mts');
    expect(yml).toContain('git merge-base --is-ancestor');
    expect(yml).toContain('git ls-remote --exit-code --tags origin');
    expect(yml).not.toContain('gh release view "v$RELEASE_VERSION" --json isDraft');
  });
  it('accepts a synthetic schema fixture but does not claim QA happened',()=>{
    expect(stableBlockers(example(),version,tag)).toEqual([]);
  });
  it('only verifies manually and cannot publish or overwrite releases',()=>{
    const yml=readFileSync('.github/workflows/stable-readiness.yml','utf8');
    expect(yml).toContain('workflow_dispatch:');
    expect(yml).toContain('VERIFY_STABLE_READINESS_ONLY');
    expect(yml).toContain('Get-AuthenticodeSignature');
    expect(yml).toContain('xcrun stapler validate');
    expect(yml).toContain('codesign --verify');
    expect(yml).toContain('Get-FileHash');
    expect(yml).toContain('Get-AuthenticodeSignature');
    expect(yml).toContain('EXPECTED_WINDOWS_SHA256');
    expect(yml).toContain('EXPECTED_APPLE_TEAM_ID');
    expect(yml).toContain('EXPECTED_MACOS_SHA256');
    expect(yml).toContain('CFBundleIdentifier');
    expect(yml).not.toMatch(/^\s+push:/m);
    expect(yml).not.toMatch(/gh release (?:create|edit|upload)/);
  });
});
