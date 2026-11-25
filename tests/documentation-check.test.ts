import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  auditMarkdown,
  CURRENT_DOCUMENTS,
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
  it('does not scan maintained Markdown entrypoints more than once', () => {
    expect(CURRENT_DOCUMENTS.length).toBe(new Set(CURRENT_DOCUMENTS).size);
    expect(CURRENT_DOCUMENTS).toContain('docs/DEVELOPMENT.md');
  });

  it('keeps current release, privacy, security and audit documents in the required scan', () => {
    for (const file of [
      'CHANGELOG.md',
      'SECURITY.md',
      'docs/PRIVACY.md',
      'docs/design/V3-DICTATION-FIRST-UX-2026-11-23.md',
      'docs/design/V3-VISUAL-PRODUCTION-SPEC.md',
      'docs/engineering/UI-ACCESSIBILITY-AUDIT-2026-11-16.md',
      'docs/release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md',
      'docs/release/V1.0.4-REGISTRY-AUDIT.md',
      'docs/release/V1.0.4-REVIEW-ARTIFACT-HANDOFF-2026-11-24.md',
      'docs/engineering/MOONSHINE-PRIVATE-LICENSE-TEXT-REVIEW-2026-11-24.md',
      'docs/engineering/MOONSHINE-VERSION-MIGRATION-DECISION-2026-11-24.md',
      'docs/engineering/MOONSHINE-V1.0.4-LICENSE-EVIDENCE.md',
      'docs/engineering/MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md',
      'docs/engineering/MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md',
      'docs/release-notes/v1.0.4.md',
      'docs/engineering/ASR-PUBLIC-RELEASE-GATE.md',
      'docs/engineering/TECH-DEBT-2026-11-16.md',
      'docs/engineering/V0.1-CONTENT-REVIEW.md',
      'docs/audits/2026-11-22-MODULE-REACHABILITY.md',
    ]) {
      expect(CURRENT_DOCUMENTS).toContain(file);
    }
  });

  it('checks maintained installation, public-release, contributor and distribution guides', () => {
    for (const file of [
      'AGENTS.md',
      '.github/PULL_REQUEST_TEMPLATE.md',
      'docs/deployment/GITHUB-PAGES-WEB-PREVIEW.md',
      'docs/engineering/MOONSHINE-LINUX-INSTALLATION.md',
      'docs/engineering/MOONSHINE-CROSS-PLATFORM-PILOT.md',
      'docs/engineering/MOONSHINE-DEPENDENCY-EVIDENCE-2026-11-22.md',
      'docs/engineering/GITHUB-RELEASE-DRAFT.md',
      'docs/engineering/STABLE-RELEASE-READINESS.md',
      'docs/engineering/SIGNED-CANDIDATE-SETUP.md',
      'docs/support/POP-OS-24-ENGLISH-TTS.md',
      'docs/release/UNSIGNED-V1-OWNER-DECISION.md',
      'docs/release-notes/v1.0.3.md',
    ]) expect(CURRENT_DOCUMENTS).toContain(file);
  });

  it('separates the public release from the unpublished source candidate in critical docs', () => {
    const privacy = readFileSync(path.resolve('docs/PRIVACY.md'), 'utf8');
    const release = readFileSync(path.resolve('docs/release-notes/v1.0.4.md'), 'utf8');
    const changelog = readFileSync(path.resolve('CHANGELOG.md'), 'utf8');
    expect(privacy).toContain('公开 v1.0.3');
    expect(privacy).toContain('未发布 v1.0.4');
    expect(privacy).toContain('未加密 JSON');
    expect(privacy).not.toContain('导出/恢复功能尚未提供');
    for (const id of ['F102', 'F104', 'F106', 'F107']) {
      expect(release).toContain(id);
      expect(changelog).toContain(id);
    }
    expect(release).toContain('4aeb58e37840d2aec760fac3e348ab18b9ce1be1');
    expect(release).toContain('不是当前');
  });

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

  it('does not treat prose about pnpm as a shell command, while retaining typo checks', () => {
    const markdown = [
      '- pnpm was updated to a stable version.',
      '- pnpm is pinned in the lockfile.',
      '- pnpm typechek',
      'pnpm lint',
    ].join('\n');
    expect(documentedPnpmCommands(markdown)).toEqual(['typechek', 'lint']);
  });

  it('scans nested release docs while excluding root build output and dependencies in all mode', () => {
    withFixture(root => {
      const included = ['docs/release', 'docs/archive/release', 'docs/dist', 'docs/coverage'];
      const excluded = ['release', 'dist', 'dist-electron', 'coverage', '.git', 'node_modules', 'docs/node_modules'];
      for (const directory of [...included, ...excluded]) {
        mkdirSync(path.join(root, directory), { recursive: true });
        writeFileSync(path.join(root, directory, 'probe.md'), '[missing](missing.md)\n');
      }
      const issues = checkDocumentation(root, true);
      expect(issues).toEqual(included.sort().map(directory => ({
        file: directory + '/probe.md', kind: 'missing-file', detail: 'missing.md',
      })));
    });
  });

  it('distinguishes missing maintained files from a passing current documentation set', () => {
    withFixture(root => {
      const issues = checkDocumentation(root);
      expect(issues.some(x => x.kind === 'missing-file')).toBe(true);
    });
  });
});
