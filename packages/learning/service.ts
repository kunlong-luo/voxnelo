import { SENTENCES, TOPIC_LABELS, type Sentence } from '@voxnelo/content';
import { APP_VERSION, calculateStats, chooseNext, type LearningState } from '@voxnelo/core';
import { speakEnglish, stopSpeech, type SpeechResult } from '@voxnelo/audio';
import { loadLearningData, patchState, recordEvent, type HistoryEvent } from '@voxnelo/storage';

/**
 * 学习应用服务：UI 唯一允许直连的包门面。
 * 编排内容、推荐、朗读与持久化，把底层异常收口为可展示的 ServiceError 并记日志，
 * UI 层只做展示与导航，不再直连 storage/audio/core。
 */
export { APP_VERSION, SENTENCES, TOPIC_LABELS };
export { FIRST_SENTENCE } from '@voxnelo/content';
export { primeSpeechVoices } from '@voxnelo/audio';
export type { HistoryEvent, LearningState, Sentence, SpeechResult };
export type LearningStats = ReturnType<typeof calculateStats>;

export type ServiceError =
  { code: 'STORAGE_UNAVAILABLE'; message: string } | { code: 'SPEECH_UNAVAILABLE'; message: string };

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: ServiceError };

export interface LearningSnapshot {
  states: LearningState[];
  events: HistoryEvent[];
}

function storageError(message: string): ServiceError {
  return { code: 'STORAGE_UNAVAILABLE', message };
}

export async function loadSnapshot(): Promise<ServiceResult<LearningSnapshot>> {
  try {
    const data = await loadLearningData();
    return { ok: true, value: data };
  } catch (err) {
    console.error('[learning] loadSnapshot failed', err);
    return {
      ok: false,
      error: storageError('学习记录暂时无法读取，请确认应用拥有本地存储权限。'),
    };
  }
}

export async function recordView(sentenceId: string): Promise<ServiceResult<void>> {
  try {
    await recordEvent(sentenceId, 'view');
    return { ok: true, value: undefined };
  } catch (err) {
    console.error('[learning] recordView failed', err);
    return { ok: false, error: storageError('无法保存浏览历史。') };
  }
}

export async function recordPractice(sentenceId: string): Promise<ServiceResult<void>> {
  try {
    await recordEvent(sentenceId, 'practice');
    return { ok: true, value: undefined };
  } catch (err) {
    console.error('[learning] recordPractice failed', err);
    return { ok: false, error: storageError('本次练习未能保存到历史。') };
  }
}

export async function setFlag(
  sentenceId: string,
  flag: 'favorite' | 'review',
  value: boolean,
): Promise<ServiceResult<void>> {
  try {
    await patchState(sentenceId, { [flag]: value });
    return { ok: true, value: undefined };
  } catch (err) {
    console.error('[learning] setFlag failed', err);
    return { ok: false, error: storageError('本次操作没有保存成功，请重试。') };
  }
}

export function pickNext(
  states: LearningState[],
  currentId?: string,
  recentIds: string[] = [],
  sentences: Sentence[] = SENTENCES,
): Sentence | undefined {
  return chooseNext(sentences, states, currentId, recentIds);
}

/** V0.1 F006: resume the last valid sentence from local IndexedDB history. */
export function mostRecentSentenceId(
  events: readonly HistoryEvent[],
  sentences: readonly Sentence[] = SENTENCES,
): string | undefined {
  const knownIds = new Set(sentences.map((item) => item.id));
  return events.find((event) => knownIds.has(event.sentenceId))?.sentenceId;
}

export function summarize(states: LearningState[]): LearningStats {
  return calculateStats(states);
}

export async function speak(text: string, speed: 'normal' | 'slow' = 'normal'): Promise<SpeechResult> {
  if (typeof window === 'undefined') {
    return { ok: false, message: '当前环境不支持语音朗读。' };
  }
  return speakEnglish(text, speed);
}

export function silence(): void {
  if (typeof window !== 'undefined') stopSpeech();
}
