// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FIRST_SENTENCE } from '@voxnelo/content';
import { database, recordEvent } from '@voxnelo/storage';
import { App } from '../apps/web/src/App';
import { LANGUAGE_STORAGE_KEY } from '../apps/web/src/i18n';
import type { VoxneloDesktopAPI } from '../apps/web/src/desktopBridge';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

beforeEach(async () => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh-CN');
  await database.transaction('rw', database.states, database.events, async () => {
    await database.states.clear();
    await database.events.clear();
  });
});

describe('App smoke', () => {
  it('首屏展示品牌、首句与导航', async () => {
    render(<App />);
    expect(screen.getByText(/Voxnelo · Early Access/)).toBeTruthy();
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar?.querySelector('.brand img')?.getAttribute('src')).toBe('brand/voxnelo-mark.svg');
    expect(sidebar?.querySelector('.brandText')?.textContent).toBe('Voxnelo');
    expect(screen.queryByRole('banner', { name: '窗口标题栏' })).toBeNull();
    expect(document.querySelector('.appTitlebar .brand')).toBeNull();
    expect(screen.queryByText('英语口语')).toBeNull();
    expect(screen.queryByText('本地学习模式')).toBeNull();
    // 首屏直接进入学习，不再出现重复的营销标语或每日口号。
    expect(screen.queryByText('从第一句开始，自信开口')).toBeNull();
    expect(screen.queryByText('从这一句开始，')).toBeNull();
    expect(screen.queryByText(/SPEAK A LITTLE, EVERY DAY/)).toBeNull();
    expect(await screen.findByText(FIRST_SENTENCE.english)).toBeTruthy();
    expect(screen.getByRole('button', { name: '换一句' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '我的收藏' })).toBeTruthy();
  });

  it('P0: resumes the last valid sentence from IndexedDB after relaunch without a false first-phrase visit', async () => {
    await recordEvent('s012', 'view');
    await recordEvent('s020', 'practice');

    const first = render(<App />);
    await waitFor(() => {
      expect(first.container.querySelector('h1.sentenceText')?.textContent).toBe('I am hungry.');
    });
    await waitFor(async () => {
      const initial = await database.events.where('sentenceId').equals('s001').count();
      expect(initial).toBe(0);
    });
    first.unmount();

    const second = render(<App />);
    await waitFor(() => {
      expect(second.container.querySelector('h1.sentenceText')?.textContent).toBe('I am hungry.');
    });
    // Persistence remains in IndexedDB; remount does not clear practice and browsing distinctions.
    const state = await database.states.get('s020');
    expect(state?.practicedCount).toBe(1);
    expect(state?.seenCount).toBeGreaterThanOrEqual(1);
    expect(await database.events.where('sentenceId').equals('s001').count()).toBe(0);
  });

  it('桌面导航从窗口顶端铺满高度，标题栏只属于右侧工作区', async () => {
    vi.stubGlobal('voxneloDesktop', {
      platform: 'linux', version: '0.1.0',
      windowControls: {
        minimize: vi.fn(), toggleMaximize: vi.fn(), close: vi.fn(),
        isMaximized: vi.fn().mockResolvedValue(false),
        onMaximizeChange: () => () => undefined,
      },
    } satisfies VoxneloDesktopAPI);
    const view = render(<App />);
    await screen.findByText(FIRST_SENTENCE.english);
    const shell = view.container.querySelector('.shell');
    const sidebar = shell?.querySelector(':scope > .sidebar');
    const main = shell?.querySelector(':scope > .mainArea');
    const titlebar = main?.querySelector(':scope > .appTitlebar');
    expect(sidebar).toBeTruthy();
    expect(main).toBeTruthy();
    expect(titlebar).toBeTruthy();
    expect(view.container.querySelector('.appFrame > .appTitlebar')).toBeNull();
    expect(sidebar?.className).toContain('top-0');
    expect(sidebar?.className).toContain('h-dvh');
    expect(sidebar?.className).not.toContain('top-11');
    expect(sidebar?.className).not.toContain('calc(100dvh-44px)');
    expect(titlebar?.className).not.toContain('border-b');
    expect(titlebar?.className).not.toContain('bg-sidebar');
    expect(titlebar?.querySelectorAll('.windowControl')).toHaveLength(3);
  });

  it('窄屏使用底部导航，导航行为与侧栏保持一致', async () => {
    const view = render(<App />);
    const mainArea = view.container.querySelector('.mainArea');
    const mobileNav = view.container.querySelector('.mobileNav');
    expect(mainArea?.classList.contains('@container/workspace')).toBe(true);
    expect(mobileNav?.classList.contains('sm:hidden')).toBe(true);
    const favoriteButton = mobileNav?.querySelector('button[aria-label^="我的收藏"]');
    expect(favoriteButton).toBeTruthy();
    fireEvent.click(favoriteButton!);
    await waitFor(() => expect(view.container.querySelector('.libraryPage')).toBeTruthy());
    expect(favoriteButton?.getAttribute('aria-current')).toBe('page');
    const practiceButton = mobileNav?.querySelector('button[aria-label^="开始练习"]');
    expect(practiceButton).toBeTruthy();
    fireEvent.click(practiceButton!);
    await waitFor(() => expect(view.container.querySelector('.practiceLayout')).toBeTruthy());
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
      expect((screen.getByRole('button', { name: '播放标准朗读' }) as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: '我的收藏' }));
      expect(screen.getByText('请先结束当前录音，再切换页面。')).toBeTruthy();
      expect(screen.getByText(FIRST_SENTENCE.english)).toBeTruthy();
      // 浮动停止按钮不在顶部窗口栏中，仍不依赖主卡片的滚动位置。
      fireEvent.click(screen.getByRole('button', { name: '悬浮快速停止录音' }));
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
