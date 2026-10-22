import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const signedWorkflow = readFileSync('.github/workflows/signed-candidate.yml', 'utf8');
const appEntitlement = readFileSync('build/stable-entitlements.mac.plist', 'utf8');
const helperEntitlement = readFileSync('build/stable-entitlements.mac.inherit.plist', 'utf8');

describe('signed Stable candidates require real publisher credentials and never publish', () => {
  it('runs only on explicit main SHA/unused version authorization', () => {
    expect(signedWorkflow).toContain('workflow_dispatch:');
    expect(signedWorkflow).toContain('BUILD_SIGNED_QA_ONLY');
    expect(signedWorkflow).toContain('test "$EXPECTED_COMMIT" = "$GITHUB_SHA"');
    expect(signedWorkflow).toContain("test \"$GITHUB_REF\" = 'refs/heads/main'");
    expect(signedWorkflow).toContain('Cannot overwrite existing draft or release');
    expect(signedWorkflow).toContain('environment: stable-signing');
    expect(signedWorkflow).not.toMatch(/^\s+push:/m);
    expect(signedWorkflow).not.toMatch(/gh release (?:create|edit|upload|publish)/);
  });

  it('fails closed when Windows certificate, approved identity or timestamp is missing', () => {
    expect(signedWorkflow).toContain('secrets.WIN_CSC_LINK');
    expect(signedWorkflow).toContain('secrets.WIN_CSC_KEY_PASSWORD');
    expect(signedWorkflow).toContain('vars.STABLE_WIN_CERT_SHA1');
    expect(signedWorkflow).toContain('Get-AuthenticodeSignature');
    expect(signedWorkflow).toContain(".Status -ne 'Valid'");
    expect(signedWorkflow).toContain('TimeStamperCertificate');
    expect(signedWorkflow).toContain('Get-FileHash');
  });

  it('requires an Apple Developer ID sign, app notarization, DMG notarization and Gatekeeper verification', () => {
    expect(signedWorkflow).toContain('secrets.MAC_CSC_LINK');
    expect(signedWorkflow).toContain('secrets.MAC_CSC_KEY_PASSWORD');
    expect(signedWorkflow).toContain('secrets.APPLE_APP_SPECIFIC_PASSWORD');
    expect(signedWorkflow).toContain('vars.STABLE_APPLE_TEAM_ID');
    expect(signedWorkflow).toContain('--config.mac.notarize=true');
    expect(signedWorkflow).toContain('--config.mac.hardenedRuntime=true');
    expect(signedWorkflow).toContain('xcrun stapler validate "$app"');
    expect(signedWorkflow).toContain('xcrun notarytool submit "$dmg"');
    expect(signedWorkflow).toContain('xcrun stapler staple "$dmg"');
    expect(signedWorkflow).toContain('xcrun stapler validate "$dmg"');
    expect(signedWorkflow).toContain('codesign --verify --deep --strict');
    expect(signedWorkflow).toContain('spctl --assess --type execute');
    expect(signedWorkflow).toContain("test \"$bundle_id\" = 'app.voxnelo.desktop'");
  });

  it('grants only minimal entitlements in signed-only CI, without loosening unsigned builds', () => {
    expect(helperEntitlement).toBe(appEntitlement);
    expect(appEntitlement).toContain('com.apple.security.cs.allow-jit');
    expect(appEntitlement).toContain('com.apple.security.device.audio-input');
    expect(appEntitlement).not.toContain('com.apple.security.cs.disable-library-validation');
    expect(appEntitlement).not.toContain('com.apple.security.cs.allow-unsigned-executable-memory');
    expect(signedWorkflow).toContain('build/stable-entitlements.mac.plist');
    expect(signedWorkflow).toContain('build/stable-entitlements.mac.inherit.plist');
    expect(signedWorkflow).not.toContain('CSC_IDENTITY_AUTO_DISCOVERY');
    expect(signedWorkflow).toContain('--publish never');
  });

  it('does not expose distributable artifacts or create any release', () => {
    expect(signedWorkflow).toContain('permissions:\n  contents: read');
    expect(signedWorkflow).toContain('retention-days: 7');
    expect(signedWorkflow).toContain('SHA256SUMS-win32.txt');
    expect(signedWorkflow).toContain('SHA256SUMS-darwin.txt');
    expect(signedWorkflow).not.toContain('--draft');
  });
});
