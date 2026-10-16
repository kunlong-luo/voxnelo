import { AudioLines, Download, Mic2, ShieldCheck, Square } from 'lucide-react';
import type { useLiveDictation } from './useLiveDictation';
import { useI18n } from './i18n';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

interface Props {
  dictation: ReturnType<typeof useLiveDictation>;
  blocked: boolean;
  onStart: () => void;
}
export function LiveDictationPanel({dictation,blocked,onStart}:Props) {
  const {t}=useI18n();
  const listening=dictation.status==='listening';
  const checking=dictation.status==='checking';
  return <section className="liveDictation w-full max-w-150 min-w-0 rounded-2xl border border-primary/15 bg-secondary/50 px-3 py-2.5 [@media(max-height:680px)]:py-1.5 text-left shadow-[inset_0_1px_1px_rgba(255,255,255,.65)] @min-[560px]/workspace:px-4" aria-label={t('dictationTitle')}>
    <div className="flex min-w-0 flex-wrap items-center gap-2 [@media(max-height:680px)]:gap-1">
      <Button className={cn('dictationAction h-10 shrink-0 rounded-xl px-3 [@media(max-height:680px)]:h-9 text-xs font-bold shadow-sm',listening?'bg-primary text-primary-foreground':'bg-primary text-primary-foreground')} onClick={listening?dictation.stop:onStart} disabled={blocked||checking||(!listening&&!dictation.supported)} aria-label={t(listening?'dictationStop':checking?'dictationChecking':'dictationStart')}>
        {listening?<Square size={14} fill="currentColor" aria-hidden="true"/>:<Mic2 size={17} aria-hidden="true"/>}
        {t(listening?'dictationStop':'dictationTitle')}
      </Button>
      <span className="hidden min-w-0 flex-1 items-center gap-1.5 text-[11px] leading-4 font-medium text-translation-ink @min-[440px]/workspace:flex" role="status">
        {listening?<><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-mic-halo motion-safe:animate-status-breathe"/>{t('dictationListening')}</>
          :checking?t('dictationChecking')
          :<><AudioLines size={14} className="shrink-0 text-primary" aria-hidden="true"/>{t('dictationPrivacy')}</>}
      </span>
    </div>
    <div className="dictationTranscript mt-2 min-h-7 max-h-22 overflow-y-auto rounded-xl bg-card/80 px-3 py-1.5 text-xs leading-5 text-sentence-ink [@media(max-height:680px)]:mt-1 [@media(max-height:680px)]:min-h-6 [@media(max-height:680px)]:max-h-13 [@media(max-height:680px)]:py-0.5" data-testid="live-transcript">
      <span aria-live="polite" className={cn('font-medium',!dictation.finalText&&'text-muted-foreground')}>{dictation.finalText||(!dictation.interimText?t('dictationPlaceholder'):'')}</span>
      {dictation.interimText&&<span className="ml-1 text-translation-ink" aria-label={t('dictationInterim')}>{dictation.interimText}</span>}
    </div>
    {!dictation.supported&&<><p role="status" className="mt-1.5 hidden text-[11px] leading-4 text-translation-ink @min-[440px]/workspace:block">{t(window.voxneloDesktop?'dictationLocalRequired':'dictationUnsupported')}</p><p role="status" className="mt-1 text-[10px] leading-4 text-translation-ink @min-[440px]/workspace:hidden">{t('dictationUnavailableShort')}</p></>}
    {listening&&window.voxneloDesktop&&dictation.noiseReduction!=='unknown'&&<p className="mt-1 flex items-center gap-1 text-[10px] leading-4 text-translation-ink"><ShieldCheck size={12} aria-hidden="true"/>{t(dictation.noiseReduction==='enabled'?'dictationNoiseEnabled':'dictationNoiseUnverified')}</p>}
    {dictation.error&&<p role="status" className="mt-1.5 text-[11px] leading-4 text-translation-ink">{dictation.error}</p>}
    {dictation.localPack==='downloadable'&&dictation.mode==='local'&&<Button variant="outline" size="sm" className="mt-2 h-8 text-[11px]" onClick={()=>void dictation.installLocal()} disabled={checking}><Download size={14}/>{t('dictationInstallPack')}</Button>}
    {dictation.supported&&dictation.browserModeAvailable&&!listening&&!checking&&<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <Button variant="ghost" size="sm" className="h-auto min-h-7 px-1.5 text-[10px] leading-4 text-muted-foreground underline decoration-dotted underline-offset-2" onClick={()=>dictation.chooseMode(dictation.mode==='local'?'browser':'local')}>
        {t(dictation.mode==='local'?'dictationCloudEnable':'dictationCloudDisable')}
      </Button>
      {dictation.mode==='browser'&&<span className="flex items-start gap-1 text-[10px] leading-4 text-translation-ink"><ShieldCheck size={12} className="mt-0.5 shrink-0" aria-hidden="true"/>{t('dictationCloudEnabled')}</span>}
    </div>}
  </section>;
}
