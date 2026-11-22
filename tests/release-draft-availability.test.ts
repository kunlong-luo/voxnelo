import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  assertReleaseTagVacant,
  type GitHubLookup,
  type GitHubLookupResponse,
} from '../scripts/assert-release-tag-vacant.mts';

const repository = 'kunlong-luo/voxnelo';
const version = '1.0.4';
const releasePath = 'repos/' + repository + '/releases?per_page=100&page=1';
const refPath = 'repos/' + repository + '/git/ref/tags/v1.0.4';

describe('draft-only release version availability', () => {
  it('rejects an existing PRIVATE draft, even when the by-tag and git tag APIs would return 404', async () => {
    const get = vi.fn<GitHubLookup>(async endpoint => {
      if (endpoint === releasePath) return {
        status: 200, data: [{ tag_name: 'v1.0.3', draft: false },
          { tag_name: 'v1.0.4', draft: true, prerelease: true }],
      };
      return { status: 404 };
    });
    await expect(assertReleaseTagVacant(repository, version, get))
      .rejects.toThrow(/already exists.*private Draft/);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(releasePath);
  });

  it('also rejects an existing published release', async () => {
    const get: GitHubLookup = async () =>
      ({ status: 200, data: [{ tag_name: 'v1.0.4', draft: false }] });
    await expect(assertReleaseTagVacant(repository, version, get))
      .rejects.toThrow(/already exists/);
  });

  it('rejects a tag even when the release has been deleted', async () => {
    const get = vi.fn<GitHubLookup>(async endpoint =>
      endpoint === releasePath ? { status: 200, data: [] } : { status: 200 });
    await expect(assertReleaseTagVacant(repository, version, get))
      .rejects.toThrow(/Git tag already exists/);
    expect(get).toHaveBeenNthCalledWith(2, refPath);
  });

  it('allows only a genuinely unused version after checking BOTH releases and tags', async () => {
    const get = vi.fn<GitHubLookup>(async endpoint =>
      endpoint === releasePath
        ? { status: 200, data: [{ tag_name: 'v1.0.3' }] }
        : { status: 404 });
    await expect(assertReleaseTagVacant(repository, version, get))
      .resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(2, refPath);
  });

  it('checks further pages instead of assuming the first 100 results are all releases', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({ tag_name: 'v0.1.' + i }));
    const get = vi.fn<GitHubLookup>(async endpoint => {
      if (endpoint === releasePath) return { status: 200, data: firstPage };
      if (endpoint.includes('page=2')) return {
        status: 200, data: [{ tag_name: 'v1.0.4', draft: true }],
      };
      return { status: 404 };
    });
    await expect(assertReleaseTagVacant(repository, version, get))
      .rejects.toThrow(/already exists/);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 404, 429, 500])('fails closed when release inventory returns HTTP %s', async status => {
    const get: GitHubLookup = async (): Promise<GitHubLookupResponse> => ({ status });
    await expect(assertReleaseTagVacant(repository, version, get))
      .rejects.toThrow(/Could not verify existing GitHub releases/);
  });

  it('fails closed on malformed list, tag API error and excessive pagination', async () => {
    await expect(assertReleaseTagVacant(repository, version,
      async () => ({ status: 200, data: { message: 'not a list' } })))
      .rejects.toThrow(/Could not verify existing GitHub releases/);
    await expect(assertReleaseTagVacant(repository, version,
      async () => ({ status: 200, data: [{ draft: true }] })))
      .rejects.toThrow(/Invalid GitHub release inventory/);
    await expect(assertReleaseTagVacant(repository, version,
      async endpoint => endpoint === releasePath
        ? { status: 200, data: [] } : { status: 403 }))
      .rejects.toThrow(/Could not verify existing Git tags/);
    const page = Array.from({ length: 100 }, (_, i) => ({ tag_name: 'v0.2.' + i }));
    await expect(assertReleaseTagVacant(repository, version,
      async () => ({ status: 200, data: page })))
      .rejects.toThrow(/pagination limit/);
  });

  it('validates inputs before making any network request', async () => {
    const get = vi.fn<GitHubLookup>(async () => ({ status: 404 }));
    await expect(assertReleaseTagVacant('owner/repo/extra', version, get))
      .rejects.toThrow(/Invalid GitHub repository/);
    await expect(assertReleaseTagVacant(repository, '../1.0.4', get))
      .rejects.toThrow(/Invalid candidate version/);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('release draft GitHub Actions guard', () => {
  const workflow = readFileSync(path.resolve('.github/workflows/release-draft.yml'), 'utf8');

  it('requires the authenticated, fail-closed check before expensive native and OS matrix jobs', () => {
    const script = 'node --experimental-strip-types scripts/assert-release-tag-vacant.mts "$RELEASE_VERSION"';
    const preflight = workflow.indexOf('  preflight:');
    const earlyCheck = workflow.indexOf(script);
    const native = workflow.indexOf('  native-moonshine:');
    const build = workflow.indexOf('  build:');
    expect(preflight).toBeGreaterThanOrEqual(0);
    expect(earlyCheck).toBeGreaterThan(preflight);
    expect(earlyCheck).toBeLessThan(native);
    expect(earlyCheck).toBeLessThan(build);
    expect(workflow.slice(preflight, native)).toContain('GH_TOKEN: ${{ github.token }}');
    expect(workflow.match(/scripts\/assert-release-tag-vacant\.mts/g)).toHaveLength(2);
    expect(workflow).toContain('needs: [preflight, build, native-moonshine]');
  });

  it('retains the duplicate recheck before writing assets and never auto-publishes', () => {
    const lastCheck = workflow.lastIndexOf('scripts/assert-release-tag-vacant.mts');
    const draft = workflow.indexOf('gh release create');
    expect(lastCheck).toBeGreaterThan(0);
    expect(lastCheck).toBeLessThan(draft);
    expect(workflow).toContain('--draft --prerelease');
    expect(workflow).not.toContain('gh release edit --draft=false');
  });
});
