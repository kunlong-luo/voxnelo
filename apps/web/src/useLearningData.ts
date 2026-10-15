import { useCallback, useEffect, useRef, useState } from 'react';
import type { LearningState } from '../../../packages/core/recommend';
import { loadLearningData, patchState, recordEvent, type HistoryEvent } from '../../../packages/storage/database';

/** 学习数据读写：states/events 加载刷新、浏览与练习事件记录、收藏/复习标记。 */
export function useLearningData(
  notify: (message: string) => void,
  sentenceId: string,
  currentId: string,
  recordingUrl: string | null,
) {
  const [states, setStates] = useState<LearningState[]>([]);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const playedRef = useRef<string>('');
  const countedRecordingUrl = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await loadLearningData();
      setStates(data.states);
      setEvents(data.events);
    } catch {
      notify('学习记录暂时无法读取，请确认应用拥有本地存储权限。');
    }
  }, [notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (playedRef.current === sentenceId) return;
    playedRef.current = sentenceId;
    void recordEvent(sentenceId, 'view')
      .then(refresh)
      .catch(() => notify('无法保存浏览历史。'));
  }, [sentenceId, refresh, notify]);

  useEffect(() => {
    if (!recordingUrl || countedRecordingUrl.current === recordingUrl) return;
    countedRecordingUrl.current = recordingUrl;
    void recordEvent(currentId, 'practice')
      .then(refresh)
      .catch(() => notify('本次练习未能保存到历史。'));
  }, [recordingUrl, currentId, refresh, notify]);

  const setFlag = useCallback(
    async (targetId: string, flag: 'favorite' | 'review', value: boolean) => {
      try {
        await patchState(targetId, { [flag]: value });
        await refresh();
      } catch {
        notify('本次操作没有保存成功，请重试。');
      }
    },
    [refresh, notify],
  );

  return { states, events, refresh, setFlag };
}
