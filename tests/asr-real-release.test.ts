import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { planRealAsrRelease } from '../scripts/check-asr-real-release.mts';

const fixtures:string[]=[];
function workspace(){
  const root=mkdtempSync(path.join(tmpdir(),'voxnelo-native-release-gate-'));
  fixtures.push(root);
  const staging=path.join(root,'build','offline-asr');
  mkdirSync(staging,{recursive:true});
  writeFileSync(path.join(staging,'README.md'),'README-only distribution');
  return {root,staging};
}
function stage(root:string,staging:string){
  writeFileSync(path.join(staging,'manifest.json'),'{"sha256":{}}');
  mkdirSync(path.join(staging,'model'));
  mkdirSync(path.join(staging,'native'));
  writeFileSync(path.join(staging,'native','index.cjs'),'test-only fixture');
  mkdirSync(path.join(root,'dist-electron'));
  writeFileSync(path.join(root,'dist-electron','offlineAsrWorker.cjs'),'test-only worker');
}
afterEach(()=>fixtures.splice(0).forEach(root=>rmSync(root,{force:true,recursive:true})));

describe('Real native ASR release gating',()=>{
  it('keeps default no-model public builds installable without a fake transcript',()=>{
    const {root,staging}=workspace();
    const plan=planRealAsrRelease(staging,{},root);
    expect(plan.kind).toBe('skip');
    expect(plan.args).toBeUndefined();
    expect(plan.description).toContain('No native ASR model');
  });

  it('requires a real approved reference audio sample whenever a model is staged',()=>{
    const {root,staging}=workspace();
    stage(root,staging);
    expect(()=>planRealAsrRelease(staging,{},root)).toThrow(/VOXNELO_ASR_QA_WAV/);
    expect(()=>planRealAsrRelease(staging,{VOXNELO_ASR_QA_WAV:'relative.wav'},root))
      .toThrow(/VOXNELO_ASR_QA_WAV/);
  });

  it('refuses packaging without a known English reference sentence',()=>{
    const {root,staging}=workspace();
    stage(root,staging);
    const wav=path.join(root,'approved.wav');
    writeFileSync(wav,'sample file placeholder: benchmark validates PCM and real recognition');
    expect(()=>planRealAsrRelease(staging,{VOXNELO_ASR_QA_WAV:wav},root))
      .toThrow(/VOXNELO_ASR_QA_EXPECT/);
    expect(()=>planRealAsrRelease(staging,{VOXNELO_ASR_QA_WAV:wav,VOXNELO_ASR_QA_EXPECT:'hello'},root))
      .toThrow(/VOXNELO_ASR_QA_EXPECT/);
  });

  it('routes the candidate through the genuine native worker benchmark, never the mock test',()=>{
    const {root,staging}=workspace();
    stage(root,staging);
    const wav=path.join(root,'approved.wav');
    writeFileSync(wav,'fixture');
    const plan=planRealAsrRelease(staging,{
      VOXNELO_ASR_QA_WAV:wav,VOXNELO_ASR_QA_EXPECT:'hello world',
    },root);
    expect(plan.kind).toBe('run');
    expect(plan.args).toContain(path.join(root,'scripts','benchmark-offline-asr.mts'));
    expect(plan.args).toContain('--expect');
    expect(plan.args).toContain('hello world');
    expect(plan.env?.VOXNELO_ASR_MODEL_DIR).toBe(path.join(staging,'model'));
    expect(plan.env?.VOXNELO_ASR_ADDON_PATH).toBe(path.join(staging,'native','index.cjs'));
  });

  it('fails before benchmark if a staged release has no adapter or compiled worker',()=>{
    const {root,staging}=workspace();
    writeFileSync(path.join(staging,'manifest.json'),'{}');
    const wav=path.join(root,'approved.wav');
    writeFileSync(wav,'fixture');
    const env={VOXNELO_ASR_QA_WAV:wav,VOXNELO_ASR_QA_EXPECT:'hello world'};
    expect(()=>planRealAsrRelease(staging,env,root)).toThrow(/Incomplete ASR staging/);
    stage(root,staging);
    rmSync(path.join(root,'dist-electron','offlineAsrWorker.cjs'));
    expect(()=>planRealAsrRelease(staging,env,root)).toThrow(/Build Electron worker/);
  });
});
