import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LINUX_DESKTOP_FILENAME, LINUX_ICON_RESOURCE, resolveLinuxIconPath } from '../apps/desktop/linuxAppIdentity';

const config = JSON.parse(readFileSync(path.resolve('package.json'), 'utf8'));

describe('Voxnelo Linux dock and taskbar icon', () => {
  it('uses the same stable desktop identity in Electron and generated Debian/AppImage launchers', () => {
    expect(LINUX_DESKTOP_FILENAME).toBe('app.voxnelo.desktop.desktop');
    expect(config.desktopName).toBe(LINUX_DESKTOP_FILENAME);
    expect(config.build.linux.syncDesktopName).toBe(true);
    expect(config.build.linux.desktop.entry.StartupWMClass).toBe('app.voxnelo.desktop');
    expect(config.build.linux.category).toBe('Education');
  });

  it('references a real PNG for development and includes it in packaged resources', () => {
    const root = path.resolve('.');
    expect(resolveLinuxIconPath({ isPackaged:false, bundleDir:path.join(root,'dist-electron'), resourcesPath:'/unused' }))
      .toBe(path.join(root,'build','icon.png'));
    expect(resolveLinuxIconPath({ isPackaged:true, bundleDir:'/unused', resourcesPath:'/opt/Voxnelo/resources' }))
      .toBe(path.join('/opt/Voxnelo/resources',LINUX_ICON_RESOURCE));
    expect(config.build.extraResources).toContainEqual({ from:'build/icon.png', to:'icons/voxnelo.png' });
    expect(config.build.linux.icon).toBe('build/icon.png');

    const image = readFileSync(path.join(root,'build','icon.png'));
    expect(image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))).toBe(true);
    expect(image.toString('ascii',12,16)).toBe('IHDR');
    expect(image.readUInt32BE(16)).toBeGreaterThanOrEqual(256);
    expect(image.readUInt32BE(20)).toBeGreaterThanOrEqual(256);
  });

  it('dev launcher can be registered and removed without changing the global system launcher', () => {
    expect(config.scripts['icon:linux:dev']).toContain('register-linux-dev-launcher.mts');
    expect(config.scripts['icon:linux:dev:remove']).toContain('--remove');
    const launcher = readFileSync(path.resolve('scripts/register-linux-dev-launcher.mts'),'utf8');
    expect(launcher).toContain('app.voxnelo.desktop.desktop');
    expect(launcher).toContain('StartupWMClass=app.voxnelo.desktop');
    expect(launcher).toContain('build');
    expect(launcher).not.toContain('sudo ');
  });
});
