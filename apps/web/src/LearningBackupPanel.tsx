import { useRef, useState } from 'react';
import { Download, FileJson2, RotateCcw, ShieldAlert, Upload } from 'lucide-react';
import {
  exportLearningBackup, parseLearningBackup, restoreLearningBackup,
  LearningBackupError, MAX_BACKUP_BYTES,
  type LearningBackup, type BackupErrorCode,
} from '@voxnelo/learning';
import { useI18n, type TranslationKey } from './i18n';
import { Button } from './components/ui/button';

const errors: Record<BackupErrorCode, TranslationKey> = {
  'invalid-file':'backupInvalidFile',
  'unsupported-version':'backupUnsupported',
  'invalid-records':'backupInvalidRecords',
  'too-large':'backupTooLarge',
  'storage-failed':'backupStorageFailed',
};

/** System file chooser + explicit in-app preview and confirmation.
 * No remote account, upload endpoint, clipboard copy or OS-native confirm. */
export function LearningBackupPanel({onRestored}: {onRestored?: (()=>Promise<void>)|undefined}) {
  const {t} = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview,setPreview] = useState<LearningBackup|null>(null);
  const [confirmed,setConfirmed] = useState(false);
  const [working,setWorking] = useState(false);
  const [message,setMessage] = useState<{key:TranslationKey;error:boolean}|null>(null);

  const showError = (error:unknown) => {
    const code:BackupErrorCode = error instanceof LearningBackupError ? error.code : 'storage-failed';
    setMessage({key:errors[code],error:true});
  };

  const download = async () => {
    if(working)return;
    setWorking(true);
    setMessage(null);
    try{
      const data=await exportLearningBackup();
      const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
      try{
        const anchor=document.createElement('a');
        anchor.href=url;
        anchor.download='voxnelo-learning-backup-'+new Date().toISOString().slice(0,10)+'.json';
        anchor.style.display='none';
        document.body.appendChild(anchor);
        try { anchor.click(); } finally { anchor.remove(); }
      }finally{
        // Let the browser finish resolving the download before releasing the URL.
        window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
      setMessage({key:'backupDownloadStarted',error:false});
    }catch(error){showError(error);}
    finally{setWorking(false);}
  };

  const selectFile=async (file:File|undefined) => {
    setPreview(null);
    setConfirmed(false);
    setMessage(null);
    if(!file)return;
    if(file.size>MAX_BACKUP_BYTES){setMessage({key:'backupTooLarge',error:true});return;}
    setWorking(true);
    try{
      const data=await file.text();
      setPreview(parseLearningBackup(data));
    }catch(error){showError(error);}
    finally{setWorking(false);}
  };

  const restore=async () => {
    if(!preview||!confirmed||working)return;
    setWorking(true);
    setMessage(null);
    try {
      await restoreLearningBackup(preview);
      await onRestored?.();
      setPreview(null);
      setConfirmed(false);
      if(inputRef.current)inputRef.current.value='';
      setMessage({key:'backupRestored',error:false});
    }catch(error){showError(error);}
    finally{setWorking(false);}
  };

  return <div className="flex min-w-0 flex-col gap-3">
    <p className="text-xs leading-6 text-muted-foreground">{t('backupDescription')}</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="min-h-10 rounded-xl" onClick={()=>void download()} disabled={working}>
        <Download size={16} aria-hidden="true"/>{t('backupExport')}
      </Button>
      <Button variant="outline" className="min-h-10 rounded-xl" onClick={()=>inputRef.current?.click()} disabled={working}>
        <Upload size={16} aria-hidden="true"/>{t('backupChoose')}
      </Button>
      <input ref={inputRef} className="sr-only" type="file" accept=".json,application/json"
        aria-label={t('backupFile')} onChange={event=>void selectFile(event.target.files?.[0])}/>
    </div>
    {preview&&<div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border/70 bg-background/65 p-3" role="region" aria-label={t('backupPreviewTitle')}>
      <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <FileJson2 size={16} aria-hidden="true"/>{t('backupPreviewTitle')}
      </p>
      <p className="text-xs text-muted-foreground">
        {t('backupPreviewCounts',{states:preview.states.length,events:preview.events.length})}
      </p>
      <p className="flex gap-2 text-xs leading-5 text-foreground">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true"/>
        {t('backupReplaceWarning')}
      </p>
      <Button size="sm" variant={confirmed?'soft':'outline'} className="min-h-9 h-auto justify-start whitespace-normal rounded-xl text-left"
        aria-pressed={confirmed} onClick={()=>setConfirmed(value=>!value)} disabled={working}>
        {confirmed?<RotateCcw size={15} aria-hidden="true"/>:<ShieldAlert size={15} aria-hidden="true"/>}
        {t('backupConfirmReplace')}
      </Button>
      <Button variant="default" size="sm" className="min-h-10 w-fit rounded-xl" onClick={()=>void restore()}
        disabled={!confirmed||working}>
        <RotateCcw size={16} aria-hidden="true"/>{t('backupRestore')}
      </Button>
    </div>}
    <p className="text-[11px] leading-5 text-muted-foreground">{t('backupPrivacy')}</p>
    {message&&<p role="status" aria-live="polite"
      className={message.error?'text-xs text-destructive':'text-xs text-primary'}>{t(message.key)}</p>}
  </div>;
}
