import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkToolchainConsistency,
  MAINTAINED_WORKFLOWS,
  type ToolchainInputs,
} from '../scripts/check-toolchain-consistency.mts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (filename: string): string => readFileSync(path.join(root, filename), 'utf8');

function fixture(): ToolchainInputs {
  return {
    manifest: JSON.stringify({
      packageManager: 'pnpm@12.22.0',
      devDependencies: { '@types/node': '^26.6.6' },
    }),
    lockfile: [
      '---', "lockfileVersion: '9.0'", 'importers:', '  .:',
      '    packageManagerDependencies:', '      pnpm:',
      '        specifier: 12.22.0', '        version: 12.22.0',
      'packages:', '  pnpm@12.22.0:',
      '    resolution: {integrity: sha512-ABC123+/=}',
    ].join('\n'),
    developmentGuide: '- Node.js 26 (Active LTS)\n\nnpm install --global pnpm@12.22.0\n',
    workflows: Object.fromEntries(MAINTAINED_WORKFLOWS.map(({ path: filename, usesPnpm }) => [
      filename,
      [
        'steps:',
        '  - uses: actions/setup-node@fixedsha',
        '    with:',
        "      node-version: '26'",
        ...(usesPnpm ? [
          '  - uses: pnpm/action-setup@fixedsha',
          '    with:',
          '      version: 12.22.0',
        ] : []),
      ].join('\n'),
    ])),
  };
}

describe('Node and pnpm stable toolchain consistency', () => {
  it('accepts a matching pnpm 12 lockfile, Node types, guide and maintained workflows', () => {
    expect(checkToolchainConsistency(fixture())).toEqual([]);
  });

  it('checks current repository versions, with archived one-time workflows excluded', () => {
    const result = checkToolchainConsistency({
      manifest: read('package.json'),
      lockfile: read('pnpm-lock.yaml'),
      developmentGuide: read('docs/DEVELOPMENT.md'),
      workflows: Object.fromEntries(MAINTAINED_WORKFLOWS.map(({ path: filename }) =>
        [filename, read(filename)])),
    });
    expect(result).toEqual([]);
    expect(MAINTAINED_WORKFLOWS.every(entry => !/publish-all-v|prepare-v|review-installers/.test(entry.path))).toBe(true);
  });

  it('rejects mismatch between root pnpm pin and lockfile artifact', () => {
    const input = fixture();
    input.manifest = input.manifest.replace('pnpm@12.22.0', 'pnpm@12.21.0');
    expect(checkToolchainConsistency(input)).toEqual(expect.arrayContaining([
      expect.stringContaining('pinned pnpm specifier/version'),
      expect.stringContaining('artifact SHA-512'),
    ]));
  });

  it('rejects missing pnpm artifact integrity even if the version matches', () => {
    const input = fixture();
    input.lockfile = input.lockfile.replace('sha512-ABC123+/=', 'unknown');
    expect(checkToolchainConsistency(input)).toEqual(expect.arrayContaining([
      expect.stringContaining('artifact SHA-512'),
    ]));
  });

  it('catches Node or pnpm drift inside any maintained workflow', () => {
    const input = fixture();
    const first = MAINTAINED_WORKFLOWS[0]!.path;
    input.workflows = { ...input.workflows, [first]: input.workflows[first]!
      .replace("node-version: '26'", "node-version: '22'")
      .replace('version: 12.22.0', 'version: 12.11.2') };
    expect(checkToolchainConsistency(input)).toEqual(expect.arrayContaining([
      expect.stringContaining('setup-node version(s)'),
      expect.stringContaining('pnpm/action-setup version(s)'),
    ]));
  });

  it('rejects incomplete setup steps and stale instructions', () => {
    const input = fixture();
    const first = MAINTAINED_WORKFLOWS[0]!.path;
    input.workflows = { ...input.workflows, [first]: 'steps:\n  - uses: actions/checkout@fixedsha\n' };
    input.developmentGuide = '- Node.js 22 (Active LTS)\n\nnpm install --global pnpm@12.11.2';
    expect(checkToolchainConsistency(input)).toEqual(expect.arrayContaining([
      expect.stringContaining('setup-node version(s)'),
      expect.stringContaining('pnpm/action-setup version(s)'),
      expect.stringContaining('documented Node Active LTS'),
      expect.stringContaining('documented pnpm bootstrap'),
    ]));
  });
});
