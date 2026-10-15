// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FIRST_SENTENCE } from '@voxnelo/content';
import type { useRecorder } from '../apps/web/src/useRecorder';
import { PracticeView } from '../apps/web/src/PracticeView';
import { LibraryView } from '../apps/web/src/LibraryView';

afterEach(cleanup);

function stubRecorder(overrides: Partial<ReturnType<typeof useRecorder>> = {}) {
  return {
    status: 'idle' as const,
    recordingUrl: null,
    error: null,
    start: () => Promise.resolve(),
    stop: () => undefined,
    clearAudio: () => undefined,
    ...overrides,
  };
}

const basePracticeProps = {
  current: FIRST_SENTENCE,
  currentState: undefined,
  stats: { viewed: 0, practiced: 0, favorites: 0, review: 0 },
  speed: 'normal' as const,
  showIpa: false,
  notice: '',
  recorder: stubRecorder(),
  recordingBusy: false,
  canGoPrevious: false,
  onToggleIpa: () => undefined,
  onSpeak: () => undefined,
  onToggleSpeed: () => undefined,
  onRecord: () => undefined,
  onToggleFlag: () => undefined,
  onNext: () => undefined,
  onPrevious: () => undefined,
  onDismissNotice: () => undefined,
};

describe('PracticeView', () => {
  it('展示当前短句与操作入口', () => {
    render(<PracticeView {...basePracticeProps} />);
    expect(screen.getByText(FIRST_SENTENCE.english)).toBeTruthy();
    expect(screen.getByRole('button', { name: '开口跟读' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '换一句' })).toBeTruthy();
  });

  it('练习台有横向六操作入口与真实课程进度，不渲染虚构学习成绩', () => {
    render(<PracticeView {...basePracticeProps} />);
    const rail = screen.getByTestId('practice-control-rail');
    expect(rail.children).toHaveLength(6);
    expect(screen.getByText('1 / 40')).toBeTruthy();
    expect(screen.getByText('录音尝试句')).toBeTruthy();
    expect(screen.queryByText('连续天数')).toBeNull();
    expect(screen.queryByText('发音准确率')).toBeNull();
    expect(screen.getByRole('button', { name: '结束录音' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '回听刚才的录音' }).hasAttribute('disabled')).toBe(true);
  });

  it('录音中只有结束录音可用，避免切换语速、播放示范或误启动录音', () => {
    render(<PracticeView {...basePracticeProps} recorder={stubRecorder({ status: 'recording' })} recordingBusy />);
    expect((screen.getByRole('button', { name: '开口跟读' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '结束录音' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: '播放标准朗读' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '切换语速' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '换一句' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('收藏态显示已收藏', () => {
    render(
      <PracticeView
        {...basePracticeProps}
        currentState={{
          sentenceId: FIRST_SENTENCE.id,
          seenCount: 1,
          practicedCount: 0,
          favorite: true,
          review: false,
          lastSeenAt: 1,
        }}
      />,
    );
    expect(screen.getByText('已收藏')).toBeTruthy();
  });

  it('录音中显示录音态，且禁止参考语音与录音重叠', () => {
    render(<PracticeView {...basePracticeProps} recorder={stubRecorder({ status: 'recording' })} recordingBusy />);
    expect(screen.getByText('结束录音')).toBeTruthy();
    expect((screen.getByTitle('播放标准朗读') as HTMLButtonElement).disabled).toBe(true);
  });

  it('收藏按钮触发回调', () => {
    const onToggleFlag = vi.fn();
    render(<PracticeView {...basePracticeProps} onToggleFlag={onToggleFlag} />);
    fireEvent.click(screen.getByText('收藏'));
    expect(onToggleFlag).toHaveBeenCalledWith('favorite');
  });
});

describe('LibraryView', () => {
  const baseLibraryProps = {
    view: 'favorites' as const,
    states: [],
    events: [],
    search: '',
    notice: '',
    onSearch: () => undefined,
    onChoose: () => undefined,
    onBackToPractice: () => undefined,
  };

  it('空收藏显示引导', () => {
    render(<LibraryView {...baseLibraryProps} />);
    expect(screen.getByText('这里暂时还没有短句')).toBeTruthy();
  });

  it('收藏列表可点回练习', () => {
    const onChoose = vi.fn();
    render(
      <LibraryView
        {...baseLibraryProps}
        states={[
          {
            sentenceId: FIRST_SENTENCE.id,
            seenCount: 1,
            practicedCount: 0,
            favorite: true,
            review: false,
            lastSeenAt: 1,
          },
        ]}
        onChoose={onChoose}
      />,
    );
    fireEvent.click(screen.getByText(FIRST_SENTENCE.english));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});
