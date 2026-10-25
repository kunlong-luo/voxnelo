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
    expect(draft).toContain('native-moonshine:');
    expect(draft).toContain('uses: ./.github/workflows/moonshine-native-matrix.yml');
    expect(draft).toContain('needs: [preflight, build, native-moonshine]');
    expect(draft).toContain('scripts/check-desktop-package.mts');
    expect(draft).toContain('sha256sum -c');
    expect(draft).toContain('--draft --prerelease');
    expect(draft).not.toMatch(/^\s+push:/m);
  });
});
