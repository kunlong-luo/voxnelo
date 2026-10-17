import { ArrowLeft, AudioLines, BookOpenText, Bug, Check, CircleHelp, ExternalLink, GitBranch, Info, Languages, Lightbulb, Palette, ShieldCheck, Settings2 } from 'lucide-react';
import { APP_VERSION, SUPPORT_LINKS } from '@voxnelo/learning';
import type { AppearanceTheme } from './appearance';
import { useI18n, type LanguageSetting } from './i18n';
import { Button, buttonVariants } from './components/ui/button';
import { Card } from './components/ui/card';
import { cn } from './lib/utils';
interface SettingsViewProps {
  speed:'normal'|'slow';showIpa:boolean;appearance:AppearanceTheme;
  languageSetting?:LanguageSetting;
  onChangeAppearance:(theme:AppearanceTheme)=>void;
  onChangeLanguage?:(locale:LanguageSetting)=>void;
  onToggleSpeed:()=>void;onToggleIpa:()=>void;onBackToPractice:()=>void;
}
const themes:AppearanceTheme[]=['nordic','sunset'];
const languageIds:LanguageSetting[]=['system','zh-CN','en-US'];
const helpActions = [
  { href: SUPPORT_LINKS.guide, label: 'supportGuide', detail: 'supportGuideHint', icon: BookOpenText },
  { href: SUPPORT_LINKS.bugReport, label: 'supportBug', detail: 'supportBugHint', icon: Bug },
  { href: SUPPORT_LINKS.featureRequest, label: 'supportFeature', detail: 'supportFeatureHint', icon: Lightbulb },
] as const;
export function SettingsView({
  speed,showIpa,appearance,languageSetting='system',onChangeAppearance,
  onChangeLanguage,onToggleSpeed,onToggleIpa,onBackToPractice,
}:SettingsViewProps) {
  const {t,locale}=useI18n();
  const section='flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/90 p-5 shadow-soft motion-safe:animate-panel-enter sm:p-6';
  return <div className="settingsPage mx-auto flex w-full max-w-305 flex-col gap-6 px-0 py-2 motion-safe:animate-view-enter">
    <div className="libraryTitle flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="eyebrow flex items-center gap-2 text-[10px] font-bold tracking-[.21em] text-primary uppercase"><Settings2 size={16}/>{t('settingsEyebrow')}</div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t('settingsTitle')}</h1>
        <p className="max-w-125 text-xs leading-6 text-muted-foreground">{t('settingsSummary')}</p>
      </div>
      <Button variant="outline" size="sm" className="backPractice" onClick={onBackToPractice}><ArrowLeft size={16}/>{t('backPractice')}</Button>
    </div>
    <div className="settingsGrid grid min-w-0 grid-cols-1 gap-4 @min-[740px]/workspace:grid-cols-2">
      <Card className={cn(section,'appearanceSettings')}>
        <div className="settingsPanelHeading flex items-center gap-3 text-primary"><Palette size={20}/><h2 className="text-sm font-extrabold text-foreground">{t('appearanceTitle')}</h2></div>
        <p className="text-xs leading-6 text-muted-foreground">{t('appearanceDesc')}</p>
        <div className="appearanceChoices grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3" role="group" aria-label={t('appearanceGroup')}>
          {themes.map(id=>{const name=t(id==='nordic'?'nordicName':'sunsetName');return <button type="button" className={cn('appearanceChoice group flex min-w-0 flex-col gap-2 rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none',appearance===id?'border-primary/50 bg-secondary/65 ring-2 ring-primary/10':'border-border bg-card/70 hover:border-primary/30')} key={id} onClick={()=>onChangeAppearance(id)} aria-label={t('appearanceChoose',{name})} aria-pressed={appearance===id}>
            <span className={cn('appearancePreview relative h-18 w-full overflow-hidden rounded-xl border border-white/75 transition-transform duration-300 motion-safe:group-hover:scale-[1.025]',id==='nordic'?'bg-gradient-to-tr from-brand-mist via-brand-cream to-accent':'bg-gradient-to-tr from-brand-blush via-brand-cream to-brand-mist')} aria-hidden="true"><span className="absolute inset-y-2 left-1/3 aspect-square rounded-full bg-white/50 blur-lg motion-safe:animate-ambient-drift"/></span>
            <strong className="flex items-center justify-between gap-2 text-xs text-foreground">{name}{appearance===id&&<Check size={15} className="text-primary motion-safe:animate-soft-pop"/>}</strong>
            <small className="text-[10px] leading-4 text-muted-foreground">{t(id==='nordic'?'nordicSummary':'sunsetSummary')}</small>
          </button>})}
        </div>
        <p className="appearanceHelp text-[10px] leading-5 text-muted-foreground">{t('appearanceNote')}</p>
        <p className="text-[11px] leading-5 text-primary motion-reduce:hidden">{t('motionVisibleHint')}</p>
        <p className="hidden text-[11px] leading-5 text-primary motion-reduce:block" role="status">{t('motionReducedHint')}</p>
      </Card>
      <Card className={cn(section,'languageSettings')}>
        <div className="settingsPanelHeading flex items-center gap-3 text-primary"><Languages size={20}/><h2 className="text-sm font-extrabold text-foreground">{t('languageTitle')}</h2></div>
        <p className="text-xs leading-6 text-muted-foreground">{t('languageDesc')}</p>
        <div className="languageChoices grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2" role="group" aria-label={t('languageGroup')}>
          {languageIds.map(id=><button type="button" key={id} className={cn('languageChoice flex min-h-18 flex-col justify-center gap-2 rounded-2xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5 motion-reduce:transform-none',languageSetting===id?'border-primary/50 bg-secondary/80 ring-2 ring-primary/10':'border-border bg-card/80 hover:border-primary/30 hover:bg-muted')} aria-pressed={languageSetting===id} onClick={()=>onChangeLanguage?.(id)}>
            <span className="languageChoiceTop flex items-center justify-between gap-1"><strong className="text-xs text-foreground">{t(id==='system'?'languageSystem':id==='zh-CN'?'languageChinese':'languageEnglish')}</strong>{languageSetting===id&&<Check size={15} className="text-primary motion-safe:animate-soft-pop"/>}</span>
            <small className="text-[10px] leading-4 text-muted-foreground">{id==='system'?t('languageSystemDetail',{name:t(locale==='zh-CN'?'languageChinese':'languageEnglish')}):t('languageManualDetail')}</small>
          </button>)}
        </div>
        <p className="appearanceHelp mt-auto text-[10px] leading-5 text-muted-foreground">{t('languageContentNote')}</p>
      </Card>
      <Card className={section}>
        <div className="settingsPanelHeading flex items-center gap-3 text-primary"><AudioLines size={20}/><h2 className="text-sm font-extrabold text-foreground">{t('voiceTitle')}</h2></div>
        <p className="text-xs leading-6 text-muted-foreground">{t('voiceDesc')}</p>
        <button type="button" className="settingToggle flex w-full items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/50 p-4 text-left transition hover:bg-secondary/50" aria-pressed={speed==='slow'} onClick={onToggleSpeed}>
          <span className="flex flex-col gap-1"><strong className="text-xs">{t('slowMode')}</strong><small className="text-[10px] leading-5 text-muted-foreground">{t('slowModeHint')}</small></span>
          <span className={cn('switchTrack relative inline-flex h-6 w-11 shrink-0 rounded-full border border-border/50 p-0.5 transition-colors',speed==='slow'?'bg-primary':'bg-muted-foreground/30')}><span className={cn('size-5 rounded-full bg-white shadow-sm transition-transform',speed==='slow'&&'translate-x-5')}/></span>
        </button>
      </Card>
      <Card className={section}>
        <div className="settingsPanelHeading flex items-center gap-3 text-primary"><Languages size={20}/><h2 className="text-sm font-extrabold text-foreground">{t('contentTitle')}</h2></div>
        <p className="text-xs leading-6 text-muted-foreground">{t('contentDesc')}</p>
        <button type="button" className="settingToggle flex w-full items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/50 p-4 text-left transition hover:bg-secondary/50" aria-pressed={showIpa} onClick={onToggleIpa}>
          <span className="flex flex-col gap-1"><strong className="text-xs">{t('showIpa')}</strong><small className="text-[10px] leading-5 text-muted-foreground">{t('showIpaHint')}</small></span>
          <span className={cn('switchTrack relative inline-flex h-6 w-11 shrink-0 rounded-full border border-border/50 p-0.5 transition-colors',showIpa?'bg-primary':'bg-muted-foreground/30')}><span className={cn('size-5 rounded-full bg-white shadow-sm transition-transform',showIpa&&'translate-x-5')}/></span>
        </button>
      </Card>
      <Card className={cn(section,'aboutSettings @min-[740px]/workspace:col-span-2')}>
        <div className="settingsPanelHeading flex items-center gap-3 text-primary"><Info size={20}/><h2 className="text-sm font-extrabold text-foreground">{t('aboutTitle')}</h2></div>
        <div className="flex flex-wrap items-center gap-4">
          <img src="brand/voxnelo-mark.svg" alt="" width="56" height="56" className="size-14 rounded-2xl shadow-soft"/>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <strong className="text-lg font-extrabold text-foreground">Voxnelo</strong>
            <span className="text-xs text-muted-foreground">{t('aboutVersion',{version:window.voxneloDesktop?.version??APP_VERSION})} · {t('aboutRelease')}</span>
            <span className="text-[11px] text-muted-foreground">{t('aboutLicense')}</span>
          </div>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">{t('aboutSummary')}</p>
        <div className="flex flex-wrap gap-2">
          <a href={SUPPORT_LINKS.repository} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant:'outline',size:'sm'}),'min-w-0 whitespace-normal text-center')}>
            <GitBranch size={16} aria-hidden="true"/>{t('aboutSource')}<ExternalLink size={13} aria-hidden="true"/>
          </a>
          <a href={SUPPORT_LINKS.license} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({variant:'outline',size:'sm'}),'min-w-0 whitespace-normal text-center')}>
            <GitBranch size={16} aria-hidden="true"/>{t('aboutLicenseLink')}<ExternalLink size={13} aria-hidden="true"/>
          </a>
        </div>
      </Card>
      <Card className={cn(section,'helpSettings @min-[740px]/workspace:col-span-2')}>
        <div className="settingsPanelHeading flex items-center gap-3 text-primary"><CircleHelp size={20}/><h2 className="text-sm font-extrabold text-foreground">{t('supportTitle')}</h2></div>
        <p className="text-xs leading-6 text-muted-foreground">{t('supportSummary')}</p>
        <div className="grid min-w-0 grid-cols-1 gap-3 @min-[600px]/workspace:grid-cols-3">
          {helpActions.map(({href,label,detail,icon:Icon})=><a key={href} href={href} target="_blank" rel="noopener noreferrer"
            className="group flex min-w-0 flex-col gap-2 rounded-2xl border border-border/70 bg-card/80 p-4 text-left outline-none transition-colors hover:border-primary/40 hover:bg-secondary/40 focus-visible:ring-3 focus-visible:ring-ring/30">
            <span className="flex items-center gap-2 text-primary"><Icon size={18} aria-hidden="true"/><strong className="text-xs text-foreground">{t(label)}</strong><ExternalLink size={13} aria-hidden="true" className="ml-auto opacity-60"/></span>
            <span className="text-[11px] leading-5 text-muted-foreground">{t(detail)}</span>
          </a>)}
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">{t('supportPublicNotice')}</p>
      </Card>
      <Card className={cn(section,'privacySettings @min-[740px]/workspace:col-span-2')}>
        <div className="settingsPanelHeading flex items-center gap-3 text-primary"><ShieldCheck size={20}/><h2 className="text-sm font-extrabold text-foreground">{t('localPrivacyTitle')}</h2></div>
        <p className="text-xs leading-6 text-muted-foreground">{t('localPrivacyDesc')}</p>
      </Card>
    </div>
  </div>;
}
