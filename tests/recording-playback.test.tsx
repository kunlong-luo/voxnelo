// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecordingPlayback } from '../apps/web/src/RecordingPlayback';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('品牌化录音回听组件', () => {
  it('录音尚未完成时回听按钮明确不可用', () => {
    render(<RecordingPlayback src={null} />);
    expect((screen.getByRole('button', { name: '回听刚才的录音' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('progressbar', { name: '录音播放进度' })).toBeNull();
  });

  it('只展示真实音频回听与未确认时长，不显示虚构波形或评分', () => {
    render(<RecordingPlayback src="blob:practice" />);
    expect(screen.getByRole('button', { name: '回听刚才的录音' })).toBeTruthy();
    expect(screen.getByText('0:00 / --:--')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: '录音播放进度' })).toBeTruthy();
  });

  it('点击回听时调用浏览器播放器，播放成功后出现暂停操作', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    render(<RecordingPlayback src="blob:practice" />);
    fireEvent.click(screen.getByRole('button', { name: '回听刚才的录音' }));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: '暂停回听' })).toBeTruthy();
  });

  it('切句卸载旧回听时显式暂停正在播放的音频', async () => {
    let paused = true;
    vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(() => paused);
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => { paused = false; });
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => { paused = true; });
    const view = render(<RecordingPlayback key="old" src="blob:old" />);
    fireEvent.click(screen.getByRole('button', { name: '回听刚才的录音' }));
    expect(await screen.findByRole('button', { name: '暂停回听' })).toBeTruthy();
    view.rerender(<RecordingPlayback key="new" src="blob:new" />);
    expect(play).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: '回听刚才的录音' })).toBeTruthy();
  });

  it('旧句未完成的 play Promise 不能改变新句播放状态', async () => {
    let resolvePlay: (() => void) | undefined;
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(
      () => new Promise<void>(resolve => { resolvePlay = resolve; }),
    );
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const view = render(<RecordingPlayback key="old" src="blob:old" />);
    fireEvent.click(screen.getByRole('button', { name: '回听刚才的录音' }));
    expect(play).toHaveBeenCalledOnce();
    view.rerender(<RecordingPlayback key="new" src="blob:new" />);
    expect(pause).toHaveBeenCalledOnce();
    resolvePlay?.();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '暂停回听' })).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  it('播放失败时明确提示，不能冒充成功', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('unsupported'));
    render(<RecordingPlayback src="blob:practice" />);
    fireEvent.click(screen.getByRole('button', { name: '回听刚才的录音' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '暂时无法回听这段录音，请重试。');
  });
});
