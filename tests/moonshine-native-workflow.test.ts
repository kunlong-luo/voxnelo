import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('cross-platform Moonshine native SDK CI',()=>{
  const workflow=readFileSync('.github/workflows/moonshine-native-matrix.yml','utf8');
  it('uses real supported public standard runners including macOS ARM64',()=>{
    expect(workflow).toContain('os: ubuntu-24.04, target: linux-x64');
    expect(workflow).toContain('os: windows-latest, target: windows-x64');
    expect(workflow).toContain('os: macos-15, target: macos-arm64-15');
    expect(workflow).not.toContain('macos-15-arm64');
    expect(workflow).toContain('scripts/install-moonshine-linux.mts --accept-experimental-runtime');
    expect(workflow).toContain('scripts/check-moonshine-native-worker.mts');
    expect(workflow).toContain('scripts/check-packaged-moonshine-native.mts');
    expect(workflow).toContain('workflow_call:');
  });
});

describe('future unsigned release draft must wait for native offline recognition',()=>{
  const draft=readFileSync('.github/workflows/release-draft.yml','utf8');
  it('reuses the same real Linux/Windows/macOS packaged Moonshine matrix before draft assembly',()=>{
    expect(draft).toContain('workflow_call:');
    expect(draft).toContain("PREPARE_DRAFT_ONLY");
    expect(draft).toContain('native-moonshine:');
    expect(draft).toContain('uses: ./.github/workflows/moonshine-native-matrix.yml');
    expect(draft).toContain('needs: [preflight, build, native-moonshine]');
    expect(draft).toContain('scripts/check-desktop-package.mts');
    expect(draft).toContain('sha256sum -c');
    expect(draft).toContain('scripts/validate-release-draft.mts');
    expect(draft).toContain('draft-assets/SHA256SUMS-*.txt');
    expect(draft).toContain('Normalize Windows Release asset filename and matching SHA-256 manifest');
    expect(draft).toContain('mv -- "$original" "$published"');
    expect(draft).toContain('sha256sum -c SHA256SUMS-win32.txt');
    expect(draft).not.toContain('gh release create "v$RELEASE_VERSION" draft-assets/*');
    expect(draft).toContain('--draft --prerelease');
    expect(draft).not.toMatch(/^\s+push:/m);
  });
});

describe('v1.0.4 one-time DRAFT bootstrap must NEVER publish publicly',()=>{
  const bootstrap=readFileSync('.github/workflows/prepare-v1.0.4-private-draft-once.yml','utf8');
  it('limits the push trigger to the new main-only bootstrap file',()=>{
    expect(bootstrap).toContain('branches: [main]');
    expect(bootstrap).toContain("- '.github/workflows/prepare-v1.0.4-private-draft-once.yml'");
    expect(bootstrap).toContain("github.repository == 'kunlong-luo/voxnelo'");
    expect(bootstrap).toContain("github.ref == 'refs/heads/main'");
    expect(bootstrap).not.toMatch(/^\\s+tags:/m);
    expect(bootstrap).not.toMatch(/^\\s+schedule:/m);
  });
  it('reuses the strictly gated draft-only workflow with exact version and consent',()=>{
    expect(bootstrap).toContain('uses: ./.github/workflows/release-draft.yml');
    expect(bootstrap).toContain("version: '1.0.4'");
    expect(bootstrap).toContain("confirmation: 'PREPARE_DRAFT_ONLY'");
    expect(bootstrap).toContain('contents: read');
    expect(bootstrap).toContain('contents: write');
    expect(bootstrap).not.toContain('gh release publish');
    expect(bootstrap).not.toContain('gh release create');
    expect(bootstrap).not.toContain('git tag');
    expect(bootstrap).not.toContain('--latest');
  });
});
