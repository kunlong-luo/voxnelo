import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (filename: string) => readFileSync(path.resolve('.github/workflows', filename), 'utf8');
function pullRequestPaths(yaml: string): string[] {
  const section = yaml.split('  pull_request:\n    paths:\n')[1]?.split(/\n {2}[a-z][\w-]*:/)[0] ?? '';
  return [...section.matchAll(/^\s+- '([^']+)'$/gm)].map(match => match[1]!);
}

describe('Expensive native ASR / dependency workflow trigger scope', () => {
  it('runs real Moonshine comparison for changed model/runtime sources, not all pnpm script edits', () => {
    const yaml = read('moonshine-candidate.yml');
    const paths = pullRequestPaths(yaml);
    expect(yaml).toContain('workflow_dispatch:');
    expect(paths).toContain('scripts/moonshine-stream-pilot.py');
    expect(paths).toContain('scripts/install-moonshine-linux.mts');
    expect(paths).toContain('apps/desktop/moonshineIntegrity.ts');
    expect(paths).not.toContain('package.json');
    expect(paths).not.toContain('pnpm-lock.yaml');
  });

  it('audits locked dependency changes weekly or manually, not a script-only package.json edit', () => {
    const yaml = read('security-dependency-audit.yml');
    const paths = pullRequestPaths(yaml);
    expect(paths).toContain('pnpm-lock.yaml');
    expect(paths).toContain('scripts/install-moonshine-linux.mts');
    expect(paths).not.toContain('package.json');
    expect(yaml).toContain("cron: '17 8 * * 1'");
    expect(yaml).toContain('workflow_dispatch:');
  });

  it('retains a single trigger for the historical ASR platform candidate check', () => {
    const yaml = read('asr-candidate.yml');
    expect(pullRequestPaths(yaml).filter(name => name === 'scripts/check-platform-asr-candidate.mts'))
      .toHaveLength(1);
    expect(yaml).toContain('workflow_dispatch:');
  });
});
