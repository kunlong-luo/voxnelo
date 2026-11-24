#!/usr/bin/env node
/**
 * Linux DEB post-install evidence. This checks *installed package-owned bytes*,
 * not only the electron-builder unpacked input to the installer.
 *
 * Scope: Voxnelo's first-party MIT LICENSE only. Not a third-party legal review,
 * a signature, a real-device microphone test, or release approval.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function selectInstalledVoxneloLicense(ownedFiles: readonly string[]): string {
  const matching = ownedFiles.filter(filename => {
    if (!filename.startsWith('/') || path.posix.normalize(filename) !== filename) return false;
    const segments = filename.split('/');
    return segments.length >= 5 &&
      segments.at(-1) === 'LICENSE' && segments.at(-2) === 'resources' &&
      segments.slice(1, -2).every(part => part.length > 0 && part !== '.' &&
        part !== '..' && !part.includes('\\0'));
  });
  assert.equal(matching.length, 1,
    'Expected exactly one package-owned, installed resources/LICENSE');
  return matching[0]!;
}

export function assertFirstPartyLicenseBytes(expected: Uint8Array, installed: Uint8Array): void {
  assert.ok(expected.byteLength > 100, 'Source MIT LICENSE is unexpectedly short');
  assert.ok(Buffer.from(expected).equals(Buffer.from(installed)),
    'Installed DEB first-party MIT LICENSE differs from tracked source bytes');
}

function runPostInstallCheck(): void {
  assert.equal(process.platform, 'linux', 'Linux DEB post-install check requires Linux');
  const query = spawnSync('dpkg-query', ['-W', '-f=${Status}', 'voxnelo'], {
    encoding: 'utf8', timeout: 15000, maxBuffer: 64 * 1024,
  });
  assert.equal(query.status, 0, 'Cannot query the installed Voxnelo DEB');
  assert.equal(query.stdout.trim(), 'install ok installed',
    'Voxnelo DEB is not installed');
  const list = spawnSync('dpkg', ['-L', 'voxnelo'], {
    encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024,
  });
  assert.equal(list.status, 0, 'Cannot list the installed Voxnelo DEB files');
  const installedPath = selectInstalledVoxneloLicense(list.stdout.split(/\r?\n/));
  assert.ok(lstatSync(installedPath).isFile(),
    'Installed first-party LICENSE must be a regular file, not a symlink');
  assertFirstPartyLicenseBytes(readFileSync(path.resolve('LICENSE')), readFileSync(installedPath));
  console.log('Installed Linux DEB contains exact first-party MIT LICENSE; third-party review PENDING.');
}

if (process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runPostInstallCheck();
}
