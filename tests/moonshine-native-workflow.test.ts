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
  });
});
