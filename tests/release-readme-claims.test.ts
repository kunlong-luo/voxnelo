import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve('.');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
const packageInfo = JSON.parse(read('package.json')) as { version: string };

// Exempt only these exact maintained Markdown destinations, not their visible
// link labels or other README text. The local-link test still checks existence.
const withoutReviewLinkDestinations = (content: string) =>
  content.replace(/\]\(docs\/release\/V1\.0\.4-(?:RELEASE-FREEZE|PHYSICAL-DEVICE-EVIDENCE)\.md\)/g, ']');
const unsupportedClaim = /SpeakFeed|Speak Karaoke|Smart Prompt|V1\.0|coming soon|敬请期待/;


describe('Current release README claims (English first, Chinese equivalent)', () => {
  const en = read('README.md');
  const zh = read('README.zh-CN.md');

  it('keeps exactly two root README files and reciprocal language links', () => {
    expect(readdirSync(root).filter(name => /^README(?:\.[^.]+)?\.md$/.test(name)).sort())
      .toEqual(['README.md', 'README.zh-CN.md']);
    expect(en).toContain('[简体中文](README.zh-CN.md)');
    expect(zh).toContain('[English](README.md)');
    expect(existsSync(path.join(root, 'docs/DEVELOPMENT.md'))).toBe(true);
  });

  it('describes only what current packaged Voxnelo implements', () => {
    expect(en).toContain(packageInfo.version);
    expect(zh).toContain(packageInfo.version);
    for (const phrase of [
      '40 starter sentences', '240 additional review-pending drafts', 'text-to-speech', 'microphone', 'record',
      'favorites', 'history', 'IndexedDB', 'Leo Luo',
    ]) expect(en.toLowerCase()).toContain(phrase.toLowerCase());
    for (const phrase of ['40 条入门短句', '240 条待审校扩展草稿', '系统', '麦克风', '回听', '收藏', '历史', 'IndexedDB', 'Leo Luo'])
      expect(zh).toContain(phrase);

    for (const content of [en, zh]) {
      expect(withoutReviewLinkDestinations(content)).not.toMatch(unsupportedClaim);
      expect(content).toContain(packageInfo.version);
    }
    expect(en).toContain('deliberately omit unreviewed IPA');
    expect(zh).toContain('不应视为全部通过语言学或版权审核');
    // Linux now defaults to Moonshine, but its Python runtime and model are
    // installed separately by a user gesture, never bundled or auto-run.
    expect(en).toContain('Linux desktop uses Moonshine Medium Streaming');
    expect(en).toContain('Standard installers do not bundle');
    expect(en).toContain('no automatic pronunciation scoring');
    expect(zh).toContain('Linux 默认使用 Moonshine Medium Streaming');
    expect(zh).toContain('标准安装包不内置第三方模型');
    expect(zh).toContain('没有自动发音评分');
    expect(en).toContain('GitHub Releases');
    expect(zh).toContain('GitHub Releases');
    expect(en).toContain('unsigned');
    expect(zh).toContain('未签名');
  });

  it('allows only the current review document destinations without hiding unsupported claims', () => {
    for (const content of [en, zh]) {
      expect(content).toContain('(docs/release/V1.0.4-RELEASE-FREEZE.md)');
      expect(content).toContain('(docs/release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md)');
    }
    expect(withoutReviewLinkDestinations('[review](docs/release/V1.0.4-RELEASE-FREEZE.md)')).not.toMatch(unsupportedClaim);
    for (const invalid of [
      '[V1.0](docs/release/V1.0.4-RELEASE-FREEZE.md)',
      '[SpeakFeed](docs/release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md)',
      'coming soon [review](docs/release/V1.0.4-RELEASE-FREEZE.md)',
      '[review](docs/release/V1.0-OLD.md)',
    ]) expect(withoutReviewLinkDestinations(invalid)).toMatch(unsupportedClaim);
  });

  it('keeps local Markdown links valid across both languages and the development guide', () => {
    for (const filename of ['README.md', 'README.zh-CN.md', 'docs/DEVELOPMENT.md']) {
      const contents = read(filename);
      for (const match of contents.matchAll(/\]\(([^)]+)\)/g)) {
        const target = match[1]!;
        if (/^(?:https?:|mailto:|#)/.test(target)) continue;
        const relative = target.split('#', 1)[0]!;
        expect(existsSync(path.resolve(root, path.dirname(filename), relative)),
          `Missing link from ${filename}: ${relative}`).toBe(true);
      }
    }
  });
});

describe('Release approval and guarded Linux Early Access workflow', () => {
  it('requires explicit intent before building or uploading installers', () => {
    const workflow = read('.github/workflows/release-draft.yml');
    expect(workflow).toMatch(/on:\s*\n\s+workflow_dispatch:/);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).toContain('PREPARE_DRAFT_ONLY');
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain('package.json');
    expect(workflow).toContain('--draft --prerelease');
    expect(workflow).toContain('Reject a version already used by a private Draft, published Release or tag');
    expect(workflow).toContain('Recheck version collision immediately before creating a private Draft');
    expect(workflow).toContain('scripts/assert-release-tag-vacant.mts');
    expect(workflow).toContain('sha256sum -c');
    expect(workflow).toContain('Voxnelo.deb');
    expect(workflow).toContain('if: github.repository ==');
    expect(workflow).not.toContain('gh release edit');
  });

  it('preserves the archived Linux Early Access release validation evidence', () => {
    const workflow = read('docs/archive/workflows/publish-linux-v0.1.5.yml');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).toContain('if: false && github.repository');
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('pnpm check');
    expect(workflow).toContain('VOXNELO_REQUIRE_INSTALLERS');
    expect(workflow).toContain('sha256sum --check SHA256SUMS-linux.txt');
    expect(workflow).toContain('sudo apt-get install -y ./release/voxnelo_0.1.5_amd64.deb');
    expect(workflow).toContain('gh release create v0.1.5');
    expect(workflow).toContain('--prerelease');
    expect(workflow).not.toContain('--draft --prerelease');
    expect(workflow).toContain("gh release view v0.1.5");
    expect(workflow).toContain('git ls-remote --exit-code --tags');
    expect(workflow).not.toContain('release/*.exe');
    expect(workflow).not.toContain('release/*.dmg');
  });

  it('preserves archived three-platform Early Access integrity checks', () => {
    const workflow = read('docs/archive/workflows/publish-all-v0.1.6.yml');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).toContain('if: false # retired');
    expect(workflow).toContain('windows-latest');
    expect(workflow).toContain('macos-latest');
    expect(workflow).toContain('ubuntu-24.04');
    expect(workflow).toContain('VOXNELO_REQUIRE_INSTALLERS');
    expect(workflow).toContain('sha256sum -c');
    expect(workflow).toContain('*.exe');
    expect(workflow).toContain('*.dmg');
    expect(workflow).toContain('*.AppImage');
    expect(workflow).toContain('v0.1.6');
    expect(workflow).toContain('--prerelease');
    expect(workflow).toContain('Refuse to overwrite');
    expect(workflow).not.toContain('gh release edit');
  });


  it('preserves the retired v0.1.7 private draft gate as non-executable evidence', () => {
    const workflow = read('docs/archive/workflows/prepare-v0.1.7-draft-once.yml');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).toContain('if: false # retired');
    expect(workflow).toContain("RELEASE_VERSION: '0.1.7'");
    expect(workflow).toContain('PREPARE_DRAFT_ONLY');
    expect(workflow).toContain('pnpm audit --prod --audit-level high');
    expect(workflow).toContain('pnpm asr:verify-real');
    expect(workflow).toContain('sha256sum -c');
    expect(workflow).toContain('Verify actual installers');
    expect(workflow).toContain('Refuse to overwrite an existing release or version tag');
    expect(workflow).toContain('Existing version tag; refusing to overwrite');
    expect(workflow).toContain('--draft --prerelease');
    expect(workflow).toContain('Build unsigned OS installers');
    expect(workflow).not.toMatch(/gh release (?:edit|upload|publish)/);
    expect(workflow).not.toMatch(/^\s+tags:/m);
    expect(workflow).toContain("test \"$GITHUB_REPOSITORY\" = 'kunlong-luo/voxnelo'");
  });
  it('permanently retires historical one-shot release jobs after their exact versions exist', () => {
    for (const pathname of [
      'docs/archive/workflows/publish-linux-v0.1.5.yml',
      'docs/archive/workflows/publish-all-v0.1.6.yml',
      'docs/archive/workflows/prepare-v0.1.7-draft-once.yml',
    ]) {
      const workflow = read(pathname);
      expect(workflow).not.toMatch(/^\s+push:/m);
      expect(workflow).toContain('workflow_dispatch:');
      expect(workflow).toMatch(/\bif: false\b/);
    }
  });
  it('provides a truthful unsigned official release note and provenance explanation', () => {
    const notes = read('docs/release-notes/v' + packageInfo.version + '.md');
    expect(notes).toContain(packageInfo.version);
    expect(notes).toContain('尚未');
    expect(notes).toContain('未完成');
    expect(notes).toContain('模型不随安装包内置');
    expect(notes).toContain('未签名');
    expect(notes).toContain('Linux x64');
    expect(read('docs/engineering/GITHUB-RELEASE-DRAFT.md')).toContain('Publish release');
  });
});
