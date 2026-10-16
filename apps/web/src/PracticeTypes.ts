import type { LearningState, LearningStats, Sentence } from '@voxnelo/learning';
import type { useRecorder } from './useRecorder';

/** Stable practice-screen contract shared by the focused visual components. */
export interface PracticeViewProps {
  current: Sentence; currentState: LearningState | undefined; stats: LearningStats;
  speed: 'normal' | 'slow'; showIpa: boolean; notice: string;
  recorder: ReturnType<typeof useRecorder>; recordingBusy: boolean; canGoPrevious: boolean;
  onToggleIpa: () => void; onSpeak: () => void; onToggleSpeed: () => void;
  onRecord: () => void; onToggleFlag: (flag:'favorite'|'review') => void;
  onNext: () => void; onPrevious: () => void; onChooseRelated?: (s:Sentence) => void;
  onDismissNotice: () => void;
}

