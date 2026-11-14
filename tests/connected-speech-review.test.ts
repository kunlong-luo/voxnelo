import { describe, expect, it } from 'vitest';
import { CONNECTED_SPEECH_GUIDES } from '@voxnelo/content';
import { connectedSpeechReviewCsv, reviewCsvCell } from '../packages/content/connected-speech-review.ts';

const columns=(line:string)=>[...line.matchAll(/"(?:[^"]|"")*"/gu)]
  .map(match=>match[0].slice(1,-1).replaceAll('""','"'));

describe('exportable connected-speech linguistic and recording review queue',()=>{
  it('provides a UTF-8, deterministic, one-row-per-rule checklist with no invented approvals or audio',()=>{
    const csv=connectedSpeechReviewCsv();
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines=csv.slice(1).trimEnd().split('\r\n');
    const header=columns(lines[0]!);
    const rows=lines.slice(1).map(columns);
    const guides=Object.entries(CONNECTED_SPEECH_GUIDES);
    const totalRules=guides.reduce((sum,[,guide])=>sum+guide.rules.length,0);
    expect(guides).toHaveLength(10);
    expect(rows).toHaveLength(totalRules);
    expect(header).toHaveLength(19);
    expect(header).toContain('recording_rights_evidence');
    expect(header).toContain('recording_sha256');
    expect(header).toContain('recording_matches_ipa');
    expect([...new Set(rows.map(row=>row[0]))]).toHaveLength(10);
    expect(rows.map(row=>row[0])).toEqual([...rows.map(row=>row[0])].sort());
    for(const row of rows){
      expect(row).toHaveLength(header.length);
      const guide=CONNECTED_SPEECH_GUIDES[row[0]!];
      expect(guide).toBeTruthy();
      expect(row[1]).toBe(guide.english);
      expect(row[2]).toBe(guide.standardIpa);
      expect(row[3]).toBe(guide.spokenIpa);
      expect(row[4]).toBe('editorial-draft');
      const note=guide.rules[Number(row[5])-1];
      expect(row[6]).toBe(note?.kind);
      expect(row[7]).toBe(note?.span);
      expect(row[8]).toBe(note?.spokenIpa);
      expect(row[9]).toBe(note?.descriptionZh);
      expect(row[10]).toBe(note?.descriptionEn);
      expect(row[13]).toBe('PENDING');
      for(const index of [11,12,14,15,16,17,18]) expect(row[index]).toBe('');
    }
  });
  it('quotes commas, line breaks and formulas in spreadsheet-bound content',()=>{
    expect(reviewCsvCell('say, hello')).toBe('"say, hello"');
    expect(reviewCsvCell('a"b')).toBe('"a""b"');
    expect(reviewCsvCell('=2+2')).toBe('"\'=2+2"');
    expect(reviewCsvCell('  @SUM(A1)')).toBe('"\'  @SUM(A1)"');
    expect(reviewCsvCell('x\ny')).toBe('"x\ny"');
  });
});
