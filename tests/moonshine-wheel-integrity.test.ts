import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach,describe,expect,it} from 'vitest';
import {pinnedMoonshineWheel,verifyPinnedMoonshineWheel}
  from '../apps/desktop/moonshineWheelIntegrity.ts';

const roots:string[]=[];
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
function fixture(){
  const dir=mkdtempSync(path.join(tmpdir(),'voxnelo-sdk-wheel-'));
  roots.push(dir);
  const bytes=Buffer.from('test-only, not a real Python wheel');
  const wheel={
    filename:'moonshine_voice-0.0.65-py3-none-win_amd64.whl',
    sha256:createHash('sha256').update(bytes).digest('hex'),
  };
  const wheelPath=path.join(dir,wheel.filename);
  writeFileSync(wheelPath,bytes);
  return {dir,wheel,wheelPath};
}

describe('pinned v0.0.65 native SDK wheel integrity gate',()=>{
  it('maps exactly the approved supported OS/architectures to PyPI digests',()=>{
    const linux=pinnedMoonshineWheel('linux','x64','6.8.0');
    const win=pinnedMoonshineWheel('win32','x64','10.0.0');
    const mac=pinnedMoonshineWheel('darwin','arm64','24.0.0');
    expect(linux?.filename).toContain('manylinux_2_34_x86_64');
    expect(win?.filename).toContain('win_amd64');
    expect(mac?.filename).toContain('macosx_15_0_arm64');
    expect(linux?.sha256).toBe('946e0a056dd3a13ee8cc28dec84c0f01676743a841bae5e6c52a87483b10241b');
    expect(win?.sha256).toBe('657e16825ca8f4298fea2a9d9a28bb685d9cf6ad247e104656ed5b02b9ff886b');
    expect(mac?.sha256).toBe('3e92fa8497bf4fc40b6241e4dc29fd4ac77832f7f3d8addc4fd467a6bf1cf605');
    expect(pinnedMoonshineWheel('darwin','arm64','23.6.0')).toBeNull();
    expect(pinnedMoonshineWheel('darwin','x64','24.0.0')).toBeNull();
    expect(pinnedMoonshineWheel('win32','arm64','10.0.0')).toBeNull();
    expect(pinnedMoonshineWheel('linux','arm64','6.8.0')).toBeNull();
  });
  it('accepts only an exact ordinary file and expected hash',async()=>{
    const {dir,wheel,wheelPath}=fixture();
    expect(await verifyPinnedMoonshineWheel(dir,wheel)).toBe(true);
    writeFileSync(wheelPath,'altered wheel bytes');
    expect(await verifyPinnedMoonshineWheel(dir,wheel)).toBe(false);
    expect(await verifyPinnedMoonshineWheel(dir,{...wheel,sha256:'not a hash'})).toBe(false);
    expect(await verifyPinnedMoonshineWheel('relative/wheelhouse',wheel)).toBe(false);
  });
  it('rejects extra wheel payloads, broken files and a symbolic-link wheel',async()=>{
    const {dir,wheel,wheelPath}=fixture();
    writeFileSync(path.join(dir,'other.whl'),'extra');
    expect(await verifyPinnedMoonshineWheel(dir,wheel)).toBe(false);
    rmSync(path.join(dir,'other.whl'));
    rmSync(wheelPath);
    expect(await verifyPinnedMoonshineWheel(dir,wheel)).toBe(false);
    if(process.platform!=='win32'){
      const replacement=path.join(dir,'external.bin');
      writeFileSync(replacement,'test-only');
      symlinkSync(replacement,wheelPath);
      expect(await verifyPinnedMoonshineWheel(dir,wheel)).toBe(false);
    }
  });
  it('ensures installer verifies the download before installing it',()=>{
    const script=readFileSync('scripts/install-moonshine-linux.mts','utf8');
    expect(script).toContain("'pip','download'");
    expect(script).toContain("'--no-deps'");
    expect(script).toContain('verifyPinnedMoonshineWheel(sdkDownload,sdkWheel)');
    expect(script.indexOf('verifyPinnedMoonshineWheel(sdkDownload,sdkWheel)'))
      .toBeLessThan(script.indexOf("'pip','install'"));
    expect(script).toContain('path.join(sdkDownload,sdkWheel.filename)');
    expect(script).toContain('provisionMoonshineDirectory');
  });
});
