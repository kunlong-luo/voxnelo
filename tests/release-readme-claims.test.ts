import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root=path.resolve('.');
const read=(relative:string)=>readFileSync(path.join(root,relative),'utf8');
const packageInfo=JSON.parse(read('package.json')) as {version:string};

describe('Current Voxnelo README and release claims',()=>{
  it('documents implemented features of the CURRENT package, not a future roadmap',()=>{
    const readme=read('README.md');
    expect(readme).toContain('0.1.5');
    expect(readme).toContain(packageInfo.version);
    for(const capability of ['40 条','系统','录音','回听','收藏','历史','IndexedDB','主题','Leo Luo'])
      expect(readme).toContain(capability);
    expect(readme).toContain('不附带第三方离线 ASR 模型');
    expect(readme).toContain('未创建正式的 GitHub Release');
    expect(readme).not.toMatch(/V1\.0\s*(?:规划|即将)|即将推出|敬请期待|AI 对话已实现/);
  });

  it('requires explicit manual execution and never auto-publishes release installers',()=>{
    const workflow=read('.github/workflows/release-draft.yml');
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

  it('provides exact-version honest release notes and human approval guidance',()=>{
    const notes=read('docs/release-notes/v'+packageInfo.version+'.md');
    expect(notes).toContain(packageInfo.version);
    expect(notes).toContain('尚未');
    expect(notes).toContain('未完成');
    expect(notes).toContain('不自带离线实时英语识别模型');
    expect(read('docs/engineering/GITHUB-RELEASE-DRAFT.md')).toContain('Publish release');
  });
});
