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

  it('F005/F006: changing sentence records a new view without counting a practice', async () => {
    const view = render(<App />);
    await screen.findByText(FIRST_SENTENCE.english);
    fireEvent.click(screen.getByRole('button', { name: '换一句' }));
    await waitFor(() => {
      expect(view.container.querySelector('h1.sentenceText')?.textContent).not.toBe(FIRST_SENTENCE.english);
    });
    const activeSentence = view.container.querySelector('h1.sentenceText')?.textContent;
    await waitFor(async () => {
      const data = await database.states.toArray();
      expect(data.some(item => item.sentenceId !== FIRST_SENTENCE.id && item.seenCount > 0)).toBe(true);
      expect(data.every(item => item.practicedCount === 0)).toBe(true);
    });
    expect(activeSentence).toBeTruthy();
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
  it('F004: the visible microphone button cancels a pending OS grant without making a phantom practice', async () => {
    const oldMedia = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    let grant: ((stream: MediaStream) => void) | undefined;
    const stopOldTrack = vi.fn();
    const getUserMedia = vi.fn(() => new Promise<MediaStream>(resolve => { grant = resolve; }));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    class NoCaptureUntilAuthorized {
      static isTypeSupported() { return true; }
      state: RecordingState = 'inactive';
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; }
    }
    vi.stubGlobal('MediaRecorder', NoCaptureUntilAuthorized);
    try {
      render(<App />);
      await screen.findByText(FIRST_SENTENCE.english);
      fireEvent.click(screen.getByRole('button', { name: '开口跟读' }));
      const cancel = await screen.findByRole('button', { name: '取消录音授权请求' });
      expect((cancel as HTMLButtonElement).disabled).toBe(false);
      expect(getUserMedia).toHaveBeenCalledTimes(1);
      fireEvent.click(cancel);
      expect(screen.queryByRole('button', { name: '取消录音授权请求' })).toBeNull();
      expect(screen.getByRole('button', { name: '开口跟读' })).toBeTruthy();
      const { act } = await import('@testing-library/react');
      await act(async () => {
        grant?.({ getTracks: () => [{ stop: stopOldTrack }] } as unknown as MediaStream);
      });
      expect(stopOldTrack).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: '结束录音' })).toBeNull();
      expect(screen.getByRole('button', { name: '开口跟读' })).toBeTruthy();
      expect((await database.states.toArray()).every(item => item.practicedCount === 0)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      if (oldMedia) Object.defineProperty(navigator, 'mediaDevices', oldMedia);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
    }
  });

  it('F004/F005: synchronous stop failure releases microphone and does not count phantom practice or block navigation',async()=>{
    const oldMedia=Object.getOwnPropertyDescriptor(navigator,'mediaDevices');
    const stopTrack=vi.fn();
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
      getUserMedia:vi.fn(async()=>({getTracks:()=>[{stop:stopTrack}]})),
    }});
    class BrokenStopRecorder {
      static isTypeSupported(){return true;}
      state:RecordingState='inactive';
      mimeType='audio/webm';
      onstop:(()=>void)|null=null;
      ondataavailable:((event:{data:Blob})=>void)|null=null;
      onerror:(()=>void)|null=null;
      start(){this.state='recording';}
      stop():void{throw Error('device disconnected');}
    }
    vi.stubGlobal('MediaRecorder',BrokenStopRecorder);
    try{
      const view=render(<App/>);
      await screen.findByText(FIRST_SENTENCE.english);
      fireEvent.click(screen.getByRole('button',{name:'开口跟读'}));
      await screen.findByRole('button',{name:'结束录音'});
      fireEvent.click(screen.getByRole('button',{name:'结束录音'}));
      await waitFor(()=>expect(screen.getByRole('button',{name:'开口跟读'})).toBeTruthy());
      expect(stopTrack).toHaveBeenCalled();
      expect((await database.states.toArray()).every(x=>x.practicedCount===0)).toBe(true);
      fireEvent.click(screen.getByRole('button',{name:'换一句'}));
      await waitFor(()=>expect(view.container.querySelector('h1.sentenceText')?.textContent)
        .not.toBe(FIRST_SENTENCE.english));
      const states=await database.states.toArray();
      expect(states.every(x=>x.practicedCount===0)).toBe(true);
      expect(document.querySelector('audio[src^="blob:"]')).toBeNull();
    }finally{
      vi.unstubAllGlobals();
      if(oldMedia)Object.defineProperty(navigator,'mediaDevices',oldMedia);
      else Reflect.deleteProperty(navigator,'mediaDevices');
    }
  });

  it('F004/F005: a late recorder callback cannot attribute the previous sentence to the next', async () => {
    const oldMedia = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    const oldCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const oldRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const trackStop = vi.fn();
    let serial = 0;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: trackStop }],
      })) },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true, value: vi.fn(() => 'blob:practice-' + ++serial),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true, value: vi.fn(),
    });
    class DeferredRecorder {
      static instances: DeferredRecorder[] = [];
      static isTypeSupported() { return true; }
      state: RecordingState = 'inactive';
      mimeType = 'audio/webm';
      onstop: (() => void) | null = null;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      constructor() { DeferredRecorder.instances.push(this); }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; /* browser queues ondataavailable and onstop */ }
    }
    vi.stubGlobal('MediaRecorder', DeferredRecorder);
    try {
      const view = render(<App />);
      await screen.findByText(FIRST_SENTENCE.english);
      fireEvent.click(screen.getByRole('button', { name: '开口跟读' }));
      await screen.findByRole('button', { name: '结束录音' });
      const first = DeferredRecorder.instances[0];
      if (!first) throw new Error('Expected the first MediaRecorder');
      fireEvent.click(screen.getByRole('button', { name: '结束录音' }));
      // The late browser events are the only thing that completes the attempt.
      expect(view.container.querySelector('h1.sentenceText')?.textContent).toBe(FIRST_SENTENCE.english);
      await waitFor(() => expect(first.state).toBe('inactive'));
      fireEvent.click(screen.getByRole('button', { name: '换一句' }));
      // Still waiting for the stop callback: switching must be blocked.
      expect(view.container.querySelector('h1.sentenceText')?.textContent).toBe(FIRST_SENTENCE.english);
      fireEvent.click(screen.getByRole('button', { name: '结束录音' }));
      // Duplicate clicks must not create another recording or count a practice.
      expect(DeferredRecorder.instances).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: '我的收藏' }));
      expect(view.container.querySelector('h1.sentenceText')?.textContent).toBe(FIRST_SENTENCE.english);
      const { act } = await import('@testing-library/react');
      await act(async () => {
        first.ondataavailable?.({ data: new Blob(['current voice']) });
        first.onstop?.();
      });
      await waitFor(async () => {
        expect((await database.states.get(FIRST_SENTENCE.id))?.practicedCount).toBe(1);
      });
      fireEvent.click(screen.getByRole('button', { name: '换一句' }));
      await waitFor(() => {
        expect(view.container.querySelector('h1.sentenceText')?.textContent).not.toBe(FIRST_SENTENCE.english);
      });
      // A stale duplicate event from the previous sentence must be ignored.
      await act(async () => {
        first.ondataavailable?.({ data: new Blob(['stale voice']) });
        first.onstop?.();
      });
      await waitFor(async () => {
        const allStates = await database.states.toArray();
        expect(allStates.find(x => x.sentenceId === FIRST_SENTENCE.id)?.practicedCount).toBe(1);
        expect(allStates.filter(x => x.sentenceId !== FIRST_SENTENCE.id).every(x => x.practicedCount === 0)).toBe(true);
      });
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:practice-1');
      expect(trackStop).toHaveBeenCalled();
      view.unmount();
    } finally {
      vi.unstubAllGlobals();
      for (const [key,desc] of [['createObjectURL',oldCreate],['revokeObjectURL',oldRevoke]] as const) {
        if (desc) Object.defineProperty(URL,key,desc);
        else Reflect.deleteProperty(URL,key);
      }
      if (oldMedia) Object.defineProperty(navigator, 'mediaDevices', oldMedia);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
    }
  });

  it('F004/F005: microphone track loss re-enables navigation and cannot charge a phantom practice', async () => {
    const oldMedia = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    const listeners = new Set<() => void>();
    const stopTrack = vi.fn();
    const track = {
      stop: stopTrack,
      addEventListener(name: string, callback: () => void) {
        if (name === 'ended') listeners.add(callback);
      },
      removeEventListener(name: string, callback: () => void) {
        if (name === 'ended') listeners.delete(callback);
      },
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
    });
    class InterruptedRecorder {
      static instances: InterruptedRecorder[] = [];
      static isTypeSupported() { return true; }
      state: RecordingState = 'inactive';
      mimeType = 'audio/webm';
      onstop: (() => void) | null = null;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() { InterruptedRecorder.instances.push(this); }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; /* stop is delivered later by the OS */ }
    }
    vi.stubGlobal('MediaRecorder', InterruptedRecorder);
    const oldCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true, value: vi.fn(() => 'blob:should-never-exist'),
    });
    try {
      const view = render(<App />);
      await screen.findByText(FIRST_SENTENCE.english);
      fireEvent.click(screen.getByRole('button', { name: '开口跟读' }));
      await screen.findByRole('button', { name: '结束录音' });
      const oldRecorder = InterruptedRecorder.instances[0];
      if (!oldRecorder) throw new Error('Expected MediaRecorder');
      expect(listeners.size).toBe(1);

      const { act } = await import('@testing-library/react');
      await act(async () => {
        oldRecorder.ondataavailable?.({ data: new Blob(['partial']) });
        for (const handler of [...listeners]) handler(); // external device unplug
      });
      expect(stopTrack).toHaveBeenCalled();
      expect(listeners.size).toBe(0);
      expect(screen.getByText('暂未检测到可用麦克风，可以先畅听示范或收藏喜欢的句子。')).toBeTruthy();
      expect(screen.queryByRole('button', { name: '结束录音' })).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: '换一句' }));
      await waitFor(() => {
        expect(view.container.querySelector('h1.sentenceText')?.textContent).not.toBe(FIRST_SENTENCE.english);
      });
      await act(async () => {
        oldRecorder.ondataavailable?.({ data: new Blob(['late stale audio']) });
        oldRecorder.onstop?.();
      });
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      await waitFor(async () => {
        const states = await database.states.toArray();
        expect(states.every(item => item.practicedCount === 0)).toBe(true);
      });
      view.unmount();
    } finally {
      vi.unstubAllGlobals();
      if (oldCreate) Object.defineProperty(URL, 'createObjectURL', oldCreate);
      else Reflect.deleteProperty(URL, 'createObjectURL');
      if (oldMedia) Object.defineProperty(navigator, 'mediaDevices', oldMedia);
      else Reflect.deleteProperty(navigator, 'mediaDevices');
    }
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
      expect(await screen.findByRole('button', { name: '结束录音' })).toBeTruthy();
      expect((screen.getByRole('button', { name: '播放标准朗读' }) as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: '我的收藏' }));
      expect(screen.getByText('请先结束当前录音，再切换页面。')).toBeTruthy();
      expect(screen.getByText(FIRST_SENTENCE.english)).toBeTruthy();
      // Same recording action must remain enabled and stop the actual MediaRecorder.
      expect((screen.getByRole('button', { name: '结束录音' }) as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: '结束录音' }));
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
