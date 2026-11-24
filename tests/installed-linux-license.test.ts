import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assertFirstPartyLicenseBytes,
  selectInstalledVoxneloLicense,
} from '../scripts/check-installed-linux-license.mts';

describe('actual Linux DEB first-party MIT license evidence', () => {
  const installed = '/opt/Voxnelo/resources/LICENSE';

  it('selects exactly one canonical resources/LICENSE listed by dpkg -L', () => {
    expect(selectInstalledVoxneloLicense([
      '/opt/Voxnelo/resources/app.asar',
      '/usr/share/applications/app.voxnelo.desktop.desktop',
      installed,
    ])).toBe(installed);
  });

  it('refuses missing, duplicate, relative or traversal-like package-owned files', () => {
    expect(() => selectInstalledVoxneloLicense([])).toThrow(/exactly one/);
    expect(() => selectInstalledVoxneloLicense([installed, '/usr/lib/Voxnelo/resources/LICENSE']))
      .toThrow(/exactly one/);
    for (const bad of [
      'opt/Voxnelo/resources/LICENSE',
      '/opt/../somewhere/resources/LICENSE',
      '/opt//Voxnelo/resources/LICENSE',
      '/resources/LICENSE',
      '/opt/Voxnelo/resources/OTHER',
    ]) {
      expect(() => selectInstalledVoxneloLicense([bad])).toThrow(/exactly one/);
    }
  });

  it('compares the installed actual bytes with the original MIT text', () => {
    const source = readFileSync('LICENSE');
    expect(() => assertFirstPartyLicenseBytes(source, Buffer.from(source))).not.toThrow();
    expect(() => assertFirstPartyLicenseBytes(source, Buffer.concat([source, Buffer.from('extra')])))
      .toThrow(/differs/);
    expect(() => assertFirstPartyLicenseBytes(Buffer.from('short'), source))
      .toThrow(/unexpectedly short/);
  });

  it('connects every supported Linux apt installer workflow to the installed-byte check', () => {
    const command = 'node --experimental-strip-types scripts/check-installed-linux-license.mts';
    for (const filename of [
      '.github/workflows/ci.yml',
      '.github/workflows/v1.0.4-review-installers.yml',
      '.github/workflows/release-draft.yml',
      '.github/workflows/release.yml',
    ]) {
      const workflow = readFileSync(filename, 'utf8');
      const install = workflow.indexOf('sudo apt-get install -y');
      expect(install, filename).toBeGreaterThan(-1);
      expect(workflow.indexOf(command, install), filename).toBeGreaterThan(install);
      expect(workflow.split(command).length - 1, filename).toBe(1);
    }
  });
});
