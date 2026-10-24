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
  // A cancelled getUserMedia promise may settle after a replacement request starts.
  // Keep the lock scoped to its generation so stale finally blocks cannot unlock it.
  const pendingRequestGenerationRef = useRef<number | null>(null);
  // The current media track's 'ended' listener belongs to one recorder only.
  const detachTrackEndedRef = useRef<(() => void) | null>(null);
  // Invalidates delayed MediaRecorder events when the user clears or changes a sentence.
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    // Explicit Stop must never be mistaken for an unplugged microphone.
    detachTrackEndedRef.current?.();
    detachTrackEndedRef.current = null;
    const activeRecorder = recorder.current;
    try {
      // MediaRecorder.stop() can throw when the device disappears between the
      // state check and the stop call. Never strand the UI in "recording".
      if (activeRecorder?.state === 'recording') activeRecorder.stop();
    } catch {
      // Discard every delayed ondataavailable/onstop from the failed session.
      // Do not construct a Blob, count a practice, or disturb a later session.
      generationRef.current += 1;
      pendingRequestGenerationRef.current = null;
      if (recorder.current === activeRecorder) recorder.current = null;
      if (activeRecorder) {
        activeRecorder.ondataavailable = null;
        activeRecorder.onstop = null;
        activeRecorder.onerror = null;
      }
      if (!disposedRef.current) {
        setStatus('idle');
        setError(t('recorderInterrupted'));
      }
    } finally {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    }
  }, [t]);

  const clearAudio = useCallback(() => {
    // A sentence change must invalidate callbacks and physically release any
    // active microphone, even if the MediaRecorder's stop event arrives later.
    generationRef.current += 1;
    pendingRequestGenerationRef.current = null;
    stop();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setRecordingUrl(null);
    setStatus('idle');
    setError(null);
  }, [stop]);

  const start = useCallback(async () => {
    if (pendingRequestGenerationRef.current !== null || status === 'requesting' || status === 'recording') return;
    clearAudio();
    const generation = generationRef.current;
    pendingRequestGenerationRef.current = generation;
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
      let failed = false;
      const tracks = granted.getTracks();
      const detachEnded = () => {
        tracks.forEach(track => track.removeEventListener?.('ended', onDeviceEnded));
        if (detachTrackEndedRef.current === detachEnded) detachTrackEndedRef.current = null;
      };
      const onDeviceEnded = () => {
        // Some USB/headset disconnects end MediaStreamTrack without a usable
        // MediaRecorder result. A late event from a prior sentence/session
        // must never stop or overwrite the new recording.
        if (failed || disposedRef.current || generation !== generationRef.current
          || recorder.current !== mediaRecorder) return;
        failed = true;
        detachEnded();
        try {
          if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        } catch { /* The recorder may already have stopped on device loss. */ }
        tracks.forEach(track => track.stop());
        if (stream.current === granted) stream.current = null;
        if (recorder.current === mediaRecorder) recorder.current = null;
        setStatus('idle');
        setError(t('recorderDeviceMissing'));
      };
      mediaRecorder.ondataavailable = (event) => {
        if (!failed && !disposedRef.current && generation === generationRef.current
          && event.data.size > 0) chunks.push(event.data);
      };
      mediaRecorder.onstop = () => {
        detachEnded();
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
        detachEnded();
        granted.getTracks().forEach((track) => track.stop());
        if (stream.current === granted) stream.current = null;
        if (recorder.current === mediaRecorder) recorder.current = null;
        if (!disposedRef.current && generation === generationRef.current) {
          setStatus('idle');
          setError(t('recorderInterrupted'));
        }
      };
      detachTrackEndedRef.current = detachEnded;
      tracks.forEach(track => track.addEventListener?.('ended', onDeviceEnded));
      mediaRecorder.start();
      if (!failed) setStatus('recording');
    } catch (cause) {
      if (disposedRef.current || generation !== generationRef.current) return;
      detachTrackEndedRef.current?.();
      detachTrackEndedRef.current = null;
      recorder.current = null;
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
      if (pendingRequestGenerationRef.current === generation) {
        pendingRequestGenerationRef.current = null;
      }
    }
  }, [clearAudio, status, t]);

  useEffect(
    () => {
      disposedRef.current = false;
      return () => {
        disposedRef.current = true;
        generationRef.current += 1;
        pendingRequestGenerationRef.current = null;
        detachTrackEndedRef.current?.();
        detachTrackEndedRef.current = null;
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
