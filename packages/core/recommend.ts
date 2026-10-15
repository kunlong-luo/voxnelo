import type { Sentence } from '../content/sentences';
import { RANDOM_CEIL, RECENT_WINDOW, RECOMMEND_WEIGHTS } from './config';

export interface LearningState {
  sentenceId: string;
  seenCount: number;
  practicedCount: number;
  favorite: boolean;
  review: boolean;
  lastSeenAt: number;
  lastPracticedAt?: number;
}

/**
 * V0.1 透明规则推荐：优先全新短句，适当考虑需要复习的内容。
 * random 参数方便测试，未来可替换为确定性的每日推荐。
 */
export function chooseNext(
  sentences: Sentence[],
  states: LearningState[],
  currentId?: string,
  recentIds: string[] = [],
  random: () => number = Math.random,
): Sentence | undefined {
  const stateById = new Map(states.map((state) => [state.sentenceId, state]));
  const pool = sentences.filter((sentence) => sentence.id !== currentId);
  if (pool.length === 0) return sentences[0];
  const recent = new Set(recentIds.slice(-RECENT_WINDOW));
  const preferred = pool.filter((sentence) => !recent.has(sentence.id));
  const candidates = preferred.length ? preferred : pool;
  const weighted = candidates.map((sentence) => {
    const state = stateById.get(sentence.id);
    if (!state) return { sentence, weight: RECOMMEND_WEIGHTS.unseen };
    if (state.review) return { sentence, weight: RECOMMEND_WEIGHTS.review };
    if (!state.practicedCount) return { sentence, weight: RECOMMEND_WEIGHTS.unpracticed };
    return { sentence, weight: RECOMMEND_WEIGHTS.practiced };
  });
  const sum = weighted.reduce((total, item) => total + item.weight, 0);
  let draw = Math.max(0, Math.min(RANDOM_CEIL, random())) * sum;
  for (const item of weighted) {
    draw -= item.weight;
    if (draw < 0) return item.sentence;
  }
  return weighted[weighted.length - 1]?.sentence;
}

export function calculateStats(states: LearningState[]) {
  return {
    viewed: states.filter((item) => item.seenCount > 0).length,
    practiced: states.filter((item) => item.practicedCount > 0).length,
    favorites: states.filter((item) => item.favorite).length,
    review: states.filter((item) => item.review).length,
  };
}
