import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { database, patchState, recordEvent } from '@voxnelo/storage';
import {
  BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, MAX_BACKUP_EVENTS,
  exportLearningBackup, parseLearningBackup, restoreLearningBackup, LearningBackupError,
} from '@voxnelo/learning';

const all = async () => ({
  states: await database.states.toArray(),
  events: await database.events.toArray(),
});
const clear = async () => database.transaction('rw', database.states, database.events, async () => {
  await database.states.clear();
  await database.events.clear();
});
const snapshot = (states:unknown[], events:unknown[], overrides:Record<string,unknown>={}) =>
  JSON.stringify({format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt:Date.now(),states,events,...overrides});

beforeEach(clear);
afterEach(() => vi.restoreAllMocks());

describe('F107 offline learning data backup', () => {
  it('round-trips real favorites, review schedule and ALL events beyond the 250 UI preview', async () => {
    await patchState('s001',{favorite:true,review:true});
    for(let index=0;index<260;index++)await recordEvent('s001',index%2===0?'view':'practice');
    const before=await all();
    expect(before.events).toHaveLength(260);
    const text=await exportLearningBackup();
    const parsed=parseLearningBackup(text);
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.version).toBe(1);
    expect(parsed.states).toHaveLength(1);
    expect(parsed.events).toHaveLength(260);
    expect(parsed.states[0]).toMatchObject({favorite:true,review:true,reviewStep:5});
    expect(text).not.toContain('wavBase64');
    expect(text).not.toContain('recordingUrl');
    await clear();
    await restoreLearningBackup(parsed);
    const restored=await all();
    expect(restored.states).toEqual(before.states);
    expect(restored.events.map(({sentenceId,at,type})=>({sentenceId,at,type})))
      .toEqual(before.events.map(({sentenceId,at,type})=>({sentenceId,at,type})));
    expect(restored.events).toHaveLength(260);
  });

  it('does not alter existing data when JSON is malformed, unsupported or unsafe', async () => {
    await recordEvent('s001','view');
    const prior=await all();
    const valid=JSON.parse(await exportLearningBackup()) as {
      states: Record<string,unknown>[];events:Record<string,unknown>[];version:number;
    };
    const cases=[
      '{ broken json',
      '{}',
      snapshot([],[],{version:99}),
      snapshot([],[],{format:'other-product'}),
      snapshot([{...valid.states[0],sentenceId:'unknown-private-sentence'}],[]),
      snapshot([valid.states[0],valid.states[0]],[]),
      snapshot([], [{sentenceId:'s001',at:Date.now(),type:'assessment'}]),
      snapshot([], [{sentenceId:'s001',at:Date.now(),type:'view',audio:'secret'}]),
      snapshot([{...valid.states[0],seenCount:-1}],[]),
      snapshot([{...valid.states[0],reviewStep:100}],[]),
      snapshot([{...valid.states[0],review:false,nextReviewAt:100}],[]),
    ];
    for(const text of cases) {
      expect(()=>parseLearningBackup(text)).toThrow(LearningBackupError);
      expect(await all()).toEqual(prior);
    }
  });

  it('rejects oversized input and refuses silent truncation on export', async () => {
    expect(()=>parseLearningBackup(' '.repeat(MAX_BACKUP_BYTES+1))).toThrowError('too-large');
    const tooMany=Array.from({length:MAX_BACKUP_EVENTS+1},()=>({sentenceId:'s001',at:1,type:'view'}));
    expect(()=>parseLearningBackup(snapshot([],tooMany))).toThrowError('too-large');
    await recordEvent('s001','view');
    const valid=await exportLearningBackup();
    expect(parseLearningBackup(valid).events).toHaveLength(1);
  });

  it('replaces data only after validation and removes old event keys', async () => {
    await recordEvent('s001','view');
    const previous=await all();
    const originalId=previous.events[0]?.id;
    const replacement=parseLearningBackup(snapshot([
      {sentenceId:'s002',seenCount:1,practicedCount:0,favorite:true,review:false,lastSeenAt:100},
    ],[{sentenceId:'s002',at:100,type:'view'}]));
    await restoreLearningBackup(replacement);
    const current=await all();
    expect(current.states.map(state=>state.sentenceId)).toEqual(['s002']);
    expect(current.events.map(event=>event.sentenceId)).toEqual(['s002']);
    // Database-assigned IDs (not trusted from backup), with original row removed.
    expect(typeof current.events[0]?.id).toBe('number');
    expect(current.events[0]?.id).not.toBe(originalId);
    await expect(restoreLearningBackup({...replacement,states:[
      {...replacement.states[0]!,sentenceId:'s500'},
    ]})).rejects.toThrow(LearningBackupError);
    expect(await all()).toEqual(current);
  });

  it('rolls back both tables if the final bulk insert fails', async () => {
    await recordEvent('s001','view');
    const prior=await all();
    const replacement=parseLearningBackup(snapshot([
      {sentenceId:'s002',seenCount:1,practicedCount:0,favorite:false,review:false,lastSeenAt:1},
    ],[{sentenceId:'s002',at:1,type:'practice'}]));
    vi.spyOn(database.events,'bulkAdd').mockRejectedValueOnce(new Error('disk failed'));
    await expect(restoreLearningBackup(replacement)).rejects.toMatchObject({code:'storage-failed'});
    expect(await all()).toEqual(prior);
  });

  it('keeps imported review optional fields compatible with old backups and protects empty snapshots', async () => {
    await recordEvent('s001','view');
    const legacy=parseLearningBackup(snapshot([
      {sentenceId:'s001',seenCount:2,practicedCount:0,favorite:false,review:true,lastSeenAt:1},
    ],[]));
    expect(legacy.states[0]?.reviewStep).toBeUndefined();
    await restoreLearningBackup(legacy);
    expect((await all()).states[0]?.review).toBe(true);
    await restoreLearningBackup(parseLearningBackup(snapshot([],[])));
    expect(await all()).toEqual({states:[],events:[]});
  });
});
