import { describe, expect, it } from 'vitest';
import { calculateStats, chooseNext, type LearningState } from '@voxnelo/core';
import { SENTENCES } from '@voxnelo/content';

describe('Voxnelo V0.1 推荐与进度', () => {
  it('不会推荐当前句子（存在其他候选时）', () => {
    const next = chooseNext(SENTENCES, [], SENTENCES[0].id, [], () => 0);
    expect(next?.id).not.toBe(SENTENCES[0].id);
  });
  it('最近练习过滤不会导致没有可推荐句子', () => {
    const selected = SENTENCES.slice(0, 2);
    const next = chooseNext(selected, [], selected[0].id, [selected[1].id], () => 0);
    expect(next?.id).toBe(selected[1].id);
  });
  it('区分已浏览与已练习', () => {
    const states: LearningState[] = [
      { sentenceId: 'a', seenCount: 2, practicedCount: 0, favorite: false, review: true, lastSeenAt: 1 },
      { sentenceId: 'b', seenCount: 1, practicedCount: 1, favorite: true, review: false, lastSeenAt: 2 },
    ];
    expect(calculateStats(states)).toEqual({ viewed: 2, practiced: 1, favorites: 1, review: 1 });
  });
  it('初始课程应具有唯一 ID', () => {
    expect(new Set(SENTENCES.map((s) => s.id)).size).toBe(SENTENCES.length);
    expect(SENTENCES.length).toBeGreaterThanOrEqual(30);
  });
});
