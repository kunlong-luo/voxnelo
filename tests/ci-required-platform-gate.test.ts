import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(path.resolve('.github/workflows/ci.yml'), 'utf8');
const jobSource = (name: string): string =>
  source.split('  '+name+':\n')[1]?.split(/\n {2}[a-z][a-z-]*:\n/)[0] ?? '';

describe('Main branch required check gates all desktop platforms', () => {
  it('keeps core quality and three OS package jobs parallel', () => {
    const quality = jobSource('quality');
    const packages = jobSource('desktop-package');
    expect(quality).toContain('name: Core quality');
    for (const step of ['pnpm typecheck', 'pnpm lint', 'pnpm test:coverage', 'pnpm build']) {
      expect(quality).toContain(step);
    }
    expect(quality).not.toContain('needs:');
    expect(packages).toContain('os: [ubuntu-latest, windows-latest, macos-latest]');
    expect(packages).toContain('Install actual Linux DEB via apt');
    expect(packages).toContain('Verify SHA-256 candidate manifest on Linux');
    expect(packages).not.toContain('needs:');
  });

  it('does not let the existing required check pass before Linux or other platforms finish', () => {
    const required = jobSource('check');
    expect(required).toContain('name: check');
    expect(required).toContain('needs: [quality, desktop-package]');
    expect(required).toContain('if: ${{ always() }}');
    expect(required).toContain('QUALITY_RESULT: ${{ needs.quality.result }}');
    expect(required).toContain('PACKAGE_RESULT: ${{ needs.desktop-package.result }}');
    expect(required).toContain('test "${QUALITY_RESULT}" = "success"');
    expect(required).toContain('test "${PACKAGE_RESULT}" = "success"');
  });

  it('keeps PR triggers, platform contexts and read-only token', () => {
    expect(source).toContain('pull_request:\n    branches: [main]');
    expect(source).toContain('contents: read');
    expect(source).toContain('name: Desktop package integrity (${{ matrix.os }})');
    expect(source).toContain('cancel-in-progress: true');
  });
});
