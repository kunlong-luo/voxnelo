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
  const inactive=!dictation.supported&&!busy;
  return <section className="liveDictation mx-auto w-full max-w-140 min-w-0 rounded-[28px] border border-glass-edge bg-card/55 transition-[background-color,border-color,box-shadow] duration-500 ease-out hover:border-primary/25 hover:bg-card/60 px-3 py-3 [@media(max-height:680px)]:py-2 text-left shadow-[0_18px_45px_-32px_rgba(120,73,47,.28)] backdrop-blur-sm @min-[400px]/lesson:border-transparent @min-[400px]/lesson:bg-transparent @min-[400px]/lesson:shadow-none @min-[400px]/lesson:px-4 @min-[400px]/lesson:py-2" aria-label={t('dictationTitle')}>
    <div className="flex min-w-0 items-center gap-2 @min-[400px]/lesson:flex-col @min-[400px]/lesson:gap-2">
      <div className="relative isolate grid shrink-0 place-items-center transition-transform duration-500 ease-out hover:-translate-y-0.5">
        {/* A calm ambient light, NOT a fake live audio waveform. */}
        <span aria-hidden="true" data-motion="mic-breathe" className="pointer-events-none absolute -inset-7 rounded-full bg-primary/35 blur-2xl animate-ambient-breathe [animation-delay:-2s]"/>
        <span aria-hidden="true" data-motion="mic-halo" className="pointer-events-none absolute -inset-3 rounded-full border-[2px] border-primary/55 shadow-[0_0_32px_5px_var(--canvas-glow)] animate-record-halo [animation-duration:3s]"/>
        {listening&&<><span aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-full border-2 border-primary/75 animate-live-pulse"/><span aria-hidden="true" className="pointer-events-none absolute -inset-5 rounded-full border border-mic-halo/60 animate-live-pulse [animation-delay:-1s]"/></>}
        <Button
          className={cn('dictationAction relative size-17 shrink-0 rounded-full border-[3px] border-white/85 bg-[image:var(--mic-gradient)] p-0 text-mic-foreground shadow-[0_18px_32px_-14px_rgba(120,73,47,.55),inset_0_2px_2px_rgba(255,255,255,.4)] ring-1 ring-primary/25 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:scale-[1.05] active:translate-y-0 active:scale-[.97]  [@media(max-height:700px)]:size-16 @min-[400px]/lesson:size-20',inactive&&'opacity-80 saturate-75')}
          onClick={busy?dictation.stop:onStart}
          disabled={!busy&&(blocked||!dictation.supported)}
          aria-label={t(busy?'dictationStop':'dictationStart')}
        >
          {busy?<Square size={22} fill="currentColor" aria-hidden="true"/>:<Mic2 size={29} strokeWidth={1.9} aria-hidden="true"/>}
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 @min-[400px]/lesson:w-full @min-[400px]/lesson:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 @min-[400px]/lesson:justify-center">
          <strong className="text-[13px] font-bold tracking-tight text-foreground @min-[400px]/lesson:text-sm">{t('dictationTitle')}</strong>
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-4 text-translation-ink" role="status">
            {listening?<><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-mic-halo animate-status-breathe"/>{t('dictationListening')}</>
              :checking?t('dictationChecking')
              :<><AudioLines size={13} className="shrink-0 text-primary" aria-hidden="true"/>{t(dictation.mode==='browser'?'dictationCloudEnabled':'dictationPrivacy')}</>}
          </span>
        </div>
        {listening&&dictation.inputLevel!==null&&<div className="flex h-6 items-center justify-center gap-1" role="img" aria-label="Live microphone input level">
          {[0.55,0.8,1,0.7,0.45].map((weight,index)=><span key={index} aria-hidden="true" className="h-5 w-1.5 origin-center rounded-full bg-primary/75 transition-transform duration-100 motion-reduce:transition-none" style={{transform:`scaleY(${Math.max(0.18,Math.min(1,(dictation.inputLevel??0)*weight*2.4))})`}}/>)}
        </div>}
        <div className="dictationTranscript max-h-20 min-h-9 w-full overflow-y-auto rounded-xl bg-muted/55 @min-[400px]/lesson:max-w-110 @min-[400px]/lesson:text-center px-3 py-2 [@media(max-height:680px)]:min-h-8 [@media(max-height:680px)]:py-1.5 text-[13px] leading-5 text-sentence-ink @min-[400px]/lesson:text-sm" data-testid="live-transcript" data-state={listening?'listening':checking?'checking':'idle'}>
          <span aria-live="polite" className={cn('font-medium',!dictation.finalText&&'text-muted-foreground')}>{dictation.finalText||(!dictation.interimText?t('dictationPlaceholder'):'')}</span>
          {dictation.interimText&&<span className="ml-1 text-translation-ink animate-view-enter" aria-label={t('dictationInterim')}>{dictation.interimText}</span>}
        </div>
      </div>
    </div>
    {!dictation.supported&&<>
      <p role="status" className="mt-2 hidden text-[11px] leading-4 text-translation-ink @min-[440px]/lesson:block @min-[400px]/lesson:text-center">
        {t(window.voxneloDesktop?(dictation.desktopReason==='missing-model'?'dictationModelMissing':dictation.desktopReason==='missing-addon'?'dictationAddonMissing':'dictationLocalRequired'):'dictationUnsupported')}
      </p>
      <p role="status" className="mt-1 text-[11px] leading-4 text-translation-ink @min-[440px]/lesson:hidden">{t('dictationUnavailableShort')}</p>
    </>}
    {!dictation.supported&&window.voxneloDesktop?.platform==='linux'&&<p className="mt-2 text-[11px] leading-5 text-translation-ink" role="status">
      {t('dictationPersonalSetup')}
      <code className="mt-1 block select-text rounded-lg bg-muted/70 px-2 py-1.5 font-mono text-[11px] text-foreground">pnpm asr:personal:install</code>
    </p>}
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
