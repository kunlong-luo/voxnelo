import { VolumeX, X } from 'lucide-react';
import type { PracticeViewProps } from './PracticeTypes';
import { PracticeCard } from './PracticeCard';
import { PracticeSidebarWidgets } from './PracticeSidebarWidgets';
import { useI18n } from './i18n';
import { Button } from './components/ui/button';

/** Composition only: keep practice, controls and side information independent. */
export function PracticeView({current,currentState,stats,speed,showIpa,notice,recorder,dictation,recordingBusy,
  canGoPrevious,onStartDictation,onToggleIpa,onSpeak,onToggleSpeed,onRecord,onToggleFlag,onNext,onPrevious,
  onChooseRelated,onDismissNotice}:PracticeViewProps) {
  const {t}=useI18n();
  return <div className="practiceLayout layoutWorkbench grid min-w-0 grid-cols-1 items-start gap-5 @min-[1250px]/workspace:items-stretch [@media(max-height:849px)]:items-start animate-view-enter @min-[840px]/workspace:grid-cols-[minmax(0,1fr)_minmax(230px,28%)] @min-[1040px]/workspace:gap-7 @min-[1200px]/workspace:gap-9">
    <div className="practiceColumn flex min-w-0 flex-col gap-5 @min-[1250px]/workspace:self-stretch [@media(max-height:849px)]:self-auto">
      <PracticeCard current={current} currentState={currentState} speed={speed} showIpa={showIpa}
        recorder={recorder} dictation={dictation} recordingBusy={recordingBusy} canGoPrevious={canGoPrevious} onStartDictation={onStartDictation}
        onToggleIpa={onToggleIpa} onSpeak={onSpeak} onToggleSpeed={onToggleSpeed}
        onRecord={onRecord} onToggleFlag={onToggleFlag} onNext={onNext} onPrevious={onPrevious}/>
      {notice && <div className="notice flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-foreground shadow-sm" role="status">
        <span className="flex items-center gap-2"><VolumeX size={17}/>{notice}</span>
        <Button variant="ghost" size="icon-sm" onClick={onDismissNotice} aria-label={t('closeNotice')}><X size={15}/></Button>
      </div>}
    </div>
    <PracticeSidebarWidgets current={current} stats={stats} recordingBusy={recordingBusy} onChooseRelated={onChooseRelated}/>
  </div>;
}
