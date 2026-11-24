import { describe, expect, it } from 'vitest';
import type { Metafile } from 'esbuild';
import { packageRootForInput, summarizeBundledPackages } from '../scripts/esbuild-license-inventory.mts';

describe('esbuild bundled package license inventory', () => {
  it('uses the last node_modules segment and handles scoped pnpm and Windows paths', () => {
    expect(packageRootForInput('node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js'))
      .toEqual({ root: 'node_modules/.pnpm/pkg@1.0.0/node_modules/pkg', name: 'pkg' });
    expect(packageRootForInput('C:\\repo\\node_modules\\@scope\\pkg\\index.js'))
      .toEqual({ root: 'C:/repo/node_modules/@scope/pkg', name: '@scope/pkg' });
    expect(packageRootForInput('apps/desktop/main.ts')).toBeNull();
    expect(() => packageRootForInput('node_modules/.pnpm/index.js')).toThrow();
  });

  it('aggregates only positive contributions, counts external imports and does not emit input paths', async () => {
    const meta: Metafile = {
      inputs: {},
      outputs: {
        'dist-electron/main.cjs': {
          bytes: 30,
          imports: [{ path: 'electron', kind: 'require-call', external: true }],
          exports: [],
          inputs: {
            'node_modules/pkg/a.js': { bytesInOutput: 12 },
            'node_modules/pkg/b.js': { bytesInOutput: 3 },
            'node_modules/unused/index.js': { bytesInOutput: 0 },
            'apps/desktop/main.ts': { bytesInOutput: 15 },
          },
        },
      },
    };
    const result = await summarizeBundledPackages([meta], async (_root, name) => ({
      name, version: '1.2.3', license: 'MIT', noticeFiles: [], skippedNoticeCount: 0,
    }));
    expect(result).toEqual({
      packages: [{ name: 'pkg', version: '1.2.3', license: 'MIT', noticeFiles: [], skippedNoticeCount: 0, contributedBytes: 15 }],
      externalImportCount: 1,
    });
    expect(JSON.stringify(result)).not.toContain('node_modules');
  });

  it('rejects inconsistent installed package identity', async () => {
    const meta: Metafile = { inputs: {}, outputs: {
      'out.js': { bytes: 1, imports: [], exports: [], inputs: {
        'node_modules/pkg/index.js': { bytesInOutput: 1 },
      } },
    } };
    await expect(summarizeBundledPackages([meta], async () => ({
      name: 'different', version: '1.0.0', license: null, noticeFiles: [], skippedNoticeCount: 0,
    }))).rejects.toThrow();
  });
});
