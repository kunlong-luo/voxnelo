import { useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const safe = Math.floor(Math.max(0, seconds));
  return Math.floor(safe / 60) + ':' + String(safe % 60).padStart(2, '0');
}

/** 用户录音回听：使用真实音频事件，不伪造声纹、时长或发音评分。 */
export function RecordingPlayback({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
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
    <div className="replay" aria-label="录音回听">
      <audio ref={audioRef} src={src} preload="metadata"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          setDuration(Number.isFinite(value) ? value : 0);
        }}
        onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
      <div className="replayTitle">
        <span className="replayIcon"><Volume2 size={17} /></span>
        <div><strong>录音已完成</strong><small>听一听自己的声音，可以再录一次</small></div>
      </div>
      <div className="replayControls">
        <button type="button" className="replayButton" onClick={() => void toggle()} aria-label={playing ? '暂停回听' : '回听刚才的录音'}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? '暂停' : '播放录音'}
        </button>
        <progress className="replayProgress" value={elapsed} max={duration > 0 ? duration : 1} aria-label="录音播放进度" />
        <time className="replayTime">{clock(elapsed)} / {duration > 0 ? clock(duration) : '--:--'}</time>
      </div>
      {error ? <p className="replayError" role="alert">{error}</p> : null}
    </div>
  );
}
