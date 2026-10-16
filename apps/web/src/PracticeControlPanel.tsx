import { CheckCircle2, CircleHelp, LoaderCircle, Mic, ShieldCheck, Square, Turtle, Volume2 } from 'lucide-react';
import type { PracticeViewProps } from './PracticeTypes';
import { RecordingPlayback } from './RecordingPlayback';
import { Tooltip } from './Tooltip';
import { useI18n } from './i18n';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

type ControlPanelProps = Pick<PracticeViewProps, 'recorder'|'recordingBusy'|'speed'|'onSpeak'|'onToggleSpeed'|'onRecord'>;

const utilityButton = 'size-10 rounded-2xl border border-border/65 bg-card/80 text-primary shadow-sm hover:bg-accent hover:shadow-md @min-[440px]/workspace:size-11 @min-[700px]/workspace:size-12';
const minorCaption = 'mt-2 max-w-full text-center text-[10px] font-semibold leading-4 text-muted-foreground @min-[560px]/workspace:text-[11px]';
function ActionSlot({children,label,detail,className}:{
  children:React.ReactNode;label:string;detail?:string;className?:string;
}) {
  return <div className={cn('actionSlot flex min-w-0 flex-col items-center justify-start text-center',className)}>
    {children}
    <span className={minorCaption}>{label}</span>
    {detail && <span className="mt-1 max-w-full text-center text-[10px] leading-4 text-muted-foreground/80">{detail}</span>}
  </div>;
}

/** Audio control visuals follow the real recorder status; no synthetic VAD state. */
export function PracticeControlPanel({recorder,recordingBusy,speed,onSpeak,onToggleSpeed,onRecord}:ControlPanelProps) {
  const {t}=useI18n();
  const recording=recorder.status==='recording';
  const requesting=recorder.status==='requesting';
  const ready=recorder.status==='ready' && Boolean(recorder.recordingUrl);
  return (
        <section className="lessonActions border-t border-border/55 bg-brand-cream/45 px-3 pt-6 pb-4 sm:px-6" aria-label={t('practiceActions')}>
          <div className="actionRail grid grid-cols-[repeat(2,minmax(0,1fr))_minmax(60px,1.25fr)_repeat(2,minmax(0,1fr))] items-start gap-0.5 @min-[560px]/workspace:gap-2" data-testid="practice-control-rail">
            <ActionSlot label={t('playDemo')}>
              <Tooltip text={t('playExample')}>
                <Button variant="outline" size="icon-lg" className={utilityButton} onClick={onSpeak} aria-label={t('playExample')} disabled={recordingBusy}><Volume2 size={21}/></Button>
              </Tooltip>
            </ActionSlot>
            <ActionSlot label={t('speedSlow')} detail={speed==='slow'?'0.75×':t('speedNormal')}>
              <Button variant="outline" size="icon-lg" className={utilityButton} onClick={onToggleSpeed} disabled={recordingBusy} aria-pressed={speed==='slow'} aria-label={t('speedSwitch')}><Turtle size={21}/></Button>
            </ActionSlot>
            <ActionSlot label={t(requesting?'micPermission':recording?'recordingInProgress':'recordingSecondary')} detail={t(requesting?'micRequestHint':recording?'micRecordingHint':ready?'micReadyHint':'micStartHint')}>
              <div className="relative isolate grid place-items-center">
                {recording && <span aria-hidden="true" data-motion="record-halo" className="pointer-events-none absolute -inset-2 rounded-[30px] border-2 border-mic-halo/75 motion-safe:animate-record-halo"/>}
                {requesting && <span aria-hidden="true" data-motion="permission-halo" className="pointer-events-none absolute -inset-1 rounded-[26px] border-2 border-primary/40 motion-safe:animate-status-breathe"/>}
                <Button variant="default" size="icon-lg" className={cn('recordAction relative size-11 rounded-xl border border-primary/25 bg-card text-primary shadow-sm @min-[440px]/workspace:size-12 transition-[background-color,box-shadow,transform] duration-200 motion-safe:hover:scale-[1.04] hover:bg-accent motion-reduce:transform-none',recording&&'bg-secondary ring-2 ring-mic-halo/50')} onClick={onRecord} disabled={recordingBusy} aria-label={t(requesting?'micPermission':recording?'micBusy':'micStart')}>
                  {requesting?<LoaderCircle size={28} aria-hidden="true" className="motion-safe:animate-spin"/>:<Mic size={23} aria-hidden="true"/>}
                </Button>
              </div>
            </ActionSlot>
            <ActionSlot label={t('stopRecording')}>
              <Button variant="outline" size="icon-lg" className={utilityButton} onClick={onRecord} disabled={!recording} aria-label={t('stopRecording')}><Square size={20} fill="currentColor"/></Button>
            </ActionSlot>
            <RecordingPlayback key={recorder.recordingUrl??'no-recording'} src={recorder.recordingUrl}/>
          </div>
          {recording?<p className="recordingStatus mt-5 flex items-center justify-center gap-2 text-center text-xs font-semibold text-primary" role="status"><span aria-hidden="true" className="size-2 rounded-full bg-mic-halo motion-safe:animate-status-breathe"/>{t('recordingStatus')}</p>
            :requesting?<p className="recordingStatus mt-5 text-center text-xs text-muted-foreground" role="status">{t('permissionHint')}</p>
            :ready?<p className="recordingReady mt-4 flex items-center justify-center gap-1.5 text-center text-xs font-medium leading-5 text-primary" role="status"><CheckCircle2 size={15} className="shrink-0" aria-hidden="true"/>{t('recordingReadyStatus')}</p>
            :<p className="practicePrompt mt-5 flex items-center justify-center gap-1 text-center text-[10px] leading-4 text-muted-foreground"><ShieldCheck size={13}/>{t('privacyRecording')}</p>}
          {recorder.error && <p className="warning mt-2 flex items-start gap-2 rounded-xl border border-border/70 bg-secondary/55 p-3 text-xs leading-5 text-translation-ink" role="status"><CircleHelp size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true"/>{recorder.error}</p>}
        </section>
  );
}
