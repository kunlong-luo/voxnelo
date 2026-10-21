import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const created:string[]=[];
afterEach(()=>{for(const dir of created.splice(0))rmSync(dir,{recursive:true,force:true});});
function fixture(){
  const root=mkdtempSync(path.join(os.tmpdir(),'voxnelo-moonshine-qa-'));
  created.push(root);
  const model=path.join(root,'model');
  mkdirSync(model);
  for(const f of ['encoder.ort','adapter.ort','cross_kv.ort','decoder_kv.ort',
                  'frontend.model.ort','frontend.weights.ort','streaming_config.json','tokenizer.bin']){
    writeFileSync(path.join(model,f),'test-only');
  }
  const wav=path.join(root,'sample.wav');
  const bytes=Buffer.alloc(44+1600);
  bytes.write('RIFF',0,'ascii');
  bytes.writeUInt32LE(bytes.length-8,4);
  bytes.write('WAVEfmt ',8,'ascii');
  bytes.writeUInt32LE(16,16);
  bytes.writeUInt16LE(1,20);
  bytes.writeUInt16LE(1,22);
  bytes.writeUInt32LE(16000,24);
  bytes.writeUInt32LE(32000,28);
  bytes.writeUInt16LE(2,32);
  bytes.writeUInt16LE(16,34);
  bytes.write('data',36,'ascii');
  bytes.writeUInt32LE(1600,40);
  writeFileSync(wav,bytes);
  return {root,model,wav};
}
const run=(wav:string,model:string,size='medium')=>spawnSync('python3',[
  'scripts/benchmark-moonshine-voice.py','--wav',wav,'--model-dir',model,
  '--size',size,'--validate-only',
],{cwd:process.cwd(),encoding:'utf8',timeout:5000,env:{...process.env,PYTHONNOUSERSITE:'1'}});

describe('Moonshine candidate selection: deterministic offline preflight',()=>{
  it('accepts only explicitly supplied complete local model directories and WAVs',()=>{
    const {wav,model}=fixture();
    const r=run(wav,model);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({
      valid:true,engine:'moonshine-voice',size:'medium',durationSeconds:0.05,
    });
    expect(run(wav,model,'small').status).toBe(0);
    expect(run(wav,model,'invalid').status).not.toBe(0);
  });
  it('fails closed on missing or malformed files without ever loading an external model',()=>{
    const {wav,model,root}=fixture();
    const bad=path.join(root,'missing.wav');
    const result=run(bad,model);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Private Moonshine evaluation failed');
    expect(result.stderr).not.toContain(root);
    expect(run(wav,path.join(root,'unknown-model')).status).not.toBe(0);
    const stereo=path.join(root,'stereo.wav');
    const bytes=Buffer.alloc(44+1600);
    bytes.write('RIFF',0,'ascii');
    bytes.writeUInt32LE(bytes.length-8,4);
    bytes.write('WAVEfmt ',8,'ascii');
    bytes.writeUInt32LE(16,16);
    bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);
    bytes.writeUInt32LE(16000,24);bytes.writeUInt32LE(64000,28);
    bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);
    bytes.write('data',36,'ascii');bytes.writeUInt32LE(1600,40);
    writeFileSync(stereo,bytes);
    expect(run(stereo,model).status).not.toBe(0);
  });
});