import { useAutoAnimate } from '@formkit/auto-animate/react';
import { ArrowRight, Bookmark, BookOpen, ChevronLeft, CircleHelp, Heart } from 'lucide-react';
import { SENTENCES, type Sentence } from '@voxnelo/learning';
import type { PracticeViewProps } from './PracticeTypes';
import { PracticeControlPanel } from './PracticeControlPanel';
import { LiveDictationPanel } from './LiveDictationPanel';
import { WaveformArt } from './WaveformArt';
import { Tooltip } from './Tooltip';
import { useI18n, type TranslationKey } from './i18n';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { cn } from './lib/utils';

type PracticeCardProps = Omit<PracticeViewProps, 'stats'|'notice'|'onChooseRelated'|'onDismissNotice'>;

const topics:Record<Sentence['topic'],TranslationKey> = {
  greetings:'topicGreetings',personal:'topicPersonal',needs:'topicNeeds',
  learning:'topicLearning',daily:'topicDaily'
};

/** Single glass surface, typographic hierarchy and persistent lesson controls. */
export function PracticeCard({current,currentState,speed,showIpa,recorder,dictation,recordingBusy,canGoPrevious,onStartDictation,
  onToggleIpa,onSpeak,onToggleSpeed,onRecord,onToggleFlag,onNext,onPrevious}:PracticeCardProps) {
  const {t}=useI18n();
  // Stable parent + keyed child: each next sentence now triggers a real DOM transition.
  const [sentenceMotionRef]=useAutoAnimate<HTMLDivElement>({duration:540,easing:'ease-in-out'});
  const [translationMotionRef]=useAutoAnimate<HTMLDivElement>({duration:460,easing:'ease-in-out'});
  const position=SENTENCES.findIndex(item=>item.id===current.id);
  const index=position<0?1:position+1;
  const favorite=Boolean(currentState?.favorite);
  const review=Boolean(currentState?.review);
  return (
      <Card className="practiceCard referenceLesson relative isolate flex min-h-[min(700px,calc(100dvh-120px))] [@media(max-height:800px)]:min-h-[min(560px,calc(100dvh-180px))] min-w-0 flex-1 flex-col overflow-visible rounded-[34px] border border-glass-edge bg-glass-surface shadow-glass backdrop-blur-[var(--glass-blur)] ring-1 ring-white/25">
        <div aria-hidden="true" data-motion="lesson-breathe" className="pointer-events-none absolute inset-x-[16%] top-[12%] h-60 rounded-[50%] bg-brand-cream/85 blur-3xl animate-ambient-breathe [animation-delay:-1.7s]"/>
        <div aria-hidden="true" data-motion="glass-shimmer" className="pointer-events-none absolute -top-28 -right-24 size-82 rounded-full bg-white/45 blur-[65px] animate-glass-shimmer"/>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent"/>
        <header className="cardHeader lessonHeader relative flex min-h-19 [@media(max-height:680px)]:min-h-16 flex-wrap items-center justify-between gap-4 px-5 pt-6 pb-0 [@media(max-height:680px)]:pt-3 sm:px-8 sm:pt-8 lg:px-10">
          <div className="lessonProgress flex min-w-22 flex-col gap-2" aria-label={t('coursePosition',{index,total:SENTENCES.length})}>
            <span className="lessonCount text-sm font-extrabold tracking-tight tabular-nums text-foreground">{String(index).padStart(2,'0')} <span className="font-medium text-muted-foreground">/ {SENTENCES.length}</span></span>
            <Progress label={t('coursePosition',{index,total:SENTENCES.length})} value={index} max={SENTENCES.length} className="h-1.5 w-24"/>
          </div>
          <div className="lessonHeaderActions flex min-w-0 items-center gap-2">
            <Badge className="pill max-w-44 truncate max-[950px]:max-w-29"><BookOpen size={14}/>{t(topics[current.topic])}</Badge>
            <div className="sentenceFlags inline-flex items-center gap-1 rounded-2xl border border-border/60 bg-muted/60 p-1" role="group" aria-label={t('navFavorites')+' / '+t('navReview')}>
              <Tooltip text={t(favorite?'favoriteRemove':'favoriteAdd')} placement="bottom">
                <Button variant="ghost" size="icon-sm" className={cn('lessonFavorite flagButton text-muted-foreground hover:text-primary',favorite&&'bg-secondary text-primary')} onClick={()=>onToggleFlag('favorite')} aria-label={t(favorite?'favoriteRemove':'favoriteAdd')} aria-pressed={favorite}>
                  <Heart key={favorite?'favorite-on':'favorite-off'} size={19} fill={favorite?'currentColor':'none'} className="animate-soft-pop"/>
                </Button>
              </Tooltip>
              <Tooltip text={t(review?'reviewRemove':'reviewAdd')} placement="bottom">
                <Button variant="ghost" size="icon-sm" className={cn('reviewIconButton flagButton text-muted-foreground hover:text-primary',review&&'bg-secondary text-primary')} onClick={()=>onToggleFlag('review')} aria-label={t(review?'reviewRemove':'reviewAdd')} aria-pressed={review}>
                  <Bookmark key={review?'review-on':'review-off'} size={19} fill={review?'currentColor':'none'} className="animate-soft-pop"/>
                </Button>
              </Tooltip>
            </div>
          </div>
        </header>
        <div className="lessonFocus @container/lesson relative flex min-h-44 min-w-0 flex-1 sm:min-h-64 flex-col items-center justify-center gap-3 px-4 py-3 text-center sm:gap-3 sm:px-5 sm:py-3 [@media(max-height:800px)]:gap-1 [@media(max-height:800px)]:py-2 [@media(max-height:680px)]:min-h-48 [@media(max-height:680px)]:gap-1.5 [@media(max-height:680px)]:py-1 @min-[560px]/workspace:px-9 @min-[700px]/workspace:min-h-[clamp(12rem,calc(100dvh-525px),18rem)]">
          <div className="sentenceContent flex w-full flex-col items-center justify-center gap-3 sm:gap-4 [@media(max-height:800px)]:gap-2 [@media(max-height:680px)]:gap-1.5">
            <span className="lessonLevel text-[11px] font-bold tracking-[.2em] text-muted-foreground uppercase">{t('speakingPractice')} · {current.level}</span>
            <div ref={sentenceMotionRef} className="sentenceHeading flex max-w-full justify-center">
              <h1 key={current.id} className="sentenceText max-w-full text-[clamp(2rem,6.25cqi,3.375rem)] leading-[1.25] font-extrabold tracking-[-.045em] wrap-break-word text-sentence-ink drop-shadow-[0_1px_0_rgba(255,255,255,.45)] animate-sentence-enter">{current.english}</h1>
            </div>
            <div ref={translationMotionRef} className="flex min-w-0 max-w-full justify-center"><p key={current.id} className="translation text-[17px] leading-7 font-medium text-translation-ink @min-[600px]/lesson:text-xl animate-sentence-enter [animation-delay:60ms]">{current.chinese}</p></div>
            {showIpa && current.ipa && <p className="ipa max-w-full text-sm leading-6 wrap-break-word text-ipa-ink">{current.ipa}</p>}
            {current.ipa ? <Button variant="ghost" size="sm" className="subtleLink rounded-full text-xs text-primary" onClick={onToggleIpa} aria-expanded={showIpa}><CircleHelp size={14}/>{t(showIpa?'ipaHide':'ipaShow')}</Button> : <span className="text-xs text-muted-foreground">{t('ipaPending')}</span>}
          </div>
          <div className="pointer-events-none hidden w-full max-w-145 opacity-95 @min-[700px]/workspace:block [@media(max-height:800px)]:hidden" aria-hidden="true"><WaveformArt/></div>
          <LiveDictationPanel dictation={dictation} blocked={recorder.status==='requesting'||recorder.status==='recording'} onStart={onStartDictation}/>
        </div>
        <PracticeControlPanel recorder={recorder} recordingBusy={recordingBusy} speed={speed} onSpeak={onSpeak} onToggleSpeed={onToggleSpeed} onRecord={onRecord} />
        <footer className="cardFooter referenceFooter grid min-h-18 [@media(max-height:680px)]:min-h-14 grid-cols-[minmax(95px,1fr)_auto_minmax(95px,1fr)] items-center gap-2 rounded-b-[var(--radius)] border-t border-border/60 bg-card/75 px-5 py-3 sm:px-8 lg:px-10">
          <Button variant="outline" size="sm" className="prevButton pagerButton justify-self-start text-primary" onClick={onPrevious} disabled={!canGoPrevious} aria-label={t('previous')}><ChevronLeft size={16}/>{t('previous')}</Button>
          <span className="footerHint text-center text-[10px] text-muted-foreground max-[1050px]:hidden">{t('footerHint')}</span>
          <Button variant="outline" size="sm" className="nextButton pagerButton col-start-3 justify-self-end text-primary" onClick={onNext} disabled={recordingBusy} aria-label={t('nextAccessible')}>{t('next')}<ArrowRight size={16}/></Button>
        </footer>
      </Card>
  );
}
