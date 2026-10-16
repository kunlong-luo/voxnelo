import { AudioLines, Download, Globe2, Mic2, ShieldCheck, Square } from 'lucide-react';
import type { useLiveDictation } from './useLiveDictation';
import { useI18n } from './i18n';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

interface Props {
  dictation: ReturnType<typeof useLiveDictation>;
  blocked: boolean;
  onStart: () => void;
}

/**
 * U3's hero microphone belongs to live dictation, not the secondary recorder.
 * A single quiet surface groups the actual transcript with its one main action.
 */
export function LiveDictationPanel({dictation,blocked,onStart}:Props) {
  const {t}=useI18n();
  const listening=dictation.status==='listening';
  const checking=dictation.status==='checking';
  const busy=listening||checking;
  return <section className="liveDictation mx-auto w-full max-w-140 min-w-0 rounded-[28px] border border-primary/12 bg-card/60 px-3 py-3 [@media(max-height:680px)]:py-2 text-left shadow-[0_18px_35px_-30px_rgba(57,76,67,.4)] @min-[560px]/lesson:px-4 @min-[560px]/lesson:py-3.5" aria-label={t('dictationTitle')}>
    <div className="flex min-w-0 items-center gap-3 @min-[560px]/lesson:gap-4">
      <div className="relative isolate grid shrink-0 place-items-center">
        {listening&&<span aria-hidden="true" className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-mic-halo/65 motion-safe:animate-record-halo"/>}
        <Button
          className={cn('dictationAction relative size-17 shrink-0 rounded-full border-[3px] border-card bg-[image:var(--mic-gradient)] p-0 text-mic-foreground shadow-[0_12px_28px_-13px_rgba(74,76,59,.5)] ring-1 ring-primary/15 transition-[transform,box-shadow] duration-200 motion-safe:hover:scale-[1.04] motion-reduce:transform-none [@media(max-height:680px)]:size-16 @min-[560px]/lesson:size-19',!dictation.supported&&!busy&&'opacity-70')}
          onClick={busy?dictation.stop:onStart}
          disabled={!busy&&(blocked||!dictation.supported)}
          aria-label={t(busy?'dictationStop':'dictationStart')}
        >
          {busy?<Square size={22} fill="currentColor" aria-hidden="true"/>:<Mic2 size={29} strokeWidth={1.9} aria-hidden="true"/>}
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <strong className="text-[13px] font-bold tracking-tight text-foreground @min-[560px]/lesson:text-sm">{t('dictationTitle')}</strong>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-4 text-translation-ink" role="status">
            {listening?<><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-mic-halo motion-safe:animate-status-breathe"/>{t('dictationListening')}</>
              :checking?t('dictationChecking')
              :<><AudioLines size={13} className="shrink-0 text-primary" aria-hidden="true"/>{t(dictation.mode==='browser'?'dictationCloudEnabled':'dictationPrivacy')}</>}
          </span>
        </div>
        <div className="dictationTranscript max-h-20 min-h-9 overflow-y-auto rounded-xl bg-muted/55 px-3 py-2 [@media(max-height:680px)]:min-h-8 [@media(max-height:680px)]:py-1.5 text-[13px] leading-5 text-sentence-ink @min-[560px]/lesson:text-sm" data-testid="live-transcript">
          <span aria-live="polite" className={cn('font-medium',!dictation.finalText&&'text-muted-foreground')}>{dictation.finalText||(!dictation.interimText?t('dictationPlaceholder'):'')}</span>
          {dictation.interimText&&<span className="ml-1 text-translation-ink" aria-label={t('dictationInterim')}>{dictation.interimText}</span>}
        </div>
      </div>
    </div>
    {!dictation.supported&&<>
      <p role="status" className="mt-2 hidden text-[11px] leading-4 text-translation-ink @min-[440px]/lesson:block">
        {t(window.voxneloDesktop?(dictation.desktopReason==='missing-model'?'dictationModelMissing':dictation.desktopReason==='missing-addon'?'dictationAddonMissing':'dictationLocalRequired'):'dictationUnsupported')}
      </p>
      <p role="status" className="mt-1 text-[11px] leading-4 text-translation-ink @min-[440px]/lesson:hidden">{t('dictationUnavailableShort')}</p>
    </>
    {listening&&window.voxneloDesktop&&dictation.noiseReduction!=='unknown'&&<p className="mt-2 flex items-center gap-1.5 text-[11px] leading-4 text-translation-ink">
      <ShieldCheck size={13} aria-hidden="true"/>{t(dictation.noiseReduction==='enabled'?'dictationNoiseEnabled':'dictationNoiseUnverified')}
    </p>}
    {dictation.error&&<p role="status" className="mt-2 text-[12px] leading-5 text-translation-ink">{dictation.error}</p>}
    {dictation.localPack==='downloadable'&&dictation.mode==='local'&&<Button variant="outline" size="sm" className="mt-2 min-h-9 rounded-xl text-xs" onClick={()=>void dictation.installLocal()} disabled={checking}>
      <Download size={14}/>{t('dictationInstallPack')}
    </Button>}
    {dictation.supported&&dictation.browserModeAvailable&&!busy&&<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/55 pt-2.5">
      <Button variant="outline" size="sm" className="min-h-9 rounded-xl border-border/75 bg-card/70 px-3 text-xs font-medium" onClick={()=>dictation.chooseMode(dictation.mode==='local'?'browser':'local')}>
        <Globe2 size={14} aria-hidden="true"/>{t(dictation.mode==='local'?'dictationCloudEnable':'dictationCloudDisable')}
      </Button>
      {dictation.mode==='browser'&&<span className="flex items-start gap-1.5 text-[11px] leading-4 text-translation-ink"><ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden="true"/>{t('dictationCloudEnabled')}</span>}
    </div>}
  </section>;
}
