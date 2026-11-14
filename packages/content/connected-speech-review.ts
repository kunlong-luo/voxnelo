import { CONNECTED_SPEECH_GUIDES } from './connected-speech.ts';

/**
 * Editorial handoff for trained pronunciation reviewers. This is NOT an
 * approval ledger: approval and recording rights must be evidenced separately
 * before any curriculum status or source-audio capability can change.
 */
const HEADER=[
  'sentence_id','sentence_english','standard_ipa','connected_ipa',
  'content_status','rule_number','rule_kind','rule_span','rule_spoken_ipa',
  'explanation_zh','explanation_en','linguistic_reviewer','review_date',
  'review_decision','supporting_sources','recording_asset_id',
  'recording_rights_evidence','recording_sha256','recording_matches_ipa',
  'review_notes',
] as const;

/** Prefix risky spreadsheet formula-like strings, then RFC 4180 quote. */
export function reviewCsvCell(value:string):string {
  const safe=/^[\t\r\n ]*[=+@-]/u.test(value) ? '\''+value : value;
  return '"'+safe.replaceAll('"','""')+'"';
}

export function connectedSpeechReviewCsv():string {
  const rows:string[][]=[];
  const guides=Object.entries(CONNECTED_SPEECH_GUIDES).sort(([a],[b])=>a.localeCompare(b,'en'));
  for(const [id,guide] of guides){
    guide.rules.forEach((rule,index)=>{
      rows.push([
        id,guide.english,guide.standardIpa,guide.spokenIpa,
        guide.reviewStatus,String(index+1),rule.kind,rule.span,rule.spokenIpa,
        rule.descriptionZh,rule.descriptionEn,
        '', '', 'PENDING', '', '', '', '', '', '',
      ]);
    });
  }
  // A BOM lets spreadsheet apps consistently recognize UTF-8 Chinese and IPA.
  return '\uFEFF'+[HEADER,...rows].map(row=>row.map(reviewCsvCell).join(',')).join('\r\n')+'\r\n';
}
