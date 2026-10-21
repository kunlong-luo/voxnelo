import { describe, expect, it } from 'vitest';
import { appendRecentWords } from '../apps/desktop/asrTranscriptHistory';

describe('offline ASR recent transcript',()=>{
  it('keeps only the last 120 finalized words',()=>{
    const history:string[]=[];
    appendRecentWords(history,Array.from({length:150},(_,i)=>'word'+i).join(' '));
    expect(history).toHaveLength(120);
    expect(history[0]).toBe('word30');
    expect(history.at(-1)).toBe('word149');
  });
  it('ignores silence and retains punctuation without duplicating words',()=>{
    const history=['Hello,'];
    appendRecentWords(history,'  ');
    appendRecentWords(history,' world! ');
    expect(history.join(' ')).toBe('Hello, world!');
  });
  it('bounds successive segment updates',()=>{
    const history:string[]=[];
    for(let i=0;i<200;i++)appendRecentWords(history,'phrase'+i);
    expect(history).toHaveLength(120);
    expect(history[0]).toBe('phrase80');
  });
});
