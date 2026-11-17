import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');
const baseline = 'docs/Voxnelo-Product-Docs-v1.0/docs/02-产品需求PRD.md';
const matrixFile = 'docs/release/PRD-TRACEABILITY.md';
const idPattern = /^\|\s*((?:F|S)\d{3})\s*\|/gm;
const statuses = [
  '代码证据已定位；待验收',
  '部分实现；验收未闭合',
  '未找到完整实现',
  '语料未完成审核',
] as const;

describe('frozen PRD evidence matrix integrity (no acceptance certification)', () => {
  it('lists exactly the frozen PRD IDs, once each, including future V1 feature IDs', () => {
    const original = [...read(baseline).matchAll(idPattern)].map(match => match[1]);
    const tracked = [...read(matrixFile).matchAll(idPattern)].map(match => match[1]);
    expect(original).toHaveLength(23);
    expect(new Set(original).size).toBe(original.length);
    expect(new Set(tracked).size).toBe(tracked.length);
    expect(tracked).toEqual(original);
  });

  it('keeps mapped implementation and test evidence as actual local paths', () => {
    const rows = read(matrixFile).split('\n').filter(line => /^\|\s*[FS]\d{3}\s*\|/.test(line));
    expect(rows).toHaveLength(23);
    for (const row of rows) {
      const columns = row.split('|').map(cell => cell.trim());
      const id = columns[1];
      const implementation = columns[3] ?? '';
      const tests = columns[4] ?? '';
      const verdict = columns[5] ?? '';
      expect(columns).toHaveLength(7);
      expect(implementation, id).toMatch(/apps\/|packages\//);
      expect(tests, id).toContain('tests/');
      expect(statuses.some(status => verdict.includes(status)), id).toBe(true);

      for (const [cell, expected] of [
        [implementation, /^(?:apps|packages)\//],
        [tests, /^tests\//],
      ] as const) {
        const links = [...cell.matchAll(/\[\x60([^\x60]+)\x60\]\(\.\.\/\.\.\/([^)]+)\)/g)];
        expect(links.length, String(id) + ': evidence needs relative repository links').toBeGreaterThan(0);
        for (const [, label, target] of links) {
          expect(label, String(id) + ': link label and target mismatch').toBe(target);
          expect(label, String(id) + ': unexpected evidence type').toMatch(expected);
          expect(existsSync(path.join(root, target!)), String(id) + ': missing ' + target).toBe(true);
        }
      }
    }
  });

  it('keeps release, linguist approval and ASR measurements explicitly distinct from code presence', () => {
    const markdown = read(matrixFile);
    expect(markdown).toContain('未公开候选源码');
    expect(markdown).toContain('v1.0.3');
    expect(markdown).toContain('needs-review');
    expect(markdown).toContain('未测量');
    expect(markdown).toContain('并非自动化用例全部通过');
  });
});
