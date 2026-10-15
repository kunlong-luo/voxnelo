import Dexie, { type Table } from 'dexie';
import type { LearningState } from '@voxnelo/core';

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
    }
    await database.states.put(state);
    await database.events.add({ sentenceId, at: now, type });
  });
}

export async function patchState(sentenceId: string, patch: Partial<Pick<LearningState, 'favorite' | 'review'>>) {
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
    await database.states.put({ ...state, ...patch });
  });
}

export async function loadLearningData() {
  const [states, events] = await Promise.all([
    database.states.toArray(),
    database.events.orderBy('at').reverse().limit(250).toArray(),
  ]);
  return { states, events };
}

export async function exportLearningData(): Promise<string> {
  const { states, events } = await loadLearningData();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), states, events }, null, 2);
}
