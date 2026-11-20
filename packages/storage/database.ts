import Dexie, { type Table } from 'dexie';
import { nextReviewSchedule, type LearningState } from '@voxnelo/core';

export interface HistoryEvent {
  id?: number;
  sentenceId: string;
  at: number;
  type: 'view' | 'practice';
}

class LearningDatabase extends Dexie {
  states!: Table<LearningState, string>;
  events!: Table<HistoryEvent, number>;

  constructor() {
    super('voxnelo-v01');
    this.version(1).stores({
      states: 'sentenceId,lastSeenAt,lastPracticedAt,favorite,review',
      events: '++id,sentenceId,at,type',
    });
  }
}

export const database = new LearningDatabase();

export async function recordEvent(sentenceId: string, type: 'view' | 'practice'): Promise<void> {
  await database.transaction('rw', database.states, database.events, async () => {
    const now = Date.now();
    const original = await database.states.get(sentenceId);
    const state: LearningState = original ?? {
      sentenceId,
      seenCount: 0,
      practicedCount: 0,
      favorite: false,
      review: false,
      lastSeenAt: now,
    };
    if (type === 'view') {
      state.seenCount += 1;
      state.lastSeenAt = now;
    } else {
      state.practicedCount += 1;
      state.lastPracticedAt = now;
      if (state.review) Object.assign(state, nextReviewSchedule(state, now));
    }
    await database.states.put(state);
    await database.events.add({ sentenceId, at: now, type });
  });
}

export async function patchState(sentenceId: string, patch: Partial<Pick<LearningState, 'favorite' | 'review' | 'familiar'>>) {
  await database.transaction('rw', database.states, async () => {
    const original = await database.states.get(sentenceId);
    const state: LearningState = original ?? {
      sentenceId,
      seenCount: 0,
      practicedCount: 0,
      favorite: false,
      review: false,
      lastSeenAt: Date.now(),
    };
    const updated = { ...state, ...patch };
    // Review and "familiar" are mutually exclusive learner decisions.
    // Favorites and previous history remain independent of both labels.
    if (patch.familiar === true) {
      updated.review = false;
      delete updated.reviewStep;
      delete updated.nextReviewAt;
    } else if (patch.review === true) {
      updated.familiar = false;
      if (!state.review) {
        updated.reviewStep = 0;
        updated.nextReviewAt = Date.now();
      }
    } else if (patch.review === false && state.review) {
      delete updated.reviewStep;
      delete updated.nextReviewAt;
    }
    await database.states.put(updated);
  });
}

/** Mark a review as done without inventing a microphone recording/history event. */
export async function completeReview(sentenceId: string): Promise<void> {
  await database.transaction('rw', database.states, async () => {
    const state = await database.states.get(sentenceId);
    if (!state?.review) throw new Error('No active review plan for this sentence');
    await database.states.put({ ...state, ...nextReviewSchedule(state) });
  });
}

export async function loadLearningData() {
  const [states, events] = await Promise.all([
    database.states.toArray(),
    database.events.orderBy('at').reverse().limit(250).toArray(),
  ]);
  return { states, events };
}
