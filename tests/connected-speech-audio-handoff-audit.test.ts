import { describe, expect, it } from 'vitest';
import {
  auditConnectedSpeechAudioHandoffCsv, connectedSpeechAudioHandoffCsv,
  parseConnectedSpeechReviewCsv, reviewCsvCell,
} from '@voxnelo/content';

function fresh(): string[][] {
  return parseConnectedSpeechReviewCsv(connectedSpeechAudioHandoffCsv());
}
const serialize = (rows: string[][]): string =>
  '\uFEFF' + rows.map(row => row.map(reviewCsvCell).join(',')).join('\r\n') + '\r\n';

function editRow(id: string, kind: string, fields: Record<string, string>,
  rows = fresh()): string[][] {
  const header = rows[0]!;
  const row = rows.slice(1).find(entry => entry[0] === id && entry[2] === kind);
  if (!row) throw Error('Missing fixture sentence/take');
  for (const [field, value] of Object.entries(fields)) {
    const index = header.indexOf(field);
    if (index < 0) throw Error('Unknown test field: ' + field);
    row[index] = value;
  }
  return rows;
}

// Test-only strings are syntactic examples, NOT real reviewer sign-offs,
// licensed recordings, performer identities, source audio or IPA approvals.
function claimedAcceptance(hash: string): Record<string, string> {
  return {
    performer_reference: 'synthetic-performer-ref-001',
    recording_source: 'synthetic-recording-session-001',
    redistribution_license: 'synthetic-license-ref-001',
    rights_evidence_reference: 'synthetic-rights-ref-001',
    attribution: 'Synthetic test-only metadata, no real voice',
    ipa_alignment_review: 'synthetic-pronunciation-audit-ref-001',
    recording_sha256: hash,
    review_decision: 'ACCEPT',
  };
}

describe('offline 20-take handoff audit: never grants approvals or enables audio', () => {
  it('checks the original 20 PENDING rows without error, certification or source changes', () => {
    const csv = connectedSpeechAudioHandoffCsv();
    const result = auditConnectedSpeechAudioHandoffCsv(csv);
    expect(result).toEqual({
      expectedTakes: 20, receivedTakes: 20,
      decisions: { PENDING: 20, ACCEPT: 0, REVISE: 0, REJECT: 0 },
      claimedPairs: 0, errors: [],
    });
    expect(connectedSpeechAudioHandoffCsv()).toBe(csv);
    expect(csv).toContain('PENDING');
  });

  it('rejects changed source text, IPA, asset name, filename and status', () => {
    for (const column of [
      'sentence_english', 'target_ipa', 'content_status', 'proposed_asset_id',
      'proposed_filename', 'take_kind',
    ]) {
      const rows = editRow('s008', 'careful', { [column]: 'fake approved asset' });
      expect(auditConnectedSpeechAudioHandoffCsv(serialize(rows)).errors)
        .toEqual(expect.arrayContaining([
          expect.stringMatching(/immutable source column|unknown sentence\/take identifier/),
        ]));
    }
  });

  it('rejects missing, duplicate, unexpected and malformed rows/header', () => {
    const removed = fresh();
    removed.pop();
    const missing = auditConnectedSpeechAudioHandoffCsv(serialize(removed));
    expect(missing.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Expected 20 take rows'),
      expect.stringContaining('Missing required take row'),
    ]));
    const duplicate = fresh();
    duplicate[2] = [...duplicate[1]!];
    expect(auditConnectedSpeechAudioHandoffCsv(serialize(duplicate)).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('duplicate sentence/take')]));
    const unknown = editRow('s008', 'careful', { sentence_id: 's999' });
    expect(auditConnectedSpeechAudioHandoffCsv(serialize(unknown)).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('unknown sentence/take')]));
    const header = fresh();
    header[0]![3] = 'fabricated_ipa';
    expect(auditConnectedSpeechAudioHandoffCsv(serialize(header)).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('incompatible export version')]));
    expect(auditConnectedSpeechAudioHandoffCsv('"unterminated').errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('Unterminated')]));
    const cols = fresh();
    cols[1]!.pop();
    expect(auditConnectedSpeechAudioHandoffCsv(serialize(cols)).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('expected 16 columns')]));
  });

  it('rejects unsupported decisions, missing correction notes and meaningless placeholders', () => {
    for (const value of ['APPROVED', 'yes', '', 'READY']) {
      const rows = editRow('s008', 'careful', { review_decision: value });
      expect(auditConnectedSpeechAudioHandoffCsv(serialize(rows)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('review_decision must be')]));
    }
    for (const choice of ['REVISE', 'REJECT']) {
      const noNotes = editRow('s008', 'natural', { review_decision: choice });
      expect(auditConnectedSpeechAudioHandoffCsv(serialize(noNotes)).errors)
        .toEqual(expect.arrayContaining([expect.stringContaining('review_notes')]));
      const withNotes = editRow('s008', 'natural', {
        review_decision: choice, review_notes: 'synthetic test: re-record',
      });
      expect(auditConnectedSpeechAudioHandoffCsv(serialize(withNotes)).errors).toEqual([]);
    }
  });

  it('demands all evidence fields before a self-reported ACCEPT can pass syntax lint', () => {
    const noEvidence = editRow('s008', 'careful', { review_decision: 'ACCEPT' });
    const results = auditConnectedSpeechAudioHandoffCsv(serialize(noEvidence));
    expect(results.decisions.ACCEPT).toBe(1);
    expect(results.claimedPairs).toBe(0);
    for (const field of [
      'performer_reference', 'recording_source', 'redistribution_license',
      'rights_evidence_reference', 'attribution', 'ipa_alignment_review', 'recording_sha256',
    ]) {
      expect(results.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('requires specific ' + field),
      ]));
    }
    const fake = editRow('s008', 'careful', claimedAcceptance('a'.repeat(64)));
    editRow('s008', 'careful', { ipa_alignment_review: 'YES', redistribution_license: 'PENDING' }, fake);
    const errors = auditConnectedSpeechAudioHandoffCsv(serialize(fake)).errors;
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('ipa_alignment_review'),
      expect.stringContaining('redistribution_license'),
    ]));
  });

  it('rejects malformed checksum and reused checksum across clear and natural takes', () => {
    const broken = editRow('s008', 'careful', { recording_sha256: 'incorrect' });
    expect(auditConnectedSpeechAudioHandoffCsv(serialize(broken)).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('exactly 64 hex characters')]));
    const reused = editRow('s008', 'careful', claimedAcceptance('c'.repeat(64)));
    editRow('s008', 'natural', claimedAcceptance('C'.repeat(64)), reused);
    const invalid = auditConnectedSpeechAudioHandoffCsv(serialize(reused));
    expect(invalid.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('recording_sha256 reused'),
    ]));
    expect(invalid.claimedPairs).toBe(0);
  });

  it('distinguishes a single self-reported ACCEPT from a two-take claim, never verifies it', () => {
    const rows = editRow('s008', 'careful', claimedAcceptance('a'.repeat(64)));
    const partial = auditConnectedSpeechAudioHandoffCsv(serialize(rows));
    expect(partial.errors).toEqual([]);
    expect(partial.decisions).toEqual({ PENDING: 19, ACCEPT: 1, REVISE: 0, REJECT: 0 });
    expect(partial.claimedPairs).toBe(0);
    editRow('s008', 'natural', claimedAcceptance('b'.repeat(64)), rows);
    const both = auditConnectedSpeechAudioHandoffCsv(serialize(rows));
    expect(both.errors).toEqual([]);
    expect(both.decisions).toEqual({ PENDING: 18, ACCEPT: 2, REVISE: 0, REJECT: 0 });
    expect(both.claimedPairs).toBe(1);
  });

  it('does not turn a malformed row or overlong private evidence into a valid pair', () => {
    const rows = editRow('s008', 'careful', claimedAcceptance('a'.repeat(64)));
    editRow('s008', 'natural', claimedAcceptance('b'.repeat(64)), rows);
    editRow('s008', 'natural', { review_notes: 'x'.repeat(2050) }, rows);
    const audit = auditConnectedSpeechAudioHandoffCsv(serialize(rows));
    expect(audit.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('exceeds the 2048-character'),
    ]));
    expect(audit.claimedPairs).toBe(0);
  });

  it('permits partial work-in-progress fields while explicitly retaining PENDING', () => {
    const rows = editRow('s008', 'careful', {
      recording_source: 'synthetic temporary recording reference',
      review_notes: 'Needs reviewer and permission before any approval',
    });
    const audit = auditConnectedSpeechAudioHandoffCsv(serialize(rows));
    expect(audit.errors).toEqual([]);
    expect(audit.decisions.PENDING).toBe(20);
    expect(audit.claimedPairs).toBe(0);
  });
});
