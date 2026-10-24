import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const workflow=readFileSync('.github/workflows/publish-all-v1.0.0.yml','utf8');
const notes=readFileSync('docs/release-notes/v1.0.0.md','utf8');
const decision=readFileSync('docs/release/UNSIGNED-V1-OWNER-DECISION.md','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8')) as {version:string};

describe('Owner-authorized official unsigned release is guarded and truthful',()=>{
  it('permanently archives the completed one-time official publisher',()=>{
    expect(pkg.version).toBe('1.0.0');
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).toContain('if: false # archived');
    expect(workflow).not.toMatch(/^\s+tags:/m);
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain("github.repository == 'kunlong-luo/voxnelo'");
    expect(workflow).toContain('Refuse to overwrite an existing release or version tag');
    expect(workflow).not.toContain('gh release edit');
    expect(workflow).not.toContain('gh release upload');
  });
  it('builds and checks actual Linux/Windows/macOS installers and strict audits',()=>{
    expect(workflow).toContain('pnpm audit --prod --audit-level high');
    expect(workflow).toContain('pnpm audit --audit-level high');
    expect(workflow).toContain('pnpm typecheck && pnpm test && pnpm build');
    expect(workflow).toContain('pnpm asr:verify-real');
    expect(workflow).toContain('check-desktop-package.mts');
    expect(workflow).toContain('sha256sum -c');
    expect(workflow).toContain('cmp -s release-assets/Voxnelo.deb');
    expect(workflow).toContain('sudo apt-get install -y ./release/voxnelo_1.0.0_amd64.deb');
    expect(workflow).toContain('windows-latest');
    expect(workflow).toContain('macos-latest');
    expect(workflow).toContain('ubuntu-24.04');
    expect(workflow).toContain('CSC_IDENTITY_AUTO_DISCOVERY');
  });
  it('publishes the new version as non-prerelease only after verifying notes, owner decision and unique tag',()=>{
    expect(workflow).toContain('test -s docs/release/UNSIGNED-V1-OWNER-DECISION.md');
    expect(workflow).toContain('gh release create v1.0.0');
    expect(workflow).toContain('--latest');
    expect(workflow).not.toContain('--prerelease');
    expect(workflow).toContain('isPrerelease == false');
    expect(workflow).toContain('refs/tags/v1.0.0');
    expect(notes).toContain('未签名');
    expect(notes).toContain('未公证');
    expect(notes).toContain('Linux x64');
    expect(notes).toContain('Windows');
    expect(notes).toContain('macOS');
    expect(notes).toContain('模型不随安装包内置');
    expect(notes).toContain('尚未完成');
    expect(decision).toContain('不代表第三方审核');
    expect(decision).toContain('F001–F012');
    expect(decision).toContain('不标记为已通过');
  });
});
