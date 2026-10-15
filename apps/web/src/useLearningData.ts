import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadSnapshot,
  recordPractice,
  recordView,
  setFlag as saveFlag,
  type HistoryEvent,
  type LearningState,
} from '@voxnelo/learning';

/** 学习数据读写：经应用服务门面访问 states/events，错误转通知。 */
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
    const result = await loadSnapshot();
    if (result.ok) {
      setStates(result.value.states);
      setEvents(result.value.events);
    } else {
      notify(result.error.message);
    }
  }, [notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (playedRef.current === sentenceId) return;
    playedRef.current = sentenceId;
    void recordView(sentenceId).then(async (result) => {
      if (!result.ok) {
        notify(result.error.message);
        return;
      }
      await refresh();
    });
  }, [sentenceId, refresh, notify]);

  useEffect(() => {
    if (!recordingUrl || countedRecordingUrl.current === recordingUrl) return;
    countedRecordingUrl.current = recordingUrl;
    void recordPractice(currentId).then(async (result) => {
      if (!result.ok) {
        notify(result.error.message);
        return;
      }
      await refresh();
    });
  }, [recordingUrl, currentId, refresh, notify]);

  const setFlag = useCallback(
    async (targetId: string, flag: 'favorite' | 'review', value: boolean) => {
      const result = await saveFlag(targetId, flag, value);
      if (!result.ok) {
        notify(result.error.message);
        return;
      }
      await refresh();
    },
    [refresh, notify],
  );

  return { states, events, refresh, setFlag };
}
