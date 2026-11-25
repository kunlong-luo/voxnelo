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
  const webLocalUnavailable=!window.voxneloDesktop&&dictation.mode==='local'&&!dictation.supported;
  const [historyOpen,setHistoryOpen]=useState(false);
  const historyId=useId();
  const focused=focusTranscript(dictation.finalText,dictation.interimText);
  const startFresh=()=>{
    setHistoryOpen(false);
    onStart();
  };
  // The transcript stays a concise latest-phrase viewport; full history is opt-in.
  const transcriptVisible=busy||Boolean(dictation.finalText||dictation.interimText);
  const state=listening?'listening':checking?'checking':dictation.supported?'ready':'unavailable';
  const statusText=listening?t('dictationListening')
    :checking||(!window.voxneloDesktop&&dictation.localPack==='unknown')?t('dictationChecking')
    :!dictation.supported?t('dictationUnavailableShort')
    :t(dictation.mode==='browser'?'dictationCloudEnabled':'dictationPrivacy');
  return <section className="liveDictation mx-auto w-full max-w-192 min-w-0 rounded-[26px] border border-primary/20 bg-card/90 px-3 py-3 text-left shadow-[0_16px_42px_-34px_rgba(63,74,68,.45)] ring-1 ring-white/40 @min-[400px]/lesson:px-4 [@media(max-height:700px)]:py-2 [@media(max-height:680px)]:py-1.5"
    aria-label={t('dictationTitle')} data-testid="dictation-workspace" data-state={state}>
    <div className="flex min-w-0 flex-col gap-2 [@media(max-height:680px)]:gap-1">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <strong className="text-[15px] font-extrabold tracking-tight text-foreground @min-[400px]/lesson:text-base">{t('dictationTitle')}</strong>
          <span className="flex min-w-0 items-center gap-2 text-[11px] leading-4 font-medium text-translation-ink" role="status">
            {listening?<span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary animate-status-breathe"/>:<AudioLines size={14} className="shrink-0 text-primary" aria-hidden="true"/>}
            {statusText}
          </span>
        </div>
        <Button
          data-testid="dictation-primary-action"
          className={cn('dictationAction relative min-h-12 shrink-0 gap-2 rounded-2xl border border-primary/25 bg-[image:var(--mic-gradient)] px-3 text-[12px] font-bold text-mic-foreground shadow-[0_10px_24px_-16px_rgba(103,63,49,.55)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring @min-[400px]/lesson:px-4',busy&&'ring-2 ring-primary/25',webLocalUnavailable&&!busy&&'opacity-65')}
          onClick={busy?dictation.stop:startFresh}
          disabled={!busy&&(blocked||webLocalUnavailable)}
          aria-label={t(busy?'dictationStop':'dictationStart')}
          aria-pressed={busy}
        >
          {busy?<Square size={17} fill="currentColor" aria-hidden="true"/>:<Mic2 size={19} strokeWidth={2} aria-hidden="true"/>}
          <span>{t(busy?'dictationStop':'dictationStart')}</span>
        </Button>
      </div>
      {listening&&dictation.inputLevel!==null&&<div className="flex h-4 items-center justify-center gap-1" role="img" aria-label={t('dictationInputLevel')}>
        {[0.55,0.8,1,0.7,0.45].map((weight,index)=><span key={index} aria-hidden="true" className="h-4 w-1.5 origin-center rounded-full bg-primary/75 transition-transform duration-100 motion-reduce:transition-none" style={{transform:'scaleY('+Math.max(0.18,Math.min(1,(dictation.inputLevel??0)*weight*2.4))+')'}}/>)}
      </div>}
      {transcriptVisible?<div className="dictationTranscript relative min-w-0 rounded-2xl border border-border/70 bg-muted/65 px-3 py-2 text-left"
        data-testid="live-transcript" data-state={state}>
        <div className="mb-1 flex min-h-5 flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-translation-ink">{t(focused.source==='interim'?'dictationCurrentText':'dictationRecentText')}</span>
          {focused.hasHistory&&<Button variant="ghost" size="sm"
            className="h-7 min-h-7 rounded-lg px-2 text-[11px] font-semibold text-primary"
            onClick={()=>setHistoryOpen(value=>!value)}
            aria-expanded={historyOpen} aria-controls={historyId}>
            <History size={13} aria-hidden="true"/>{t(historyOpen?'dictationHideHistory':'dictationShowHistory')}
          </Button>}
        </div>
        <p aria-live="polite" aria-label={t(focused.source==='interim'?'dictationCurrentText':'dictationRecentText')}
          className={cn('max-h-16 min-h-5 overflow-hidden break-words text-sm font-semibold leading-6 text-sentence-ink @min-[400px]/lesson:text-base',focused.source==='empty'&&'font-normal text-muted-foreground')}>
          {focused.source==='empty'?t('dictationPlaceholder'):formatAsrTranscriptForDisplay(focused.text)}
        </p>
      </div>:<p className="text-xs leading-4 text-translation-ink [@media(max-height:700px)]:hidden" data-testid="dictation-empty-hint">{t('dictationPlaceholder')}</p>}
      {historyOpen&&focused.hasHistory&&<div id={historyId} role="region" aria-label={t('dictationHistoryLabel')}
        className="w-full min-w-0 rounded-xl border border-border/60 bg-card p-3 text-left text-xs leading-5 text-translation-ink">
        <p className="mb-1 font-bold text-foreground">{t('dictationHistoryLabel')}</p>
        <p data-testid="dictation-history" className="max-h-32 overflow-y-auto break-words" tabIndex={0}>
          {formatAsrTranscriptForDisplay(dictation.finalText)}
        </p>
      </div>}
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
      className="mt-1 inline-flex min-h-9 items-center rounded-xl px-3 py-1 text-[11px] font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >{t('dictationHelp')}</a>}
    {listening&&window.voxneloDesktop&&dictation.noiseReduction!=='unknown'&&<p className="mt-2 flex items-center gap-1.5 text-[11px] leading-4 text-translation-ink">
      <ShieldCheck size={13} aria-hidden="true"/>{t(dictation.noiseReduction==='not-requested'?'dictationNoiseNotRequested':dictation.noiseReduction==='enabled'?'dictationNoiseEnabled':'dictationNoiseUnverified')}
    </p>}
    {dictation.error&&<p role="status" className="mt-2 text-[12px] leading-5 text-translation-ink">{dictation.error}</p>}
    {!busy&&!dictation.supported&&onManageModels&&<Button variant="ghost" size="sm"
      className="mt-1 min-h-9 rounded-xl border border-primary/30 bg-secondary px-3 text-xs font-bold text-primary"
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
