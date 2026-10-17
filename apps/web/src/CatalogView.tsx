import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpenText, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { SCENE_LABELS, SENTENCES, type Sentence } from '@voxnelo/learning';
import { useI18n } from './i18n';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

type SceneKey = keyof typeof SCENE_LABELS;
type SceneFilter = SceneKey | 'all';
const PAGE_SIZE = 6;

/** Browsable scene packs complement the existing one-tap practice flow. */
export function CatalogView({onChoose,onBackToPractice}:{
  onChoose:(sentence:Sentence)=>void;
  onBackToPractice:()=>void;
}) {
  const {t,locale}=useI18n();
  const [scene,setScene]=useState<SceneFilter>('all');
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(1);
  const sceneKeys=Object.keys(SCENE_LABELS) as SceneKey[];
  const language=locale==='zh-CN'?'zh':'en';
  const filtered=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase();
    return SENTENCES.filter(sentence=>
      (scene==='all'||(sentence.scene??'core')===scene) &&
      (!needle||
        (sentence.english+' '+sentence.chinese+' '+SCENE_LABELS[sentence.scene??'core'][language])
          .toLocaleLowerCase().includes(needle))
    );
  },[scene,query,language]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(page,pages);
  const visible=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  const chooseScene=(next:SceneFilter)=>{setScene(next);setPage(1);};
  const changeQuery=(next:string)=>{setQuery(next);setPage(1);};
  const start=filtered.length?(currentPage-1)*PAGE_SIZE+1:0;
  const end=Math.min(currentPage*PAGE_SIZE,filtered.length);
  return <section className="catalogPage mx-auto flex w-full max-w-310 flex-col gap-4 pb-5 motion-safe:animate-view-enter">
    <header className="relative isolate overflow-hidden rounded-[28px] border border-glass-edge bg-glass-surface px-5 py-6 shadow-glass backdrop-blur-[var(--glass-blur)] sm:px-8 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-60 rounded-full bg-brand-blush/45 blur-3xl"/>
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-card/75 px-3 py-1.5 text-[11px] font-semibold tracking-widest text-primary uppercase"><BookOpenText size={14}/>{t('catalogEyebrow')}</span>
          <h1 className="text-[clamp(1.75rem,3vw,2.75rem)] font-extrabold tracking-tight text-foreground">{t('catalogTitle')}</h1>
          <p className="max-w-130 text-[13px] leading-6 text-translation-ink sm:text-sm">{t('catalogHelp')}</p>
        </div>
        <Button variant="outline" size="sm" className="min-h-10 rounded-xl bg-card/75" onClick={onBackToPractice}><ArrowLeft size={16}/>{t('backPractice')}</Button>
      </div>
    </header>
    <Card className="min-w-0 rounded-[26px] border border-border/65 bg-card/90 p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <strong className="rounded-lg bg-secondary/70 px-3 py-1.5 text-sm text-primary" data-testid="catalog-count">{t('catalogCount',{count:SENTENCES.length})}</strong>
        <label className="ml-auto flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-border/80 bg-background/75 px-3 shadow-sm focus-within:ring-2 focus-within:ring-ring/20 sm:w-auto sm:min-w-60 sm:max-w-85 sm:flex-1">
          <Search size={17} className="shrink-0 text-primary"/>
          <input type="search" className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label={t('catalogSearch')} placeholder={t('catalogSearch')} value={query} onChange={event=>changeQuery(event.target.value)}/>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t('catalogSceneFilter')}>
        <Button size="sm" variant={scene==='all'?'soft':'outline'} className="min-h-9 rounded-xl text-xs" aria-pressed={scene==='all'} onClick={()=>chooseScene('all')}>{t('catalogAll')}</Button>
        {sceneKeys.map(key=><Button key={key} size="sm" variant={scene===key?'soft':'outline'}
          className="min-h-9 rounded-xl text-xs" aria-pressed={scene===key} onClick={()=>chooseScene(key)}>{SCENE_LABELS[key][language]}</Button>)}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{t('catalogDraftNotice')}</p>
    </Card>
    <div className="voxnelo-scroll grid min-w-0 gap-3 sm:max-h-[min(43dvh,470px)] sm:overflow-y-auto sm:overscroll-contain sm:pr-2 sm:grid-cols-2 xl:grid-cols-3" data-testid="catalog-grid" aria-label={t('catalogTitle')}>
      {visible.map(sentence=><Button key={sentence.id} variant="ghost" onClick={()=>onChoose(sentence)}
        className="catalogItem group h-auto min-h-32 min-w-0 flex-col items-start justify-start gap-2 rounded-2xl border border-border/60 bg-card/85 p-4 text-left shadow-sm transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent/55">
        <span className="flex w-full items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
          <span>{SCENE_LABELS[sentence.scene??'core'][language]} · {sentence.level}</span>
          <ArrowUpRight size={15} className="shrink-0 text-primary"/>
        </span>
        <strong className="w-full text-[15px] leading-6 font-bold break-words whitespace-normal text-foreground">{sentence.english}</strong>
        <span className="w-full text-[13px] leading-5 break-words whitespace-normal text-translation-ink">{sentence.chinese}</span>
      </Button>)}
    </div>
    {filtered.length===0?<p className="py-10 text-center text-sm text-muted-foreground">{t('libraryEmptySearch')}</p>:null}
    {pages>1?<nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/65 bg-card/80 px-4 py-3" aria-label={t('libraryPagination')}>
      <span className="text-xs text-muted-foreground">{t('libraryRange',{start,end,total:filtered.length})}</span>
      <div className="flex items-center gap-2">
        <Button size="icon-sm" variant="outline" className="size-9 rounded-xl" aria-label={t('libraryPreviousPage')} disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={17}/></Button>
        <span className="min-w-15 text-center text-xs font-semibold tabular-nums">{t('libraryPage',{current:currentPage,total:pages})}</span>
        <Button size="icon-sm" variant="outline" className="size-9 rounded-xl" aria-label={t('libraryNextPage')} disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}><ChevronRight size={17}/></Button>
      </div>
    </nav>:null}
  </section>;
}
