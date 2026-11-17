import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  auditMarkdown,
  checkDocumentation,
  documentedPnpmCommands,
  localMarkdownLinks,
} from '../scripts/check-documentation.mts';

function withFixture(run: (root: string) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), 'voxnelo-docs-check-'));
  try {
    mkdirSync(path.join(root, 'docs'), { recursive: true });
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      scripts: { typecheck: 'tsc --noEmit', 'content:audio:verify': 'node check.mts' },
    }));
    writeFileSync(path.join(root, 'docs', 'existing file.md'), '# Example\n');
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('documentation link and command validation', () => {
  it('recognizes relative links, images and reference definitions but not fenced examples', () => {
    const fence = '\x60'.repeat(3);
    const markdown = [
      '[read](docs/guide.md#first)',
      '![asset](assets/logo.png)',
      '[reference]: docs/check.md',
      '[site](https://example.com)',
      fence + 'md',
      '[fake](docs/missing.md)',
      fence,
    ].join('\n');
    expect(localMarkdownLinks(markdown)).toEqual([
      'docs/guide.md#first', 'assets/logo.png', 'https://example.com', 'docs/check.md',
    ]);
  });

  it('accepts encoded local filenames and ignores URLs and fragments', () => {
    withFixture(root => {
      const issues = auditMarkdown(root, 'docs/README.md', [
        '[local](existing%20file.md#section)',
        '[external](https://example.com)',
        '[fragment](#part)',
        '[email](mailto:hello@example.com)',
        'pnpm typecheck',
      ].join('\n'), new Set(['typecheck']));
      expect(issues).toEqual([]);
    });
  });

  it('reports nonexistent documents, path escape and malformed percent encoding', () => {
    withFixture(root => {
      const issues = auditMarkdown(root, 'docs/README.md', [
        '[missing](not-present.md)',
        '[escape](../../private.md)',
        '[bad](%ZZ.md)',
      ].join('\n'), new Set());
      expect(issues.map(x => x.kind)).toEqual([
        'missing-file', 'outside-repo', 'invalid-link',
      ]);
    });
  });

  it('rejects misspelled pnpm scripts without blocking documented builtins', () => {
    const markdown = [
      'pnpm --silent content:audio:verify',
      'corepack pnpm install --frozen-lockfile',
      'pnpm exec vitest run',
      'pnpm typechek',
    ].join('\n');
    expect(documentedPnpmCommands(markdown)).toEqual([
      'content:audio:verify', 'install', 'exec', 'typechek',
    ]);
    withFixture(root => {
      expect(auditMarkdown(root, 'docs/README.md', markdown,
        new Set(['content:audio:verify'])))
        .toEqual([{ file: 'docs/README.md', kind: 'unknown-script', detail: 'pnpm typechek' }]);
    });
  });

  it('distinguishes missing maintained files from a passing current documentation set', () => {
    withFixture(root => {
      const issues = checkDocumentation(root);
      expect(issues.some(x => x.kind === 'missing-file')).toBe(true);
    });
  });
});
