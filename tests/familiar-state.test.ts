import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { database, patchState, recordEvent } from '@voxnelo/storage';
import {
  BACKUP_FORMAT, BACKUP_VERSION, exportLearningBackup,
  parseLearningBackup, restoreLearningBackup,
} from '@voxnelo/learning';
import { FIRST_SENTENCE, SENTENCES } from '@voxnelo/content';
import { libraryEntries } from '../apps/web/src/libraryData';

beforeEach(async()=>{
  await database.transaction('rw',database.states,database.events,async()=>{
    await database.states.clear();await database.events.clear();
  });
});

describe('F106 explicitly familiar, independent from favorites and recording counts',()=>{
  it('only manual self-assessment changes familiar, never visits or recordings',async()=>{
    await recordEvent(FIRST_SENTENCE.id,'view');
    await recordEvent(FIRST_SENTENCE.id,'practice');
    const state=await database.states.get(FIRST_SENTENCE.id);
    expect(state?.practicedCount).toBe(1);
    expect(state?.familiar).toBeUndefined();
    expect(libraryEntries('familiar',[state!],[],'')).toEqual([]);
    await patchState(FIRST_SENTENCE.id,{familiar:true});
    const updated=await database.states.get(FIRST_SENTENCE.id);
    expect(updated).toMatchObject({familiar:true,practicedCount:1,seenCount:1});
    expect(libraryEntries('familiar',[updated!],[],'').map(x=>x.id)).toEqual([FIRST_SENTENCE.id]);
  });
  it('preserves favorites and history but cancels active due review on familiar',async()=>{
    await recordEvent('s001','practice');
    await patchState('s001',{favorite:true,review:true});
    const marked=await database.states.get('s001');
    expect(marked).toMatchObject({review:true,favorite:true,reviewStep:0});
    await patchState('s001',{familiar:true});
    const familiar=await database.states.get('s001');
    expect(familiar).toMatchObject({review:false,favorite:true,familiar:true,practicedCount:1});
    expect(familiar?.reviewStep).toBeUndefined();
    expect(familiar?.nextReviewAt).toBeUndefined();
    expect(await database.events.count()).toBe(1);
    expect(libraryEntries('review',[familiar!],[],'')).toHaveLength(0);
    expect(libraryEntries('favorites',[familiar!],[],'')).toHaveLength(1);
    await patchState('s001',{review:true});
    const resumed=await database.states.get('s001');
    expect(resumed).toMatchObject({review:true,familiar:false,reviewStep:0});
    expect(resumed?.nextReviewAt).toBeGreaterThan(0);
    await patchState('s001',{review:false});
    expect((await database.states.get('s001'))?.familiar).toBe(false);
    await patchState('s001',{familiar:true});
    await patchState('s001',{familiar:false});
    expect((await database.states.get('s001'))?.favorite).toBe(true);
  });
  it('searches only familiar items including non-favorites and excludes stale IDs',async()=>{
    const a={sentenceId:FIRST_SENTENCE.id,seenCount:0,practicedCount:0,favorite:false,review:false,familiar:true,lastSeenAt:10};
    const b={sentenceId:SENTENCES[1]!.id,seenCount:1,practicedCount:1,favorite:true,review:false,familiar:false,lastSeenAt:20};
    const stale={...a,sentenceId:'removed-course-id'};
    expect(libraryEntries('familiar',[a,b,stale],[],FIRST_SENTENCE.english.toUpperCase()).map(x=>x.id))
      .toEqual([FIRST_SENTENCE.id]);
    expect(libraryEntries('familiar',[a,b],[],SENTENCES[1]!.english)).toHaveLength(0);
    expect(libraryEntries('favorites',[a,b],[],'' ).map(x=>x.id)).toEqual([b.sentenceId]);
  });
  it('roundtrips familiar in v1 JSON without breaking older backups',async()=>{
    await patchState('s001',{familiar:true,favorite:true});
    const text=await exportLearningBackup();
    expect(parseLearningBackup(text).states[0]).toMatchObject({familiar:true,favorite:true,review:false});
    await database.states.clear();
    await restoreLearningBackup(parseLearningBackup(text));
    expect(await database.states.get('s001')).toMatchObject({familiar:true,favorite:true});
    const legacy=JSON.stringify({
      format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt:1,
      states:[{sentenceId:'s002',seenCount:0,practicedCount:0,favorite:false,review:false,lastSeenAt:1}],
      events:[],
    });
    await restoreLearningBackup(parseLearningBackup(legacy));
    expect((await database.states.get('s002'))?.familiar).toBeUndefined();
    const invalid=JSON.parse(text) as {states:Array<Record<string,unknown>>};
    invalid.states[0]!.review=true;
    expect(()=>parseLearningBackup(JSON.stringify(invalid))).toThrow('invalid-records');
    invalid.states[0]!.review=false;
    invalid.states[0]!.familiar='yes';
    expect(()=>parseLearningBackup(JSON.stringify(invalid))).toThrow('invalid-records');
  });
});