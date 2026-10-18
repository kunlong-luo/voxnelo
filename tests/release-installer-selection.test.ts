import { describe, expect, it } from 'vitest';
import { DISCOVER_LOCAL_DEB_NAME, linuxInstallerNames, selectLinuxInstallers } from '../scripts/release-installer-selection.mts';

describe('Voxnelo Linux release artifact selection',()=>{
  const stale=['voxnelo_0.1.0_amd64.deb','Voxnelo-0.1.0.AppImage'];
  const current=['voxnelo_0.1.1_amd64.deb','Voxnelo-0.1.1.AppImage'];
  it('selects the correct 0.1.1 pair even when 0.1.0 is listed first',()=>{
    expect(selectLinuxInstallers([...stale,...current],'0.1.1','x64')).toEqual({
      deb:current[0],appImage:current[1],
    });
    expect(selectLinuxInstallers([...current,...stale],'0.1.1','x64')).toEqual({
      deb:current[0],appImage:current[1],
    });
  });
  it('does not silently accept installers from another version',()=>{
    expect(()=>selectLinuxInstallers(stale,'0.1.1','x64')).toThrow(/current Voxnelo deb installer/);
    expect(()=>selectLinuxInstallers([stale[0]!,current[1]!],'0.1.1','x64')).toThrow(/0\.1\.1_amd64/);
    expect(()=>selectLinuxInstallers([current[0]!,stale[1]!],'0.1.1','x64')).toThrow(/0\.1\.1\.AppImage/);
  });
  it('keeps the versioned Debian name while supporting KDE Discover local-file UI',()=>{
    const canonical=linuxInstallerNames('0.1.5','x64').deb;
    expect(canonical).toBe('voxnelo_0.1.5_amd64.deb');
    // Discover LocalFilePKResource::name() uses QFileInfo::baseName()
    // (the segment before the *first* dot, not before the last dot).
    expect(canonical.split('.')[0]).toBe('voxnelo_0');
    expect(DISCOVER_LOCAL_DEB_NAME).toBe('Voxnelo.deb');
    expect(DISCOVER_LOCAL_DEB_NAME.split('.')[0]).toBe('Voxnelo');
  });
  it('supports Linux arm64 naming and rejects unsupported architectures',()=>{
    expect(linuxInstallerNames('0.1.1','arm64')).toEqual({
      deb:'voxnelo_0.1.1_arm64.deb',appImage:'Voxnelo-0.1.1.AppImage',
    });
    expect(()=>linuxInstallerNames('../bad','x64')).toThrow(/Invalid release version/);
    expect(()=>linuxInstallerNames('0.1.1','ia32')).toThrow(/Unsupported/);
  });
});
