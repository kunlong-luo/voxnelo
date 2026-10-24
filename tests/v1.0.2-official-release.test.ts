import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';

const workflow=readFileSync('.github/workflows/publish-all-v1.0.2.yml','utf8');
const notes=readFileSync('docs/release-notes/v1.0.2.md','utf8');
const app=JSON.parse(readFileSync('package.json','utf8')) as {version:string};

describe('v1.0.2 permanently archived official unsigned release guards',()=>{
  it('is archived after public release and never allows overwriting old releases',()=>{
    expect(app.version).toBe('1.0.2');
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain("github.repository == 'kunlong-luo/voxnelo'");
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\\s+push:/m);
    expect(workflow).not.toMatch(/^\\s+tags:/m);
    expect(workflow).toContain('if: false # archived after successful v1.0.2 official release');
    expect(workflow).toContain('Refuse to overwrite an existing release or version tag');
    expect(workflow).toContain('refs/tags/v1.0.2');
    expect(workflow).not.toContain('gh release edit');
    expect(workflow).not.toContain('gh release upload');
    expect(workflow).not.toMatch(/gh release (?:edit|upload|publish)/);
  });
  it('tests all native installers with auditable checksums and strict dependencies',()=>{
    expect(workflow).toContain('pnpm audit --prod --audit-level high');
    expect(workflow).toContain('pnpm audit --audit-level high');
    expect(workflow).toContain('pnpm typecheck && pnpm test && pnpm build');
    expect(workflow).toContain('pnpm asr:verify-real');
    expect(workflow).toContain('check-desktop-package.mts');
    expect(workflow).toContain('sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y ./release/voxnelo_1.0.2_amd64.deb');
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
  it('retains the verified public Release evidence after closing the one-shot publisher',()=>{
    const operations=readFileSync('docs/engineering/RELEASE-OPERATIONS.md','utf8');
    const security=readFileSync('SECURITY.md','utf8');
    expect(operations).toContain('40103037891');
    expect(operations).toContain('4926829094ea67b8a233bd3c41cb393719ee8aaf');
    expect(operations).toContain('v1.0.2');
    expect(operations).toContain('v1.0.1');
    expect(security).toContain('当前 v1.0.2');
    expect(security).toContain('未签名');
  });
});
