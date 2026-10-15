import { ArrowRight, Bookmark, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Coffee, Heart, Lightbulb, MessageCircle, Mic, ShieldCheck, Square, Turtle, Volume2, VolumeX, X } from 'lucide-react';
import { SENTENCES, type LearningState, type LearningStats, type Sentence } from '@voxnelo/learning';
import type { useRecorder } from './useRecorder';
import { RecordingPlayback } from './RecordingPlayback';
import { WaveformArt } from './WaveformArt';
import { Tooltip } from './Tooltip';
import { useI18n, type TranslationKey } from './i18n';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { cn } from './lib/utils';

interface PracticeViewProps {
  current: Sentence; currentState: LearningState | undefined; stats: LearningStats;
  speed: 'normal' | 'slow'; showIpa: boolean; notice: string;
  recorder: ReturnType<typeof useRecorder>; recordingBusy: boolean; canGoPrevious: boolean;
  onToggleIpa: () => void; onSpeak: () => void; onToggleSpeed: () => void;
  onRecord: () => void; onToggleFlag: (flag:'favorite'|'review') => void;
  onNext: () => void; onPrevious: () => void; onChooseRelated?: (s:Sentence) => void;
  onDismissNotice: () => void;
}

const topics:Record<Sentence['topic'],TranslationKey> = {
  greetings:'topicGreetings',personal:'topicPersonal',needs:'topicNeeds',
  learning:'topicLearning',daily:'topicDaily'
};
const tips:Record<Sentence['topic'],TranslationKey> = {
  greetings:'tipGreetings',personal:'tipPersonal',needs:'tipNeeds',
  learning:'tipLearning',daily:'tipDaily'
};
const utilityButton = 'size-11 rounded-2xl border border-border/65 bg-card/80 text-primary shadow-sm hover:bg-accent hover:shadow-md sm:size-12';
const minorCaption = 'mt-2 text-center text-[11px] font-semibold leading-4 text-muted-foreground';
function ActionSlot({children,label,detail,className}:{
  children:React.ReactNode;label:string;detail?:string;className?:string;
}) {
  return <div className={cn('actionSlot flex min-w-0 flex-col items-center justify-start text-center',className)}>
    {children}
    <span className={minorCaption}>{label}</span>
    {detail && <span className="mt-1 max-w-full text-center text-[10px] leading-4 text-muted-foreground/80">{detail}</span>}
  </div>;
}
function Metric({count,label}: {count:number;label:string}) {
  return <div className="flex flex-col gap-1 rounded-2xl bg-muted/70 px-2 py-3 text-center">
    <strong className="text-lg font-extrabold tabular-nums text-foreground">{count}</strong>
    <span className="text-[10px] leading-4 text-muted-foreground">{label}</span>
  </div>;
}

export function PracticeView({
  current,currentState,stats,speed,showIpa,notice,recorder,recordingBusy,
  canGoPrevious,onToggleIpa,onSpeak,onToggleSpeed,onRecord,onToggleFlag,
  onNext,onPrevious,onChooseRelated,onDismissNotice,
}:PracticeViewProps) {
  const {t} = useI18n();
  const position = SENTENCES.findIndex(item=>item.id===current.id);
  const index = position < 0 ? 1 : position+1;
  const favorite = Boolean(currentState?.favorite);
  const review = Boolean(currentState?.review);
  const recording = recorder.status==='recording';
  const requesting = recorder.status==='requesting';
  const related = SENTENCES.filter(item=>item.topic===current.topic && item.id!==current.id).slice(0,4);
  const scenes = [
    {topic:'greetings',label:t('sceneGreetings'),icon:MessageCircle},
    {topic:'personal',label:t('scenePersonal'),icon:BookOpen},
    {topic:'daily',label:t('sceneDaily'),icon:Coffee},
  ] as const;
  return <div className="practiceLayout layoutWorkbench grid min-h-[max(720px,calc(100dvh-114px))] grid-cols-[minmax(0,1fr)_clamp(198px,23vw,294px)] items-stretch gap-3 min-[1100px]:gap-5 max-[870px]:grid-cols-[minmax(0,1fr)_194px]">
    <div className="practiceColumn flex min-w-0 flex-col gap-3">
      <Card className="practiceCard referenceLesson flex min-h-[700px] flex-1 flex-col overflow-visible border-white/75 bg-gradient-to-br from-card via-card to-brand-mist/35 shadow-soft">
        <header className="cardHeader lessonHeader flex min-h-19 flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-0 sm:px-7 sm:pt-6">
          <div className="lessonProgress flex min-w-22 flex-col gap-2" aria-label={t('coursePosition',{index,total:SENTENCES.length})}>
            <span className="lessonCount text-sm font-extrabold tracking-tight tabular-nums text-foreground">{String(index).padStart(2,'0')} <span className="font-medium text-muted-foreground">/ {SENTENCES.length}</span></span>
            <Progress label={t('coursePosition',{index,total:SENTENCES.length})} value={index} max={SENTENCES.length} className="h-1.5 w-24"/>
          </div>
          <div className="lessonHeaderActions flex min-w-0 items-center gap-2">
            <Badge className="pill max-w-44 truncate max-[950px]:max-w-29"><BookOpen size={14}/>{t(topics[current.topic])}</Badge>
            <div className="sentenceFlags inline-flex items-center gap-1 rounded-2xl border border-border/60 bg-muted/60 p-1" role="group" aria-label={t('navFavorites')+' / '+t('navReview')}>
              <Tooltip text={t(favorite?'favoriteRemove':'favoriteAdd')} placement="bottom">
                <Button variant="ghost" size="icon-sm" className={cn('lessonFavorite flagButton text-muted-foreground hover:text-primary',favorite&&'bg-secondary text-primary')} onClick={()=>onToggleFlag('favorite')} aria-label={t(favorite?'favoriteRemove':'favoriteAdd')} aria-pressed={favorite}>
                  <Heart size={19} fill={favorite?'currentColor':'none'}/>
                </Button>
              </Tooltip>
              <Tooltip text={t(review?'reviewRemove':'reviewAdd')} placement="bottom">
                <Button variant="ghost" size="icon-sm" className={cn('reviewIconButton flagButton text-muted-foreground hover:text-primary',review&&'bg-secondary text-primary')} onClick={()=>onToggleFlag('review')} aria-label={t(review?'reviewRemove':'reviewAdd')} aria-pressed={review}>
                  <Bookmark size={19} fill={review?'currentColor':'none'}/>
                </Button>
              </Tooltip>
            </div>
          </div>
        </header>
        <div className="lessonFocus flex min-h-80 flex-1 flex-col items-center justify-center gap-4 px-5 py-8 text-center sm:px-9">
          <div className="sentenceContent flex w-full flex-col items-center justify-center gap-3">
            <span className="lessonLevel text-[11px] font-bold tracking-[.2em] text-muted-foreground uppercase">{t('speakingPractice')} · {current.level}</span>
            <div className="sentenceHeading flex max-w-full justify-center">
              <h1 key={current.id} className="sentenceText max-w-full text-[clamp(30px,3.7vw,54px)] leading-[1.18] font-extrabold tracking-[-.055em] wrap-break-word text-foreground motion-safe:animate-sentence-enter">{current.english}</h1>
            </div>
            <p className="translation text-base leading-7 text-muted-foreground sm:text-lg">{current.chinese}</p>
            {showIpa && <p className="ipa max-w-full text-sm leading-6 wrap-break-word text-muted-foreground">{current.ipa}</p>}
            <Button variant="ghost" size="sm" className="subtleLink rounded-full text-xs text-primary" onClick={onToggleIpa} aria-expanded={showIpa}><CircleHelp size={14}/>{t(showIpa?'ipaHide':'ipaShow')}</Button>
          </div>
          <div className="wavePanel mx-auto w-full max-w-150 opacity-80"><WaveformArt/></div>
        </div>
        <section className="lessonActions border-t border-border/55 bg-brand-cream/45 px-3 pt-6 pb-4 sm:px-6" aria-label={t('practiceActions')}>
          <div className="actionRail grid grid-cols-[repeat(2,minmax(0,1fr))_minmax(75px,1.35fr)_repeat(2,minmax(0,1fr))] items-start gap-1 sm:gap-2" data-testid="practice-control-rail">
            <ActionSlot label={t('playDemo')}>
              <Tooltip text={t('playExample')}>
                <Button variant="outline" size="icon-lg" className={utilityButton} onClick={onSpeak} aria-label={t('playExample')} disabled={recordingBusy}><Volume2 size={21}/></Button>
              </Tooltip>
            </ActionSlot>
            <ActionSlot label={t('speedSlow')} detail={speed==='slow'?'0.75×':t('speedNormal')}>
              <Button variant="outline" size="icon-lg" className={utilityButton} onClick={onToggleSpeed} disabled={recordingBusy} aria-pressed={speed==='slow'} aria-label={t('speedSwitch')}><Turtle size={21}/></Button>
            </ActionSlot>
            <ActionSlot label={t(requesting?'micPermission':recording?'recordingInProgress':'micStart')} detail={t('micStartHint')}>
              <Button variant="default" size="icon-lg" className={cn('recordAction size-17 rounded-[24px] bg-primary text-white shadow-[0_12px_28px_-10px_var(--shadow-color)] hover:scale-[1.04] hover:bg-primary/90 motion-reduce:transform-none',recording&&'ring-6 ring-destructive/15')} onClick={onRecord} disabled={recordingBusy} aria-label={t(requesting?'micPermission':recording?'micBusy':'micStart')}><Mic size={30}/></Button>
            </ActionSlot>
            <ActionSlot label={t('stopRecording')}>
              <Button variant="outline" size="icon-lg" className={utilityButton} onClick={onRecord} disabled={!recording} aria-label={t('stopRecording')}><Square size={20} fill="currentColor"/></Button>
            </ActionSlot>
            <RecordingPlayback key={recorder.recordingUrl??'no-recording'} src={recorder.recordingUrl}/>
          </div>
          {recording?<p className="recordingStatus mt-5 text-center text-xs text-destructive" role="status">{t('recordingStatus')}</p>
            :requesting?<p className="recordingStatus mt-5 text-center text-xs text-muted-foreground" role="status">{t('permissionHint')}</p>
            :<p className="practicePrompt mt-5 flex items-center justify-center gap-1 text-center text-[10px] leading-4 text-muted-foreground"><ShieldCheck size={13}/>{t('privacyRecording')}</p>}
          {recorder.error && <p className="warning mt-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive" role="alert">{recorder.error}</p>}
        </section>
        <footer className="cardFooter referenceFooter grid min-h-18 grid-cols-[minmax(95px,1fr)_auto_minmax(95px,1fr)] items-center gap-2 rounded-b-[var(--radius)] border-t border-border/60 bg-card/75 px-4 py-3 sm:px-6">
          <Button variant="outline" size="sm" className="prevButton pagerButton justify-self-start text-primary" onClick={onPrevious} disabled={!canGoPrevious} aria-label={t('previous')}><ChevronLeft size={16}/>{t('previous')}</Button>
          <span className="footerHint text-center text-[10px] text-muted-foreground max-[1050px]:hidden">{t('footerHint')}</span>
          <Button variant="outline" size="sm" className="nextButton pagerButton col-start-3 justify-self-end text-primary" onClick={onNext} disabled={recordingBusy} aria-label={t('nextAccessible')}>{t('next')}<ArrowRight size={16}/></Button>
        </footer>
      </Card>
      {notice && <div className="notice flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-foreground shadow-sm" role="status">
        <span className="flex items-center gap-2"><VolumeX size={17}/>{notice}</span>
        <Button variant="ghost" size="icon-sm" onClick={onDismissNotice} aria-label={t('closeNotice')}><X size={15}/></Button>
      </div>}
    </div>
    <aside className="referenceInsights insightsColumn grid min-w-0 grid-rows-[1.3fr_1fr_.95fr_1.1fr] gap-3" aria-label={t('localOverview')}>
      <Card className="insightCard progressCard flex min-h-0 flex-col gap-4 p-4 sm:p-5">
        <div className="insightHeading flex flex-wrap items-center justify-between gap-1"><h2 className="text-sm font-bold">{t('progress')}</h2><span className="insightSideNote text-[10px] text-muted-foreground">{t('localRecord')}</span></div>
        <div className="progressOverview flex flex-wrap items-center gap-3">
          <div className="progressDonut grid size-17 shrink-0 place-items-center rounded-full p-2" role="img" aria-label={t('viewedCount',{viewed:stats.viewed,total:SENTENCES.length})} style={{background:'conic-gradient(var(--primary) '+stats.viewed/SENTENCES.length*100+'%,var(--muted) 0)'}}>
            <div className="donutInner flex size-full flex-col items-center justify-center rounded-full bg-card"><strong className="text-xl font-extrabold tabular-nums">{stats.viewed}</strong><small className="text-[9px] text-muted-foreground">/{SENTENCES.length}</small></div>
          </div>
          <div className="progressSummary flex min-w-0 flex-1 flex-col gap-1"><span className="text-[10px] text-muted-foreground">{t('viewedLessons')}</span><strong className="text-sm font-bold">{t('sentencesCount',{count:stats.viewed,total:SENTENCES.length})}</strong><small className="text-[10px] leading-4 text-muted-foreground">{t('progressEncourage')}</small></div>
        </div>
        <div className="miniMetrics grid grid-cols-3 gap-1.5"><Metric count={stats.practiced} label={t('practiced')}/><Metric count={stats.favorites} label={t('favorited')}/><Metric count={stats.review} label={t('toReview')}/></div>
        <p className="progressCopy mt-auto text-[10px] leading-4 text-muted-foreground">{t('progressDisclaimer')}</p>
      </Card>
      <Card className="insightCard feedCard flex min-h-0 flex-col gap-3 p-4 sm:p-5">
        <div className="insightHeading flex items-center justify-between gap-1"><h2 className="text-sm font-bold">{t('relatedPhrases')}</h2><span className="insightSideNote text-[10px] text-muted-foreground">{t('sameTopic')}</span></div>
        <div className="feedStrip grid min-h-0 flex-1 content-start gap-2 overflow-auto" aria-label={t('relatedPhrasesAria')}>
          {related.map(item=><Button variant="ghost" className="feedItem h-auto min-h-10 w-full justify-between rounded-xl bg-muted/40 px-3 py-2 text-left hover:bg-accent" key={item.id} disabled={recordingBusy||!onChooseRelated} onClick={()=>onChooseRelated?.(item)} aria-label={t('practiceSentence',{english:item.english})}>
            <span className="flex min-w-0 flex-col gap-1"><span className="truncate text-[10px] font-normal text-muted-foreground">{item.chinese}</span><strong className="truncate text-[11px] text-foreground">{item.english}</strong></span><ChevronRight size={15} className="shrink-0 text-primary"/>
          </Button>)}
        </div>
      </Card>
      <Card className="insightCard tipCard flex min-h-0 flex-col gap-3 bg-gradient-to-br from-brand-cream via-card to-brand-blush/45 p-4 sm:p-5">
        <div className="insightHeading flex items-center gap-2"><Lightbulb size={17} className="text-primary"/><h2 className="text-sm font-bold">{t('learningTip')}</h2></div>
        <p className="text-xs leading-6 text-foreground/80">{t(tips[current.topic])}</p>
        <small className="mt-auto border-t border-border/50 pt-3 text-[10px] leading-4 text-muted-foreground">{t('tipFooter')}</small>
      </Card>
      <Card className="insightCard sceneCard flex min-h-0 flex-col gap-3 p-4 sm:p-5">
        <div className="insightHeading flex items-center gap-2"><MessageCircle size={17} className="text-primary"/><h2 className="text-sm font-bold">{t('relatedScenes')}</h2></div>
        <div className="sceneGrid grid grid-cols-3 gap-2">
          {scenes.map(({topic,label,icon:Icon})=>{const first=SENTENCES.find(item=>item.topic===topic);return first?<Button key={topic} size="sm" variant="soft" className={'sceneThumb scene-'+topic+' h-auto min-h-18 flex-col gap-2 rounded-xl px-1 py-2 text-center'} disabled={recordingBusy||!onChooseRelated} onClick={()=>onChooseRelated?.(first)} aria-label={t('practiceScene',{name:label})}><Icon size={19}/><span className="max-w-full text-[9px] whitespace-normal">{label}</span></Button>:null})}
        </div>
        <div className="privacyNote mt-auto flex items-center gap-1 border-t border-border/50 pt-3 text-[10px] leading-4 text-muted-foreground"><ShieldCheck size={14} className="shrink-0"/>{t('privacyLocal')}</div>
      </Card>
    </aside>
  </div>;
}
