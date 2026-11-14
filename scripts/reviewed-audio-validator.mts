/**
 * Offline preflight for a future *human-approved* pair of careful/natural WAVs.
 *
 * No approval or license can be granted by metadata or a checksum. This
 * validator is not imported by the renderer and does not enable playback.
 */
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONNECTED_SPEECH_GUIDES } from '../packages/content/connected-speech.ts';

type JsonRecord = Record<string, unknown>;
type TakeKind = 'careful' | 'natural';

export interface ReviewedAudioAudit {
  pairs: number;
  filesChecked: number;
  errors: string[];
}

function record(value: unknown): JsonRecord | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as JsonRecord;
}

function textField(value: unknown, label: string, errors: string[]): string {
  if (typeof value !== 'string' || value.trim().length === 0 ||
      value.trim().length > 512 || /^(?:todo|tbd|pending|unknown|n\/a)$/iu.test(value.trim())) {
    errors.push(label + ': missing or placeholder evidence');
    return '';
  }
  return value.trim();
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Inspect the actual RIFF bytes, not the filename or declared media type.
 * Only mono 16-bit little-endian PCM WAV is supported in the first pilot.
 */
export function inspectReviewPcmWav(
  data: Buffer, sampleRateHz: number, durationMs: number,
): string[] {
  const errors: string[] = [];
  if (data.length < 44 || data.toString('ascii', 0, 4) !== 'RIFF' ||
      data.toString('ascii', 8, 12) !== 'WAVE' ||
      data.readUInt32LE(4) !== data.length - 8) {
    return ['WAV RIFF header/length is invalid'];
  }
  let offset = 12;
  let fmtCount = 0;
  let dataCount = 0;
  let audioBytes = 0;
  while (offset < data.length) {
    if (offset + 8 > data.length) {
      errors.push('WAV chunk header is truncated');
      break;
    }
    const name = data.toString('ascii', offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > data.length) {
      errors.push('WAV chunk exceeds file length');
      break;
    }
    if (name === 'fmt ') {
      fmtCount++;
      if (size < 16 || data.readUInt16LE(start) !== 1 ||
          data.readUInt16LE(start + 2) !== 1 ||
          data.readUInt32LE(start + 4) !== sampleRateHz ||
          data.readUInt32LE(start + 8) !== sampleRateHz * 2 ||
          data.readUInt16LE(start + 12) !== 2 ||
          data.readUInt16LE(start + 14) !== 16) {
        errors.push('WAV must be mono PCM16 with matching sample rate and byte alignment');
      }
    }
    if (name === 'data') {
      dataCount++;
      audioBytes = size;
    }
    offset = end + (size % 2);
  }
  if (offset !== data.length) errors.push('WAV contains invalid trailing bytes');
  if (fmtCount !== 1 || dataCount !== 1 || audioBytes === 0 || audioBytes % 2 !== 0) {
    errors.push('WAV requires exactly one fmt chunk and one nonempty PCM data chunk');
  } else {
    const actualMs = (audioBytes / 2 / sampleRateHz) * 1000;
    if (Math.abs(actualMs - durationMs) > 10) errors.push('WAV duration differs from metadata');
  }
  return errors;
}

/**
 * File audit is intentionally fail-closed. Even a structurally clean result
 * does NOT authenticate a reviewer, recording, redistribution license, or IPA.
 */
export async function auditReviewedAudioManifest(
  source: unknown, audioRoot: string,
): Promise<ReviewedAudioAudit> {
  const errors: string[] = [];
  let filesChecked = 0;
  const json = record(source);
  if (!json || json.schemaVersion !== 1 || !Array.isArray(json.pairs)) {
    return { pairs: 0, filesChecked: 0, errors: ['Expected schemaVersion: 1 and pairs array'] };
  }
  if (json.pairs.length > 40) {
    return { pairs: json.pairs.length, filesChecked: 0, errors: ['Manifest exceeds 40 sentences'] };
  }
  if (json.pairs.length > 0) {
    try {
      const root = await lstat(audioRoot);
      if (!root.isDirectory() || root.isSymbolicLink()) errors.push('Audio root must be a real directory');
    } catch {
      errors.push('Audio root directory is absent');
    }
  }
  const seenSentences = new Set<string>();
  const seenAssets = new Set<string>();
  const seenHashes = new Set<string>();
  for (const [index, raw] of json.pairs.entries()) {
    const prefix = 'Pair ' + (index + 1);
    const pair = record(raw);
    if (!pair) {
      errors.push(prefix + ': invalid pair');
      continue;
    }
    const id = textField(pair.sentenceId, prefix + ' sentenceId', errors);
    if (!/^s\d{3}$/u.test(id)) errors.push(prefix + ': invalid sentence identifier');
    if (seenSentences.has(id)) errors.push(prefix + ': duplicate sentence');
    seenSentences.add(id);
    const guide = CONNECTED_SPEECH_GUIDES[id];
    if (!guide) {
      errors.push(prefix + ': no matching connected-speech lesson');
    } else {
      if (pair.english !== guide.english || pair.standardIpa !== guide.standardIpa ||
          pair.naturalIpa !== guide.spokenIpa) {
        errors.push(prefix + ': written phrase or IPA differs from the current curriculum');
      }
      // All existing lessons are editorial drafts; genuine approval requires a
      // separately reviewed curriculum PR, not a JSON change in this manifest.
      if (String(guide.reviewStatus) !== 'linguist-reviewed') {
        errors.push(prefix + ': curriculum lacks verified linguist-reviewed status');
      }
    }
    if (pair.language !== 'en-US') errors.push(prefix + ': expected en-US accent');
    const reviewId = textField(pair.reviewEvidenceId, prefix + ' reviewEvidenceId', errors);
    if (reviewId.length < 6) errors.push(prefix + ': review evidence reference too short');
    const reviewDate = textField(pair.reviewDate, prefix + ' reviewDate', errors);
    if (!validDate(reviewDate)) errors.push(prefix + ': invalid reviewDate');
    const takes = record(pair.takes);
    if (!takes || Object.keys(takes).sort().join(',') !== 'careful,natural') {
      errors.push(prefix + ': exactly two named takes (careful and natural) are required');
      continue;
    }
    const takesSeen: string[] = [];
    for (const variant of ['careful', 'natural'] as const) {
      const where = prefix + ' ' + variant;
      const take = record(takes[variant]);
      if (!take) {
        errors.push(where + ': missing asset metadata');
        continue;
      }
      const assetId = textField(take.assetId, where + ' assetId', errors);
      const filename = textField(take.filename, where + ' filename', errors);
      const sha256 = textField(take.sha256, where + ' sha256', errors);
      const performer = textField(take.performerId, where + ' performerId', errors);
      const licenseId = textField(take.licenseId, where + ' licenseId', errors);
      const rightsEvidenceId = textField(take.rightsEvidenceId, where + ' rightsEvidenceId', errors);
      const alignment = textField(take.ipaAlignmentEvidenceId, where + ' ipaAlignmentEvidenceId', errors);
      textField(take.attribution, where + ' attribution', errors);
      if ([performer, licenseId, rightsEvidenceId, alignment].some(x => x.length < 6)) {
        errors.push(where + ': recording evidence references must be specific');
      }
      if (!/^s\d{3}-(?:careful|natural)-[a-z0-9-]+$/u.test(assetId) ||
          !assetId.startsWith(id + '-' + variant + '-') ||
          filename !== assetId + '.wav' || !/^[a-z0-9-]+\.wav$/u.test(filename)) {
        errors.push(where + ': unsafe filename or asset identifier');
        continue;
      }
      if (seenAssets.has(assetId)) errors.push(where + ': duplicate asset identifier');
      seenAssets.add(assetId);
      if (!/^[a-f0-9]{64}$/iu.test(sha256)) {
        errors.push(where + ': SHA-256 must contain 64 hex characters');
        continue;
      }
      if (seenHashes.has(sha256.toLowerCase())) errors.push(where + ': audio checksum reused across takes');
      seenHashes.add(sha256.toLowerCase());
      const rate = take.sampleRateHz;
      const duration = take.durationMs;
      if (typeof rate !== 'number' || !Number.isInteger(rate) ||
          rate < 16000 || rate > 48000 ||
          typeof duration !== 'number' || !Number.isInteger(duration) ||
          duration < 150 || duration > 15000) {
        errors.push(where + ': invalid sample rate or duration');
        continue;
      }
      if (take.encoding !== 'wav-pcm16-mono') {
        errors.push(where + ': unsupported audio encoding');
        continue;
      }
      takesSeen.push(variant);
      try {
        const full = path.join(audioRoot, filename);
        const stat = await lstat(full);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 20_000_000) {
          errors.push(where + ': recording must be a regular WAV file under 20 MB');
          continue;
        }
        const bytes = await readFile(full);
        const hash = createHash('sha256').update(bytes).digest('hex');
        if (hash !== sha256.toLowerCase()) errors.push(where + ': SHA-256 mismatch');
        for (const error of inspectReviewPcmWav(bytes, rate, duration)) errors.push(where + ': ' + error);
        filesChecked++;
      } catch {
        errors.push(where + ': recording is missing or cannot be read');
      }
    }
    if (takesSeen.length !== 2) errors.push(prefix + ': both take files must pass metadata validation');
  }
  return { pairs: json.pairs.length, filesChecked, errors };
}
