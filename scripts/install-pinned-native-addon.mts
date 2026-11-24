#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const NATIVE_ADDON_VERSION = '1.13.8';
export const NATIVE_ADDON_PNPM_VERSION = '12.22.0';

// Isolated disposable workspace: hoisted packages are required because the
// existing staging audit deliberately refuses runtime symlinks. Do not change
// the application's workspace, lockfile, package versions or installed model.
export async function installPinnedNativeAddon(root: string, runtime = 'pnpm'): Promise<void> {
  assert.ok(path.isAbsolute(root), 'Native addon sandbox must be absolute');
  await mkdir(root, { mode: 0o700 });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({
    name: 'voxnelo-native-addon-sandbox', private: true,
    packageManager: 'pnpm@' + NATIVE_ADDON_PNPM_VERSION,
    dependencies: { 'sherpa-onnx-node': NATIVE_ADDON_VERSION },
  }, null, 2) + '\n', { flag: 'wx' });
  await writeFile(path.join(root, 'pnpm-workspace.yaml'),
    'packages: []\nnodeLinker: hoisted\nignoreScripts: true\n', { flag: 'wx' });
  const result = spawnSync(runtime, ['install', '--no-frozen-lockfile', '--ignore-scripts'], {
    cwd: root, stdio: 'inherit', timeout: 600000,
    // Windows action setup may provide a command shim. Arguments are fixed.
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'Native pnpm installation failed');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2];
  assert.ok(root && process.argv.length === 3, 'Provide a new absolute sandbox directory');
  await installPinnedNativeAddon(root);
}
