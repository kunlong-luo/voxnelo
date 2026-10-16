// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FIRST_SENTENCE } from '@voxnelo/content';
import type { useRecorder } from '../apps/web/src/useRecorder';
import type { useLiveDictation } from '../apps/web/src/useLiveDictation';
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

function stubDictation(overrides:Partial<ReturnType<typeof useLiveDictation>>={}) {
  return {
    status:'idle' as const, active:false, mode:'local' as const,
    chooseMode:()=>undefined, supported:false, browserModeAvailable:true,
    noiseReduction:'unknown' as const,localPack:'unknown' as const, finalText:'', interimText:'', error:'',
    start:async()=>undefined, stop:()=>undefined, clear:()=>undefined, installLocal:async()=>undefined,
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
  dictation: stubDictation(),
  onStartDictation: ()=>undefined,
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

  it('练习台有横向五个音频操作入口与真实课程进度，不渲染虚构学习成绩', () => {
    render(<PracticeView {...basePracticeProps} />);
    const rail = screen.getByTestId('practice-control-rail');
    expect(rail.children).toHaveLength(5);
    expect(screen.getByRole('button', { name: '上一句' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '换一句' })).toBeTruthy();
    const progress = screen.getByRole('progressbar', { name: '课程位置，第 1 句，共 40 句' });
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    expect(progress.getAttribute('aria-valuemax')).toBe('40');
    expect(screen.getByText('录音尝试句')).toBeTruthy();
    expect(screen.queryByText('连续天数')).toBeNull();
    expect(screen.queryByText('发音准确率')).toBeNull();
    expect(screen.getByRole('button', { name: '结束录音' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '回听刚才的录音' }).hasAttribute('disabled')).toBe(true);
  });

  it('V3 独立组件组合不改变练习卡和学习侧栏的真实结构', () => {
    const {container}=render(<PracticeView {...basePracticeProps} />);
    const lesson=container.querySelector('.practiceColumn > .practiceCard');
    const sidebar=container.querySelector('.practiceLayout > .referenceInsights');
    expect(lesson).toBeTruthy();
    expect(sidebar).toBeTruthy();
    expect(lesson?.className).toContain('bg-glass-surface');
    expect(lesson?.className).toContain('backdrop-blur-[var(--glass-blur)]');
    expect(lesson?.querySelector('.actionRail')?.children).toHaveLength(5);
    expect(sidebar?.querySelectorAll('.insightCard')).toHaveLength(4);
    expect(sidebar?.querySelector('.progressDonut')).toBeTruthy();
    expect(lesson?.querySelector('.insightCard')).toBeNull();
  });

  it('主要入口是实时听写，录制回听仍作为辅助入口', () => {
    const onStartDictation=vi.fn();
    const {container,rerender}=render(<PracticeView {...basePracticeProps}
      onStartDictation={onStartDictation} dictation={stubDictation({supported:true})}/>);
    expect(screen.getByRole('button',{name:'开始实时听写'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'开始实时听写'}));
    expect(onStartDictation).toHaveBeenCalledTimes(1);
    expect(screen.getByText('录制回听')).toBeTruthy();
    expect(container.querySelector('.recordAction')).toBeTruthy();
    rerender(<PracticeView {...basePracticeProps} dictation={stubDictation({supported:true,status:'listening',active:true,finalText:'Hello',interimText:'world'})} recordingBusy/>);
    expect(screen.getByRole('button',{name:'停止听写'})).toBeTruthy();
    expect(screen.getByTestId('live-transcript').textContent).toContain('Hello');
    expect(screen.getByTestId('live-transcript').textContent).toContain('world');
    expect((screen.getByRole('button',{name:'开口跟读'}) as HTMLButtonElement).disabled).toBe(true);
  });

  it('录音中只有结束录音可用，避免切换语速、播放示范或误启动录音', () => {
    render(<PracticeView {...basePracticeProps} recorder={stubRecorder({ status: 'recording' })} recordingBusy />);
    expect((screen.getByRole('button', { name: '录音进行中' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '结束录音' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: '播放标准朗读' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '切换语速' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '换一句' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('录音动效只在真实录音状态出现，申请权限时使用独立状态提示', () => {
    const { container, rerender } = render(<PracticeView {...basePracticeProps} />);
    expect(container.querySelector('[data-motion="record-halo"]')).toBeNull();
    expect(container.querySelector('[data-motion="permission-halo"]')).toBeNull();
    expect(container.querySelector('.liveDictation')).toBeTruthy();
    expect(container.querySelector('.waveformArt')).toBeNull();
    expect(container.querySelector('.practiceLayout')?.className).toContain('motion-safe:animate-view-enter');

    rerender(<PracticeView {...basePracticeProps} recorder={stubRecorder({ status: 'requesting' })} recordingBusy />);
    const requesting = container.querySelector('[data-motion="permission-halo"]');
    expect(requesting?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-motion="record-halo"]')).toBeNull();
    expect((screen.getByRole('button', { name: '正在获取权限' }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<PracticeView {...basePracticeProps} recorder={stubRecorder({ status: 'recording' })} recordingBusy />);
    const halo = container.querySelector('[data-motion="record-halo"]');
    expect(halo?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-motion="permission-halo"]')).toBeNull();
    expect((screen.getByRole('button', { name: '结束录音' }) as HTMLButtonElement).disabled).toBe(false);

    rerender(<PracticeView {...basePracticeProps} recorder={stubRecorder({ status: 'idle' })} />);
    expect(container.querySelector('[data-motion="record-halo"]')).toBeNull();
    expect(container.querySelector('[data-motion="permission-halo"]')).toBeNull();
  });

  it('右侧推荐短句可读并保持真实点击导航，录音期间禁用跳转', () => {
    const onChooseRelated = vi.fn();
    const {container,rerender}=render(<PracticeView {...basePracticeProps} onChooseRelated={onChooseRelated}/>);
    const items=container.querySelectorAll('.feedItem');
    expect(items).toHaveLength(4);
    const first=items.item(0);
    if(!first)throw new Error('Expected related phrase item');
    expect(first.querySelector('strong')?.className).toContain('line-clamp-2');
    expect(first.querySelector('strong')?.className).not.toContain('truncate');
    expect(first.querySelector('span.text-muted-foreground')?.className).toContain('line-clamp-2');
    fireEvent.click(first);
    expect(onChooseRelated).toHaveBeenCalledTimes(1);
    expect(onChooseRelated.mock.calls[0]?.[0]?.topic).toBe(FIRST_SENTENCE.topic);
    rerender(<PracticeView {...basePracticeProps} recordingBusy onChooseRelated={onChooseRelated}/>);
    expect((container.querySelector('.feedItem') as HTMLButtonElement).disabled).toBe(true);
  });

  it('录音完成后显示真实可回听状态，且不同于录音中或权限申请', () => {
    const {container,rerender}=render(<PracticeView {...basePracticeProps} recorder={stubRecorder({status:'ready',recordingUrl:'blob:verified'})}/>);
    expect(screen.getByText('录音已完成，可以回听自己的声音。')).toBeTruthy();
    expect(screen.getByText('可再次录音')).toBeTruthy();
    expect((screen.getByRole('button',{name:'回听刚才的录音'}) as HTMLButtonElement).disabled).toBe(false);
    expect(container.querySelector('[data-motion="record-halo"]')).toBeNull();
    rerender(<PracticeView {...basePracticeProps} recorder={stubRecorder({status:'recording'})} recordingBusy/>);
    expect(screen.queryByText('录音已完成，可以回听自己的声音。')).toBeNull();
    expect(screen.getByText('点击结束完成录音')).toBeTruthy();
    rerender(<PracticeView {...basePracticeProps} recorder={stubRecorder({status:'requesting'})} recordingBusy/>);
    expect(screen.getByText('等待麦克风权限')).toBeTruthy();
    expect(container.querySelector('[data-motion="record-halo"]')).toBeNull();
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
    expect((screen.getByRole('button', { name: '播放标准朗读' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('收藏按钮触发回调', () => {
    const onToggleFlag = vi.fn();
    render(<PracticeView {...basePracticeProps} onToggleFlag={onToggleFlag} />);
    fireEvent.click(screen.getByRole('button', { name: '收藏' }));
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
