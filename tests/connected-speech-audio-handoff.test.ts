import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONNECTED_SPEECH_GUIDES, connectedSpeechAudioHandoffCsv,
  parseConnectedSpeechReviewCsv,
} from '@voxnelo/content';
import { auditReviewedAudioManifest } from '../scripts/reviewed-audio-validator.mts';

describe('20-take careful/natural recording handoff (no approvals generated)', () => {
  const rows = () => parseConnectedSpeechReviewCsv(connectedSpeechAudioHandoffCsv());

  it('is deterministic, Excel-compatible UTF-8 BOM CSV with exactly two takes per sentence', () => {
    const csv = connectedSpeechAudioHandoffCsv();
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toBe(connectedSpeechAudioHandoffCsv());
    const [header, ...data] = rows();
    expect(header).toEqual([
      'sentence_id', 'sentence_english', 'take_kind', 'target_ipa',
      'content_status', 'proposed_asset_id', 'proposed_filename',
      'performer_reference', 'recording_source', 'redistribution_license',
      'rights_evidence_reference', 'attribution', 'ipa_alignment_review',
      'recording_sha256', 'review_decision', 'review_notes',
    ]);
    expect(data).toHaveLength(20);
    expect(new Set(data.map(row => row[0])).size).toBe(10);
    const filenames = new Set<string>();
    for (const row of data) {
      expect(row).toHaveLength(header!.length);
      const guide = CONNECTED_SPEECH_GUIDES[row[0] ?? ''];
      expect(guide).toBeDefined();
      if (!guide) throw Error('Missing connected-speech guide in handoff');
      expect(row[1]).toBe(guide.english);
      expect(row[2]).toMatch(/^(careful|natural)$/);
      expect(row[3]).toBe(row[2] === 'careful' ? guide.standardIpa : guide.spokenIpa);
      expect(row[4]).toBe('editorial-draft');
      expect(row[5]).toBe(row[0] + '-' + row[2] + '-v1');
      expect(row[6]).toBe(row[5] + '.wav');
      filenames.add(row[6]!);
      expect(row.slice(7, 14)).toEqual(['', '', '', '', '', '', '']);
      expect(row[14]).toBe('PENDING');
      expect(row[15]).toBe('');
    }
    expect(filenames.size).toBe(20);
    expect(data.map(row => row[0])).toEqual(
      [...new Set(data.map(row => row[0]))].flatMap(id => [id, id]),
    );
    // One phrase has two pronunciation rules but still needs two recordings.
    expect(data.filter(row => row[0] === 's009')).toHaveLength(2);
  });

  it('keeps the legitimate, empty manifest valid without any recording directory', async () => {
    const result = await auditReviewedAudioManifest({ schemaVersion: 1, pairs: [] },
      path.join(os.tmpdir(), 'voxnelo-audio-audit-no-directory-' + process.pid));
    expect(result).toEqual({ pairs: 0, filesChecked: 0, errors: [] });
  });

  it('rejects any unlisted recording, non-audio evidence or directory while manifest is empty', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'voxnelo-stray-audio-'));
    const root = path.join(dir, 'reviewed');
    try {
      await mkdir(root);
      await writeFile(path.join(root, 's008-careful-v1.wav'), 'not authorized');
      await writeFile(path.join(root, 'private-reviewer.csv'), 'personal data');
      await mkdir(path.join(root, 'nested'));
      const result = await auditReviewedAudioManifest({ schemaVersion: 1, pairs: [] }, root);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Unlisted file in reviewed audio directory: s008-careful-v1.wav'),
        expect.stringContaining('Unlisted file in reviewed audio directory: private-reviewer.csv'),
        expect.stringContaining('Unexpected non-regular audio entry: nested'),
      ]));
      expect(result.filesChecked).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects a symlinked root and a symlinked unlisted file without reading target data', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'voxnelo-stray-link-'));
    try {
      const root = path.join(dir, 'reviewed');
      const alias = path.join(dir, 'alias');
      await mkdir(root);
      await symlink(root, alias);
      const linkedRoot = await auditReviewedAudioManifest({ schemaVersion: 1, pairs: [] }, alias);
      expect(linkedRoot.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Audio root must be a real directory'),
      ]));
      await writeFile(path.join(dir, 'outside.txt'), 'not an authorized recording');
      await symlink(path.join(dir, 'outside.txt'), path.join(root, 's008-natural-v1.wav'));
      const linkedFile = await auditReviewedAudioManifest({ schemaVersion: 1, pairs: [] }, root);
      expect(linkedFile.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Unexpected non-regular audio entry: s008-natural-v1.wav'),
        expect.stringContaining('Unlisted file in reviewed audio directory: s008-natural-v1.wav'),
      ]));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
