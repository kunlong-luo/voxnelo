import { useAutoAnimate } from '@formkit/auto-animate/react';
import { BookOpen, BookOpenCheck, ChevronRight, Coffee, Lightbulb, MessageCircle, ShieldCheck } from 'lucide-react';
import { SENTENCES, type Sentence } from '@voxnelo/learning';
import type { PracticeViewProps } from './PracticeTypes';
import { useI18n, type TranslationKey } from './i18n';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

type SidebarWidgetsProps = Pick<PracticeViewProps,'current'|'stats'|'recordingBusy'> & {
  onChooseRelated: PracticeViewProps['onChooseRelated'];
};

const tips:Record<Sentence['topic'],TranslationKey> = {
  greetings:'tipGreetings',personal:'tipPersonal',needs:'tipNeeds',
  learning:'tipLearning',daily:'tipDaily'
};
function Metric({count,label}: {count:number;label:string}) {
  return <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border/45 bg-muted/60 px-1.5 py-2.5 text-center">
    <strong className="text-xl font-extrabold tabular-nums text-foreground">{count}</strong>
    <span className="text-[11px] leading-4 font-medium text-muted-foreground">{label}</span>
  </div>;
}


/** Local study statistics and related phrases; never mock proficiency scores. */
export function PracticeSidebarWidgets({current,stats,recordingBusy,onChooseRelated}:SidebarWidgetsProps) {
  const {t}=useI18n();
  const [relatedListRef]=useAutoAnimate<HTMLDivElement>();
  const related=SENTENCES.filter(item=>item.topic===current.topic && item.id!==current.id).slice(0,4);
  const progressPercent=Math.max(0,Math.min(100,stats.viewed/SENTENCES.length*100));
  const scenes = [
    {topic:'greetings',label:t('sceneGreetings'),icon:MessageCircle},
    {topic:'personal',label:t('scenePersonal'),icon:BookOpen},
    {topic:'daily',label:t('sceneDaily'),icon:Coffee},
  ] as const;
  return (
    <aside className="referenceInsights insightsColumn grid min-w-0 auto-rows-min grid-cols-1 content-start gap-3 @min-[600px]/workspace:grid-cols-2 @min-[840px]/workspace:grid-cols-1" aria-label={t('localOverview')}>
      <Card className="insightCard progressCard motion-safe:animate-panel-enter motion-safe:[animation-delay:100ms] flex min-h-0 flex-col gap-3.5 border-border/65 bg-card/90 p-4 shadow-sm sm:p-5">
        <div className="insightHeading flex flex-wrap items-center justify-between gap-1"><h2 className="flex items-center gap-2 text-sm font-bold"><BookOpenCheck size={16} className="text-primary" aria-hidden="true"/>{t('progress')}</h2><span className="insightSideNote rounded-full bg-secondary/65 px-2 py-1 text-[10px] font-medium text-secondary-foreground">{t('localRecord')}</span></div>
        <div className="progressOverview flex flex-wrap items-center gap-3">
          <div className="progressDonut grid size-19 shrink-0 place-items-center rounded-full p-1.5" role="img" aria-label={t('viewedCount',{viewed:stats.viewed,total:SENTENCES.length})} style={{background:'conic-gradient(var(--primary) '+progressPercent+'%,var(--muted) 0)'}}>
            <div className="donutInner flex size-full flex-col items-center justify-center rounded-full bg-card"><strong className="text-xl font-extrabold tabular-nums">{stats.viewed}</strong><small className="text-[10px] text-muted-foreground">/{SENTENCES.length}</small></div>
          </div>
          <div className="progressSummary flex min-w-0 flex-1 flex-col gap-1.5"><span className="text-[11px] text-muted-foreground">{t('viewedLessons')}</span><strong className="text-sm font-bold">{t('sentencesCount',{count:stats.viewed,total:SENTENCES.length})}</strong><small className="text-[11px] leading-4 text-muted-foreground">{t('progressEncourage')}</small></div>
        </div>
        <div className="miniMetrics grid grid-cols-3 gap-1.5"><Metric count={stats.practiced} label={t('practiced')}/><Metric count={stats.favorites} label={t('favorited')}/><Metric count={stats.review} label={t('toReview')}/></div>
        <p className="progressCopy mt-auto text-[11px] leading-4 text-muted-foreground">{t('progressDisclaimer')}</p>
      </Card>
      <Card className="insightCard feedCard motion-safe:animate-panel-enter motion-safe:[animation-delay:165ms] flex min-h-0 flex-col gap-3 border-border/65 bg-card/90 p-4 shadow-sm sm:p-5">
        <div className="insightHeading flex items-center justify-between gap-1"><h2 className="text-sm font-bold">{t('relatedPhrases')}</h2><span className="insightSideNote text-[11px] text-muted-foreground">{t('sameTopic')}</span></div>
        <div ref={relatedListRef} className="feedStrip grid min-h-0 flex-1 content-start gap-2" aria-label={t('relatedPhrasesAria')}>
          {related.map((item,i)=><Button variant="ghost" className="feedItem group h-auto min-h-12 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-transparent bg-muted/45 px-2.5 py-2.5 text-left transition-[border-color,background-color] hover:border-primary/20 hover:bg-accent focus-visible:border-primary" key={item.id} disabled={recordingBusy||!onChooseRelated} onClick={()=>onChooseRelated?.(item)} aria-label={t('practiceSentence',{english:item.english})}><span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-card/85 text-[10px] font-semibold tabular-nums text-primary">{String(i+1).padStart(2,'0')}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"><strong className="line-clamp-2 text-xs leading-4 font-semibold wrap-break-word whitespace-normal text-foreground">{item.english}</strong><span className="line-clamp-2 text-[11px] leading-4 wrap-break-word whitespace-normal text-muted-foreground">{item.chinese}</span></span><ChevronRight size={15} className="shrink-0 text-primary/75 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true"/>
          </Button>)}
        </div>
      </Card>
      <Card className="insightCard tipCard motion-safe:animate-panel-enter motion-safe:[animation-delay:230ms] flex min-h-0 flex-col gap-3 border-border/65 bg-gradient-to-br from-brand-cream via-card to-brand-blush/25 p-4 shadow-sm sm:p-5">
        <div className="insightHeading flex items-center gap-2"><Lightbulb size={17} className="text-primary"/><h2 className="text-sm font-bold">{t('learningTip')}</h2></div>
        <p className="text-[13px] leading-6 text-foreground/85">{t(tips[current.topic])}</p>
        <small className="mt-auto border-t border-border/50 pt-3 text-[11px] leading-4 text-muted-foreground">{t('tipFooter')}</small>
      </Card>
      <Card className="insightCard sceneCard motion-safe:animate-panel-enter motion-safe:[animation-delay:295ms] flex min-h-0 flex-col gap-3 border-border/65 bg-card/90 p-4 shadow-sm sm:p-5">
        <div className="insightHeading flex items-center gap-2"><MessageCircle size={17} className="text-primary"/><h2 className="text-sm font-bold">{t('relatedScenes')}</h2></div>
        <div className="sceneGrid grid grid-cols-3 gap-2">
          {scenes.map(({topic,label,icon:Icon})=>{const first=SENTENCES.find(item=>item.topic===topic);return first?<Button key={topic} size="sm" variant="soft" className={'sceneThumb scene-'+topic+' h-auto min-h-18 flex-col gap-2 rounded-xl px-1 py-2 text-center'} disabled={recordingBusy||!onChooseRelated} onClick={()=>onChooseRelated?.(first)} aria-label={t('practiceScene',{name:label})}><Icon size={19}/><span className="max-w-full text-[10px] leading-4 whitespace-normal">{label}</span></Button>:null})}
        </div>
        <div className="privacyNote mt-auto flex items-center gap-1 border-t border-border/50 pt-3 text-[11px] leading-4 text-muted-foreground"><ShieldCheck size={14} className="shrink-0"/>{t('privacyLocal')}</div>
      </Card>
    </aside>
  );
}
