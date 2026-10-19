#!/usr/bin/env node
/**
 * Fail before the expensive build when the requested installer format needs
 * host-only tools (e.g. macOS sips/hdiutil for DMG creation).
 *
 * Windows NSIS cross-packaging on Linux/macOS may work, but it is NOT a
 * substitute for executing the installer and microphone tests on Windows.
 */
import { pathToFileURL } from 'node:url';

export type DesktopPackageTarget = 'linux' | 'windows' | 'mac';
export type PackagePreflight = { ok: boolean; message: string };

export function checkPackagingPlatform(
  target: DesktopPackageTarget,
  host: NodeJS.Platform,
): PackagePreflight {
  if (target === 'mac' && host !== 'darwin') {
    return {
      ok: false,
      message: `Voxnelo packaging: macOS DMG requires a macOS host (sips and hdiutil). Current host: ${host}. Use pnpm pack:linux on Linux, or the macos-latest runner in GitHub Actions to build a DMG.`,
    };
  }
  if (target === 'linux' && host !== 'linux') {
    return {
      ok: false,
      message: `Voxnelo packaging: Linux DEB/AppImage must be built on Linux. Current host: ${host}. Use GitHub Actions for a cross-platform candidate.`,
    };
  }
  if (target === 'windows' && host !== 'win32') {
    return {
      ok: true,
      message: `Voxnelo packaging: cross-building an unsigned Windows NSIS installer on ${host}. A generated .exe or signtool log does not prove Authenticode signing or Windows runtime compatibility; verify on real Windows before release.`,
    };
  }
  return { ok: true, message: `Voxnelo packaging: ${target} target on ${host} host.` };
}

const invokedAsScript = !!process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedAsScript) {
  const target = process.argv[2];
  if (target !== 'mac' && target !== 'linux' && target !== 'windows') {
    console.error('Usage: check-packaging-platform.mts <linux|windows|mac>');
    process.exitCode = 2;
  } else {
    const result = checkPackagingPlatform(target, process.platform);
    if (!result.ok) {
      console.error(result.message);
      process.exitCode = 1;
    } else if (target === 'windows' && process.platform !== 'win32') {
      console.warn(result.message);
    } else {
      console.log(result.message);
    }
  }
}
