import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'ready';

export function useRecorder() {
  const {t} = useI18n();
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const urlRef = useRef<string | null>(null);
  const disposedRef = useRef(false);
  const requestingRef = useRef(false);
  // Invalidates delayed MediaRecorder events when the user clears or changes a sentence.
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  const clearAudio = useCallback(() => {
    // A sentence change must invalidate callbacks and physically release any
    // active microphone, even if the MediaRecorder's stop event arrives later.
    generationRef.current += 1;
    stop();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setRecordingUrl(null);
    setStatus('idle');
  }, [stop]);

  const start = useCallback(async () => {
    if (requestingRef.current || status === 'requesting' || status === 'recording') return;
    requestingRef.current = true;
    setError(null);
    clearAudio();
    const generation = generationRef.current;
    setStatus('requesting');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error(t('recorderUnsupported'));
      }
      const granted = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, channelCount: 1 }, video: false });
      // 窗口可能在系统权限弹窗尚未关闭时已经卸载。
      if (disposedRef.current || generation !== generationRef.current) {
        granted.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = granted;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const mediaRecorder = mime ? new MediaRecorder(granted, { mimeType: mime }) : new MediaRecorder(granted);
      recorder.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      let failed = false;
      mediaRecorder.onstop = () => {
        granted.getTracks().forEach((track) => track.stop());
        if (stream.current === granted) stream.current = null;
        if (recorder.current === mediaRecorder) recorder.current = null;
        if (failed || disposedRef.current || generation !== generationRef.current) return;
        if (chunks.length) {
          const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          const objectUrl = URL.createObjectURL(blob);
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = objectUrl;
          setRecordingUrl(objectUrl);
          setStatus('ready');
        } else {
          setStatus('idle');
          setError(t('recorderEmpty'));
        }
      };
      mediaRecorder.onerror = () => {
        failed = true;
        granted.getTracks().forEach((track) => track.stop());
        if (stream.current === granted) stream.current = null;
        if (recorder.current === mediaRecorder) recorder.current = null;
        if (!disposedRef.current && generation === generationRef.current) {
          setStatus('idle');
          setError(t('recorderInterrupted'));
        }
      };
      mediaRecorder.start();
      setStatus('recording');
    } catch (cause) {
      if (disposedRef.current || generation !== generationRef.current) return;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      setStatus('idle');
      setError(
        cause instanceof Error && (cause.name === 'NotAllowedError' || cause.name === 'PermissionDeniedError')
          ? t('recorderPermission')
          : cause instanceof Error && ['NotFoundError', 'DevicesNotFoundError', 'NotReadableError', 'TrackStartError', 'OverconstrainedError'].includes(cause.name)
            ? t('recorderDeviceMissing')
            : cause instanceof Error && cause.message === t('recorderUnsupported')
              ? cause.message
              : t('recorderFailure'),
      );
    } finally {
      requestingRef.current = false;
    }
  }, [clearAudio, status, t]);

  useEffect(
    () => {
      disposedRef.current = false;
      return () => {
        disposedRef.current = true;
        generationRef.current += 1;
        if (recorder.current) recorder.current.onstop = null;
        if (recorder.current?.state === 'recording') recorder.current.stop();
        stream.current?.getTracks().forEach((track) => track.stop());
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      };
    },
    [],
  );

  return { status, recordingUrl, error, start, stop, clearAudio };
}
