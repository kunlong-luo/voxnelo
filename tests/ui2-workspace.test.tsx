// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FIRST_SENTENCE } from '@voxnelo/content';
import type { useRecorder } from '../apps/web/src/useRecorder';
import { PracticeView } from '../apps/web/src/PracticeView';
import { SettingsView } from '../apps/web/src/SettingsView';

afterEach(cleanup);

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

describe('UI2 reference workspace', () => {
  it('shows real related sentences and lets learners navigate them', () => {
    const onChooseRelated = vi.fn();
    const { container } = render(
      <PracticeView current={FIRST_SENTENCE} currentState={undefined}
        stats={{ viewed: 1, practiced: 0, favorites: 0, review: 0 }}
        speed="normal" showIpa notice="" recorder={stubRecorder()}
        recordingBusy={false} canGoPrevious={false}
        onToggleIpa={() => undefined} onSpeak={() => undefined}
        onToggleSpeed={() => undefined} onRecord={() => undefined}
        onToggleFlag={() => undefined} onNext={() => undefined}
        onPrevious={() => undefined} onDismissNotice={() => undefined}
        onChooseRelated={onChooseRelated}
      />,
    );
    expect(screen.getByText('SpeakFeed')).toBeTruthy();
    expect(screen.getByText('相关场景')).toBeTruthy();
    expect(screen.getByText('1 / 40 句')).toBeTruthy();
    expect(container.querySelector('.waveformArt')?.getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '练习短句：Hi!' }));
    expect(onChooseRelated).toHaveBeenCalledWith(expect.objectContaining({ english: 'Hi!' }));
    fireEvent.click(screen.getByRole('button', { name: '练习场景：自我介绍' }));
    expect(onChooseRelated).toHaveBeenCalledWith(expect.objectContaining({ topic: 'personal' }));
  });

  it('offers actionable session preferences without fake sign-in or subscription', () => {
    const onToggleSpeed = vi.fn();
    const onToggleIpa = vi.fn();
    render(<SettingsView speed="normal" showIpa onToggleSpeed={onToggleSpeed}
      onToggleIpa={onToggleIpa} onBackToPractice={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /慢速模式/ }));
    fireEvent.click(screen.getByRole('button', { name: /显示参考音标/ }));
    expect(onToggleSpeed).toHaveBeenCalledOnce();
    expect(onToggleIpa).toHaveBeenCalledOnce();
    expect(screen.getByText(/选择在本次打开应用期间生效/)).toBeTruthy();
  });
});
