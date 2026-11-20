import { SENTENCES } from '@voxnelo/content';
import type { LearningState } from '@voxnelo/core';
import { database, type HistoryEvent } from '@voxnelo/storage';

export const BACKUP_FORMAT = 'voxnelo-learning-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
export const MAX_BACKUP_EVENTS = 50_000;
const validIds = new Set(SENTENCES.map(sentence => sentence.id));

export type BackupErrorCode = 'invalid-file' | 'unsupported-version' | 'invalid-records' | 'too-large' | 'storage-failed';

export class LearningBackupError extends Error {
  constructor(public readonly code: BackupErrorCode) { super(code); }
}

export interface LearningBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  states: LearningState[];
  events: Pick<HistoryEvent, 'sentenceId' | 'at' | 'type'>[];
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const finiteTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const count = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;

const exactKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Object.keys(value).every(key => allowed.includes(key));

const STATE_KEYS = [
  'sentenceId', 'seenCount', 'practicedCount', 'favorite', 'review',
  'lastSeenAt', 'lastPracticedAt', 'reviewStep', 'nextReviewAt', 'familiar',
] as const;

function validatedState(value: unknown): LearningState {
  if (!object(value) || !exactKeys(value, STATE_KEYS) ||
    typeof value.sentenceId !== 'string' || !validIds.has(value.sentenceId) ||
    !count(value.seenCount) || !count(value.practicedCount) ||
    typeof value.favorite !== 'boolean' || typeof value.review !== 'boolean' ||
    (value.familiar !== undefined && typeof value.familiar !== 'boolean') ||
    (value.familiar === true && value.review === true) ||
    !finiteTimestamp(value.lastSeenAt) ||
    (value.lastPracticedAt !== undefined && !finiteTimestamp(value.lastPracticedAt)) ||
    (value.reviewStep !== undefined &&
      (typeof value.reviewStep !== 'number' || !Number.isSafeInteger(value.reviewStep) ||
       value.reviewStep < 0 || value.reviewStep > 5)) ||
    (value.nextReviewAt !== undefined && !finiteTimestamp(value.nextReviewAt)) ||
    (!value.review && (value.reviewStep !== undefined || value.nextReviewAt !== undefined))
  ) throw new LearningBackupError('invalid-records');

  const state: LearningState = {
    sentenceId: value.sentenceId, seenCount: value.seenCount,
    practicedCount: value.practicedCount, favorite: value.favorite,
    review: value.review, lastSeenAt: value.lastSeenAt,
  };
  if (typeof value.familiar === 'boolean') state.familiar = value.familiar;
  if (typeof value.lastPracticedAt === 'number') state.lastPracticedAt = value.lastPracticedAt;
  if (typeof value.reviewStep === 'number') state.reviewStep = value.reviewStep;
  if (typeof value.nextReviewAt === 'number') state.nextReviewAt = value.nextReviewAt;
  return state;
}

function validatedEvent(value: unknown): LearningBackup['events'][number] {
  if (!object(value) || !exactKeys(value, ['sentenceId', 'at', 'type']) ||
    typeof value.sentenceId !== 'string' || !validIds.has(value.sentenceId) ||
    !finiteTimestamp(value.at) || (value.type !== 'view' && value.type !== 'practice')
  ) throw new LearningBackupError('invalid-records');
  return { sentenceId: value.sentenceId, at: value.at, type: value.type };
}

/** Strict, versioned, byte-bounded, source-allowlisted JSON. Never trust file type alone. */
export function parseLearningBackup(text: string): LearningBackup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new LearningBackupError('too-large');
  let payload: unknown;
  try { payload = JSON.parse(text) as unknown; }
  catch { throw new LearningBackupError('invalid-file'); }
  if (!object(payload) || payload.format !== BACKUP_FORMAT)
    throw new LearningBackupError('invalid-file');
  if (payload.version !== BACKUP_VERSION)
    throw new LearningBackupError('unsupported-version');
  if (!exactKeys(payload, ['format', 'version', 'exportedAt', 'states', 'events']) ||
    !finiteTimestamp(payload.exportedAt) ||
    !Array.isArray(payload.states) || !Array.isArray(payload.events))
    throw new LearningBackupError('invalid-records');
  if (payload.states.length > validIds.size || payload.events.length > MAX_BACKUP_EVENTS)
    throw new LearningBackupError('too-large');

  const states = payload.states.map(validatedState);
  const events = payload.events.map(validatedEvent);
  if (new Set(states.map(state => state.sentenceId)).size !== states.length)
    throw new LearningBackupError('invalid-records');
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION,
    exportedAt: payload.exportedAt, states, events };
}

/** Export the ENTIRE local event table, not the 250-row recent-history UI preview.
 * Refuse an oversized backup instead of silently dropping learning history.
 * Binary microphone recordings, model packs and OS settings are not exported. */
export async function exportLearningBackup(): Promise<string> {
  let states: LearningState[];
  let events: HistoryEvent[];
  try {
    [states, events] = await database.transaction('r', database.states, database.events,
      async () => Promise.all([database.states.toArray(), database.events.toArray()]));
  } catch { throw new LearningBackupError('storage-failed'); }
  if (events.length > MAX_BACKUP_EVENTS) throw new LearningBackupError('too-large');

  const data = {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: Date.now(),
    states, events: events.map(({sentenceId, at, type}) => ({sentenceId, at, type})),
  };
  return JSON.stringify(parseLearningBackup(JSON.stringify(data)), null, 2);
}

/** Full replacement is explicit in the UI; atomic transaction means no partial
 * clear on write failure. Event PKs are newly generated, not blindly imported.
 * Validate again to guard against changed caller data after preview. */
export async function restoreLearningBackup(backup: LearningBackup): Promise<void> {
  const checked = parseLearningBackup(JSON.stringify(backup));
  try {
    await database.transaction('rw', database.states, database.events, async () => {
      await database.states.clear();
      await database.events.clear();
      if (checked.states.length) await database.states.bulkPut(checked.states);
      if (checked.events.length) await database.events.bulkAdd(checked.events);
    });
  } catch { throw new LearningBackupError('storage-failed'); }
}
