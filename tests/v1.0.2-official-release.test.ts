import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';

const workflow=readFileSync('.github/workflows/publish-all-v1.0.2.yml','utf8');
const notes=readFileSync('docs/release-notes/v1.0.2.md','utf8');
const app=JSON.parse(readFileSync('package.json','utf8')) as {version:string};

describe('v1.0.2 one-time official unsigned release guards',()=>{
  it('uses a distinct version and never allows overwriting old releases',()=>{
    expect(app.version).toBe('1.0.2');
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain("github.repository == 'kunlong-luo/voxnelo'");
    expect(workflow).toContain("'.github/workflows/publish-all-v1.0.2.yml'");
    expect(workflow).toContain('Refuse to overwrite an existing release or version tag');
    expect(workflow).toContain('refs/tags/v1.0.2');
    expect(workflow).not.toContain('gh release edit');
    expect(workflow).not.toContain('gh release upload');
    expect(workflow).not.toContain('if: false # archived');
  });
  it('tests all native installers with auditable checksums and strict dependencies',()=>{
    expect(workflow).toContain('pnpm audit --prod --audit-level high');
    expect(workflow).toContain('pnpm audit --audit-level high');
    expect(workflow).toContain('pnpm typecheck && pnpm test && pnpm build');
    expect(workflow).toContain('pnpm asr:verify-real');
    expect(workflow).toContain('check-desktop-package.mts');
    expect(workflow).toContain('sudo apt-get install -y ./release/voxnelo_1.0.2_amd64.deb');
    expect(workflow).toContain('sha256sum -c');
    expect(workflow).toContain('cmp -s release-assets/Voxnelo.deb');
    expect(workflow).toContain('windows-latest');
    expect(workflow).toContain('macos-latest');
    expect(workflow).toContain('ubuntu-24.04');
    expect(workflow).toContain('CSC_IDENTITY_AUTO_DISCOVERY');
  });
  it('will create a non-prerelease only after validating the owner decision and notes',()=>{
    expect(workflow).toContain('gh release create v1.0.2');
    expect(workflow).toContain('test -s docs/release/UNSIGNED-V1-OWNER-DECISION.md');
    expect(workflow).toContain('--latest');
    expect(workflow).not.toContain('--prerelease');
    expect(workflow).toContain('isPrerelease == false');
    for(const clause of ['未签名','未公证','Windows','macOS','Linux x64','模型不随安装包内置','尚未完成']){
      expect(notes).toContain(clause);
    }
    expect(notes).toContain('Leo Luo');
  });
});
