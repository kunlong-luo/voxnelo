import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validateReleaseDraftInventory} from '../scripts/validate-release-draft.mts';

const version='1.0.4';
const commit='b'.repeat(40);
const workflowRun='40123456789';
const identity={version,commit,workflowRun};
const sha='a'.repeat(64);
const filesByPlatform={
  linux:['Voxnelo.deb','Voxnelo-1.0.4.AppImage','voxnelo_1.0.4_amd64.deb'],
  win32:['Voxnelo.Setup.1.0.4.exe'],
  darwin:['Voxnelo-1.0.4-arm64.dmg'],
} as const;
const temporary:string[]=[];
afterEach(()=>temporary.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true})));

function fixture():string{
  const dir=mkdtempSync(path.join(tmpdir(),'voxnelo-private-draft-'));
  temporary.push(dir);
  for(const [platform,names] of Object.entries(filesByPlatform)){
    const files=names.map(name=>({name,sizeBytes:2*1024*1024,sha256:sha}));
    const manifest={candidateOnly:true,unsigned:true,publicReleaseApproved:false,
      offlineAsrValidated:false,platform,commit,workflowRun,files};
    writeFileSync(path.join(dir,'candidate-manifest-'+platform+'.json'),JSON.stringify(manifest));
    writeFileSync(path.join(dir,'SHA256SUMS-'+platform+'.txt'),
      files.map(item=>item.sha256+'  '+item.name).join('\n')+'\n');
    for(const item of files)writeFileSync(path.join(dir,item.name),'fixture - bytes verified by workflow sha256sum -c');
  }
  return dir;
}
function editManifest(dir:string,platform:keyof typeof filesByPlatform,change:(manifest:any)=>void):void{
  const pathname=path.join(dir,'candidate-manifest-'+platform+'.json');
  const manifest=JSON.parse(readFileSync(pathname,'utf8'));
  change(manifest);
  writeFileSync(pathname,JSON.stringify(manifest));
}

describe('three-platform private draft inventory and provenance',()=>{
  it('accepts exactly the expected v1.0.4 unsigned manifests and checksums',()=>{
    expect(()=>validateReleaseDraftInventory(fixture(),identity)).not.toThrow();
  });
  it('rejects a prior source commit and a different GitHub workflow run',()=>{
    const dir=fixture();
    editManifest(dir,'darwin',m=>{m.commit='c'.repeat(40)});
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/Mismatched source commit/);
    editManifest(dir,'darwin',m=>{m.commit=commit;m.workflowRun='9999'});
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/Mismatched workflow run/);
  });
  it('rejects wrong version or platform even with plausible SHA-256 values',()=>{
    const dir=fixture();
    editManifest(dir,'win32',m=>{m.files[0].name='Voxnelo.Setup.1.0.3.exe'});
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/inventory/);
    editManifest(dir,'win32',m=>{m.files[0].name='Voxnelo.Setup.1.0.4.exe';m.platform='linux'});
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/Incorrect manifest platform/);
  });
  it('refuses unapproved release state and missing evidence typing',()=>{
    const dir=fixture();
    editManifest(dir,'linux',m=>{m.publicReleaseApproved=true});
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/Unexpected publication approval/);
    editManifest(dir,'linux',m=>{m.publicReleaseApproved=false;m.offlineAsrValidated='yes'});
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/Invalid ASR evidence marker/);
  });
  it('rejects a forged checksums list or mismatched digest',()=>{
    const dir=fixture();
    writeFileSync(path.join(dir,'SHA256SUMS-win32.txt'), 'f'.repeat(64)+'  Voxnelo.Setup.1.0.4.exe\n');
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/digest differs/);
    writeFileSync(path.join(dir,'SHA256SUMS-win32.txt'),
      sha+'  Voxnelo.Setup.1.0.4.exe\n'+sha+'  Voxnelo.Setup.1.0.4.exe\n');
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/Duplicate/);
  });
  it('rejects an additional unreviewed executable and renamed checksum inventory',()=>{
    const dir=fixture();
    writeFileSync(path.join(dir,'Voxnelo-extra.exe'),'not approved');
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/Executable upload attachments/);
    rmSync(path.join(dir,'Voxnelo-extra.exe'));
    writeFileSync(path.join(dir,'SHA256SUMS-other.txt'),'empty\n');
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/Checksums upload attachments/);
  });
  it('rejects a mismatched Linux alias and unsafe SHA256SUMS file names',()=>{
    const dir=fixture();
    editManifest(dir,'linux',m=>{m.files[0].sha256='f'.repeat(64)});
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/digest differs/);
    editManifest(dir,'linux',m=>{m.files[0].sha256=sha});
    writeFileSync(path.join(dir,'SHA256SUMS-linux.txt'),
      sha+'  ../../private.wav\n'+sha+'  voxnelo_1.0.4_amd64.deb\n');
    expect(()=>validateReleaseDraftInventory(dir,identity)).toThrow(/Invalid linux SHA256SUMS record/);
  });
});
