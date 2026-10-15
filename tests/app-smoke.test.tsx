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
    expect(screen.getByText('Voxnelo')).toBeTruthy();
    expect(await screen.findByText(FIRST_SENTENCE.english)).toBeTruthy();
    expect(screen.getByRole('button', { name: '换一句' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '我的收藏' })).toBeTruthy();
  });

  it('右方向键换到下一句', async () => {
    render(<App />);
    await screen.findByText(FIRST_SENTENCE.english);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.queryByText(FIRST_SENTENCE.english)).toBeNull();
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
      view.unmount();
      expect(stopTrack).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      if (oldMedia) Object.defineProperty(navigator, 'mediaDevices', oldMedia);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
    }
  });

});
