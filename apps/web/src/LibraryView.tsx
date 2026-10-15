import { useMemo } from 'react';
import { ArrowRight, Bookmark, ChevronLeft, Search, Heart, Clock3, ListRestart } from 'lucide-react';
import { SENTENCES, type HistoryEvent, type LearningState, type Sentence } from '@voxnelo/learning';
import { useI18n, type TranslationKey } from './i18n';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';

export type View = 'practice'|'history'|'favorites'|'review'|'settings';
interface LibraryViewProps {
 view:Exclude<View,'practice'|'settings'>;states:LearningState[];
 events:HistoryEvent[];search:string;notice:string;
 onSearch:(v:string)=>void;onChoose:(s:Sentence)=>void;onBackToPractice:()=>void;
}
const views:Record<'history'|'favorites'|'review',{title:TranslationKey;helper:TranslationKey;icon:typeof Clock3}>={
 history:{title:'libHistoryTitle',helper:'libHistoryHelp',icon:Clock3},
 favorites:{title:'libFavoritesTitle',helper:'libFavoritesHelp',icon:Heart},
 review:{title:'libReviewTitle',helper:'libReviewHelp',icon:ListRestart},
};
const topics:Record<Sentence['topic'],TranslationKey>={
 greetings:'topicGreetings',personal:'topicPersonal',needs:'topicNeeds',learning:'topicLearning',daily:'topicDaily',
};
export function LibraryView({view,states,events,search,notice,onSearch,onChoose,onBackToPractice}:LibraryViewProps){
 const {t}=useI18n();
 const filtered=useMemo(()=>{
   const unique=new Set<string>();
   if(view==='history')events.filter(e=>e.type==='view'||e.type==='practice').forEach(e=>unique.add(e.sentenceId));
   if(view==='favorites')states.filter(s=>s.favorite).forEach(s=>unique.add(s.sentenceId));
   if(view==='review')states.filter(s=>s.review).forEach(s=>unique.add(s.sentenceId));
   return [...unique].map(id=>SENTENCES.find(s=>s.id===id)).filter((s):s is Sentence=>Boolean(s))
    .filter(s=>(s.english+' '+s.chinese).toLowerCase().includes(search.trim().toLowerCase()));
 },[view,states,events,search]);
 const {title,helper,icon:Icon}=views[view];
 return <div className="libraryPage mx-auto flex w-full max-w-305 flex-col gap-6 py-2">
   <div className="libraryTitle flex flex-wrap items-start justify-between gap-4">
     <div className="flex flex-col gap-2">
       <div className="eyebrow flex items-center gap-2 text-[10px] font-bold tracking-[.2em] text-primary uppercase"><Icon size={16}/>{t('libraryEyebrow')}</div>
       <h1 className="text-3xl font-extrabold tracking-tight">{t(title)}</h1>
       <p className="text-xs leading-6 text-muted-foreground">{t(helper)}</p>
     </div>
     <Button variant="outline" size="sm" className="backPractice" onClick={onBackToPractice}><ChevronLeft size={16}/>{t('backPractice')}</Button>
   </div>
   <Card className="libraryCard min-h-130 overflow-hidden border-white/70" aria-label={t(title)}>
     <div className="libraryToolbar flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 sm:p-5">
       <Badge className="libraryCount">{t('libraryCount',{count:filtered.length})}</Badge>
       <label className="searchBox flex w-full max-w-80 items-center gap-2 rounded-xl border border-border bg-card/80 px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/20 sm:w-auto">
         <Search size={17} className="shrink-0"/>
         <input className="h-10 min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" aria-label={t('searchAria')} placeholder={t('searchPlaceholder')} value={search} onChange={e=>onSearch(e.target.value)}/>
       </label>
     </div>
     <div className="libraryList flex flex-col gap-2 p-4 sm:p-5">
       {filtered.length?filtered.map(s=><Button key={s.id} variant="ghost" className="libraryItem h-auto min-h-21 w-full justify-between rounded-2xl border border-border/60 bg-muted/35 p-4 text-left hover:border-primary/30 hover:bg-accent/65" onClick={()=>onChoose(s)}>
         <div className="librarySentence flex min-w-0 flex-col items-start gap-1.5"><strong className="max-w-full truncate text-base text-foreground">{s.english}</strong><span className="max-w-full truncate text-xs font-normal text-muted-foreground">{s.chinese}</span></div>
         <div className="libraryMeta ml-3 flex shrink-0 items-center gap-2"><span className="hidden text-[10px] text-muted-foreground sm:block">{t(topics[s.topic])}</span><ArrowRight size={17} className="text-primary"/></div>
       </Button>):<div className="empty flex min-h-90 flex-col items-center justify-center gap-4 text-center">
         <span className="emptyIcon rounded-2xl bg-secondary p-4 text-primary"><Bookmark size={27}/></span>
         <strong className="text-lg font-bold">{t('libraryEmptyTitle')}</strong>
         <span className="max-w-65 text-xs leading-6 text-muted-foreground">{t(search?'libraryEmptySearch':'libraryEmptyHint')}</span>
         <Button onClick={onBackToPractice}>{t('libraryStart')}<ArrowRight size={15}/></Button>
       </div>}
     </div>
   </Card>
   {notice&&<div className="notice rounded-2xl border border-border bg-card px-4 py-3 text-xs" role="status">{notice}</div>}
 </div>;
}
