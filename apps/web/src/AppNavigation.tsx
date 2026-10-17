import { BarChart3, BookOpenText, Clock3, MessageCircle, Settings2, ShieldCheck, Star, type LucideIcon } from 'lucide-react';
import { APP_VERSION } from '@voxnelo/learning';
import type { View } from './LibraryView';
import { useI18n } from './i18n';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

/** One typed source of truth for desktop and compact navigation labels. */
const menu = [
  {id:'practice',icon:MessageCircle,labelKey:'navPractice',accessibleLabelKey:'navStart'},
  {id:'catalog',icon:BookOpenText,labelKey:'navCatalog',accessibleLabelKey:'navCatalogExplore'},
  {id:'favorites',icon:Star,labelKey:'navFavorites',accessibleLabelKey:'navMyFavorites'},
  {id:'history',icon:Clock3,labelKey:'navHistory',accessibleLabelKey:'navRecent'},
  {id:'review',icon:BarChart3,labelKey:'navReview',accessibleLabelKey:'navReviewItems'},
  {id:'settings',icon:Settings2,labelKey:'navSettings',accessibleLabelKey:'navSettings'},
] as const satisfies ReadonlyArray<{id:View;icon:LucideIcon;labelKey:string;accessibleLabelKey:string}>;

interface NavigationProps {
  view: View;
  onNavigate: (target: View) => void;
}

export function NavigationSidebar({view,onNavigate,favorites}:NavigationProps & {favorites:number}) {
  const {t}=useI18n();
  return (
      <aside className="sidebar voxnelo-sidebar-scroll sticky top-0 hidden h-dvh w-[clamp(204px,19vw,252px)] shrink-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-r border-white/50 bg-sidebar/90 px-3 pt-4 pb-5 text-sidebar-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,.65),12px_0_35px_-30px_rgba(99,68,54,.32)] backdrop-blur-md sm:flex max-[1050px]:w-19 max-[1050px]:items-center max-[1050px]:px-2">
        <div className="brand mb-7 flex w-full items-center gap-3 rounded-[22px] border border-white/55 bg-card/45 px-2 py-2 shadow-[0_12px_30px_-24px_rgba(67,49,39,.32)] max-[1050px]:justify-center max-[1050px]:border-0 max-[1050px]:bg-transparent max-[1050px]:px-0" aria-label="Voxnelo">
          <div className="brandMark flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card/35 shadow-[0_10px_28px_-14px_rgba(60,80,70,.5)]"><img src="brand/voxnelo-mark.svg" alt="" width="44" height="44" className="size-11 rounded-2xl shadow-sm"/></div>
          <div className="brandText max-[1050px]:hidden"><strong className="text-[24px] font-extrabold tracking-[-.065em] text-foreground">Voxnelo</strong></div>
        </div>
        <div className="sidebarHint px-4 text-[10px] font-bold tracking-[.18em] text-muted-foreground uppercase max-[1050px]:hidden">{t('sidebarSpace')}</div>
        <nav className="mt-4 flex w-full flex-col gap-2" aria-label={t('navLabel')}>
          {menu.map(({ id, icon: Icon, labelKey, accessibleLabelKey }) => (
            <Button key={id} variant="ghost" className={cn('navItem group relative h-12 w-full justify-start rounded-[17px] border border-transparent px-4 text-sm font-semibold text-sidebar-foreground/80 transition-[background-color,color,transform,box-shadow] duration-400 hover:border-primary/10 hover:bg-sidebar-accent/85 hover:text-foreground hover:translate-x-0.5 max-[1050px]:size-12 max-[1050px]:justify-center max-[1050px]:px-0',view===id&&'active animate-soft-pop border-primary/20 bg-gradient-to-r from-brand-blush/55 via-card/95 to-card/65 text-primary shadow-[0_10px_30px_-18px_rgba(70,85,72,.48)] ring-1 ring-primary/10 before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-full before:bg-primary before:content-[\'\']')} aria-label={t(accessibleLabelKey)} aria-current={view === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
              <Icon size={20} strokeWidth={1.9} />
              <span className="max-[1050px]:hidden">{t(labelKey)}</span>
              {id === 'favorites' && favorites > 0 ? <span className="navCount ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground max-[1050px]:hidden">{favorites}</span> : null}
            </Button>
          ))}
        </nav>
        <div className="sidebarBottom mt-auto flex flex-col gap-4 px-1 pt-8 max-[1050px]:hidden">
          <div className="tinyPanel privacyPanel flex flex-col gap-2.5 rounded-[24px] border border-white/55 bg-gradient-to-br from-card/85 via-card/60 to-brand-mist/20 p-4.5 text-xs leading-5 text-translation-ink shadow-[0_16px_36px_-28px_rgba(47,73,65,.45)]">
            <span className="tinyBadge flex size-10 items-center justify-center rounded-[15px] border border-primary/10 bg-secondary/85 text-primary shadow-sm"><ShieldCheck size={17} /></span>
            <strong>{t('sidebarRhythm')}</strong>
            <span>{t('sidebarLocal')}</span>
          </div>
          <div className="sidebarVersion px-1 text-[10px] text-muted-foreground">Voxnelo · Early Access {APP_VERSION}</div>
        </div>
      </aside>
  );
}

export function MobileNavigation({view,onNavigate}:NavigationProps) {
  const {t}=useI18n();
  return (
      {/* The compact viewport has its own navigation affordance; no miniature sidebar. */}
      <nav className="mobileNav fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 gap-0.5 border-t border-border/80 bg-card/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-soft backdrop-blur-xl sm:hidden" aria-label={t('navLabel')}>
        {menu.map(({id,icon:Icon,labelKey,accessibleLabelKey}) => (
          <Button key={id} variant="ghost" className={cn('mobileNavItem h-14 min-w-0 flex-col gap-1 rounded-xl px-1 py-1 text-[10px] transition-[background-color,color,transform] duration-200 active:scale-[.94]',view===id&&'bg-secondary text-primary')} aria-label={t(accessibleLabelKey)+' · '+t('navLabel')} aria-current={view===id?'page':undefined} onClick={() => onNavigate(id)}>
            <Icon size={19} strokeWidth={1.9} aria-hidden="true"/>
            <span className="max-w-full truncate">{t(labelKey)}</span>
          </Button>
        ))}
      </nav>
  );
}
