import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');
const workflow=read('.github/workflows/publish-all-v1.0.3.yml');
const notes=read('docs/release-notes/v1.0.3.md');
const qa=read('docs/engineering/MANUAL-QA-OWNER-2026-10-25.md');

describe('v1.0.3 owner-confirmed unsigned release gate',()=>{
  it('publishes a distinct 1.0.3 only through a protected main one-time workflow',()=>{
    expect(JSON.parse(read('package.json')).version).toBe('1.0.3');
    expect(workflow).toContain("'.github/workflows/publish-all-v1.0.3.yml'");
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain("github.repository == 'kunlong-luo/voxnelo'");
    expect(workflow).not.toContain('if: false # archived');
    expect(workflow).toContain('refs/tags/v1.0.3');
    expect(workflow).toContain('Refuse to overwrite an existing release or version tag');
    expect(workflow).not.toMatch(/gh release (?:edit|upload|publish)/);
  });
  it('retains strict platform integrity, audits and real apt installation',()=>{
    for(const clause of ['pnpm audit --prod --audit-level high','pnpm audit --audit-level high',
      'pnpm typecheck && pnpm test && pnpm build','pnpm asr:verify-real','check-desktop-package.mts',
      'sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y ./release/voxnelo_1.0.3_amd64.deb',
      'sha256sum -c','cmp -s release-assets/Voxnelo.deb','windows-latest',
      'macos-latest','ubuntu-24.04','CSC_IDENTITY_AUTO_DISCOVERY']){
      expect(workflow).toContain(clause);
    }
  });
  it('publishes a non-beta version only after truthful risk statements',()=>{
    expect(workflow).toContain('gh release create v1.0.3');
    expect(workflow).toContain('test -s docs/release/UNSIGNED-V1-OWNER-DECISION.md');
    expect(workflow).toContain('--latest');
    expect(workflow).not.toContain('--prerelease');
    expect(workflow).toContain('isPrerelease == false');
    for(const x of ['未签名','未公证','Windows','macOS','Linux x64',
      '模型不随安装包内置','暂无']){if(x!=='暂无')expect(notes).toContain(x);}
    expect(qa).toContain('需要人工测试的已经测试通过了');
    expect(qa).toContain('不能');
    expect(notes).toContain('Leo Luo');
  });
});
