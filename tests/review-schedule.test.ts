import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextReviewSchedule, reviewSchedule } from '@voxnelo/core';
import { database, patchState, recordEvent, completeReview, loadLearningData } from '@voxnelo/storage';
import { libraryEntries, reviewTotals } from '../apps/web/src/libraryData';

const start = Date.UTC(2026, 10, 17, 12);
const day = 86_400_000;

async function clearAll() {
  await database.transaction('rw', database.states, database.events, async () => {
    await database.states.clear();
    await database.events.clear();
  });
}
beforeEach(async () => {
  vi.spyOn(Date,'now').mockReturnValue(start);
  await clearAll();
});
afterEach(() => vi.restoreAllMocks());

describe('F104 opt-in spaced review without fabricated learning grades', () => {
  it('keeps new user-marked items immediately due and ignores browsing', async () => {
    await patchState('s001', {review:true});
    let snapshot = await loadLearningData();
    expect(snapshot.states[0]).toMatchObject({review:true,reviewStep:0,nextReviewAt:start,practicedCount:0});
    expect(reviewSchedule(snapshot.states[0]!,start)).toMatchObject({due:true,dueAt:start});
    await recordEvent('s001','view');
    snapshot = await loadLearningData();
    expect(snapshot.states[0]).toMatchObject({reviewStep:0,nextReviewAt:start,practicedCount:0,seenCount:1});
  });

  it('moves due date forward only on user-confirmed follow-up, not as a recorded attempt', async () => {
    await patchState('s001', {review:true});
    await completeReview('s001');
    const snapshot = await loadLearningData();
    expect(snapshot.states[0]).toMatchObject({
      review:true, reviewStep:1,nextReviewAt:start+day,practicedCount:0,seenCount:0,
    });
    expect(snapshot.events).toHaveLength(0);
    expect(reviewSchedule(snapshot.states[0]!,start+day-1)?.due).toBe(false);
    expect(reviewSchedule(snapshot.states[0]!,start+day)?.due).toBe(true);
  });

  it('advances to 3 and 7 days on completed recordings, then resets after removing review', async () => {
    await patchState('s001', {review:true});
    await completeReview('s001');
    vi.mocked(Date.now).mockReturnValue(start+day);
    await recordEvent('s001','practice');
    let state=(await loadLearningData()).states[0]!;
    expect(state).toMatchObject({reviewStep:2,nextReviewAt:start+4*day,practicedCount:1});
    vi.mocked(Date.now).mockReturnValue(start+4*day);
    await recordEvent('s001','practice');
    state=(await loadLearningData()).states[0]!;
    expect(state).toMatchObject({reviewStep:3,nextReviewAt:start+11*day,practicedCount:2});
    await patchState('s001',{review:false});
    state=(await loadLearningData()).states[0]!;
    expect(state.review).toBe(false);
    expect(state.nextReviewAt).toBeUndefined();
    expect(state.reviewStep).toBeUndefined();
    expect(reviewSchedule(state,start+20*day)).toBeUndefined();
    await patchState('s001',{review:true});
    state=(await loadLearningData()).states[0]!;
    expect(state).toMatchObject({reviewStep:0,nextReviewAt:start+4*day,practicedCount:2});
  });

  it('keeps old Dexie rows readable and avoids incorrect due dates for malformed data', () => {
    const legacy = {sentenceId:'s001',seenCount:3,practicedCount:1,favorite:false,review:true,
      lastSeenAt:start,lastPracticedAt:start};
    expect(reviewSchedule(legacy,start+day-1)?.due).toBe(false);
    expect(reviewSchedule(legacy,start+day)?.due).toBe(true);
    expect(reviewSchedule({review:true},start)?.due).toBe(true);
    expect(reviewSchedule({...legacy,nextReviewAt:Number.NaN},start)?.due).toBe(false);
    expect(nextReviewSchedule({reviewStep:200},start)).toEqual({reviewStep:5,nextReviewAt:start+30*day});
    expect(nextReviewSchedule({reviewStep:-1},start)).toEqual({reviewStep:1,nextReviewAt:start+day});
  });

  it('orders overdue before upcoming and ignores deleted course IDs in totals', () => {
    const states=[
      {sentenceId:'s001',seenCount:1,practicedCount:1,favorite:false,review:true,lastSeenAt:start,nextReviewAt:start-1,reviewStep:1},
      {sentenceId:'s002',seenCount:2,practicedCount:2,favorite:false,review:true,lastSeenAt:start,nextReviewAt:start+day,reviewStep:2},
      {sentenceId:'deleted',seenCount:1,practicedCount:0,favorite:false,review:true,lastSeenAt:start,nextReviewAt:0,reviewStep:0},
    ];
    expect(reviewTotals(states,start)).toEqual({due:1,upcoming:1,total:2});
    expect(libraryEntries('review',states,[],'',start).map(x=>[x.id,x.reviewDue])).toEqual([
      ['s001',true],['s002',false],
    ]);
    expect(libraryEntries('favorites',states,[],'',start)).toHaveLength(0);
  });

  it('cannot complete review for an unmarked or nonexistent sentence', async () => {
    await expect(completeReview('s001')).rejects.toThrow(/No active review plan/);
    expect((await loadLearningData()).states).toHaveLength(0);
    await patchState('s001',{favorite:true});
    await expect(completeReview('s001')).rejects.toThrow(/No active review plan/);
  });
});
