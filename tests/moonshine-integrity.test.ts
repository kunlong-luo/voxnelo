import {describe,it,expect,afterEach} from 'vitest';
import {mkdtempSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {verifyPinnedMoonshineMediumModel,PINNED_MOONSHINE_MEDIUM_FILES} from '../apps/desktop/moonshineIntegrity';

const roots:string[]=[];
afterEach(()=>{for(const r of roots.splice(0))rmSync(r,{recursive:true,force:true});});
function fixture(){
  const root=mkdtempSync(path.join(tmpdir(),'voxnelo-moonshine-integrity-'));
  roots.push(root);
  const bytes={'encoder.ort':'model','tokenizer.bin':'vocabulary'};
  const hashes=Object.fromEntries(Object.entries(bytes).map(([name,value])=>{
    writeFileSync(path.join(root,name),value);
    return [name,createHash('sha256').update(value).digest('hex')];
  }));
  return {root,hashes};
}
describe('pinned Moonshine model hashes',()=>{
  it('has an explicit digest for all eight official quantized components',()=>{
    expect(Object.keys(PINNED_MOONSHINE_MEDIUM_FILES)).toHaveLength(8);
    for(const sha of Object.values(PINNED_MOONSHINE_MEDIUM_FILES))
      expect(sha).toMatch(/^[a-f0-9]{64}$/);
  });
  it('accepts only an exact byte-for-byte inventory',async()=>{
    const {root,hashes}=fixture();
    expect(await verifyPinnedMoonshineMediumModel(root,hashes)).toBe(true);
    writeFileSync(path.join(root,'encoder.ort'),'tampered model');
    expect(await verifyPinnedMoonshineMediumModel(root,hashes)).toBe(false);
    writeFileSync(path.join(root,'encoder.ort'),'model');
    writeFileSync(path.join(root,'unexpected.txt'),'unexpected');
    expect(await verifyPinnedMoonshineMediumModel(root,hashes)).toBe(false);
  });
  it('rejects symlinked roots and model files',async()=>{
    const {root,hashes}=fixture();
    const link=path.join(root,'alias.ort');
    symlinkSync(path.join(root,'encoder.ort'),link);
    expect(await verifyPinnedMoonshineMediumModel(root,hashes)).toBe(false);
    rmSync(link);
    const rootAlias=root+'-alias';
    roots.push(rootAlias);
    symlinkSync(root,rootAlias);
    expect(await verifyPinnedMoonshineMediumModel(rootAlias,hashes)).toBe(false);
  });
  it('permits only model-associated official downloader lock files',async()=>{
    const {root,hashes}=fixture();
    writeFileSync(path.join(root,'encoder.ort.lock'),'');
    expect(await verifyPinnedMoonshineMediumModel(root,hashes)).toBe(true);
    writeFileSync(path.join(root,'unexpected.lock'),'');
    expect(await verifyPinnedMoonshineMediumModel(root,hashes)).toBe(false);
  });
});
