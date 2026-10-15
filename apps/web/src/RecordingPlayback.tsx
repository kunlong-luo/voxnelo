import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const safe = Math.floor(Math.max(0, seconds));
  return Math.floor(safe / 60) + ':' + String(safe % 60).padStart(2, '0');
}

/** Styled control integrated into the same action rail as the real recording controls. */
export function RecordingPlayback({ src }: { src: string | null }) {
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
      setError('暂时无法回听这段录音，请重试。');
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
      <button type="button" className="roundControl replayButton" onClick={() => void toggle()}
        disabled={!src} aria-label={playing ? '暂停回听' : '回听刚才的录音'}>
        {playing ? <Pause size={22} /> : <Play size={22} />}
      </button>
      <span className="actionCaption">{playing ? '暂停回听' : '回听录音'}</span>
      {src ? (
        <>
          <time className="actionAux replayTime">{clock(elapsed)} / {duration > 0 ? clock(duration) : '--:--'}</time>
          <progress className="replayProgress" value={elapsed} max={duration > 0 ? duration : 1}
            aria-label="录音播放进度" />
        </>
      ) : <span className="actionAux">完成录音后可用</span>}
      {error ? <p className="replayError" role="alert">{error}</p> : null}
    </div>
  );
}
