import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { database } from '@voxnelo/storage';
import {
  loadSnapshot,
  pickNext,
  recordPractice,
  recordView,
  setFlag,
  silence,
  speak,
  summarize,
} from '@voxnelo/learning';

async function clearAll(): Promise<void> {
  await database.transaction('rw', database.states, database.events, async () => {
    await database.states.clear();
    await database.events.clear();
  });
}

describe('Voxnelo 学习应用服务门面', () => {
  beforeEach(clearAll);

  it('loadSnapshot 返回空快照', async () => {
    const result = await loadSnapshot();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.states).toEqual([]);
      expect(result.value.events).toEqual([]);
    }
  });

  it('recordView/recordPractice 经服务落盘并可汇总', async () => {
    expect((await recordView('s001')).ok).toBe(true);
    expect((await recordPractice('s001')).ok).toBe(true);
    const snapshot = await loadSnapshot();
    expect(snapshot.ok).toBe(true);
    if (snapshot.ok) {
      expect(summarize(snapshot.value.states)).toEqual({
        viewed: 1,
        practiced: 1,
        favorites: 0,
        review: 0,
      });
    }
  });

  it('setFlag 经服务合并标记', async () => {
    await recordView('s001');
    const result = await setFlag('s001', 'favorite', true);
    expect(result.ok).toBe(true);
    const snapshot = await loadSnapshot();
    if (snapshot.ok) {
      expect(snapshot.value.states[0]).toMatchObject({ favorite: true, seenCount: 1 });
    }
  });

  it('pickNext 不返回当前句', async () => {
    const snapshot = await loadSnapshot();
    if (snapshot.ok) {
      const sentences = [
        { id: 'a', english: 'A', chinese: '甲', ipa: '', topic: 'daily' as const, level: 'Pre-A1' as const },
        { id: 'b', english: 'B', chinese: '乙', ipa: '', topic: 'daily' as const, level: 'Pre-A1' as const },
      ];
      const next = pickNext(snapshot.value.states, 'a', [], sentences);
      expect(next?.id).toBe('b');
    }
  });

  it('node 环境朗读不可用但不抛错', () => {
    const result = speak('Hello');
    expect(result.ok).toBe(false);
    expect(() => silence()).not.toThrow();
  });
});
