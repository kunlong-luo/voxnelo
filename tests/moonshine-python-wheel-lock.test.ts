import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,describe,expect,it} from 'vitest';
import {MOONSHINE_RUNTIME_DEPENDENCIES}
  from '../apps/desktop/moonshinePythonDependencies.ts';
import {pinnedMoonshineWheel}
  from '../apps/desktop/moonshineWheelIntegrity.ts';
import {
  moonshineHashedRequirements,
  pinnedMoonshineWheelhouse,
  verifyPinnedMoonshineWheelhouse,
  type LockedMoonshineWheel,
} from '../apps/desktop/moonshinePythonWheelLock.ts';

const roots:string[]=[];
afterEach(()=>{for(const dir of roots.splice(0))rmSync(dir,{recursive:true,force:true});});
const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
function fixture(){
  const root=mkdtempSync(path.join(tmpdir(),'voxnelo-full-wheel-lock-'));
  roots.push(root);
  const files=[
    ['moonshine_voice-0.0.65-py3-none-any.whl',Buffer.from('fake-sdk')],
    ['numpy-2.5.5-py3-none-any.whl',Buffer.from('fake-dependency')],
  ] as const;
  const wheels:LockedMoonshineWheel[]=files.map(([filename,bytes])=>{
    writeFileSync(path.join(root,filename),bytes);
    return {name:filename.startsWith('moonshine')?'moonshine-voice':'numpy',
      version:filename.startsWith('moonshine')?'0.0.65':'2.5.5',
      filename,sha256:digest(bytes)};
  });
  return {root,wheels,files};
}

describe('exact platform hash-locked Moonshine Python 3.12 wheels',()=>{
  it('matches every SDK and transitive version against the published 40-file inventory',()=>{
    for(const [platform,arch,release,count] of [
      ['linux','x64','6.8.0',13],
      ['win32','x64','10.0.0',14],
      ['darwin','arm64','24.6.0',13],
    ] as const){
      const wheels=pinnedMoonshineWheelhouse(platform,arch,release,'3.12.16');
      expect(wheels).not.toBeNull();
      expect(wheels).toHaveLength(count);
      const sdk=pinnedMoonshineWheel(platform,arch,release);
      expect(wheels?.some(w=>w.filename===sdk?.filename&&w.sha256===sdk.sha256)).toBe(true);
      const allowed=Object.entries(MOONSHINE_RUNTIME_DEPENDENCIES)
        .filter(([name])=>name!=='colorama'||platform==='win32');
      for(const [name,version] of allowed)
        expect(wheels?.some(w=>w.name===name&&w.version===version)).toBe(true);
      const requirements=moonshineHashedRequirements(wheels??[]);
      expect(requirements.trim().split('\n')).toHaveLength(count);
      expect(requirements).toContain('moonshine-voice==0.0.65 --hash=sha256:');
      expect(requirements).toContain('numpy==2.5.5 --hash=sha256:');
      expect(requirements.includes('colorama==0.4.6')).toBe(platform==='win32');
      expect(requirements).not.toMatch(/--index-url|--extra-index-url|--trusted-host/);
    }
  });
  it('never silently chooses an unknown Python ABI, OS or CPU',()=>{
    for(const version of ['3.11.9','3.13.0','3.15.2','3.12','3.12.1.1','abc'])
      expect(pinnedMoonshineWheelhouse('linux','x64','6.8.0',version)).toBeNull();
    expect(pinnedMoonshineWheelhouse('win32','arm64','10.0.0','3.12.10')).toBeNull();
    expect(pinnedMoonshineWheelhouse('linux','arm64','6.8.0','3.12.10')).toBeNull();
    expect(pinnedMoonshineWheelhouse('darwin','x64','24.0.0','3.12.10')).toBeNull();
    expect(pinnedMoonshineWheelhouse('darwin','arm64','23.5.0','3.12.10')).toBeNull();
  });
  it('accepts only the exact expected files with correctly hashed bytes',async()=>{
    const {root,wheels,files}=fixture();
    expect(await verifyPinnedMoonshineWheelhouse(root,wheels)).toBe(true);
    writeFileSync(path.join(root,files[0][0]),'tampered sdk');
    expect(await verifyPinnedMoonshineWheelhouse(root,wheels)).toBe(false);
    writeFileSync(path.join(root,files[0][0]),files[0][1]);
    writeFileSync(path.join(root,'extra.whl'),'unexpected');
    expect(await verifyPinnedMoonshineWheelhouse(root,wheels)).toBe(false);
    rmSync(path.join(root,'extra.whl'));
    rmSync(path.join(root,files[1][0]));
    expect(await verifyPinnedMoonshineWheelhouse(root,wheels)).toBe(false);
    expect(await verifyPinnedMoonshineWheelhouse('relative/wheelhouse',wheels)).toBe(false);
  });
  it('rejects symlink payloads even if their bytes match',async()=>{
    if(process.platform==='win32')return; // developer policy may deny symlinks
    const {root,wheels,files}=fixture();
    const name=files[0][0];
    rmSync(path.join(root,name));
    const external=path.join(root,'target.bin');
    writeFileSync(external,files[0][1]);
    symlinkSync(external,path.join(root,name));
    expect(await verifyPinnedMoonshineWheelhouse(root,wheels)).toBe(false);
  });
});
