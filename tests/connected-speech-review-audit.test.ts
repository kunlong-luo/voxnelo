import { describe, expect, it } from 'vitest';
import {
  auditConnectedSpeechReviewCsv, connectedSpeechReviewCsv,
  parseConnectedSpeechReviewCsv, reviewCsvCell,
} from '@voxnelo/content';

const original = () => parseConnectedSpeechReviewCsv(connectedSpeechReviewCsv());
const serialize = (rows: string[][]) =>
  '\uFEFF' + rows.map(row => row.map(reviewCsvCell).join(',')).join('\r\n') + '\r\n';

function editFirstRule(fields: Record<string, string>): string {
  const rows = original();
  const header = rows[0]!;
  const first = rows[1]!;
  for (const [name, value] of Object.entries(fields)) {
    const column = header.indexOf(name);
    if (column < 0) throw Error('Unknown review column ' + name);
    first[column] = value;
  }
  return serialize(rows);
}

describe('offline review evidence audit (not an approval importer)', () => {
  it('accepts the untouched 11-rule, entirely pending export', () => {
    const result = auditConnectedSpeechReviewCsv(connectedSpeechReviewCsv());
    expect(result.errors).toEqual([]);
    expect(result.expectedRows).toBe(11);
    expect(result.receivedRows).toBe(11);
    expect(result.decisions).toEqual({ PENDING: 11, ACCEPT: 0, REVISE: 0, REJECT: 0 });
  });

  it('allows an externally stated ACCEPT only when reviewer, real date and sources exist', () => {
    const missing = auditConnectedSpeechReviewCsv(editFirstRule({ review_decision: 'ACCEPT' }));
    expect(missing.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('reviewer is required'),
      expect.stringContaining('review_date'),
      expect.stringContaining('supporting_sources'),
    ]));

    const syntacticallyComplete = auditConnectedSpeechReviewCsv(editFirstRule({
      review_decision: 'ACCEPT',
      linguistic_reviewer: 'External reviewer',
      review_date: '2026-11-14',
      supporting_sources: 'reviewer supplied dictionary references',
    }));
    expect(syntacticallyComplete.errors).toEqual([]);
    expect(syntacticallyComplete.decisions.ACCEPT).toBe(1);
    expect(syntacticallyComplete.decisions.PENDING).toBe(10);
  });

  it('requires written correction/rejection notes and an actual ISO date', () => {
    const invalid = auditConnectedSpeechReviewCsv(editFirstRule({
      review_decision: 'REVISE', linguistic_reviewer: 'Reviewer',
      review_date: '2026-02-30',
    }));
    expect(invalid.errors.some(message => message.includes('review_date'))).toBe(true);
    expect(invalid.errors.some(message => message.includes('review_notes'))).toBe(true);

    const revised = auditConnectedSpeechReviewCsv(editFirstRule({
      review_decision: 'REJECT', linguistic_reviewer: 'Reviewer',
      review_date: '2026-11-14', review_notes: 'Check weak-form IPA',
    }));
    expect(revised.errors).toEqual([]);
    expect(revised.decisions.REJECT).toBe(1);
  });

  it('rejects tampering with immutable rule text, content status or IPA', () => {
    for (const name of ['sentence_english', 'standard_ipa', 'connected_ipa', 'content_status', 'rule_span']) {
      const issues = auditConnectedSpeechReviewCsv(editFirstRule({ [name]: 'edited in spreadsheet' })).errors;
      expect(issues.some(message => message.includes('source column ' + name))).toBe(true);
    }
  });

  it('rejects missing, duplicate, unknown rule rows and incompatible headers', () => {
    const removed = original();
    removed.pop();
    expect(auditConnectedSpeechReviewCsv(serialize(removed)).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('Missing rule row')]));

    const duplicated = original();
    duplicated[2] = [...duplicated[1]!];
    expect(auditConnectedSpeechReviewCsv(serialize(duplicated)).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('duplicated sentence/rule identifier')]));

    expect(auditConnectedSpeechReviewCsv(editFirstRule({ rule_number: '999' })).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('unknown sentence/rule identifier')]));

    const legacy = original();
    for (const row of legacy) row.pop();
    expect(auditConnectedSpeechReviewCsv(serialize(legacy)).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('incompatible export version')]));
  });

  it('rejects fabricated, incomplete or invalid audio evidence fields', () => {
    expect(auditConnectedSpeechReviewCsv(editFirstRule({
      recording_asset_id: 'audio.wav',
    })).errors.some(message => message.includes('partial recording metadata'))).toBe(true);
    expect(auditConnectedSpeechReviewCsv(editFirstRule({
      recording_asset_id: 'audio.wav',
      recording_rights_evidence: 'claimed permission',
      recording_sha256: 'not-a-hash',
      recording_matches_ipa: 'MAYBE',
    })).errors).toEqual(expect.arrayContaining([
      expect.stringContaining('recording_sha256'),
      expect.stringContaining('recording_matches_ipa'),
    ]));
  });

  it('parses escaped quotes, embedded newlines and unquoted spreadsheet fields', () => {
    expect(parseConnectedSpeechReviewCsv('\uFEFF"a,b","say ""hi""","line\nbreak"\r\n'))
      .toEqual([['a,b', 'say "hi"', 'line\nbreak']]);
    expect(parseConnectedSpeechReviewCsv('a,b\nc,d\n'))
      .toEqual([['a', 'b'], ['c', 'd']]);
    expect(auditConnectedSpeechReviewCsv('"unterminated').errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('Unterminated')]));
    expect(auditConnectedSpeechReviewCsv('invalid"quote').errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('Unexpected quote')]));
  });
});
