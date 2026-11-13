import { useId, useState } from 'react';
import { BookOpenText, ChevronDown, Volume2 } from 'lucide-react';
import { getConnectedSpeechGuide, type ConnectedSpeechRuleKind, type Sentence } from '@voxnelo/learning';
import { useI18n, type TranslationKey } from './i18n';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

const ruleLabels:Record<ConnectedSpeechRuleKind,TranslationKey>={
  assimilation:'connectedRuleAssimilation',
  weakForm:'connectedRuleWeakForm',
  flapping:'connectedRuleFlapping',
  linking:'connectedRuleLinking',
};

export function PronunciationGuide({
  sentence,showIpa,recordingBusy,onToggleIpa,onSpeak,
}:{
  sentence:Sentence;
  showIpa:boolean;
  recordingBusy:boolean;
  onToggleIpa:()=>void;
  onSpeak:()=>void;
}) {
  const {t,locale}=useI18n();
  const [showRules,setShowRules]=useState(false);
  const [compactOpen,setCompactOpen]=useState(false);
  const ruleRegionId=useId();
  const guide=getConnectedSpeechGuide(sentence);

  return <section aria-label={t('pronunciationGuide')}
    className="w-full max-w-155 min-w-0 rounded-2xl border border-border/65 bg-card/70 px-3 py-2.5 text-left shadow-sm backdrop-blur-sm sm:px-4">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-foreground">
        <BookOpenText size={15} aria-hidden="true"/>{t('pronunciationGuide')}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onSpeak} disabled={recordingBusy} aria-label={t('pronunciationPlay')} className="h-8 rounded-lg px-2 text-xs text-primary">
          <Volume2 size={15} aria-hidden="true"/>{t('playDemo')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleIpa} aria-expanded={showIpa}
          aria-label={t(showIpa?'ipaHide':'ipaShow')} className="h-8 rounded-lg px-2 text-xs text-primary">
          <ChevronDown size={14} aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none',showIpa&&'rotate-180')}/>
          {t(showIpa?'ipaHide':'ipaShow')}
        </Button>
      </div>
    </div>
    {showIpa && !compactOpen && <div className="hidden min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/55 pt-1 [@media(max-height:700px)]:flex">
      {sentence.ipa && <span className="ipa wrap-anywhere text-xs text-ipa-ink" lang="en">{sentence.ipa}</span>}
      {guide && <span className="wrap-anywhere text-xs font-medium text-primary" lang="en">{guide.spokenIpa}</span>}
      <Button variant="ghost" size="sm" onClick={()=>setCompactOpen(true)} aria-expanded={false}
        className="h-7 rounded-lg px-2 text-[11px] text-primary">{t('pronunciationExpand')}</Button>
    </div>}
    {showIpa && <div className={cn(
      'mt-2 flex min-w-0 flex-col gap-2.5 border-t border-border/55 pt-2.5',
      !compactOpen && '[@media(max-height:700px)]:hidden',
    )}>
      {compactOpen && <Button variant="ghost" size="sm" onClick={()=>setCompactOpen(false)}
        aria-expanded={true} className="hidden h-7 w-fit rounded-lg px-2 text-[11px] text-primary [@media(max-height:700px)]:inline-flex">
        {t('pronunciationCollapse')}
      </Button>}
      {sentence.ipa ? <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">{t('ipaStandard')}</p>
        <p data-testid="standard-ipa" className="ipa mt-0.5 wrap-anywhere text-sm leading-6 text-ipa-ink" lang="en">{sentence.ipa}</p>
      </div> : <p className="text-xs text-muted-foreground">{t('ipaPending')}</p>}
      {guide ? <>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">{t('connectedIpa')}</p>
          <p data-testid="connected-ipa" className="mt-0.5 wrap-anywhere text-sm font-medium leading-6 text-primary" lang="en">{guide.spokenIpa}</p>
        </div>
        <Button variant="soft" size="sm" onClick={()=>setShowRules(v=>!v)}
          aria-expanded={showRules} aria-controls={ruleRegionId}
          className="h-8 w-fit max-w-full rounded-xl text-xs">
          <BookOpenText size={14} aria-hidden="true"/>{t(showRules?'connectedRulesHide':'connectedRulesShow')}
          <ChevronDown size={14} aria-hidden="true"
            className={cn('transition-transform motion-reduce:transition-none',showRules&&'rotate-180')}/>
        </Button>
        {showRules && <div id={ruleRegionId} role="region" aria-label={t('connectedRulesTitle')}
          className="min-w-0 space-y-2 rounded-xl border border-border/60 bg-background/60 p-2.5 sm:p-3">
          {guide.rules.map(note=><div key={note.span} className="min-w-0">
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
              <span className="font-bold text-primary">{t(ruleLabels[note.kind])}</span>
              <span className="font-semibold text-foreground" lang="en">{note.span}</span>
              <span className="wrap-anywhere text-ipa-ink" lang="en">{note.spokenIpa}</span>
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {locale==='zh-CN'?note.descriptionZh:note.descriptionEn}
            </p>
          </div>)}
        </div>}
        <p className="text-[10px] leading-4 text-muted-foreground">{t('connectedGuideNote')}</p>
      </> : <p className="text-[11px] leading-5 text-muted-foreground">{t('connectedGuidePending')}</p>}
      <p className="text-[10px] leading-4 text-muted-foreground">{t('pronunciationTtsNote')}</p>
    </div>}
  </section>;
}
