import { describe, expect, it } from 'vitest';
import { formatAsrTranscriptForDisplay as format } from '../apps/web/src/dictation/formatTranscript';

describe('Readable English ASR subtitle presentation',()=>{
  it('converts uppercase-only transcripts into sentence case',()=>{
    expect(format('HELLO HOW ARE YOU')).toBe('Hello how are you');
    expect(format("HELLO, I'M LEARNING ENGLISH WITH AI!")).toBe("Hello, I'm learning English with AI!");
    expect(format('HELLO WORLD. HOW ARE YOU?')).toBe('Hello world. How are you?');
  });
  it('preserves standalone I, common unambiguous acronyms, and contractions',()=>{
    expect(format('I WOULD LIKE TO LEARN ENGLISH USING AN API')).toBe('I would like to learn English using an API');
    expect(format("I DON'T KNOW IF NASA USES A GPU")).toBe("I don't know if NASA uses a GPU");
  });
  it('keeps meaningful mixed-case, non-English characters and already readable text untouched',()=>{
    expect(format('Hello iPhone from NASA')).toBe('Hello iPhone from NASA');
    expect(format('I love English')).toBe('I love English');
    expect(format('123 こんにちは')).toBe('123 こんにちは');
    expect(format('')).toBe('');
  });
  it('does not add unrecognized words or punctuation',()=>{
    expect(format('I LIKE COFFEE')).toBe('I like coffee');
    expect(format('USB')).toBe('USB');
    expect(format('HELLO\nHOW ARE YOU')).toBe('Hello\nHow are you');
  });
});
