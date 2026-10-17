import { describe, expect, it } from 'vitest';
import { SCENE_LABELS, SENTENCES, STARTER_SENTENCES, TOPIC_LABELS } from '@voxnelo/content';

/**
 * Machine-verifiable F010 checks only. These do NOT attest to translation,
 * American IPA linguistic correctness or source/recording copyrights.
 */
describe('V0.1 content integrity', () => {
  it('preserves the 40 stable starter IDs and expands into 12 new 20-phrase scenes', () => {
    expect(STARTER_SENTENCES).toHaveLength(40);
    expect(SENTENCES).toHaveLength(280);
    expect(SENTENCES.slice(0,40)).toEqual(STARTER_SENTENCES);
    expect(SENTENCES.map(item=>item.id)).toEqual(
      SENTENCES.map((_,index)=>'s'+String(index+1).padStart(3,'0')),
    );
  });

  it('contains nonempty bilingual text and delimited IPA for every sentence', () => {
    for(const item of SENTENCES) {
      expect(item.english.trim(), item.id).toBe(item.english);
      expect(item.chinese.trim(), item.id).toBe(item.chinese);
      if (item.ipa) expect(item.ipa.trim(), item.id).toBe(item.ipa);
      else expect(item.reviewStatus,item.id+' has no verified IPA').toBe('needs-review');
      expect(/[A-Za-z]/.test(item.english), item.id+' English').toBe(true);
      expect(/[\u3400-\u9fff]/u.test(item.chinese), item.id+' Chinese').toBe(true);
      if(item.ipa){
        expect(item.ipa.startsWith('/')&&item.ipa.endsWith('/'), item.id+' IPA delimiters').toBe(true);
        expect(item.ipa.length, item.id+' IPA').toBeGreaterThan(4);
      }
      expect(/todo|tbd|placeholder|lorem|待补|待译/i.test(item.english+item.chinese+(item.ipa??'')),item.id).toBe(false);
      expect(item.level==='Pre-A1'||item.level==='A1',item.id+' CEFR level').toBe(true);
      expect(Object.prototype.hasOwnProperty.call(TOPIC_LABELS,item.topic),item.id+' topic').toBe(true);
      expect(Object.prototype.hasOwnProperty.call(SCENE_LABELS,item.scene??'core'),item.id+' scene').toBe(true);
    }
  });

  it('does not accidentally duplicate English teaching sentences', () => {
    const normalized=SENTENCES.map(item=>item.english.normalize('NFKC').toLowerCase().replace(/[^a-z]+/g,' ').trim());
    expect(new Set(normalized).size).toBe(SENTENCES.length);
  });

  it('separates original starter lessons from 240 explicitly unreviewed expansions', () => {
    expect(STARTER_SENTENCES.every(s=>Boolean(s.ipa))).toBe(true);
    const expanded=SENTENCES.slice(40);
    expect(expanded.every(s=>s.ipa===undefined&&s.reviewStatus==='needs-review')).toBe(true);
    expect(new Set(expanded.map(s=>s.scene)).size).toBe(12);
    for(const scene of Object.keys(SCENE_LABELS).filter(s=>s!=='core')) {
      expect(expanded.filter(s=>s.scene===scene),scene).toHaveLength(20);
    }
  });

  it('includes beginner examples across every declared teaching topic', () => {
    const actual=new Set(SENTENCES.map(item=>item.topic));
    expect([...actual].sort()).toEqual(Object.keys(TOPIC_LABELS).sort());
  });
});
