import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONNECTED_SPEECH_GUIDES } from '@voxnelo/content';
import {
  auditReviewedAudioManifest, inspectReviewPcmWav,
} from '../scripts/reviewed-audio-validator.mts';

// Test fixtures are synthetic PCM data, not human voices or reference recordings.
function syntheticWav(sample: number, sampleRate = 16000): Buffer {
  const count = sampleRate / 4;
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);
  for (let index = 0; index < count; index++) buffer.writeInt16LE(sample, 44 + index * 2);
  return buffer;
}

function metadata(kind: 'careful' | 'natural', wav: Buffer) {
  const id = 's008-' + kind + '-v1';
  return {
    assetId: id,
    filename: id + '.wav',
    sha256: createHash('sha256').update(wav).digest('hex'),
    encoding: 'wav-pcm16-mono',
    sampleRateHz: 16000,
    durationMs: 250,
    performerId: 'private-performer-001',
    licenseId: 'redistribution-license-001',
    rightsEvidenceId: 'private-rights-record-001',
    ipaAlignmentEvidenceId: 'private-pronunciation-review-001',
    attribution: 'Fixture only, no real spoken audio',
  };
}

async function withSyntheticPair(
  fn: (manifest: { schemaVersion: number; pairs: Array<Record<string, unknown>> },
    root: string, carefulWav: Buffer, naturalWav: Buffer) => Promise<void>,
) {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'voxnelo-review-wav-'));
  const root = path.join(temp, 'audio');
  const carefulWav = syntheticWav(100);
  const naturalWav = syntheticWav(200);
  const guide = CONNECTED_SPEECH_GUIDES.s008;
  if (!guide) throw Error('Missing synthetic fixture lesson');
  const careful = metadata('careful', carefulWav);
  const natural = metadata('natural', naturalWav);
  const manifest: { schemaVersion: number; pairs: Array<Record<string, unknown>> } = {
    schemaVersion: 1,
    pairs: [{
      sentenceId: 's008',
      english: guide.english,
      standardIpa: guide.standardIpa,
      naturalIpa: guide.spokenIpa,
      language: 'en-US',
      reviewEvidenceId: 'private-linguist-review-001',
      reviewDate: '2026-11-14',
      takes: { careful, natural },
    }],
  };
  try {
    await mkdir(root);
    await writeFile(path.join(root, careful.filename), carefulWav);
    await writeFile(path.join(root, natural.filename), naturalWav);
    await fn(manifest, root, carefulWav, naturalWav);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

describe('offline two-take audio preflight; no automatic approval or playback', () => {
  it('accepts a deliberately empty manifest while every lesson remains editorial-draft', async () => {
    const manifest = JSON.parse(await readFile('assets/audio/reviewed-manifest.json', 'utf8')) as unknown;
    await expect(auditReviewedAudioManifest(manifest, '/path/not/created'))
      .resolves.toEqual({ pairs: 0, filesChecked: 0, errors: [] });
  });

  it('checks both independent WAV bytes but still refuses unrevised editorial content', async () => {
    await withSyntheticPair(async (manifest, root) => {
      const audit = await auditReviewedAudioManifest(manifest, root);
      expect(audit.pairs).toBe(1);
      expect(audit.filesChecked).toBe(2);
      expect(audit.errors).toEqual([
        expect.stringContaining('curriculum lacks verified linguist-reviewed status'),
      ]);
    });
  });

  it('rejects a missing second take or extra unrecognized take', async () => {
    await withSyntheticPair(async (manifest, root) => {
      const pair = manifest.pairs[0]!;
      const takes = pair.takes as Record<string, unknown>;
      delete takes.natural;
      expect((await auditReviewedAudioManifest(manifest, root)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('exactly two named takes')]));
      takes.natural = metadata('natural', syntheticWav(200));
      takes.imitation = takes.natural;
      expect((await auditReviewedAudioManifest(manifest, root)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('exactly two named takes')]));
    });
  });

  it('rejects tampered audio and counterfeit metadata', async () => {
    await withSyntheticPair(async (manifest, root) => {
      const pair = manifest.pairs[0]!;
      const takes = pair.takes as { careful: ReturnType<typeof metadata>; natural: ReturnType<typeof metadata> };
      const file = path.join(root, takes.careful.filename);
      const damaged = syntheticWav(101);
      await writeFile(file, damaged);
      expect((await auditReviewedAudioManifest(manifest, root)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('SHA-256 mismatch')]));
      takes.careful.sha256 = takes.natural.sha256;
      expect((await auditReviewedAudioManifest(manifest, root)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('audio checksum reused')]));
      takes.careful.sha256 = 'not-a-sha';
      expect((await auditReviewedAudioManifest(manifest, root)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('SHA-256 must contain')]));
      takes.careful.sha256 = createHash('sha256').update(damaged).digest('hex');
      takes.careful.rightsEvidenceId = 'PENDING';
      expect((await auditReviewedAudioManifest(manifest, root)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('missing or placeholder evidence')]));
    });
  });

  it('rejects path traversal, unknown lessons and IPA tampering', async () => {
    await withSyntheticPair(async (manifest, root) => {
      const pair = manifest.pairs[0]!;
      const takes = pair.takes as { careful: ReturnType<typeof metadata> };
      takes.careful.filename = '../outside.wav';
      pair.naturalIpa = '[invented]';
      pair.sentenceId = 's999';
      const errors = (await auditReviewedAudioManifest(manifest, root)).errors;
      expect(errors).toEqual(expect.arrayContaining([
        expect.stringContaining('unsafe filename'),
        expect.stringContaining('no matching connected-speech lesson'),
      ]));
    });
  });

  it('rejects a symbolic-link WAV and never accepts symlinked audio directories', async () => {
    await withSyntheticPair(async (manifest, root) => {
      const pair = manifest.pairs[0]!;
      const takes = pair.takes as { careful: ReturnType<typeof metadata> };
      const real = path.join(root, 'real.wav');
      await writeFile(real, syntheticWav(100));
      await rm(path.join(root, takes.careful.filename));
      await symlink(real, path.join(root, takes.careful.filename));
      expect((await auditReviewedAudioManifest(manifest, root)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('regular WAV file')]));
      expect((await auditReviewedAudioManifest(manifest, path.join(root, 'missing'))).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('root directory is absent')]));
    });
  });

  it('rejects malformed RIFF, stereo/unsupported PCM and a lying duration', () => {
    const clean = syntheticWav(123);
    expect(inspectReviewPcmWav(clean, 16000, 250)).toEqual([]);
    const badRiff = Buffer.from(clean);
    badRiff.write('NOT!', 0);
    expect(inspectReviewPcmWav(badRiff, 16000, 250))
      .toEqual(expect.arrayContaining([expect.stringContaining('header/length')]));
    const stereo = Buffer.from(clean);
    stereo.writeUInt16LE(2, 22);
    expect(inspectReviewPcmWav(stereo, 16000, 250))
      .toEqual(expect.arrayContaining([expect.stringContaining('mono PCM16')]));
    expect(inspectReviewPcmWav(clean, 16000, 1500))
      .toEqual(expect.arrayContaining([expect.stringContaining('duration')]));
  });

  it('rejects malformed manifest, unknown schema and duplicates', async () => {
    expect((await auditReviewedAudioManifest({ schemaVersion: 2, pairs: [] }, 'missing')).errors.length)
      .toBeGreaterThan(0);
    await withSyntheticPair(async (manifest, root) => {
      manifest.pairs.push({ ...manifest.pairs[0]! });
      expect((await auditReviewedAudioManifest(manifest, root)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('duplicate sentence')]));
      manifest.pairs.splice(1);
      manifest.pairs[0]!.reviewDate = '2026-02-30';
      expect((await auditReviewedAudioManifest(manifest, root)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('invalid reviewDate')]));
    });
  });
});
