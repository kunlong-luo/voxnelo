import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useI18n } from './i18n';
import { Tooltip } from './Tooltip';

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const safe = Math.floor(Math.max(0, seconds));
  return Math.floor(safe / 60) + ':' + String(safe % 60).padStart(2, '0');
}

/** Styled control integrated into the same action rail as the real recording controls. */
export function RecordingPlayback({ src }: { src: string | null }) {
  const {t} = useI18n();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setError('');
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError(t('playbackError'));
    }
  };

  return (
    <div className="actionSlot replaySlot">
      {src ? (
        <audio ref={audioRef} src={src} preload="metadata"
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration;
            setDuration(Number.isFinite(value) ? value : 0);
          }}
          onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
        />
      ) : null}
      <Tooltip text={t(playing ? 'playbackPause' : 'playbackStart')}>
        <button type="button" className="roundControl replayButton" onClick={() => void toggle()}
          disabled={!src} aria-label={t(playing ? 'playbackPause' : 'playbackStart')}>
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </button>
      </Tooltip>
      <span className="actionCaption">{t(playing ? 'playbackPause' : 'playbackCaption')}</span>
      {src ? (
        <>
          <time className="actionAux replayTime">{clock(elapsed)} / {duration > 0 ? clock(duration) : '--:--'}</time>
          <div className="replayProgress" role="progressbar" aria-label={t('playbackProgress')}
            aria-valuemin={0} aria-valuemax={duration > 0 ? duration : 1} aria-valuenow={elapsed}>
            <span style={{width: Math.min(100, elapsed / (duration > 0 ? duration : 1) * 100) + '%'}} />
          </div>
        </>
      ) : <span className="actionAux">{t("playbackUnavailable")}</span>}
      {error ? <p className="replayError" role="alert">{error}</p> : null}
    </div>
  );
}
