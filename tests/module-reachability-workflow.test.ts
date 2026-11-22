import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAINTAINED_WORKFLOWS } from '../scripts/check-toolchain-consistency.mts';

const file = '.github/workflows/module-reachability-audit.yml';
const workflow = readFileSync(path.resolve(file), 'utf8');

describe('On-demand read-only module inventory', () => {
  it('stays manually runnable and does not run on every unrelated PR or push', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('pull_request:\n    paths:');
    expect(workflow).not.toContain('  push:');
    for (const watched of [
      file,
      'scripts/audit-module-reachability.mts',
      'tsconfig.json',
      'rsbuild.config.ts',
      'scripts/build-electron.mts',
      'scripts/build-audio-worklet.mts',
    ]) {
      expect(workflow).toContain("- '"+watched+"'");
    }
  });

  it('uses pinned tools with read-only permissions and uploads only the JSON audit', () => {
    expect(MAINTAINED_WORKFLOWS.some(entry => entry.path === file)).toBe(true);
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).toContain('pnpm install --frozen-lockfile');
    expect(workflow).toContain('node --experimental-strip-types scripts/audit-module-reachability.mts --json');
    expect(workflow).toContain('module-reachability-report');
    expect(workflow).toContain('retention-days: 7');
    expect(workflow).not.toMatch(/\b(?:git push|git tag|gh release|rm -rf)\b/);
  });

  it('makes review candidates informational, not an automated deletion gate', () => {
    expect(workflow).toContain('Review candidates (NOT approved for deletion)');
    expect(workflow).toContain('no file may be deleted from this report alone');
    expect(workflow).toContain('GITHUB_STEP_SUMMARY');
    expect(workflow).not.toContain('test "${report.reviewCandidates.length}" = "0"');
  });
});
