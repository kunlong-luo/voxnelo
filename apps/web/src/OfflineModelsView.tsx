import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleHelp, Download, HardDriveDownload, RefreshCcw, ShieldCheck } from 'lucide-react';
import { SUPPORT_LINKS } from '@voxnelo/learning';
import type { useLiveDictation } from './useLiveDictation';
import { useI18n } from './i18n';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';

interface OfflineModelsViewProps {
  dictation:ReturnType<typeof useLiveDictation>;
  onBack:()=>void;
}

/**
 * Model setup is deliberately separate from the live microphone controls.
 * Browser on-device packs can be installed only by a direct user gesture.
 * Desktop packages remain gated by native licensing and verification; never
 * pretend that SpeechRecognition.install() can provision an Electron model.
 */
export function OfflineModelsView({dictation,onBack}:OfflineModelsViewProps){
  const {t}=useI18n();
  const desktop=Boolean(window.voxneloDesktop);
  const [refreshing,setRefreshing]=useState(false);
  const [installing,setInstalling]=useState(false);
  const {refreshLocal}=dictation;
  useEffect(()=>{
    // A model can be installed in another tab or while Electron is open.
    void refreshLocal();
    // Refresh when this page mounts; do not cancel an active dictation session.
  },[refreshLocal]);
  const refresh=async()=>{
    if(refreshing||installing)return;
    setRefreshing(true);
    try{await dictation.refreshLocal();}finally{setRefreshing(false);}
  };
  const install=async()=>{
    if(desktop||installing||dictation.localPack!=='downloadable')return;
    setInstalling(true);
    try{
      await dictation.installLocal();
      // A successful download response is not proof that the on-device
      // recognizer is ready; ask the browser again before claiming success.
      await dictation.refreshLocal();
    }finally{setInstalling(false);}
  };
  const ready=dictation.localPack==='available';
  const checking=refreshing||dictation.localPack==='unknown';
  const state=checking?'modelStateChecking':ready?'modelStateReady'
    :!desktop&&dictation.localPack==='downloading'?'modelStateDownloading'
    :!desktop&&dictation.localPack==='downloadable'?'modelStateDownloadable':'modelStateUnavailable';
  const canInstall=!desktop&&dictation.localPack==='downloadable'&&!refreshing&&!installing;
  return <div className="offlineModelsPage mx-auto flex w-full max-w-210 flex-col gap-5 pb-8 animate-view-enter">
    <header className="relative overflow-hidden rounded-[28px] border border-glass-edge bg-glass-surface px-5 py-6 shadow-glass backdrop-blur-[var(--glass-blur)] sm:px-8">
      <div className="pointer-events-none absolute -right-20 -top-18 size-52 rounded-full bg-brand-mist/35 blur-3xl" aria-hidden="true"/>
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-120 flex-col gap-2">
          <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase"><HardDriveDownload size={16}/>{t('modelEyebrow')}</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t('modelTitle')}</h1>
          <p className="text-sm leading-6 text-translation-ink">{t('modelIntro')}</p>
        </div>
        <Button variant="outline" size="sm" className="backPractice rounded-xl" onClick={onBack}>
          <ArrowLeft size={16}/>{t('backPractice')}
        </Button>
      </div>
    </header>
    <Card className="flex flex-col gap-4 rounded-[26px] border-border/70 bg-card/85 p-5 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><HardDriveDownload size={23}/></span>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-foreground">{t('modelEnglish')}</h2>
            <p className="text-xs text-muted-foreground">{t(desktop?'modelDesktopSource':'modelBrowserSource')}</p>
          </div>
        </div>
        <Badge className="rounded-full px-3 py-1 text-xs" data-testid="model-status">
          {ready&&<CheckCircle2 size={14} aria-hidden="true"/>}{t(state)}
        </Badge>
      </div>
      <p role="status" className="text-sm leading-6 text-translation-ink">
        {ready?t('modelReadyDescription')
          :checking?t('modelCheckingDescription')
          :desktop?t(dictation.desktopReason==='invalid-personal-pack'?'modelDesktopInvalid':'modelDesktopUnavailable')
          :dictation.localPack==='downloading'?t('modelDownloadingDescription')
          :dictation.localPack==='downloadable'?t('modelDownloadDescription')
          :t('modelBrowserUnavailable')}
      </p>
      {dictation.error&&<p role="alert" className="rounded-xl bg-muted px-3 py-2 text-sm text-translation-ink">{dictation.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {canInstall&&<Button className="min-h-10 rounded-xl px-4" onClick={()=>void install()}>
          <Download size={16}/>{t('modelDownloadAction')}
        </Button>}
        {installing&&<Button className="min-h-10 rounded-xl px-4" disabled>
          <Download size={16}/>{t('modelInstalling')}
        </Button>}
        <Button variant="outline" className="min-h-10 rounded-xl" onClick={()=>void refresh()} disabled={refreshing||installing||dictation.active}>
          <RefreshCcw size={16}/>{t('modelRefreshAction')}
        </Button>
        {ready&&<Button variant="ghost" className="min-h-10 rounded-xl" onClick={onBack}>{t('modelReturnAction')}</Button>}
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-secondary/40 px-4 py-3 text-xs leading-5 text-translation-ink">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-primary"/>
        <span>{t(desktop?'modelDesktopPrivacy':'modelBrowserPrivacy')}</span>
      </div>
    </Card>
    {desktop&&<Card className="flex flex-col gap-3 rounded-[26px] border-border/70 bg-card/85 p-5 shadow-soft sm:p-7">
      <h2 className="text-base font-bold text-foreground">{t('dictationCaptureTitle')}</h2>
      <p className="text-xs leading-5 text-translation-ink">{t('dictationCaptureNote')}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('dictationCaptureTitle')}>
        <Button variant={dictation.captureProfile==='conversation'?'default':'outline'}
          className="min-h-10 rounded-xl" disabled={dictation.active}
          aria-pressed={dictation.captureProfile==='conversation'}
          onClick={()=>dictation.chooseCaptureProfile('conversation')}>
          {t('dictationCaptureConversation')}
        </Button>
        <Button variant={dictation.captureProfile==='external-playback'?'default':'outline'}
          className="min-h-10 rounded-xl" disabled={dictation.active}
          aria-pressed={dictation.captureProfile==='external-playback'}
          onClick={()=>dictation.chooseCaptureProfile('external-playback')}>
          {t('dictationCaptureExternal')}
        </Button>
      </div>
    </Card>}
    <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-4 text-xs leading-5 text-translation-ink">
      <CircleHelp size={18} className="mt-0.5 shrink-0 text-primary"/>
      <div className="flex flex-col gap-2">
        <strong className="text-sm text-foreground">{t('modelManageNoteTitle')}</strong>
        <span>{t(desktop?'modelDesktopManageNote':'modelBrowserManageNote')}</span>
        <a href={SUPPORT_LINKS.guide} rel="noopener noreferrer" target="_blank" className="font-semibold text-primary underline underline-offset-4">{t('dictationHelp')}</a>
      </div>
    </div>
  </div>;
}
