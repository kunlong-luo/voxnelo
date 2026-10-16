import { describe, expect, it } from 'vitest';
import { requireRealAsrQuality } from '../apps/desktop/asrAcceptance';

describe('Real native offline ASR release acceptance',()=>{
  it('requires a real, nonempty transcript even if the worker exits cleanly',()=>{
    expect(()=>requireRealAsrQuality({transcript:'',realTimeFactor:0.1})).toThrow(/no transcript/);
    expect(()=>requireRealAsrQuality({transcript:'  ',realTimeFactor:0.1})).toThrow(/no transcript/);
  });
  it('enforces genuinely streaming speed and finite elapsed time',()=>{
    expect(()=>requireRealAsrQuality({transcript:'hello',realTimeFactor:1.5})).toThrow(/too slow/);
    expect(()=>requireRealAsrQuality({transcript:'hello',realTimeFactor:NaN})).toThrow(/too slow/);
    expect(()=>requireRealAsrQuality({transcript:'hello',realTimeFactor:0})).toThrow(/too slow/);
  });
  it('fails high word error rate instead of printing a falsely passing result',()=>{
    expect(()=>requireRealAsrQuality({
      transcript:'some incorrect words',
      reference:'the quick brown fox',
      realTimeFactor:0.12,wordErrorRate:0.75,
    })).toThrow(/quality failed/);
    expect(()=>requireRealAsrQuality({
      transcript:'something',
      reference:'something else',
      realTimeFactor:0.12,wordErrorRate:null,
    })).toThrow(/quality failed/);
  });
  it('accepts a nonempty real-time result with reference WER below threshold',()=>{
    expect(()=>requireRealAsrQuality({
      transcript:'hello world',reference:'hello world',
      realTimeFactor:0.15,wordErrorRate:0,
    })).not.toThrow();
    expect(()=>requireRealAsrQuality({
      transcript:'hello world',realTimeFactor:0.5,
    })).not.toThrow();
  });
});
