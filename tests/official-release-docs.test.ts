import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');
const current=[
  'docs/engineering/GITHUB-RELEASE-DRAFT.md',
  'docs/engineering/STABLE-RELEASE-READINESS.md',
  'docs/engineering/RELEASE-OPERATIONS.md',
  'docs/PRIVACY.md',
];

describe('post-v1.0.0 official unsigned release continuity',()=>{
  it('cannot rerun the completed one-shot official release on a push',()=>{
    const workflow=read('.github/workflows/publish-all-v1.0.0.yml');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).toContain('if: false # archived');
    expect(workflow).toContain('gh release create v1.0.0');
  });
  it('does not describe a retired Early Access as the current official download',()=>{
    for(const path of current){
      const doc=read(path);
      expect(doc,path).toContain('v1.0.0');
      expect(doc,path).toContain('未签名');
      expect(doc,path).not.toContain('当前公开版本：v0.1.6');
    }
    expect(read('docs/engineering/GITHUB-RELEASE-DRAFT.md')).toContain('11 个附件');
    expect(read('docs/engineering/STABLE-RELEASE-READINESS.md')).toContain('可选');
    expect(read('docs/USER-GUIDE.md')).not.toContain('暂不安装预览版');
    expect(read('docs/release-notes/v1.0.0.md')).toContain('尚未完成');
  });
});
