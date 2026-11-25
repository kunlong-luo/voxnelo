import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (filename: string) => readFileSync(path.resolve('.github/workflows', filename), 'utf8');
function pullRequestPaths(yaml: string): string[] {
  const section = yaml.split('  pull_request:\n    paths:\n')[1]?.split(/\n {2}[a-z][\w-]*:/)[0] ?? '';
  return [...section.matchAll(/^\s+- '([^']+)'$/gm)].map(match => match[1]!);
}

describe('Expensive native ASR / dependency workflow trigger scope', () => {
  it('cancels superseded checks for the same pull request across all heavy workflows', () => {
    for (const workflow of ['moonshine-candidate.yml', 'security-dependency-audit.yml', 'asr-candidate.yml']) {
      const yaml = read(workflow);
      expect(yaml).toContain('concurrency:');
      expect(yaml).toContain('github.event.pull_request.number || github.ref');
      expect(yaml).toContain('cancel-in-progress: true');
    }
  });
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

describe('Live GitHub Actions dependency pinning', () => {
  it('requires full commit hashes for every direct external uses entry in active workflows', () => {
    const workflows = readdirSync(path.resolve('.github/workflows'))
      .filter(name => /\.ya?ml$/.test(name));
    expect(workflows.length).toBeGreaterThan(0);
    for (const workflow of workflows) {
      const yaml = read(workflow);
      for (const entry of yaml.matchAll(/^\s*(?:-\s*)?uses:\s*([^\n#]+)/gm)) {
        const ref = entry[1]!.trim().replace(/^['"]|['"]$/g, '');
        if (ref.startsWith('./')) continue;
        expect(ref, workflow + ': ' + ref).toMatch(/^[^@\s]+@[a-f0-9]{40}$/);
      }
    }
  });
});
