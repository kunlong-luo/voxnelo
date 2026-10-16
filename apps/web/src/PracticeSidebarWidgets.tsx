import { BookOpen, ChevronRight, Coffee, Lightbulb, MessageCircle, ShieldCheck } from 'lucide-react';
import { SENTENCES, type Sentence } from '@voxnelo/learning';
import type { PracticeViewProps } from './PracticeTypes';
import { useI18n, type TranslationKey } from './i18n';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

type SidebarWidgetsProps = Pick<PracticeViewProps,'current'|'stats'|'recordingBusy'|'onChooseRelated'>;

const tips:Record<Sentence['topic'],TranslationKey> = {
  greetings:'tipGreetings',personal:'tipPersonal',needs:'tipNeeds',
  learning:'tipLearning',daily:'tipDaily'
};
function Metric({count,label}: {count:number;label:string}) {
  return <div className="flex flex-col gap-1 rounded-2xl bg-muted/70 px-2 py-3 text-center">
    <strong className="text-lg font-extrabold tabular-nums text-foreground">{count}</strong>
    <span className="text-[10px] leading-4 text-muted-foreground">{label}</span>
  </div>;
}


/** Local study statistics and related phrases; never mock proficiency scores. */
export function PracticeSidebarWidgets({current,stats,recordingBusy,onChooseRelated}:SidebarWidgetsProps) {
  const {t}=useI18n();
  const related=SENTENCES.filter(item=>item.topic===current.topic && item.id!==current.id).slice(0,4);
  const scenes = [
    {topic:'greetings',label:t('sceneGreetings'),icon:MessageCircle},
    {topic:'personal',label:t('scenePersonal'),icon:BookOpen},
    {topic:'daily',label:t('sceneDaily'),icon:Coffee},
  ] as const;
  return (
    <aside className="referenceInsights insightsColumn grid min-w-0 grid-cols-1 content-start gap-3 @min-[600px]/workspace:grid-cols-2 @min-[840px]/workspace:grid-cols-1 @min-[840px]/workspace:grid-rows-[1.3fr_1fr_.95fr_1.1fr]" aria-label={t('localOverview')}>
      <Card className="insightCard progressCard motion-safe:animate-panel-enter motion-safe:[animation-delay:100ms] flex min-h-0 flex-col gap-4 p-4 sm:p-5">
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
      <Card className="insightCard feedCard motion-safe:animate-panel-enter motion-safe:[animation-delay:165ms] flex min-h-0 flex-col gap-3 p-4 sm:p-5">
        <div className="insightHeading flex items-center justify-between gap-1"><h2 className="text-sm font-bold">{t('relatedPhrases')}</h2><span className="insightSideNote text-[10px] text-muted-foreground">{t('sameTopic')}</span></div>
        <div className="feedStrip grid min-h-0 flex-1 content-start gap-2 @min-[840px]/workspace:overflow-auto" aria-label={t('relatedPhrasesAria')}>
          {related.map(item=><Button variant="ghost" className="feedItem h-auto min-h-10 w-full justify-between rounded-xl bg-muted/40 px-3 py-2 text-left hover:bg-accent" key={item.id} disabled={recordingBusy||!onChooseRelated} onClick={()=>onChooseRelated?.(item)} aria-label={t('practiceSentence',{english:item.english})}>
            <span className="flex min-w-0 flex-col gap-1"><span className="truncate text-[10px] font-normal text-muted-foreground">{item.chinese}</span><strong className="truncate text-[11px] text-foreground">{item.english}</strong></span><ChevronRight size={15} className="shrink-0 text-primary"/>
          </Button>)}
        </div>
      </Card>
      <Card className="insightCard tipCard motion-safe:animate-panel-enter motion-safe:[animation-delay:230ms] flex min-h-0 flex-col gap-3 bg-gradient-to-br from-brand-cream via-card to-brand-blush/45 p-4 sm:p-5">
        <div className="insightHeading flex items-center gap-2"><Lightbulb size={17} className="text-primary"/><h2 className="text-sm font-bold">{t('learningTip')}</h2></div>
        <p className="text-xs leading-6 text-foreground/80">{t(tips[current.topic])}</p>
        <small className="mt-auto border-t border-border/50 pt-3 text-[10px] leading-4 text-muted-foreground">{t('tipFooter')}</small>
      </Card>
      <Card className="insightCard sceneCard motion-safe:animate-panel-enter motion-safe:[animation-delay:295ms] flex min-h-0 flex-col gap-3 p-4 sm:p-5">
        <div className="insightHeading flex items-center gap-2"><MessageCircle size={17} className="text-primary"/><h2 className="text-sm font-bold">{t('relatedScenes')}</h2></div>
        <div className="sceneGrid grid grid-cols-3 gap-2">
          {scenes.map(({topic,label,icon:Icon})=>{const first=SENTENCES.find(item=>item.topic===topic);return first?<Button key={topic} size="sm" variant="soft" className={'sceneThumb scene-'+topic+' h-auto min-h-18 flex-col gap-2 rounded-xl px-1 py-2 text-center'} disabled={recordingBusy||!onChooseRelated} onClick={()=>onChooseRelated?.(first)} aria-label={t('practiceScene',{name:label})}><Icon size={19}/><span className="max-w-full text-[9px] whitespace-normal">{label}</span></Button>:null})}
        </div>
        <div className="privacyNote mt-auto flex items-center gap-1 border-t border-border/50 pt-3 text-[10px] leading-4 text-muted-foreground"><ShieldCheck size={14} className="shrink-0"/>{t('privacyLocal')}</div>
      </Card>
    </aside>
  );
}
