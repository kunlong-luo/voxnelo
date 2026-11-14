import { CONNECTED_SPEECH_GUIDES } from './connected-speech.ts';
import { reviewCsvCell } from './connected-speech-review.ts';

/**
 * Blank, one-take-per-row handoff for an external qualified reviewer/recordist.
 * This is a planning worksheet, NOT an approved-asset manifest or importer.
 */
const HEADER = [
  'sentence_id', 'sentence_english', 'take_kind', 'target_ipa',
  'content_status', 'proposed_asset_id', 'proposed_filename',
  'performer_reference', 'recording_source', 'redistribution_license',
  'rights_evidence_reference', 'attribution', 'ipa_alignment_review',
  'recording_sha256', 'review_decision', 'review_notes',
] as const;

export function connectedSpeechAudioHandoffCsv(): string {
  const rows: string[][] = [];
  for (const [id, guide] of Object.entries(CONNECTED_SPEECH_GUIDES)
    .sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    for (const kind of ['careful', 'natural'] as const) {
      const assetId = id + '-' + kind + '-v1';
      rows.push([
        id, guide.english, kind,
        kind === 'careful' ? guide.standardIpa : guide.spokenIpa,
        guide.reviewStatus, assetId, assetId + '.wav',
        '', '', '', '', '', '', '', 'PENDING', '',
      ]);
    }
  }
  // BOM + RFC 4180 quoting for Chinese/IPA-safe offline spreadsheets.
  return '\uFEFF' + [HEADER, ...rows].map(row => row.map(reviewCsvCell).join(',')).join('\r\n') + '\r\n';
}
