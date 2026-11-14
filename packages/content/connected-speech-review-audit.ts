import { connectedSpeechReviewCsv } from './connected-speech-review.ts';

export type ReviewDecision = 'PENDING' | 'ACCEPT' | 'REVISE' | 'REJECT';

export interface ConnectedSpeechReviewAudit {
  /** These counts describe statements in an external sheet, not verified approvals. */
  decisions: Record<ReviewDecision, number>;
  expectedRows: number;
  receivedRows: number;
  errors: string[];
}

/** Strict RFC 4180-style parser; supports Excel's unquoted cells and UTF-8 BOM. */
export function parseConnectedSpeechReviewCsv(csv: string): string[][] {
  if (csv.length > 2_000_000) throw Error('Review CSV exceeds the 2 MB safety limit');
  const source = csv.startsWith('\uFEFF') ? csv.slice(1) : csv;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let closedQuote = false;
  const pushCell = () => {
    row.push(cell);
    cell = '';
    closedQuote = false;
  };
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        cell += character;
      }
    } else if (character === '"') {
      if (cell.length > 0 || closedQuote) throw Error('Unexpected quote in review CSV');
      inQuotes = true;
    } else if (character === ',') {
      pushCell();
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') index++;
      pushCell();
      rows.push(row);
      row = [];
    } else {
      if (closedQuote) throw Error('Unexpected content after a closing quote');
      cell += character;
    }
  }
  if (inQuotes) throw Error('Unterminated quoted CSV field');
  if (row.length > 0 || cell.length > 0 || closedQuote) {
    pushCell();
    rows.push(row);
  }
  return rows;
}

const REQUIRED_DECISIONS: readonly ReviewDecision[] = ['PENDING', 'ACCEPT', 'REVISE', 'REJECT'];
const AUDIO_COLUMNS = [15, 16, 17, 18] as const;
const EVIDENCE_COLUMN_COUNT = 20;
const KEY_FIELDS = 11;
const keyOf = (row: readonly string[]) => row[0] + ':' + row[5];

function realIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Inspect a completed, untrusted external review sheet without modifying app
 * content or assigning any linguistic/legal approval status.
 * This is structural/evidence-presence linting, NOT a review-signoff importer.
 */
export function auditConnectedSpeechReviewCsv(csv: string): ConnectedSpeechReviewAudit {
  const decisions: Record<ReviewDecision, number> = {
    PENDING: 0, ACCEPT: 0, REVISE: 0, REJECT: 0,
  };
  const errors: string[] = [];
  const baseline = parseConnectedSpeechReviewCsv(connectedSpeechReviewCsv());
  const header = baseline[0]!;
  const expected = new Map(baseline.slice(1).map(row => [keyOf(row), row] as const));
  let incoming: string[][];
  try {
    incoming = parseConnectedSpeechReviewCsv(csv);
  } catch (error) {
    return {
      decisions, expectedRows: expected.size, receivedRows: 0,
      errors: [error instanceof Error ? error.message : 'Invalid review CSV'],
    };
  }

  if (header.length !== EVIDENCE_COLUMN_COUNT ||
      incoming[0]?.length !== header.length ||
      incoming[0]?.some((cell, index) => cell !== header[index])) {
    return {
      decisions, expectedRows: expected.size, receivedRows: Math.max(0, incoming.length - 1),
      errors: ['Review CSV header is missing, modified, or from an incompatible export version'],
    };
  }

  const received = incoming.slice(1);
  if (received.length !== expected.size) {
    errors.push('Expected ' + expected.size + ' rule rows, received ' + received.length);
  }
  const encountered = new Set<string>();
  for (const [index, row] of received.entries()) {
    const location = 'Row ' + (index + 2);
    if (row.length !== header.length) {
      errors.push(location + ': expected ' + header.length + ' columns');
      continue;
    }
    const key = keyOf(row);
    const original = expected.get(key);
    if (!original) {
      errors.push(location + ': unknown sentence/rule identifier');
      continue;
    }
    if (encountered.has(key)) {
      errors.push(location + ': duplicated sentence/rule identifier');
      continue;
    }
    encountered.add(key);
    for (let column = 0; column < KEY_FIELDS; column++) {
      if (row[column] !== original[column]) {
        errors.push(location + ': source column ' + header[column] + ' was changed; edit curriculum through PR review');
      }
    }

    const decision = row[13] as ReviewDecision;
    if (!REQUIRED_DECISIONS.includes(decision)) {
      errors.push(location + ': review_decision must be PENDING, ACCEPT, REVISE or REJECT');
      continue;
    }
    decisions[decision]++;
    if (decision !== 'PENDING') {
      if (!row[11]?.trim()) errors.push(location + ': reviewer is required for a decision');
      if (!realIsoDate(row[12] ?? '')) errors.push(location + ': review_date must be a real YYYY-MM-DD date');
    }
    if (decision === 'ACCEPT' && !row[14]?.trim()) {
      errors.push(location + ': ACCEPT requires supporting_sources');
    }
    if ((decision === 'REVISE' || decision === 'REJECT') && !row[19]?.trim()) {
      errors.push(location + ': REVISE/REJECT requires review_notes');
    }

    const audio = AUDIO_COLUMNS.map(column => row[column]!.trim());
    if (audio.some(Boolean)) {
      if (audio.some(value => value.length === 0)) {
        errors.push(location + ': partial recording metadata (asset, rights, hash and IPA match are all required)');
      }
      if (audio[2] && !/^[a-f0-9]{64}$/iu.test(audio[2])) {
        errors.push(location + ': recording_sha256 must have 64 hex characters');
      }
      if (audio[3] && audio[3] !== 'YES' && audio[3] !== 'NO') {
        errors.push(location + ': recording_matches_ipa must be YES or NO');
      }
    }
  }
  for (const key of expected.keys()) {
    if (!encountered.has(key)) errors.push('Missing rule row ' + key);
  }
  return { decisions, expectedRows: expected.size, receivedRows: received.length, errors };
}
