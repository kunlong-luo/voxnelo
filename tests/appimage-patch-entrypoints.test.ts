import {readFileSync, readdirSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const workflowDir='.github/workflows/';
const linuxEntrypoints=['ci.yml','asr-candidate.yml','release.yml','release-draft.yml','v1.0.4-review-installers.yml'];
describe('Patched Linux installer entrypoints',()=>{
  it('routes every current AppImage workflow through the pinned patch gate',()=>{
    for(const name of linuxEntrypoints){
      const source=readFileSync(workflowDir+name,'utf8');
      expect(source,name).toContain('python3 scripts/pack_linux_patched.py');
      expect(source,name).toContain('squashfs-tools');
    }
    for(const name of readdirSync(workflowDir).filter(name=>name.endsWith('.yml'))){
      const source=readFileSync(workflowDir+name,'utf8');
      expect(source,name).not.toMatch(/run:.*electron-builder --linux.*AppImage/);
      if(source.includes('--linux deb AppImage')){
        expect(linuxEntrypoints,name).toContain(name);
        expect(source,name).toContain("if: runner.os != 'Linux'");
      }
    }
  });
  it('keeps local packaging and actual final installer checks on the guard',()=>{
    const metadata=JSON.parse(readFileSync('package.json','utf8')) as {scripts:Record<string,string>};
    expect(metadata.scripts['pack:linux']).toContain('python3 scripts/pack_linux_patched.py');
    expect(metadata.scripts['pack:linux']).not.toContain('electron-builder --linux');
    expect(readFileSync('scripts/check-desktop-package.mts','utf8')).toContain("'scripts/pack_linux_patched.py','--verify',appImagePath");
  });
});
