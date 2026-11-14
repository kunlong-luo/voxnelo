import { connectedSpeechAudioHandoffCsv } from './connected-speech-audio-handoff.ts';
import { parseConnectedSpeechReviewCsv, type ReviewDecision } from './connected-speech-review-audit.ts';

/**
 * Read-only lint for a completed recording handoff. ACCEPT denotes a claim
 * in a spreadsheet, NEVER a verified performer, license or phonetic approval.
 * No file access, manifest creation, content change or source enablement.
 */
export interface AudioHandoffAudit {
  expectedTakes: number;
  receivedTakes: number;
  /** The number of self-reported decisions, NOT verified accepted recordings. */
  decisions: Record<ReviewDecision, number>;
  /** Count of sentences with two stated ACCEPTs; NOT certified pairs. */
  claimedPairs: number;
  errors: string[];
}

const DECISIONS: readonly ReviewDecision[] = ['PENDING', 'ACCEPT', 'REVISE', 'REJECT'];
const UNCHANGING_COLUMNS = 7;
const REQUIRED_EVIDENCE_COLUMNS = [7, 8, 9, 10, 11, 12, 13] as const;
const MAX_CELL_LENGTH = 2048;
const key = (row: readonly string[]) => row[0] + '/' + row[2];

function hasEvidence(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 6 && trimmed.length <= MAX_CELL_LENGTH &&
    !/^(?:todo|tbd|pending|unknown|n\/a|none|no|yes|placeholder|not available|not applicable)$/iu.test(trimmed);
}

/**
 * The exporter remains the only source of canonical immutable identifiers,
 * English text, IPA, editorial status, asset ID and future WAV filename.
 */
export function auditConnectedSpeechAudioHandoffCsv(csv: string): AudioHandoffAudit {
  const decisions: Record<ReviewDecision, number> =
    { PENDING: 0, ACCEPT: 0, REVISE: 0, REJECT: 0 };
  const baseline = parseConnectedSpeechReviewCsv(connectedSpeechAudioHandoffCsv());
  const header = baseline[0]!;
  const expectedRows = new Map(baseline.slice(1).map(row => [key(row), row] as const));
  const errors: string[] = [];
  let incoming: string[][];
  try {
    incoming = parseConnectedSpeechReviewCsv(csv);
  } catch (error) {
    return {
      expectedTakes: expectedRows.size, receivedTakes: 0, decisions, claimedPairs: 0,
      errors: [error instanceof Error ? error.message : 'Invalid audio handoff CSV'],
    };
  }

  if (incoming[0]?.length !== header.length ||
      incoming[0]?.some((cell, index) => cell !== header[index])) {
    return {
      expectedTakes: expectedRows.size,
      receivedTakes: Math.max(0, incoming.length - 1),
      decisions, claimedPairs: 0,
      errors: ['Recording handoff header is missing, modified, or from an incompatible export version'],
    };
  }

  const received = incoming.slice(1);
  if (received.length !== expectedRows.size) {
    errors.push('Expected ' + expectedRows.size + ' take rows, received ' + received.length);
  }
  const seen = new Set<string>();
  const seenHashes = new Map<string, string>();
  const acceptedKinds = new Map<string, Set<string>>();
  for (const [index, row] of received.entries()) {
    const location = 'Row ' + (index + 2);
    if (row.length !== header.length) {
      errors.push(location + ': expected ' + header.length + ' columns');
      continue;
    }
    const identity = key(row);
    const baselineRow = expectedRows.get(identity);
    if (!baselineRow) {
      errors.push(location + ': unknown sentence/take identifier');
      continue;
    }
    if (seen.has(identity)) {
      errors.push(location + ': duplicate sentence/take identifier');
      continue;
    }
    seen.add(identity);
    for (let field = 0; field < UNCHANGING_COLUMNS; field++) {
      if (row[field] !== baselineRow[field]) {
        errors.push(location + ': immutable source column ' + header[field] + ' was changed; propose a curriculum PR instead');
      }
    }
    if (row.some(field => field.length > MAX_CELL_LENGTH)) {
      errors.push(location + ': a cell exceeds the 2048-character evidence safety limit');
    }
    const decision = row[14] as ReviewDecision;
    if (!DECISIONS.includes(decision)) {
      errors.push(location + ': review_decision must be PENDING, ACCEPT, REVISE or REJECT');
      continue;
    }
    decisions[decision]++;
    const checksum = row[13]!.trim();
    if (checksum && !/^[a-f0-9]{64}$/iu.test(checksum)) {
      errors.push(location + ': recording_sha256 must have exactly 64 hex characters');
    } else if (checksum) {
      const prior = seenHashes.get(checksum.toLowerCase());
      if (prior) errors.push(location + ': recording_sha256 reused by two different takes');
      else seenHashes.set(checksum.toLowerCase(), identity);
    }

    if (decision === 'ACCEPT') {
      for (const field of REQUIRED_EVIDENCE_COLUMNS) {
        if (!hasEvidence(row[field]!)) {
          errors.push(location + ': ACCEPT requires specific ' + header[field] + ' evidence');
        }
      }
      // A lone YES/NO is not a review record: require a specific reference.
      const claimed = acceptedKinds.get(row[0]!) ?? new Set<string>();
      claimed.add(row[2]!);
      acceptedKinds.set(row[0]!, claimed);
    } else if ((decision === 'REVISE' || decision === 'REJECT') && !hasEvidence(row[15]!)) {
      errors.push(location + ': REVISE/REJECT requires meaningful review_notes');
    }
  }

  for (const identity of expectedRows.keys()) {
    if (!seen.has(identity)) errors.push('Missing required take row ' + identity);
  }
  // A malformed sheet never counts as a complete pair.
  const claimedPairs = errors.length > 0 ? 0 :
    [...acceptedKinds.values()].filter(kinds => kinds.has('careful') && kinds.has('natural')).length;

  return { expectedTakes: expectedRows.size, receivedTakes: received.length,
    decisions, claimedPairs, errors };
}
