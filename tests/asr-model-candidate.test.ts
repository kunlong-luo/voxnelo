import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENGLISH_MODEL, ENGLISH_MODEL_FILES, pinnedModelUrl, prepareEnglishModel, type ModelFile } from '../scripts/prepare-asr-model.mts';

const roots:string[]=[];
const fixture=(text:string,source='tiny-model.onnx'):ModelFile=>({
  source,
  target:'encoder.onnx',
  sha256:createHash('sha256').update(text).digest('hex'),
  exactBytes:Buffer.byteLength(text),
  maxBytes:Buffer.byteLength(text),
});
function root(){
  const d=mkdtempSync(path.join(tmpdir(),'voxnelo-model-candidate-'));
  roots.push(d);
  return d;
}
afterEach(()=>{roots.splice(0).forEach(p=>rmSync(p,{recursive:true,force:true}));vi.restoreAllMocks();});

describe('Pinned offline English candidate provisioning',()=>{
  it('pins the model to immutable upstream revision and known LFS hashes',()=>{
    expect(ENGLISH_MODEL.revision).toMatch(/^[a-f0-9]{40}$/);
    expect(ENGLISH_MODEL_FILES.map(x=>x.target)).toEqual([
      'encoder.onnx','decoder.onnx','joiner.onnx','tokens.txt',
    ]);
    expect(ENGLISH_MODEL_FILES.filter(x=>x.sha256)).toHaveLength(3);
    for(const file of ENGLISH_MODEL_FILES){
      expect(pinnedModelUrl(file.source)).toContain('/resolve/'+ENGLISH_MODEL.revision+'/');
      if(file.sha256)expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(()=>pinnedModelUrl('../credentials')).toThrow(/Unsafe/);
  });

  it('streams a checked file, then reuses the verified on-disk copy offline',async()=>{
    const d=root();
    const bytes='test model data';
    const expected=fixture(bytes);
    const fetcher=vi.fn(async()=>new Response(bytes,{status:200})) as unknown as typeof fetch;
    const first=await prepareEnglishModel(d,[expected],fetcher);
    expect(first).toEqual({'encoder.onnx':expected.sha256});
    expect(readFileSync(path.join(d,'encoder.onnx'),'utf8')).toBe(bytes);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const second=await prepareEnglishModel(d,[expected],fetcher);
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects corrupted content without leaving a usable or partial model file',async()=>{
    const d=root();
    const expected=fixture('correct', 'expected.onnx');
    const fetcher=vi.fn(async()=>new Response('corrupt',{status:200})) as unknown as typeof fetch;
    await expect(prepareEnglishModel(d,[expected],fetcher)).rejects.toThrow(/checksum or size mismatch/);
    expect(readdirSync(d)).toEqual([]);
  });

  it('bounds even an untrusted oversized response before committing it',async()=>{
    const d=root();
    const expected=fixture('ok');
    const fetcher=vi.fn(async()=>new Response('excessive bytes',{status:200})) as unknown as typeof fetch;
    await expect(prepareEnglishModel(d,[expected],fetcher)).rejects.toThrow(/maximum size/);
    expect(readdirSync(d)).toEqual([]);
  });

  it('never silently replaces local edits or follows existing symlinks',async()=>{
    const d=root();
    const expected=fixture('trusted');
    writeFileSync(path.join(d,'encoder.onnx'),'corrupted');
    const fetcher=vi.fn() as unknown as typeof fetch;
    await expect(prepareEnglishModel(d,[expected],fetcher)).rejects.toThrow(/Existing model file/);
    expect(fetcher).not.toHaveBeenCalled();
    rmSync(path.join(d,'encoder.onnx'));
    symlinkSync(path.join(d,'outside'),path.join(d,'encoder.onnx'));
    await expect(prepareEnglishModel(d,[expected],fetcher)).rejects.toThrow(/Unsafe existing/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects unsuccessful HTTP downloads without creating artifacts',async()=>{
    const d=root();
    const fetcher=vi.fn(async()=>new Response('Unavailable',{status:404})) as unknown as typeof fetch;
    await expect(prepareEnglishModel(d,[fixture('ok')],fetcher)).rejects.toThrow(/HTTP 404/);
    expect(readdirSync(d)).toEqual([]);
  });
});
