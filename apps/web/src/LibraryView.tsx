import { useEffect, useMemo, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { ArrowRight, ArrowUpRight, BookOpenCheck, CalendarDays, ChevronLeft, ChevronRight, Clock3, Heart, BadgeCheck, ListRestart, Mic2, Search, Sparkles, type LucideIcon } from 'lucide-react';
import { SENTENCES, getConnectedSpeechGuide, type HistoryEvent, type LearningState, type Sentence } from '@voxnelo/learning';
import { useI18n, type TranslationKey } from './i18n';
import { libraryEntries, libraryPage, historyTotals, reviewTotals, type LibraryMode } from './libraryData';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { cn } from './lib/utils';

export type View = 'practice'|'catalog'|'history'|'favorites'|'review'|'settings'|'models';
interface LibraryViewProps {
  view: LibraryMode; states: LearningState[];
  events: HistoryEvent[]; search: string; notice: string;
  onSearch:(v:string)=>void; onChoose:(s:Sentence)=>void; onBackToPractice:()=>void;
  onCompleteReview?:((id:string)=>void)|undefined;
}
const views:Record<LibraryMode,{title:TranslationKey;helper:TranslationKey;icon:LucideIcon}>={
  history:{title:'libHistoryTitle',helper:'libHistoryHelp',icon:Clock3},
  favorites:{title:'libFavoritesTitle',helper:'libFavoritesHelp',icon:Heart},
  familiar:{title:'libFamiliarTitle',helper:'libFamiliarHelp',icon:BadgeCheck},
  review:{title:'libReviewTitle',helper:'libReviewHelp',icon:ListRestart},
};
const topics:Record<Sentence['topic'],TranslationKey>={
  greetings:'topicGreetings',personal:'topicPersonal',needs:'topicNeeds',learning:'topicLearning',daily:'topicDaily',
};
type HistoryFilter='all'|'view'|'practice';
type ReviewFilter='all'|'due'|'upcoming';

export function LibraryView({view,states,events,search,notice,onSearch,onChoose,onBackToPractice,onCompleteReview}:LibraryViewProps){
  const {t,locale}=useI18n();
  const [page,setPage]=useState(1);
  const [collection,setCollection]=useState<'favorites'|'familiar'>('favorites');
  const mode:LibraryMode=view==='favorites'?collection:view;
  const [historyFilter,setHistoryFilter]=useState<HistoryFilter>('all');
  const [reviewFilter,setReviewFilter]=useState<ReviewFilter>('all');
  const [asOf,setAsOf]=useState(()=>Date.now());
  useEffect(()=>{
    if(view!=='review')return;
    const refresh=()=>setAsOf(Date.now());
    window.addEventListener('focus',refresh);
    const interval=window.setInterval(refresh,60_000);
    return ()=>{window.removeEventListener('focus',refresh);window.clearInterval(interval);};
  },[view]);
  const [animationParent]=useAutoAnimate<HTMLDivElement>();
  const entries=useMemo(()=>libraryEntries(mode,states,events,search,asOf),[mode,states,events,search,asOf]);
  const filtered=useMemo(()=>{
    if(view==='history'&&historyFilter!=='all')return entries.filter(entry=>entry.type===historyFilter);
    if(view==='review'&&reviewFilter!=='all')return entries.filter(entry=>reviewFilter==='due'?entry.reviewDue:!entry.reviewDue);
    return entries;
  },[view,entries,historyFilter,reviewFilter]);
  const paginated=libraryPage(filtered,page);
  const totals=useMemo(()=>historyTotals(events),[events]);
  const reviews=useMemo(()=>reviewTotals(states,asOf),[states,asOf]);
  const topicCounts=useMemo(()=>{
    const valid=new Map(SENTENCES.map(sentence=>[sentence.id,sentence.topic]));
    const counts=new Map<Sentence['topic'],number>();
    for(const event of events){
      const topic=valid.get(event.sentenceId);
      if(topic)counts.set(topic,(counts.get(topic)??0)+1);
    }
    return (Object.keys(topics) as Sentence['topic'][]).map(topic=>({
      topic,count:counts.get(topic)??0,
    })).filter(item=>item.count>0).sort((a,b)=>b.count-a.count);
  },[events]);
  const {title,helper,icon:Icon}=views[mode];
  const changeCollection=(next:'favorites'|'familiar')=>{setCollection(next);setPage(1);};
  const selectFilter=(next:HistoryFilter)=>{setHistoryFilter(next);setPage(1);};
  const selectReviewFilter=(next:ReviewFilter)=>{setReviewFilter(next);setPage(1);};
  const searchChanged=(next:string)=>{onSearch(next);setPage(1);};
  const dateLabel=(at:number)=>new Date(at).toLocaleDateString(locale,{year:'numeric',month:'long',day:'numeric'});
  return <div className="libraryPage mx-auto flex w-full max-w-310 flex-col gap-5 pb-5 motion-safe:animate-view-enter">
    <header className="libraryTitle relative isolate overflow-hidden rounded-[28px] border border-glass-edge bg-glass-surface px-5 py-6 shadow-glass backdrop-blur-[var(--glass-blur)] sm:px-8 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full bg-brand-blush/45 blur-3xl"/>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-[22%] size-36 rounded-full bg-brand-mist/30 blur-3xl"/>
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-150 flex-col items-start gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/70 px-3 py-1.5 text-[11px] font-semibold tracking-[.12em] text-primary uppercase">
            <Icon size={15}/>{t('libraryEyebrow')}
          </span>
          <h1 className="text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.14] font-extrabold tracking-[-.04em] text-foreground">{t(title)}</h1>
          <p className="max-w-110 text-[13px] leading-6 text-translation-ink sm:text-sm">{t(helper)}</p>
        </div>
        <Button variant="outline" size="sm" className="backPractice relative min-h-10 rounded-xl border-border/75 bg-card/75 shadow-sm" onClick={onBackToPractice}>
          <ChevronLeft size={16}/>{t('backPractice')}
        </Button>
      </div>
      {view==='history'&&<div className="relative mt-6 grid grid-cols-3 gap-2.5 sm:gap-3">
        {([
          {icon:Clock3,key:'historyActivity',value:totals.events},
          {icon:BookOpenCheck,key:'historyUnique',value:totals.unique},
          {icon:Mic2,key:'historyPractices',value:totals.practice},
        ] as const).map(({icon:MetricIcon,key,value})=><div key={key} className="rounded-2xl border border-white/45 bg-card/55 p-3 shadow-sm sm:px-4 sm:py-3.5">
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-translation-ink sm:text-xs"><MetricIcon className="shrink-0 text-primary" size={14}/>{t(key)}</span>
          <strong className="mt-1 block text-2xl font-extrabold tracking-tight tabular-nums text-foreground sm:text-[30px]">{value}</strong>
        </div>)}
      </div>}
    </header>

    <div className={cn('grid min-w-0 items-start gap-4',view==='history'&&'lg:grid-cols-[minmax(0,1fr)_minmax(220px,265px)]')}>
      <Card className="libraryCard min-w-0 overflow-hidden rounded-[26px] border border-border/65 bg-card/90 shadow-[0_14px_35px_-30px_rgba(40,60,50,.42)]">
        <div className="libraryToolbar flex flex-wrap items-center gap-3 border-b border-border/55 p-4 sm:px-5 sm:py-4.5">
          <div className="flex min-w-0 items-center gap-2">
            <Badge className="libraryCount shrink-0 rounded-lg bg-secondary/70 px-3 py-1.5 text-xs font-semibold text-primary">{t('libraryCount',{count:filtered.length})}</Badge>
            {view==='history'&&<span className="text-[11px] text-muted-foreground">{t('historyRecentFirst')}</span>}
          </div>
          <label className="searchBox ml-auto flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-border/80 bg-background/75 px-3 text-translation-ink shadow-sm focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-ring/20 sm:w-auto sm:min-w-58 sm:max-w-80 sm:flex-1">
            <Search size={17} className="shrink-0 text-primary"/>
            <input className="h-10 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground" aria-label={t('searchAria')} placeholder={t('searchPlaceholder')} value={search} onChange={e=>searchChanged(e.target.value)}/>
          </label>
        </div>
        {view==='favorites'&&<div className="flex flex-wrap items-center gap-2 border-b border-border/55 px-4 py-3 sm:px-5"
          role="group" aria-label={t('familiarFilterGroup')}>
          {(['favorites','familiar'] as const).map(tab=><Button key={tab} variant={collection===tab?'soft':'ghost'}
            size="sm" className={cn('min-h-9 rounded-xl px-3 text-xs font-semibold',collection===tab&&'bg-secondary text-primary shadow-sm')}
            onClick={()=>changeCollection(tab)} aria-pressed={collection===tab}>
            {t(tab==='favorites'?'familiarFilterFavorites':'familiarFilterFamiliar')}
          </Button>)}
          <p className="w-full text-[11px] leading-5 text-muted-foreground">{t('familiarFilterHint')}</p>
        </div>}
        {view==='history'&&<div className="flex flex-wrap items-center gap-2 border-b border-border/55 px-4 py-3 sm:px-5" role="group" aria-label={t('historyFilterLabel')}>
          {([
            ['all','historyFilterAll'],['view','historyFilterViews'],['practice','historyFilterPractices'],
          ] as const).map(([filter,label])=><Button key={filter} variant={historyFilter===filter?'soft':'ghost'} size="sm"
            className={cn('min-h-9 rounded-xl px-3 text-xs font-semibold',historyFilter===filter&&'bg-secondary text-primary shadow-sm')}
            onClick={()=>selectFilter(filter)} aria-pressed={historyFilter===filter}>{t(label)}</Button>)}
        </div>}
        {view==='review'&&<div className="flex flex-wrap items-center gap-2 border-b border-border/55 px-4 py-3 sm:px-5"
          role="group" aria-label={t('reviewFilterLabel')}>
          {([
            ['all','reviewFilterAll',reviews.total],
            ['due','reviewFilterDue',reviews.due],
            ['upcoming','reviewFilterUpcoming',reviews.upcoming],
          ] as const).map(([filter,label,count])=><Button key={filter}
            variant={reviewFilter===filter?'soft':'ghost'} size="sm"
            className={cn('min-h-9 rounded-xl px-3 text-xs font-semibold',reviewFilter===filter&&'bg-secondary text-primary shadow-sm')}
            aria-pressed={reviewFilter===filter} onClick={()=>selectReviewFilter(filter)}>
            {t(label,{count})}
          </Button>)}
          <p className="w-full text-[11px] leading-5 text-muted-foreground">{t('reviewScheduleHint')}</p>
        </div>}
        <div ref={animationParent} className="libraryList voxnelo-scroll flex min-w-0 flex-col gap-2.5 p-3.5 sm:max-h-[min(48dvh,500px)] sm:overflow-y-auto sm:overscroll-contain sm:p-5" data-testid="library-list">
          {paginated.items.length?paginated.items.map((entry,index)=>{
            const currentDate=entry.at===undefined?'':dateLabel(entry.at);
            const previous=paginated.items[index-1];
            const showDate=view==='history' && (index===0||!previous||dateLabel(previous.at??0)!==currentDate);
            const pronGuide=mode==='favorites'||mode==='familiar'||mode==='review'?getConnectedSpeechGuide(entry.sentence):undefined;
            return <div key={entry.id} className="flex min-w-0 flex-col gap-2.5">
              {showDate&&<div className="flex items-center gap-2 px-1 pt-1 text-xs font-bold text-translation-ink"><CalendarDays size={14} className="text-primary" /><span>{currentDate}</span><span className="ml-2 h-px min-w-4 flex-1 bg-border/60"/></div>}
              <Button variant="ghost" onClick={()=>onChoose(entry.sentence)}
                className="libraryItem group relative h-auto min-h-23 w-full min-w-0 justify-start gap-3 overflow-hidden rounded-2xl border border-border/55 bg-muted/28 px-3.5 py-3.5 text-left shadow-[0_5px_15px_-15px_rgba(50,55,45,.8)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/55 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/35 sm:px-4">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[14px] border border-primary/15 bg-secondary/65 text-primary sm:size-11">
                  {entry.type==='practice'?<Mic2 size={20}/>:view==='history'?<Clock3 size={20}/>:mode==='favorites'?<Heart size={20}/>:mode==='familiar'?<BadgeCheck size={20}/>:<ListRestart size={20}/>}
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                  <strong className="line-clamp-2 max-w-full text-[15px] leading-5 font-bold break-words whitespace-normal text-foreground sm:text-base">{entry.sentence.english}</strong>
                  <span className="line-clamp-2 max-w-full text-[12px] leading-5 font-normal break-words whitespace-normal text-translation-ink">{entry.sentence.chinese}</span>
                  {(mode==='favorites'||mode==='familiar'||mode==='review')&&entry.sentence.ipa&&<span lang="en" className="w-full max-w-full break-words whitespace-normal text-[11px] leading-4 text-ipa-ink">
                    <span className="font-semibold">{t('ipaStandard')}:</span> {entry.sentence.ipa}
                  </span>}
                  {pronGuide&&<span lang="en" className="w-full max-w-full break-words whitespace-normal text-[11px] leading-4 text-primary">
                    <span className="font-semibold">{t('connectedIpa')}:</span> {pronGuide.spokenIpa}
                  </span>}
                  <span className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                    <span>{t(topics[entry.sentence.topic])}</span>
                    {view==='review'&&entry.reviewDue!==undefined&&<span className={entry.reviewDue?'font-semibold text-primary':'text-muted-foreground'}>
                      {entry.reviewDue?t('reviewDueNow'):t('reviewDueOn')}
                    </span>}
                    {view==='review'&&!entry.reviewDue&&entry.reviewDueAt!==undefined&&entry.reviewDueAt>0&&
                      <time dateTime={new Date(entry.reviewDueAt).toISOString()}>
                        {new Date(entry.reviewDueAt).toLocaleDateString(locale,{year:'numeric',month:'short',day:'numeric'})}
                      </time>}
                    {view==='history'&&entry.at!==undefined&&<>
                      <span aria-hidden="true">·</span>
                      <span>{t(entry.type==='practice'?'historyRecorded':'historyViewed')}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</time>
                    </>}
                  </span>
                </span>
                <ArrowUpRight size={18} className="ml-1 shrink-0 text-primary opacity-75 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/>
              </Button>
              {view==='review'&&entry.reviewDue&&onCompleteReview&&<Button variant="soft" size="sm"
                className="min-h-9 self-start rounded-xl px-3 text-xs"
                aria-label={t('reviewCompleteFor',{sentence:entry.sentence.english})}
                onClick={()=>onCompleteReview(entry.sentence.id)}>
                <BookOpenCheck size={15} aria-hidden="true"/>{t('reviewComplete')}
              </Button>}
            </div>;
          }):<div className="empty flex min-h-68 flex-col items-center justify-center gap-4 px-5 py-9 text-center">
            <span className="grid size-16 place-items-center rounded-3xl border border-border/50 bg-secondary text-primary shadow-sm"><Icon size={28}/></span>
            <strong className="text-lg font-bold text-foreground">{t('libraryEmptyTitle')}</strong>
            <span className="max-w-67 text-[13px] leading-6 text-translation-ink">{t(search?'libraryEmptySearch':view==='review'&&reviewFilter==='due'?'reviewNoDue':view==='review'&&reviewFilter==='upcoming'?'reviewNoUpcoming':view==='history'&&historyFilter!=='all'?'historyFilterEmpty':'libraryEmptyHint')}</span>
            <Button className="min-h-10 rounded-xl" onClick={onBackToPractice}>{t('libraryStart')}<ArrowRight size={16}/></Button>
          </div>}
        </div>
        {paginated.pages>1&&<nav className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/15 px-4 py-3 sm:px-5" aria-label={t('libraryPagination')}>
          <span className="text-[11px] font-medium tabular-nums text-translation-ink">{t('libraryRange',{start:paginated.start,end:paginated.end,total:paginated.total})}</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon-sm" className="size-9 rounded-xl" aria-label={t('libraryPreviousPage')} disabled={paginated.page===1} onClick={()=>setPage(paginated.page-1)}><ChevronLeft size={17}/></Button>
            <span className="min-w-16 text-center text-xs font-bold tabular-nums text-foreground" aria-live="polite">{t('libraryPage',{current:paginated.page,total:paginated.pages})}</span>
            <Button variant="outline" size="icon-sm" className="size-9 rounded-xl" aria-label={t('libraryNextPage')} disabled={paginated.page===paginated.pages} onClick={()=>setPage(paginated.page+1)}><ChevronRight size={17}/></Button>
          </div>
        </nav>}
      </Card>
      {view==='history'&&<aside className="grid min-w-0 gap-4">
        <Card className="rounded-[24px] border border-border/60 bg-card/80 p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><Sparkles size={17} className="text-primary"/>{t('historyTopicsTitle')}</h2>
          <p className="mt-1.5 text-xs leading-5 text-translation-ink">{t('historyTopicsHelp')}</p>
          <div className="mt-4 flex flex-col gap-3">
            {topicCounts.length?topicCounts.map(({topic,count})=><div key={topic} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-2 text-xs font-medium text-foreground"><span>{t(topics[topic])}</span><span className="tabular-nums text-translation-ink">{count}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/70" style={{width:(totals.events?count/totals.events*100:0)+'%'}}/></div>
            </div>):<p className="rounded-xl bg-muted/40 px-3 py-4 text-xs leading-5 text-translation-ink">{t('historyNoTopics')}</p>}
          </div>
        </Card>
        <Card className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-brand-cream via-card to-brand-blush/30 p-4 shadow-sm sm:p-5">
          <BookOpenCheck size={22} className="text-primary"/>
          <h2 className="mt-3 text-base font-bold text-foreground">{t('historyContinueTitle')}</h2>
          <p className="mt-2 text-xs leading-6 text-translation-ink">{t('historyContinueHelp')}</p>
          <Button className="mt-4 min-h-10 rounded-xl" onClick={onBackToPractice}>{t('backPractice')}<ArrowRight size={16}/></Button>
        </Card>
      </aside>}
    </div>
    {notice&&<div className="notice rounded-2xl border border-border bg-card px-4 py-3 text-xs" role="status">{notice}</div>}
  </div>;
}
