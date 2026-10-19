import { CheckCircle2, CircleHelp, LoaderCircle, Mic, ShieldCheck, Square, Turtle, Volume2 } from 'lucide-react';
import type { PracticeViewProps } from './PracticeTypes';
import { RecordingPlayback } from './RecordingPlayback';
import { Tooltip } from './Tooltip';
import { useI18n } from './i18n';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

type ControlPanelProps = Pick<PracticeViewProps, 'recorder'|'recordingBusy'|'speed'|'onSpeak'|'onToggleSpeed'|'onRecord'>;

const utilityButton = 'size-10 rounded-2xl border border-white/75 bg-card/80 text-foreground/80 shadow-[0_10px_25px_-17px_rgba(80,58,44,.35)] backdrop-blur-sm transition-[background-color,color,box-shadow] hover:bg-accent hover:text-primary hover:shadow-md hover:-translate-y-1 active:translate-y-0 @min-[440px]/workspace:size-11 @min-[700px]/workspace:size-12';
const minorCaption = 'mt-2 [@media(max-height:800px)]:mt-1 max-w-full text-center text-[10px] font-semibold leading-4 text-muted-foreground @min-[560px]/workspace:text-[11px]';
function ActionSlot({children,label,detail,className}:{
  children:React.ReactNode;label:string;detail?:string;className?:string;
}) {
  return <div className={cn('actionSlot flex min-w-0 flex-col items-center justify-start text-center',className)}>
    {children}
    <span className={minorCaption}>{label}</span>
    {detail && <span className="mt-1 max-w-full text-center text-[10px] leading-4 text-muted-foreground/80 [@media(max-height:800px)]:sr-only">{detail}</span>}
  </div>;
}

/** Audio control visuals follow the real recorder status; no synthetic VAD state. */
export function PracticeControlPanel({recorder,recordingBusy,speed,onSpeak,onToggleSpeed,onRecord}:ControlPanelProps) {
  const {t}=useI18n();
  const recording=recorder.status==='recording';
  const requesting=recorder.status==='requesting';
  const ready=recorder.status==='ready' && Boolean(recorder.recordingUrl);
  return (
        <section className="lessonActions border-t border-white/55 bg-card/25 px-3 pt-3 pb-2 [@media(max-height:800px)]:pt-2 [@media(max-height:800px)]:pb-1 [@media(max-height:680px)]:pt-3 [@media(max-height:680px)]:pb-2 sm:px-6" aria-label={t('practiceActions')}>
          <div className="actionRail grid grid-cols-[repeat(2,minmax(0,1fr))_minmax(60px,1.25fr)_minmax(0,1fr)] items-start gap-0.5 @min-[560px]/workspace:gap-2" data-testid="practice-control-rail">
            <ActionSlot label={t('playDemo')}>
              <Tooltip text={t('playExample')}>
                <Button variant="outline" size="icon-lg" className={utilityButton} onClick={onSpeak} aria-label={t('playExample')} disabled={recordingBusy}><Volume2 size={21}/></Button>
              </Tooltip>
            </ActionSlot>
            <ActionSlot label={t('speedSlow')} detail={speed==='slow'?'0.75×':t('speedNormal')}>
              <Button variant="outline" size="icon-lg" className={utilityButton} onClick={onToggleSpeed} disabled={recordingBusy} aria-pressed={speed==='slow'} aria-label={t('speedSwitch')}><Turtle size={21}/></Button>
            </ActionSlot>
            <ActionSlot label={t(requesting?'micPermission':recording?'stopRecording':'recordingSecondary')} detail={t(requesting?'micRequestHint':recording?'micRecordingHint':ready?'micReadyHint':'micStartHint')}>
              <div className="relative isolate grid place-items-center">
                {recording && <span aria-hidden="true" data-motion="record-halo" className="pointer-events-none absolute -inset-2 rounded-[26px] border-2 border-primary/75 shadow-[0_0_26px_var(--canvas-glow)] animate-live-pulse"/>}
                {requesting && <span aria-hidden="true" data-motion="permission-halo" className="pointer-events-none absolute -inset-1 rounded-[26px] border-2 border-primary/40 animate-status-breathe"/>}
                <Button variant="default" size="icon-lg" className={cn('recordAction relative size-11 rounded-2xl border border-primary/25 bg-[image:var(--mic-gradient)] text-mic-foreground shadow-[0_10px_24px_-12px_rgba(100,69,40,.5)] @min-[440px]/workspace:size-12 transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:scale-[1.04] active:translate-y-0 active:scale-[.97] hover:bg-accent ',recording&&'bg-secondary ring-2 ring-mic-halo/50')} onClick={onRecord} disabled={requesting||(recordingBusy&&!recording)} aria-pressed={recording} aria-label={t(requesting?'micPermission':recording?'stopRecording':'micStart')}>
                  {requesting?<LoaderCircle size={28} aria-hidden="true" className="animate-spin"/>:recording?<Square size={21} fill="currentColor" aria-hidden="true"/>:<Mic size={23} aria-hidden="true"/>}
                </Button>
              </div>
            </ActionSlot>
            <RecordingPlayback key={recorder.recordingUrl??'no-recording'} src={recorder.recordingUrl}/>
          </div>
          {recording?<p className="recordingStatus mt-5 flex items-center justify-center gap-2 text-center text-xs font-semibold text-primary" role="status"><span aria-hidden="true" className="size-2 rounded-full bg-mic-halo animate-status-breathe"/>{t('recordingStatus')}</p>
            :requesting?<p className="recordingStatus mt-5 text-center text-xs text-muted-foreground" role="status">{t('permissionHint')}</p>
            :ready?<p className="recordingReady mt-4 flex items-center justify-center gap-1.5 text-center text-xs font-medium leading-5 text-primary" role="status"><CheckCircle2 size={15} data-motion="success-glint" className="shrink-0 animate-success-glint" aria-hidden="true"/>{t('recordingReadyStatus')}</p>
            :<p className="practicePrompt mt-5 flex items-center justify-center gap-1 text-center text-[10px] leading-4 text-muted-foreground"><ShieldCheck size={13}/>{t('privacyRecording')}</p>}
          {recorder.error && <p className="warning mt-2 flex items-start gap-2 rounded-xl border border-border/70 bg-secondary/55 p-3 text-xs leading-5 text-translation-ink" role="status"><CircleHelp size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true"/>{recorder.error}</p>}
        </section>
  );
}
