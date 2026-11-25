import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const workflow=readFileSync('.github/workflows/v1.0.4-review-installers.yml','utf8');

describe('v1.0.4 unsigned three-platform REVIEW artifacts (not a release)',()=>{
  it('only runs on its own main-branch file changes or manual review dispatch',()=>{
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain("- '.github/workflows/v1.0.4-review-installers.yml'");
    expect(workflow).toContain("github.repository == 'kunlong-luo/voxnelo'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("version')\" = '1.0.4'");
    expect(workflow).not.toMatch(/^\s+tags:/m);
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toContain('contents: write');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('node --experimental-strip-types scripts/check-toolchain-consistency.mts');
    // Both preflight and packaging use the maintained Node release, not an
    // OS runner's default Node. All runtime setup must remain consistent.
    expect(workflow.match(/node-version: 26/g)).toHaveLength(2);
    expect(workflow).toContain('version: 12.22.0');
    expect(workflow).not.toContain('node-version: 22');
    expect(workflow).not.toContain('version: 12.11.2');
  });

  it('requires all three verified real native Moonshine platforms before final artifact ZIP',()=>{
    expect(workflow).toContain('uses: ./.github/workflows/moonshine-native-matrix.yml');
    expect(workflow).toContain('needs: [preflight, build, native-moonshine]');
    expect(workflow).toContain('target: linux');
    expect(workflow).toContain('target: windows');
    expect(workflow).toContain('target: mac');
    expect(workflow).toContain('scripts/validate-release-draft.mts');
    expect(workflow).toContain('SHA256SUMS-$platform.txt');
    expect(workflow).toContain('"$GITHUB_SHA" "$GITHUB_RUN_ID"');
    expect(workflow).toContain('scripts/write-candidate-manifest.mts');
  });

  it('packages all user-facing installers but cannot create a tag or public Release',()=>{
    expect(workflow).toContain('electron-builder ${{ matrix.args }} --publish never');
    expect(workflow).toContain('scripts/brand-linux-installer.mts');
    expect(workflow).toContain('VOXNELO_REQUIRE_INSTALLERS');
    expect(workflow).toContain('sudo apt-get install -y ./release/voxnelo_1.0.4_amd64.deb');
    expect(workflow).toContain('pnpm audit --prod --audit-level high');
    expect(workflow).toContain('pnpm asr:verify-real');
    expect(workflow).toContain('Require unchanged LF bytes in Windows and Unix checkout');
    expect(workflow).toContain('pnpm exec vitest run tests/windows-checkout-lf.test.ts');
    expect(workflow).toContain('tests/first-party-license-packaging.test.ts');
    expect(workflow).toContain('v1.0.4-unsigned-three-platform-REVIEW-NOT-RELEASE');
    expect(workflow).toContain("Windows default is 'Voxnelo Setup 1.0.4.exe'");
    expect(workflow).toContain('review-assets/*.exe');
    expect(workflow).toContain('review-assets/*.dmg');
    expect(workflow).toContain('review-assets/*.AppImage');
    expect(workflow).not.toContain('gh release create');
    expect(workflow).not.toContain('gh release upload');
    expect(workflow).not.toContain('git tag ');
    expect(workflow).not.toContain('--latest');
    expect(workflow).not.toContain('review-assets/candidate-manifest-*.json');
  });
  it('requires installed Linux ASAR byte and registry notice checks before candidate evidence upload',()=>{
    const install=workflow.indexOf('sudo apt-get install -y ./release/voxnelo_1.0.4_amd64.deb');
    const audit=workflow.indexOf('- name: Verify installed DEB ASAR and upstream root notice equivalence');
    const reportUpload=workflow.indexOf('- name: Preserve sanitized review-source dependency notice evidence');
    const manifest=workflow.indexOf('- name: Generate review-only per-platform SHA-256 and provenance manifest');
    expect(install).toBeGreaterThan(-1);
    expect(audit).toBeGreaterThan(install);
    expect(reportUpload).toBeGreaterThan(audit);
    expect(manifest).toBeGreaterThan(reportUpload);
    const step=workflow.slice(audit,reportUpload);
    expect(step).toContain("if: runner.os == 'Linux'");
    expect(step).toContain('set -euo pipefail');
    expect(step).toContain('installed_asar=/opt/Voxnelo/resources/app.asar');
    expect(step).toContain('dpkg -L voxnelo | grep -Fx "$installed_asar"');
    expect(step).toContain('test -f "$installed_asar"');
    expect(step).toContain('test ! -L "$installed_asar"');
    expect(step).toContain('test -f "$unpacked_asar"');
    expect(step).toContain('test ! -L "$unpacked_asar"');
    expect(step).toContain('cmp -- "$installed_asar" "$unpacked_asar"');
    expect(step).toContain('pnpm license:audit:registry --compare-notices --packaged-asar "$installed_asar"');
    expect(step).not.toContain('continue-on-error');
    expect(workflow.match(/pnpm license:audit:registry /g)).toHaveLength(1);
    expect(workflow.slice(reportUpload,manifest)).toContain('if-no-files-found: error');
  });
});
