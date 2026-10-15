// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FIRST_SENTENCE } from '@voxnelo/content';
import { database } from '@voxnelo/storage';
import { App } from '../apps/web/src/App';

afterEach(cleanup);

beforeEach(async () => {
  await database.transaction('rw', database.states, database.events, async () => {
    await database.states.clear();
    await database.events.clear();
  });
});

describe('App smoke', () => {
  it('首屏展示品牌、首句与导航', async () => {
    render(<App />);
    expect(screen.getAllByText('Voxnelo')).toHaveLength(2);
    // 首屏直接进入学习，不再出现重复的营销标语或每日口号。
    expect(screen.queryByText('从第一句开始，自信开口')).toBeNull();
    expect(screen.queryByText('从这一句开始，')).toBeNull();
    expect(screen.queryByText(/SPEAK A LITTLE, EVERY DAY/)).toBeNull();
    expect(await screen.findByText(FIRST_SENTENCE.english)).toBeTruthy();
    expect(screen.getByRole('button', { name: '换一句' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '我的收藏' })).toBeTruthy();
  });

  it('右方向键换到下一句', async () => {
    const view = render(<App />);
    await screen.findByText(FIRST_SENTENCE.english);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      // Related-expression suggestions can still contain the previous sentence.
      // Verify the central lesson itself actually changed.
      expect(view.container.querySelector('h1.sentenceText')?.textContent).not.toBe(FIRST_SENTENCE.english);
    });
  });
  it('正在录音时不能切到历史/收藏，示范音也应停用', async () => {
    const oldMedia = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    const stopTrack = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
    });
    class FakeMediaRecorder {
      static isTypeSupported() { return true; }
      state: RecordingState = 'inactive';
      mimeType = 'audio/webm';
      onstop: (() => void) | null = null;
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.onstop?.(); }
    }
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    try {
      const view = render(<App />);
      fireEvent.click(screen.getByRole('button', { name: '开口跟读' }));
      expect(await screen.findByText('结束录音')).toBeTruthy();
      expect((screen.getByTitle('播放标准朗读') as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: '我的收藏' }));
      expect(screen.getByText('请先结束当前录音，再切换页面。')).toBeTruthy();
      expect(screen.getByText(FIRST_SENTENCE.english)).toBeTruthy();
      // 在窄屏或滚动位置较深时，顶部提供不依赖卡片可见性的停录按钮。
      fireEvent.click(screen.getByRole('button', { name: '顶部快速停止录音' }));
      expect(stopTrack).toHaveBeenCalled();
      view.unmount();
      expect(stopTrack).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      if (oldMedia) Object.defineProperty(navigator, 'mediaDevices', oldMedia);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
    }
  });

});
