import { describe, expect, it } from 'vitest';
import { SENTENCES, TOPIC_LABELS } from '@voxnelo/content';

/**
 * Machine-verifiable F010 checks only. These do NOT attest to translation,
 * American IPA linguistic correctness or source/recording copyrights.
 */
describe('V0.1 content integrity', () => {
  it('has between 30 and 50 sequential, stable sentence identifiers', () => {
    expect(SENTENCES.length).toBeGreaterThanOrEqual(30);
    expect(SENTENCES.length).toBeLessThanOrEqual(50);
    expect(SENTENCES.map(item=>item.id)).toEqual(
      SENTENCES.map((_,index)=>'s'+String(index+1).padStart(3,'0')),
    );
  });

  it('contains nonempty bilingual text and delimited IPA for every sentence', () => {
    for(const item of SENTENCES) {
      expect(item.english.trim(), item.id).toBe(item.english);
      expect(item.chinese.trim(), item.id).toBe(item.chinese);
      expect(item.ipa.trim(), item.id).toBe(item.ipa);
      expect(/[A-Za-z]/.test(item.english), item.id+' English').toBe(true);
      expect(/[\u3400-\u9fff]/u.test(item.chinese), item.id+' Chinese').toBe(true);
      expect(item.ipa.startsWith('/')&&item.ipa.endsWith('/'), item.id+' IPA delimiters').toBe(true);
      expect(item.ipa.length, item.id+' IPA').toBeGreaterThan(4);
      expect(/todo|tbd|placeholder|lorem|待补|待译/i.test(item.english+item.chinese+item.ipa),item.id).toBe(false);
      expect(item.level==='Pre-A1'||item.level==='A1',item.id+' CEFR level').toBe(true);
      expect(Object.prototype.hasOwnProperty.call(TOPIC_LABELS,item.topic),item.id+' topic').toBe(true);
    }
  });

  it('does not accidentally duplicate English teaching sentences', () => {
    const normalized=SENTENCES.map(item=>item.english.normalize('NFKC').toLowerCase().replace(/[^a-z]+/g,' ').trim());
    expect(new Set(normalized).size).toBe(SENTENCES.length);
  });

  it('includes beginner examples across every declared teaching topic', () => {
    const actual=new Set(SENTENCES.map(item=>item.topic));
    expect([...actual].sort()).toEqual(Object.keys(TOPIC_LABELS).sort());
  });
});
