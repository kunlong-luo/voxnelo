// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FIRST_SENTENCE } from '@voxnelo/content';
import type { useRecorder } from '../apps/web/src/useRecorder';
import { PracticeView } from '../apps/web/src/PracticeView';
import { SettingsView } from '../apps/web/src/SettingsView';

afterEach(cleanup);

const dictation = {
  status:'idle' as const,active:false,mode:'local' as const,chooseMode:()=>undefined,offlineEngine:'zipformer' as const,
    chooseOfflineEngine:()=>undefined,engineAvailability:{zipformer:false,moonshineMedium:false},captureProfile:'conversation' as const,chooseCaptureProfile:()=>undefined,
  supported:false,browserModeAvailable:true,desktopReason:'not-configured' as const,noiseReduction:'unknown' as const,localPack:'unknown' as const,finalText:'',
  interimText:'',inputLevel:null,error:'',start:async()=>undefined,stop:()=>undefined,
  clear:()=>undefined,installLocal:async()=>undefined,refreshLocal:async()=>undefined,
};
function stubRecorder() {
  return {
    status: 'idle' as const,
    recordingUrl: null,
    error: null,
    start: async () => undefined,
    stop: () => undefined,
    clearAudio: () => undefined,
  } as ReturnType<typeof useRecorder>;
}

describe('Nordic three-column learning workspace', () => {
  it('shows real related sentences and lets learners navigate them', () => {
    const onChooseRelated = vi.fn();
    const { container } = render(
      <PracticeView current={FIRST_SENTENCE} currentState={undefined}
        stats={{ viewed: 1, practiced: 0, favorites: 0, review: 0 }}
        speed="normal" showIpa notice="" recorder={stubRecorder()} dictation={dictation} onStartDictation={()=>undefined}
        recordingBusy={false} canGoPrevious={false}
        onToggleIpa={() => undefined} onSpeak={() => undefined}
        onToggleSpeed={() => undefined} onRecord={() => undefined}
        onToggleFlag={() => undefined} onNext={() => undefined}
        onPrevious={() => undefined} onDismissNotice={() => undefined}
        onChooseRelated={onChooseRelated}
      />,
    );
    expect(screen.getByText('相关表达')).toBeTruthy();
    expect(screen.getByText('相关场景')).toBeTruthy();
    expect(screen.getByText('1 / 280 句')).toBeTruthy();
    expect(container.querySelector('.liveDictation')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '练习短句：Hi!' }));
    expect(onChooseRelated).toHaveBeenCalledWith(expect.objectContaining({ english: 'Hi!' }));
    fireEvent.click(screen.getByRole('button', { name: '练习场景：自我介绍' }));
    expect(onChooseRelated).toHaveBeenCalledWith(expect.objectContaining({ topic: 'personal' }));
  });

  it('centers the four practice actions and gives previous/next a symmetric footer', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    const onToggleFlag = vi.fn();
    const { container } = render(
      <PracticeView current={FIRST_SENTENCE} currentState={undefined}
        stats={{ viewed: 1, practiced: 0, favorites: 0, review: 0 }}
        speed="normal" showIpa notice="" recorder={stubRecorder()} dictation={dictation} onStartDictation={()=>undefined}
        recordingBusy={false} canGoPrevious
        onToggleIpa={() => undefined} onSpeak={() => undefined}
        onToggleSpeed={() => undefined} onRecord={() => undefined}
        onToggleFlag={onToggleFlag} onNext={onNext}
        onPrevious={onPrevious} onDismissNotice={() => undefined}
      />,
    );

    // These assertions protect the container-driven layout contract; actual
    // pixel overflow and viewport behavior still require browser screenshots.
    const layout = container.querySelector('.practiceLayout');
    expect(layout?.classList.contains('grid-cols-1')).toBe(true);
    expect(layout?.className).toContain('@min-[840px]/workspace:grid-cols-');
    expect(container.querySelector('.lessonFocus')?.classList.contains('@container/lesson')).toBe(true);
    expect(container.querySelector('.referenceInsights')?.className).toContain('@min-[600px]/workspace:grid-cols-2');
    expect(container.querySelector('.practiceCard')?.className).not.toContain('min-h-[700px]');

    const footer = container.querySelector('.referenceFooter');
    expect(footer?.querySelectorAll('.pagerButton')).toHaveLength(2);
    expect(container.querySelectorAll('.actionRail > .actionSlot')).toHaveLength(4);
    expect(container.querySelector('.actionRail .nextButton')).toBeNull();
    expect(container.querySelector('.lessonFocus .sentenceContent')).toBeTruthy();
    expect(container.querySelector('.lessonFocus .liveDictation')).toBeTruthy();
    const liveMic=container.querySelector('.liveDictation .dictationAction');
    const replayMic=container.querySelector('.actionRail .recordAction');
    expect(liveMic?.className).toContain('rounded-full');
    expect(container.querySelector('.waveformArt')).toBeTruthy();
    expect(container.querySelector('.liveDictation > div')?.className).toContain('flex-col');
    expect(container.querySelector('.liveDictation > div')?.className).toContain('items-center');
    expect(liveMic?.className).toContain('bg-[image:var(--mic-gradient)]');
    expect(replayMic).toBeTruthy();
    expect(replayMic?.className).toContain('bg-[image:var(--mic-gradient)]');
    expect(container.querySelector('.sentenceText')?.className).toContain('6.25cqi');
    // Width containment survives lengthy bilingual content and phonetic
    // symbols: the actual wrap/overflow behavior is tested with CDP.
    expect(container.querySelector('.sentenceHeading')?.className).toContain('min-w-0');
    expect(container.querySelector('.sentenceText')?.className).toContain('wrap-anywhere');
    expect(container.querySelector('.translation')?.className).toContain('wrap-anywhere');
    expect(container.querySelector('.ipa')?.className).toContain('wrap-anywhere');
    fireEvent.click(screen.getByRole('button', { name: '上一句' }));
    fireEvent.click(screen.getByRole('button', { name: '换一句' }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();

    const pairedFlags = container.querySelector('.lessonHeaderActions .sentenceFlags');
    expect(pairedFlags?.querySelectorAll('.flagButton')).toHaveLength(2);
    expect(pairedFlags?.querySelectorAll('button[aria-pressed]')).toHaveLength(2);
    expect(pairedFlags?.querySelector('[title]')).toBeNull();
    const favorite = screen.getByRole('button', { name: '收藏' });
    fireEvent.click(favorite);
    expect(onToggleFlag).toHaveBeenCalledWith('favorite');

    const review = screen.getByRole('button', { name: '标记需要复习' });
    expect(review.getAttribute('aria-pressed')).toBe('false');
    expect(review.querySelector('svg')).toBeTruthy();
    expect(review.textContent).toBe('');
    expect(container.querySelector('.lessonHeaderActions .reviewIconButton')).toBe(review);
    expect(container.querySelector('.referenceFooter .reviewIconButton')).toBeNull();
    fireEvent.click(review);
    expect(onToggleFlag).toHaveBeenCalledWith('review');

    const rightRail = container.querySelector('.referenceInsights');
    expect(rightRail?.querySelectorAll(':scope > .insightCard')).toHaveLength(4);
    expect(rightRail?.lastElementChild?.classList.contains('sceneCard')).toBe(true);
    expect(rightRail?.querySelector('.sceneCard .privacyNote')).toBeTruthy();
  });

  it('offers actionable session preferences without fake sign-in or subscription', () => {
    const onToggleSpeed = vi.fn();
    const onToggleIpa = vi.fn();
    render(<SettingsView speed="normal" showIpa appearance="nordic" onChangeAppearance={() => undefined} onToggleSpeed={onToggleSpeed}
      onToggleIpa={onToggleIpa} onBackToPractice={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /慢速模式/ }));
    fireEvent.click(screen.getByRole('button', { name: /显示参考音标/ }));
    expect(onToggleSpeed).toHaveBeenCalledOnce();
    expect(onToggleIpa).toHaveBeenCalledOnce();
    expect(screen.getByText(/语音和音标设置本次会话生效/)).toBeTruthy();
  });
});
