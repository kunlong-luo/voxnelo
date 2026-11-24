import { describe, expect, it } from 'vitest';
import { summarizeRendererPackages } from '../scripts/renderer-license-inventory.mts';

describe('renderer chunk-associated license inventory', () => {
  it('includes nested members of active concatenated modules and excludes inactive modules', async () => {
    const result = await summarizeRendererPackages({ children: [{ modules: [
      { chunks: [1], nameForCondition: '/repo/node_modules/react/index.js' },
      { chunks: [2], modules: [
        { nameForCondition: '/repo/node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/a.js', chunks: [] },
        { nameForCondition: '/repo/node_modules/pkg/b.js' },
      ] },
      { chunks: [], nameForCondition: '/repo/node_modules/unused/index.js' },
    ] }] }, async (_root, name) => ({ name, version: '1.0.0', license: 'MIT', noticeFiles: [], skippedNoticeCount: 0 }));
    expect(result.packages.map(pkg => pkg.name)).toEqual(['pkg', 'react']);
    expect(result.activeModuleCount).toBe(4);
    expect(result.unidentifiedModuleCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain('/repo/');
  });

  it('rejects mismatched package identities', async () => {
    await expect(summarizeRendererPackages({ modules: [
      { chunks: ['main'], nameForCondition: 'node_modules/react/index.js' },
    ] }, async () => ({ name: 'other', version: '1.0.0', license: null, noticeFiles: [], skippedNoticeCount: 0 }))).rejects.toThrow();
  });
});
