import { describe, expect, it } from 'vitest';
import { focusTranscript } from '../apps/web/src/dictation/transcriptFocus';

describe('Current vs cumulative English transcript presentation',()=>{
  it('prioritizes the live interim hypothesis and hides finished words from the current line',()=>{
    const focus=focusTranscript('THE PREVIOUS SENTENCE WAS COMPLETED','THIS IS THE CURRENT PHRASE');
    expect(focus).toEqual({text:'THIS IS THE CURRENT PHRASE',source:'interim',hasHistory:true});
  });
  it('shows only the latest 18 words after an endpoint while retaining history separately',()=>{
    const all=Array.from({length:75},(_,i)=>'word'+i).join(' ');
    const focus=focusTranscript(all,'');
    expect(focus.source).toBe('recent-final');
    expect(focus.text).toBe('… '+Array.from({length:18},(_,i)=>'word'+(57+i)).join(' '));
    expect(focus.text).not.toContain('word0 ');
    expect(focus.hasHistory).toBe(true);
    expect(all).toContain('word0 word1');
  });
  it('bounds very long interim results without manufacturing or finalizing text',()=>{
    const interim=Array.from({length:25},(_,i)=>'spoken'+i).join(' ');
    const focus=focusTranscript('',interim);
    expect(focus.text).toBe('… '+Array.from({length:18},(_,i)=>'spoken'+(7+i)).join(' '));
    expect(focus.source).toBe('interim');
    expect(focus.hasHistory).toBe(false);
  });
  it('handles silent input and preserves unusual spaces in the original transcript',()=>{
    expect(focusTranscript('','')).toEqual({text:'',source:'empty',hasHistory:false});
    expect(focusTranscript('HELLO\n\n WORLD','')).toEqual({text:'HELLO WORLD',source:'recent-final',hasHistory:true});
    expect(()=>focusTranscript('hello','',0)).toThrow();
  });
});