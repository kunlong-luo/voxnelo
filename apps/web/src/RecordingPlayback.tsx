import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useI18n } from './i18n';
import { Tooltip } from './Tooltip';
import { Button } from './components/ui/button';
import { Progress } from './components/ui/progress';
import { cn } from './lib/utils';

function clock(seconds:number):string {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.floor(Math.max(0,seconds));
  return Math.floor(total/60)+':'+String(total%60).padStart(2,'0');
}
/** Real audio element is semantic and hidden; all visible controls are designed. */
export function RecordingPlayback({src}:{src:string|null}) {
  const {t}=useI18n();
  const ref=useRef<HTMLAudioElement>(null);
  const [playing,setPlaying]=useState(false),[elapsed,setElapsed]=useState(0);
  const [duration,setDuration]=useState(0),[error,setError]=useState('');
  // Invalidate pending play() promises before changing sentences or unmounting.
  const playbackGeneration=useRef(0);
  useEffect(()=>{
    const audio=ref.current;
    return ()=>{
      playbackGeneration.current+=1;
      if(!audio)return;
      // Removing an <audio> DOM node alone need not stop playback immediately.
      if(!audio.paused)audio.pause();
      audio.removeAttribute('src');
      if(audio.readyState>0)audio.load();
    };
  },[src]);
  const toggle=async()=>{
    const audio=ref.current;
    if(!audio||!src)return;
    const generation=++playbackGeneration.current;
    if(!audio.paused){audio.pause();setPlaying(false);return;}
    try{
      await audio.play();
      if(generation!==playbackGeneration.current)return;
      setError('');setPlaying(true);
    }catch{
      if(generation!==playbackGeneration.current)return;
      setPlaying(false);setError(t('playbackError'));
    }
  };
  return <div className="actionSlot replaySlot flex min-w-0 flex-col items-center">
    {src && <audio ref={ref} src={src} preload="metadata"
      onLoadedMetadata={event=>{const d=event.currentTarget.duration;setDuration(Number.isFinite(d)?d:0)}}
      onTimeUpdate={event=>setElapsed(event.currentTarget.currentTime)}
      onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)}/>}
    <Tooltip text={t(playing?'playbackPause':'playbackStart')}>
      <Button variant="outline" size="icon-lg" className={cn("size-10 rounded-2xl border-border/65 bg-card/80 text-primary shadow-sm hover:bg-accent @min-[440px]/workspace:size-11 @min-[700px]/workspace:size-12",playing&&"border-primary/35 bg-secondary text-primary ring-2 ring-primary/15")} onClick={()=>void toggle()} disabled={!src} aria-label={t(playing?'playbackPause':'playbackStart')}>{playing?<Pause size={21} className="motion-safe:animate-soft-pop"/>:<Play size={21}/>}</Button>
    </Tooltip>
    <span className="actionCaption mt-2 max-w-full text-center text-[10px] font-semibold leading-4 text-muted-foreground @min-[560px]/workspace:text-[11px]">{t(playing?'playbackPause':'playbackCaption')}</span>
    {src?<><time className="actionAux mt-1 text-center text-[10px] text-muted-foreground">{clock(elapsed)} / {duration>0?clock(duration):'--:--'}</time>
      <Progress label={t('playbackProgress')} value={elapsed} max={duration>0?duration:1} className="replayProgress mt-1 h-1 w-[85%]"/></>
      :<span className="actionAux mt-1 text-center text-[10px] text-muted-foreground">{t('playbackUnavailable')}</span>}
    {error&&<p className="replayError mt-1 text-[10px] text-destructive" role="alert">{error}</p>}
  </div>;
}
