import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { planRealAsrRelease } from '../scripts/check-asr-real-release.mts';

const temporary: string[] = [];
function staging(manifest?: unknown): string {
  const root = mkdtempSync(path.join(tmpdir(), 'voxnelo-asr-release-'));
  temporary.push(root);
  if (manifest !== undefined) writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  return root;
}
afterEach(() => {
  for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('native ASR public release approval gate', () => {
  it('skips the default package without a staged native manifest', () => {
    expect(planRealAsrRelease(staging()).kind).toBe('skip');
  });

  it.each([
    ['absent', {}],
    ['false', { releaseReady: false }],
    ['null', { releaseReady: null }],
    ['string true', { releaseReady: 'true' }],
    ['numeric one', { releaseReady: 1 }],
  ])('fails closed for %s approval before any WAV or binary checks', (_label, manifest) => {
    expect(() => planRealAsrRelease(staging(manifest), {})).toThrow(/explicit releaseReady:true approval/);
  });

  it('continues to required real WAV evidence when explicitly approved', () => {
    const root = staging({ releaseReady: true });
    mkdirSync(path.join(root, 'model'));
    mkdirSync(path.join(root, 'native'));
    expect(() => planRealAsrRelease(root, {})).toThrow(/VOXNELO_ASR_QA_WAV/);
  });
});
