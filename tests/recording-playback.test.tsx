// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecordingPlayback } from '../apps/web/src/RecordingPlayback';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('品牌化录音回听组件', () => {
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

  it('播放失败时明确提示，不能冒充成功', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('unsupported'));
    render(<RecordingPlayback src="blob:practice" />);
    fireEvent.click(screen.getByRole('button', { name: '回听刚才的录音' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '暂时无法回听这段录音，请重试。');
  });
});
