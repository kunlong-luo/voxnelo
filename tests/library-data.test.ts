import { describe, expect, it } from 'vitest';
import { FIRST_SENTENCE, SENTENCES, type HistoryEvent, type LearningState } from '@voxnelo/learning';
import { historyTotals, libraryEntries, libraryPage, LIBRARY_PAGE_SIZE } from '../apps/web/src/libraryData';

const timestamp=Date.UTC(2026,9,16,12,0,0);
function events(count:number):HistoryEvent[]{
  return Array.from({length:count},(_,i)=>({
    id:i+1,
    sentenceId:SENTENCES[i%SENTENCES.length]!.id,
    at:timestamp+i*60000,
    type:i%3===0?'practice':'view',
  }));
}

describe('Library history selector and pagination',()=>{
  it('retains repeated real learning visits instead of deduplicating the timeline',()=>{
    const list:HistoryEvent[]=[
      {id:1,sentenceId:FIRST_SENTENCE.id,at:timestamp,type:'view'},
      {id:2,sentenceId:FIRST_SENTENCE.id,at:timestamp+1000,type:'practice'},
    ];
    const entries=libraryEntries('history',[],list,'');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({id:'2',type:'practice',at:timestamp+1000});
    expect(entries[1]).toMatchObject({id:'1',type:'view',at:timestamp});
    expect(historyTotals(list)).toEqual({events:2,unique:1,practice:1});
  });

  it('uses database timestamps for newest-first chronology without inventing a daily streak',()=>{
    const entries=libraryEntries('history',[],events(19),'');
    expect(entries).toHaveLength(19);
    expect(entries[0]?.at).toBe(timestamp+18*60000);
    expect(entries.at(-1)?.at).toBe(timestamp);
    const one=libraryPage(entries,1);
    const three=libraryPage(entries,3);
    expect(one.items).toHaveLength(LIBRARY_PAGE_SIZE);
    expect(three.pages).toBe(4);
    expect(three.items).toHaveLength(5);
    expect(three.start).toBe(11);
    expect(three.end).toBe(15);
    expect(new Set([...one.items,...libraryPage(entries,2).items,...three.items,...libraryPage(entries,4).items].map(e=>e.id)).size).toBe(19);
  });

  it('clamps pagination when filtering shrinks the number of matches',()=>{
    const items=Array.from({length:17},(_,i)=>i);
    expect(libraryPage(items,200)).toMatchObject({page:4,pages:4,start:16,end:17});
    expect(libraryPage(items,-2)).toMatchObject({page:1,pages:4,start:1,end:5});
    expect(libraryPage([],10)).toMatchObject({page:1,pages:1,start:0,end:0,total:0});
  });

  it('filters bilingual text while excluding removed or unknown sentence IDs',()=>{
    const list=[
      {id:1,sentenceId:FIRST_SENTENCE.id,at:timestamp,type:'view' as const},
      {id:2,sentenceId:'deleted-course-entry',at:timestamp+2000,type:'practice' as const},
    ];
    const match=libraryEntries('history',[],list,FIRST_SENTENCE.english.toUpperCase());
    expect(match).toHaveLength(1);
    expect(match[0]?.sentence.id).toBe(FIRST_SENTENCE.id);
    expect(historyTotals(list)).toEqual({events:1,unique:1,practice:0});
  });

  it('maintains favorites/review as distinct saved collections',()=>{
    const states:LearningState[]=[
      {sentenceId:FIRST_SENTENCE.id,seenCount:2,practicedCount:1,favorite:true,review:false,lastSeenAt:timestamp},
      {sentenceId:SENTENCES[1]!.id,seenCount:1,practicedCount:0,favorite:false,review:true,lastSeenAt:timestamp-1000},
    ];
    expect(libraryEntries('favorites',states,[],'' ).map(e=>e.id)).toEqual([FIRST_SENTENCE.id]);
    expect(libraryEntries('review',states,[],'' ).map(e=>e.id)).toEqual([SENTENCES[1]!.id]);
  });
});
