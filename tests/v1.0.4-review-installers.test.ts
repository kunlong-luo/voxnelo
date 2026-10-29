import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const workflow=readFileSync('.github/workflows/v1.0.4-review-installers.yml','utf8');

describe('v1.0.4 unsigned three-platform REVIEW artifacts (not a release)',()=>{
  it('runs automatically only once when its own workflow lands on main',()=>{
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain("- '.github/workflows/v1.0.4-review-installers.yml'");
    expect(workflow).toContain("github.repository == 'kunlong-luo/voxnelo'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("version')\" = '1.0.4'");
    expect(workflow).not.toMatch(/^\s+tags:/m);
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toContain('contents: write');
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
    expect(workflow).toContain('v1.0.4-unsigned-three-platform-REVIEW-NOT-RELEASE');
    expect(workflow).toContain('review-assets/*.exe');
    expect(workflow).toContain('review-assets/*.dmg');
    expect(workflow).toContain('review-assets/*.AppImage');
    expect(workflow).not.toContain('gh release create');
    expect(workflow).not.toContain('gh release upload');
    expect(workflow).not.toContain('git tag ');
    expect(workflow).not.toContain('--latest');
    expect(workflow).not.toContain('review-assets/candidate-manifest-*.json');
  });
});
