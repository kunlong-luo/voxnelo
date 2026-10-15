import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { database, loadLearningData, patchState, recordEvent } from '@voxnelo/storage';

async function clearAll(): Promise<void> {
  await database.transaction('rw', database.states, database.events, async () => {
    await database.states.clear();
    await database.events.clear();
  });
}

describe('Voxnelo V0.1 学习持久层', () => {
  beforeEach(clearAll);

  it('view 事件累计 seenCount 并刷新 lastSeenAt', async () => {
    await recordEvent('s001', 'view');
    await recordEvent('s001', 'view');
    const { states } = await loadLearningData();
    expect(states).toHaveLength(1);
    const first = states[0];
    if (!first) throw new Error('expected one state');
    expect(first).toMatchObject({ sentenceId: 's001', seenCount: 2, practicedCount: 0 });
    expect(first.lastSeenAt).toBeGreaterThan(0);
  });

  it('view 与 practice 互不干扰', async () => {
    await recordEvent('s001', 'view');
    await recordEvent('s001', 'practice');
    const { states } = await loadLearningData();
    const first = states[0];
    if (!first) throw new Error('expected one state');
    expect(first).toMatchObject({ seenCount: 1, practicedCount: 1 });
    expect(first.lastPracticedAt).toBeGreaterThan(0);
  });

  it('patchState 合并标记且不丢失计数', async () => {
    await recordEvent('s001', 'view');
    await recordEvent('s001', 'practice');
    await patchState('s001', { favorite: true, review: true });
    const { states } = await loadLearningData();
    expect(states[0]).toMatchObject({
      seenCount: 1,
      practicedCount: 1,
      favorite: true,
      review: true,
    });
  });

  it('patchState 遇到未知句子时建默认状态', async () => {
    await patchState('s999', { favorite: true });
    const { states } = await loadLearningData();
    expect(states[0]).toMatchObject({
      sentenceId: 's999',
      seenCount: 0,
      practicedCount: 0,
      favorite: true,
      review: false,
    });
  });

  it('历史按时间倒序返回', async () => {
    await recordEvent('s001', 'view');
    await recordEvent('s002', 'practice');
    await recordEvent('s003', 'view');
    const { events } = await loadLearningData();
    expect(events.map((e) => e.sentenceId)).toEqual(['s003', 's002', 's001']);
  });

  it('历史最多保留 250 条', async () => {
    for (let i = 0; i < 260; i += 1) {
      await recordEvent(`s${i}`, 'view');
    }
    const { events } = await loadLearningData();
    expect(events).toHaveLength(250);
  });
});
