#!/usr/bin/env node
/**
 * Check GitHub releases AND git tags before spending time building a draft.
 *
 * GitHub's "GET releases/tags/{tag}" may return 404 for a PRIVATE Draft that
 * is visible in the authenticated releases list. Do not mistake that 404 for
 * proof that the name is unused. No release, tag, or asset is changed here.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface GitHubLookupResponse {
  status: number;
  data?: unknown;
}
export type GitHubLookup = (endpoint: string) => Promise<GitHubLookupResponse>;

export async function assertReleaseTagVacant(
  repository: string,
  version: string,
  lookup: GitHubLookup,
): Promise<void> {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))
    throw Error('Invalid GitHub repository');
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw Error('Invalid candidate version');

  const tag = 'v' + version;
  // The authenticated /releases listing includes private Draft releases;
  // unlike the per-tag endpoint, which can return 404 for those drafts.
  for (let page = 1; page <= 20; page++) {
    const result = await lookup('repos/' + repository + '/releases?per_page=100&page=' + page);
    if (result.status !== 200 || !Array.isArray(result.data))
      throw Error('Could not verify existing GitHub releases; refusing draft build');
    const releases = result.data as unknown[];
    if (releases.some(item => !item || typeof item !== 'object' ||
      typeof (item as {tag_name?: unknown}).tag_name !== 'string'))
      throw Error('Invalid GitHub release inventory; refusing draft build');
    if (releases.some(item => (item as {tag_name: string}).tag_name === tag))
      throw Error('GitHub Release already exists for ' + tag + ' (including private Draft)');
    if (releases.length < 100) {
      const ref = await lookup('repos/' + repository + '/git/ref/tags/' + tag);
      if (ref.status === 200)
        throw Error('Git tag already exists for ' + tag);
      if (ref.status !== 404)
        throw Error('Could not verify existing Git tags; refusing draft build');
      return;
    }
  }
  throw Error('GitHub release inventory exceeds audited pagination limit');
}

async function authorizedLookup(endpoint: string, token: string): Promise<GitHubLookupResponse> {
  const response = await fetch('https://api.github.com/' + endpoint, {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Voxnelo-draft-preflight',
    },
  });
  if (response.status !== 200) return { status: response.status };
  // The ref endpoint needs only its status. The release list needs its body.
  if (endpoint.includes('/git/ref/')) return { status: 200 };
  const data: unknown = await response.json();
  return { status: 200, data };
}

const calledDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (calledDirectly) {
  const version = process.argv[2];
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN;
  if (!version || !repository || !token) {
    console.error('Draft preflight requires a version and authenticated GitHub Actions context');
    process.exitCode = 1;
  } else {
    try {
      await assertReleaseTagVacant(repository, version, endpoint => authorizedLookup(endpoint, token));
      console.log('No existing GitHub Release (including private Draft) or tag for v' + version);
    } catch {
      // Do not print API/token/network response bodies or private draft metadata.
      console.error('Draft name unavailable or GitHub existence check failed; refusing to build');
      process.exitCode = 1;
    }
  }
}
