import { useEffect, useRef, useState } from 'react';
import { VolumeX, X } from 'lucide-react';
import type { PracticeViewProps } from './PracticeTypes';
import { PracticeCard } from './PracticeCard';
import { PracticeSidebarWidgets } from './PracticeSidebarWidgets';
import { useI18n } from './i18n';
import { Button } from './components/ui/button';

/** Composition only: keep practice, controls and side information independent. */
export function PracticeView({current,currentState,stats,speed,showIpa,notice,recorder,dictation,recordingBusy,
  canGoPrevious,onStartDictation,onManageModels,onToggleIpa,onSpeak,onToggleSpeed,onRecord,onToggleFlag,onNext,onPrevious,
  onChooseRelated,onDismissNotice}:PracticeViewProps) {
  const {t}=useI18n();
  const layoutRef=useRef<HTMLDivElement>(null);
  const [alignFullHeight,setAlignFullHeight]=useState(false);
  useEffect(()=>{
    const grid=layoutRef.current;
    const insights=grid?.querySelector<HTMLElement>('.referenceInsights');
    if(!grid||!insights)return;
    const update=()=>{
      const columns=getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length;
      const rail=insights.getBoundingClientRect();
      // Avoid stretching the lesson beyond the first screen when the insights
      // stack is taller than the window (particularly at medium widths).
      const fits=columns>=2&&rail.height>0&&rail.top>=0&&rail.bottom<=window.innerHeight-12;
      setAlignFullHeight(previous=>previous===fits?previous:fits);
    };
    update();
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(update):null;
    observer?.observe(insights);
    window.addEventListener('resize',update);
    return ()=>{observer?.disconnect();window.removeEventListener('resize',update);};
  },[]);
  return <div ref={layoutRef} className={`practiceLayout layoutWorkbench grid min-w-0 grid-cols-1 gap-5 animate-view-enter @min-[840px]/workspace:grid-cols-[minmax(0,1fr)_minmax(230px,28%)] @min-[1040px]/workspace:gap-7 @min-[1200px]/workspace:gap-9 ${alignFullHeight?'items-stretch':'items-start'}`}>
    <div className={`practiceColumn flex min-w-0 flex-col gap-5 ${alignFullHeight?'self-stretch':''}`}>
      <PracticeCard current={current} currentState={currentState} speed={speed} showIpa={showIpa}
        recorder={recorder} dictation={dictation} recordingBusy={recordingBusy} canGoPrevious={canGoPrevious} onStartDictation={onStartDictation} onManageModels={onManageModels}
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
