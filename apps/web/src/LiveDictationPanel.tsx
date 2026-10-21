import { useId, useState } from 'react';
import { AudioLines, Globe2, History, Mic2, ShieldCheck, Square, HardDriveDownload } from 'lucide-react';
import type { useLiveDictation } from './useLiveDictation';
import { useI18n } from './i18n';
import { SUPPORT_LINKS } from '@voxnelo/learning';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { formatAsrTranscriptForDisplay } from './dictation/formatTranscript';
import { focusTranscript } from './dictation/transcriptFocus';

interface Props {
  dictation: ReturnType<typeof useLiveDictation>;
  blocked: boolean;
  onStart: () => void;
  onManageModels?:(()=>void)|undefined;
}

/**
 * U3's hero microphone belongs to live dictation, not the secondary recorder.
 * A single quiet surface groups the actual transcript with its one main action.
 */
export function LiveDictationPanel({dictation,blocked,onStart,onManageModels}:Props) {
  const {t}=useI18n();
  const listening=dictation.status==='listening';
  const checking=dictation.status==='checking';
  const busy=listening||checking;
  const inactive=!dictation.supported&&!busy;
  const webLocalUnavailable=!window.voxneloDesktop&&dictation.mode==='local'&&!dictation.supported;
  const [historyOpen,setHistoryOpen]=useState(false);
  const historyId=useId();
  const focused=focusTranscript(dictation.finalText,dictation.interimText);
  const startFresh=()=>{
    setHistoryOpen(false);
    onStart();
  };
  return <section className="liveDictation mx-auto w-full max-w-140 min-w-0 rounded-[28px] border border-glass-edge bg-card/55 transition-[background-color,border-color,box-shadow] duration-500 ease-out hover:border-primary/25 hover:bg-card/60 px-3 py-3 [@media(max-height:680px)]:py-1 text-left shadow-[0_18px_45px_-32px_rgba(120,73,47,.28)] backdrop-blur-sm @min-[400px]/lesson:border-transparent @min-[400px]/lesson:bg-transparent @min-[400px]/lesson:shadow-none @min-[400px]/lesson:px-4 @min-[400px]/lesson:py-2" aria-label={t('dictationTitle')}>
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div className="relative isolate grid shrink-0 place-items-center transition-transform duration-500 ease-out hover:-translate-y-0.5">
        {/* A calm ambient light, NOT a fake live audio waveform. */}
        <span aria-hidden="true" data-motion="mic-breathe" className="pointer-events-none absolute -inset-4 rounded-full bg-primary/25 blur-2xl animate-ambient-breathe [animation-delay:-2s]"/>
        <span aria-hidden="true" data-motion="mic-halo" className="pointer-events-none absolute -inset-2 rounded-full border border-primary/55 shadow-[0_0_32px_5px_var(--canvas-glow)] animate-record-halo [animation-duration:3s]"/>
        {listening&&<><span aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-full border-2 border-primary/75 animate-live-pulse"/><span aria-hidden="true" className="pointer-events-none absolute -inset-5 rounded-full border border-mic-halo/60 animate-live-pulse [animation-delay:-1s]"/></>}
        <Button
          className={cn('dictationAction relative size-12 shrink-0 rounded-full border-[3px] border-white/85 bg-[image:var(--mic-gradient)] p-0 text-mic-foreground shadow-[0_18px_32px_-14px_rgba(120,73,47,.55),inset_0_2px_2px_rgba(255,255,255,.4)] ring-1 ring-primary/25 transition-[transform,box-shadow] duration-200 hover:scale-[1.03] active:translate-y-0 active:scale-[.97]  [@media(max-height:700px)]:size-12 @min-[400px]/lesson:size-13',inactive&&'opacity-80 saturate-75')}
          onClick={busy?dictation.stop:startFresh}
          disabled={!busy&&(blocked||webLocalUnavailable)}
          aria-label={t(busy?'dictationStop':'dictationStart')}
        >
          {busy?<Square size={16} fill="currentColor" aria-hidden="true"/>:<Mic2 size={20} strokeWidth={1.9} aria-hidden="true"/>}
        </Button>
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
          <strong className="text-[13px] font-bold tracking-tight text-foreground @min-[400px]/lesson:text-sm">{t('dictationTitle')}</strong>
          {dictation.browserModeAvailable&&!busy&&<Button variant="ghost" size="sm"
            className="hidden h-6 rounded-lg px-1 py-0 text-[10px] font-semibold text-primary underline-offset-2 max-[399px]:inline-flex hover:underline"
            aria-label={t(dictation.mode==='local'?'dictationCloudEnable':'dictationCloudDisable')}
            onClick={()=>dictation.chooseMode(dictation.mode==='local'?'browser':'local')}>
            {t(dictation.mode==='local'?'dictationCloudEnableShort':'dictationCloudDisable')}
          </Button>}
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-4 text-translation-ink" role="status">
            {listening?<><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-mic-halo animate-status-breathe"/>{t('dictationListening')}</>
              :checking||(!window.voxneloDesktop&&dictation.localPack==='unknown')?t('dictationChecking')
              :<><AudioLines size={13} className="shrink-0 text-primary" aria-hidden="true"/>{t(dictation.mode==='browser'?'dictationCloudEnabled':'dictationPrivacy')}</>}
          </span>
        </div>
        {listening&&dictation.inputLevel!==null&&<div className="flex h-6 items-center justify-center gap-1" role="img" aria-label="Live microphone input level">
          {[0.55,0.8,1,0.7,0.45].map((weight,index)=><span key={index} aria-hidden="true" className="h-5 w-1.5 origin-center rounded-full bg-primary/75 transition-transform duration-100 motion-reduce:transition-none" style={{transform:`scaleY(${Math.max(0.18,Math.min(1,(dictation.inputLevel??0)*weight*2.4))})`}}/>)}
        </div>}
        {(busy||dictation.finalText||dictation.interimText)&&<>
          <div className="dictationTranscript relative min-h-9 w-full max-w-110 min-w-0 rounded-xl bg-muted/55 px-3 py-1.5 text-center text-[13px] leading-5 text-sentence-ink @min-[400px]/lesson:text-sm"
            data-testid="live-transcript" data-state={listening?'listening':checking?'checking':'idle'}>
            <div className="flex min-h-5 items-center justify-center gap-2">
              <span className="text-[10px] font-semibold text-translation-ink">{t(focused.source==='interim'?'dictationCurrentText':'dictationRecentText')}</span>
              {focused.hasHistory&&<Button variant="ghost" size="sm"
                className="h-6 min-h-6 rounded-md px-1.5 py-0 text-[10px] font-medium text-primary"
                onClick={()=>setHistoryOpen(value=>!value)}
                aria-expanded={historyOpen} aria-controls={historyId}>
                <History size={12} aria-hidden="true"/>{t(historyOpen?'dictationHideHistory':'dictationShowHistory')}
              </Button>}
            </div>
            <p aria-live="polite" aria-label={t(focused.source==='interim'?'dictationCurrentText':'dictationRecentText')}
              className={cn('max-h-12 overflow-hidden break-words font-semibold leading-5',focused.source==='empty'&&'font-normal text-muted-foreground')}>
              {focused.source==='empty'?t('dictationPlaceholder'):formatAsrTranscriptForDisplay(focused.text)}
            </p>
          </div>
          {historyOpen&&focused.hasHistory&&<div id={historyId} role="region" aria-label={t('dictationHistoryLabel')}
            className="w-full max-w-110 min-w-0 rounded-xl border border-border/60 bg-card/80 p-3 text-left text-xs leading-5 text-translation-ink">
            <p className="mb-1 font-bold text-foreground">{t('dictationHistoryLabel')}</p>
            <p data-testid="dictation-history" className="max-h-32 overflow-y-auto break-words" tabIndex={0}>
              {formatAsrTranscriptForDisplay(dictation.finalText)}
            </p>
          </div>}
        </>}
      </div>
    </div>
    {!dictation.supported&&<>
      <p role="status" className="mt-2 hidden text-[11px] leading-4 text-translation-ink @min-[440px]/lesson:block @min-[400px]/lesson:text-center">
        {t(window.voxneloDesktop?(dictation.desktopReason==='invalid-personal-pack'?'dictationModelInvalid':dictation.desktopReason==='missing-model'?'dictationModelMissing':dictation.desktopReason==='missing-addon'?'dictationAddonMissing':'dictationLocalRequired'):dictation.browserModeAvailable?'dictationLocalRequired':'dictationUnsupported')}
      </p>
      <p role="status" className={cn('mt-1 text-[11px] leading-4 text-translation-ink @min-[440px]/lesson:hidden',webLocalUnavailable&&dictation.browserModeAvailable&&'max-[399px]:hidden')}>{t(!window.voxneloDesktop&&dictation.browserModeAvailable?'dictationLocalRequired':'dictationUnavailableShort')}</p>
    </>}
    {!dictation.supported&&window.voxneloDesktop&&<a
      href={SUPPORT_LINKS.guide}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex min-h-8 items-center rounded-xl px-3 py-1 [@media(max-height:780px)]:hidden text-[11px] font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >{t('dictationHelp')}</a>}
    {listening&&window.voxneloDesktop&&dictation.noiseReduction!=='unknown'&&<p className="mt-2 flex items-center gap-1.5 text-[11px] leading-4 text-translation-ink">
      <ShieldCheck size={13} aria-hidden="true"/>{t(dictation.noiseReduction==='not-requested'?'dictationNoiseNotRequested':dictation.noiseReduction==='enabled'?'dictationNoiseEnabled':'dictationNoiseUnverified')}
    </p>}
    {dictation.error&&<p role="status" className="mt-2 text-[12px] leading-5 text-translation-ink">{dictation.error}</p>}
    {!busy&&!dictation.supported&&onManageModels&&<Button variant="ghost" size="sm"
      className="mt-1 h-8 rounded-lg px-2 text-[11px] font-semibold text-primary [@media(max-height:780px)]:hidden"
      onClick={onManageModels}>
      <HardDriveDownload size={14} aria-hidden="true"/>{t('modelOpenAction')}
    </Button>}
    {dictation.browserModeAvailable&&!busy&&<div className="mt-0.5 flex items-center justify-center max-[399px]:hidden">
      <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 py-0 text-[11px] font-semibold text-primary underline-offset-2 hover:underline" onClick={()=>dictation.chooseMode(dictation.mode==='local'?'browser':'local')}
        aria-label={t(dictation.mode==='local'?'dictationCloudEnable':'dictationCloudDisable')}>
        <Globe2 size={13} aria-hidden="true"/>{t(dictation.mode==='local'?'dictationCloudEnableShort':'dictationCloudDisable')}
      </Button>
    </div>}
  </section>;
}
