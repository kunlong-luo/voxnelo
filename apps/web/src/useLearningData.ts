import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadSnapshot,
  mostRecentSentenceId,
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
  onRestoreLastSentence: (id: string | undefined) => void,
) {
  const [states, setStates] = useState<LearningState[]>([]);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const playedRef = useRef<string>('');
  const countedRecordingUrl = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const restoreCompletedRef = useRef(false);
  const [historyReady,setHistoryReady] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const result = await loadSnapshot();
    // IndexedDB Promise 可能在卸载后才完成，不能对已销毁的 React 根节点 setState。
    if (!mountedRef.current) return;
    if (result.ok) {
      if (!restoreCompletedRef.current) {
        restoreCompletedRef.current = true;
        // Restore before allowing recordView to write a fake first-sentence visit.
        onRestoreLastSentence(mostRecentSentenceId(result.value.events));
        setHistoryReady(true);
      }
      setStates(result.value.states);
      setEvents(result.value.events);
    } else {
      if (!restoreCompletedRef.current) {
        restoreCompletedRef.current = true;
        setHistoryReady(true);
      }
      notify(result.error.message);
    }
  }, [notify,onRestoreLastSentence]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!historyReady || playedRef.current === sentenceId) return;
    playedRef.current = sentenceId;
    void recordView(sentenceId).then(async (result) => {
      if (!mountedRef.current) return;
      if (!result.ok) {
        notify(result.error.message);
        return;
      }
      await refresh();
    });
  }, [sentenceId, historyReady, refresh, notify]);

  useEffect(() => {
    if (!recordingUrl || countedRecordingUrl.current === recordingUrl) return;
    countedRecordingUrl.current = recordingUrl;
    void recordPractice(currentId).then(async (result) => {
      if (!mountedRef.current) return;
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
      if (!mountedRef.current) return;
      if (!result.ok) {
        notify(result.error.message);
        return;
      }
      await refresh();
    },
    [refresh, notify],
  );

  return { states, events, historyReady, refresh, setFlag };
}
