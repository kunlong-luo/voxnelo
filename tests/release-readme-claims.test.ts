import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve('.');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
const packageInfo = JSON.parse(read('package.json')) as { version: string };

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
      '40 English sentences', 'text-to-speech', 'microphone', 'record',
      'favorites', 'history', 'IndexedDB', 'Leo Luo',
    ]) expect(en.toLowerCase()).toContain(phrase.toLowerCase());
    for (const phrase of ['40 条', '系统', '麦克风', '回听', '收藏', '历史', 'IndexedDB', 'Leo Luo'])
      expect(zh).toContain(phrase);

    for (const content of [en, zh]) {
      expect(content).not.toMatch(/SpeakFeed|Speak Karaoke|Smart Prompt|V1\.0|coming soon|敬请期待/);
      expect(content).toContain('0.1.5');
    }
    expect(en).toContain('do **not** bundle a third-party offline speech-recognition engine');
    expect(zh).toContain('不包含第三方离线语音识别引擎');
    expect(en).toContain('no automatic pronunciation score');
    expect(zh).toContain('没有自动发音评分');
    expect(en).toContain('no published GitHub Release');
    expect(zh).toContain('尚未发布该版本的公开 GitHub Release');
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

describe('Release workflow remains manual and draft-only', () => {
  it('requires explicit intent before building or uploading installers', () => {
    const workflow = read('.github/workflows/release-draft.yml');
    expect(workflow).toMatch(/on:\s*\n\s+workflow_dispatch:/);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).toContain('PREPARE_DRAFT_ONLY');
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain('package.json');
    expect(workflow).toContain('--draft --prerelease');
    expect(workflow).toContain('Refuse to overwrite an existing release or version tag');
    expect(workflow).toContain('sha256sum -c');
    expect(workflow).toContain('Voxnelo.deb');
    expect(workflow).toContain('if: github.repository ==');
    expect(workflow).not.toContain('gh release edit');
  });

  it('provides a version-specific candidate note and human-release approval guidance', () => {
    const notes = read('docs/release-notes/v' + packageInfo.version + '.md');
    expect(notes).toContain(packageInfo.version);
    expect(notes).toContain('尚未');
    expect(notes).toContain('未完成');
    expect(notes).toContain('不自带离线实时英语识别模型');
    expect(read('docs/engineering/GITHUB-RELEASE-DRAFT.md')).toContain('Publish release');
  });
});
