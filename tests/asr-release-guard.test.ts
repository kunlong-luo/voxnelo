import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { planRealAsrRelease } from '../scripts/check-asr-real-release.mts';

const roots:string[]=[];
const fixture=()=>{
  const folder=mkdtempSync(path.join(tmpdir(),'voxnelo-asr-pilot-release-gate-'));
  roots.push(folder);
  return folder;
};
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});

describe('V0.1 offline ASR public release guard',()=>{
  it('allows README-only builds to report that real speech recognition is unavailable',()=>{
    const dir=fixture();
    mkdirSync(dir,{recursive:true});
    writeFileSync(path.join(dir,'README.md'),'No optional ASR engine');
    const plan=planRealAsrRelease(dir,{},process.cwd());
    expect(plan.kind).toBe('skip');
    expect(plan.description).toMatch(/No native ASR model/);
  });

  it('always refuses to release engineering-only native resources even when a WAV is provided',()=>{
    const dir=fixture();
    writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({
      releaseReady:false,
      reviewState:'engineering-only; not approved for redistribution',
    }));
    expect(()=>planRealAsrRelease(dir,{
      VOXNELO_ASR_QA_WAV:'/any/fake.wav',
      VOXNELO_ASR_QA_EXPECT:'please speak English slowly',
    },process.cwd())).toThrow(/not approved for public release/);
  });
});
