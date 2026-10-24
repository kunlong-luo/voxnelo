// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useRecorder } from '../apps/web/src/useRecorder';

afterEach(cleanup);

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];
  static deferStop = false;
  static isTypeSupported = () => true;
  state: RecordingState = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  mimeType: string;

  constructor(_stream: unknown, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? 'audio/webm';
    MockMediaRecorder.instances.push(this);
  }

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    if (!MockMediaRecorder.deferStop) this.onstop?.();
  }
}

function mockDevices(impl: () => Promise<MediaStream>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn(impl) },
    configurable: true,
  });
}

function fakeStream(): MediaStream {
  return { getTracks: () => [] } as unknown as MediaStream;
}

function eventfulTrack() {
  const callbacks = new Set<() => void>();
  const stop = vi.fn();
  const addEventListener = vi.fn((name: string, callback: () => void) => {
    if (name === 'ended') callbacks.add(callback);
  });
  const removeEventListener = vi.fn((name: string, callback: () => void) => {
    if (name === 'ended') callbacks.delete(callback);
  });
  return {
    track: { stop, addEventListener, removeEventListener } as unknown as MediaStreamTrack,
    stop, addEventListener, removeEventListener,
    emitEnded: () => { for (const callback of [...callbacks]) callback(); },
    takeEndedCallback: () => [...callbacks][0],
    listenerCount: () => callbacks.size,
  };
}

let latest: ReturnType<typeof useRecorder>;

function Harness(): null {
  latest = useRecorder();
  return null;
}

beforeEach(() => {
  MockMediaRecorder.instances = [];
  MockMediaRecorder.deferStop = false;
  vi.stubGlobal('MediaRecorder', MockMediaRecorder);
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock'),
    configurable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useRecorder', () => {
  it('不支持录音时报错并保持 idle', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    render(<Harness />);
    await act(async () => {
      await latest.start();
    });
    expect(latest.status).toBe('idle');
    expect(latest.error).toBe('当前设备或浏览器不支持录音。');
  });

  it('拒绝麦克风授权时给中文提示', async () => {
    mockDevices(() => {
      throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    });
    render(<Harness />);
    await act(async () => {
      await latest.start();
    });
    expect(latest.status).toBe('idle');
    expect(latest.error).toBe('麦克风尚未获授权。您仍可听示范、收藏和练习其他句子。');
  });

  it('麦克风设备不可用时显示设备提示且不生成录音', async () => {
    mockDevices(() => Promise.reject(Object.assign(new Error('missing'), { name: 'NotFoundError' })));
    render(<Harness />);
    await act(async () => { await latest.start(); });
    expect(latest.status).toBe('idle');
    expect(latest.error).toBe('暂未检测到可用麦克风，可以先畅听示范或收藏喜欢的句子。');
    expect(latest.recordingUrl).toBeNull();
    expect(MockMediaRecorder.instances).toHaveLength(0);
  });

  it('重复发起录音权限请求时只请求一次麦克风', async () => {
    let grant: ((stream: MediaStream) => void) | undefined;
    const getUserMedia = vi.fn(() => new Promise<MediaStream>((resolve) => { grant = resolve; }));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true, value: { getUserMedia },
    });
    render(<Harness />);
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = latest.start();
      second = latest.start();
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await act(async () => {
      grant?.(fakeStream());
      await Promise.all([first, second]);
    });
    expect(latest.status).toBe('recording');
    expect(MockMediaRecorder.instances).toHaveLength(1);
  });

  it('取消未完成的授权后可再次请求，旧授权晚到不得接管新录音或解锁请求', async () => {
    const grants: Array<(stream: MediaStream) => void> = [];
    const getUserMedia = vi.fn(() => new Promise<MediaStream>((resolve) => { grants.push(resolve); }));
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    render(<Harness />);
    let cancelled!: Promise<void>;
    act(() => { cancelled = latest.start(); });
    expect(latest.status).toBe('requesting');
    act(() => latest.clearAudio());
    expect(latest.status).toBe('idle');
    let replacement!: Promise<void>;
    act(() => { replacement = latest.start(); });
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    const oldStop = vi.fn(), currentStop = vi.fn();
    await act(async () => {
      grants[0]?.({ getTracks: () => [{ stop: oldStop }] } as unknown as MediaStream);
      await cancelled;
    });
    expect(oldStop).toHaveBeenCalledTimes(1);
    expect(latest.status).toBe('requesting');
    await act(async () => { await latest.start(); });
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    await act(async () => {
      grants[1]?.({ getTracks: () => [{ stop: currentStop }] } as unknown as MediaStream);
      await replacement;
    });
    expect(latest.status).toBe('recording');
    expect(MockMediaRecorder.instances).toHaveLength(1);
    act(() => latest.clearAudio());
    expect(currentStop).toHaveBeenCalled();
    expect(latest.recordingUrl).toBeNull();
  });

  it('取消已失败的录音请求时清除上一句麦克风错误', async () => {
    mockDevices(() => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })));
    render(<Harness />);
    await act(async () => { await latest.start(); });
    expect(latest.error).toBeTruthy();
    act(() => latest.clearAudio());
    expect(latest.error).toBeNull();
    expect(latest.status).toBe('idle');
  });

  it('完整录音流程：请求中→录音中→就绪并产出回听地址', async () => {
    mockDevices(() => Promise.resolve(fakeStream()));
    render(<Harness />);
    await act(async () => {
      await latest.start();
    });
    expect(latest.status).toBe('recording');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, channelCount: 1 },
      video: false,
    });
    const instance = MockMediaRecorder.instances[0];
    if (!instance) throw new Error('expected recorder instance');
    act(() => {
      instance.ondataavailable?.({ data: new Blob(['audio']) });
    });
    act(() => {
      latest.stop();
    });
    expect(latest.status).toBe('ready');
    expect(latest.recordingUrl).toBe('blob:mock');
    act(() => {
      latest.clearAudio();
    });
    expect(latest.recordingUrl).toBeNull();
  });


  it('录音设备报错时释放音轨且回到 idle，不误报录音成功', async () => {
    const stopTrack = vi.fn();
    mockDevices(() => Promise.resolve({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream));
    render(<Harness />);
    await act(async () => { await latest.start(); });
    const instance = MockMediaRecorder.instances[0];
    if (!instance) throw new Error('expected recorder instance');
    act(() => {
      instance.onerror?.();
      instance.onstop?.();
    });
    expect(stopTrack).toHaveBeenCalled();
    expect(latest.status).toBe('idle');
    expect(latest.error).toBe('录音中断，请重新尝试。');
    expect(latest.recordingUrl).toBeNull();
  });

  it('系统权限请求在页面卸载后才返回时，仍释放新获得的音轨', async () => {
    let grant: ((stream: MediaStream) => void) | undefined;
    const stopTrack = vi.fn();
    mockDevices(() => new Promise<MediaStream>((resolve) => { grant = resolve; }));
    const view = render(<Harness />);
    let pending!: Promise<void>;
    act(() => { pending = latest.start(); });
    view.unmount();
    await act(async () => {
      grant?.({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream);
      await pending;
    });
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(MockMediaRecorder.instances).toHaveLength(0);
  });
  it('清理已经完成的录音时撤销 Blob URL 并复位状态', async () => {
    mockDevices(() => Promise.resolve(fakeStream()));
    render(<Harness />);
    await act(async () => { await latest.start(); });
    const instance = MockMediaRecorder.instances[0];
    if (!instance) throw new Error('expected recorder instance');
    act(() => {
      instance.ondataavailable?.({ data: new Blob(['voice']) });
      latest.stop();
    });
    expect(latest.status).toBe('ready');
    act(() => { latest.clearAudio(); });
    expect(latest.recordingUrl).toBeNull();
    expect(latest.status).toBe('idle');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('stop 同步抛错时释放麦克风、忽略旧回调，且允许重新录音', async () => {
    const oldTrackStop=vi.fn(), newTrackStop=vi.fn();
    let session=0;
    mockDevices(() => {
      const stop=++session===1?oldTrackStop:newTrackStop;
      return Promise.resolve({getTracks:()=>[{stop}]} as unknown as MediaStream);
    });
    render(<Harness />);
    await act(async () => {await latest.start();});
    const first=MockMediaRecorder.instances[0];
    if(!first)throw Error('expected recorder');
    const onLateData=first.ondataavailable;
    const onLateStop=first.onstop;
    vi.spyOn(first,'stop').mockImplementationOnce(()=>{
      throw new Error('InvalidStateError: microphone unplugged');
    });
    act(()=>latest.stop());
    expect(latest.status).toBe('idle');
    expect(latest.error).toBe('录音中断，请重新尝试。');
    expect(latest.recordingUrl).toBeNull();
    expect(oldTrackStop).toHaveBeenCalledOnce();
    expect(first.onstop).toBeNull();
    expect(first.ondataavailable).toBeNull();
    act(()=>{
      onLateData?.({data:new Blob(['stale voice'])});
      onLateStop?.();
    });
    expect(latest.status).toBe('idle');
    expect(URL.createObjectURL).not.toHaveBeenCalled();

    await act(async()=>{await latest.start();});
    expect(latest.status).toBe('recording');
    const replacement=MockMediaRecorder.instances[1];
    if(!replacement)throw Error('expected replacement recorder');
    act(()=>{
      onLateData?.({data:new Blob(['old sentence'])});
      onLateStop?.();
    });
    expect(latest.status).toBe('recording');
    act(()=>{
      replacement.ondataavailable?.({data:new Blob(['new sentence'])});
      latest.stop();
    });
    expect(latest.status).toBe('ready');
    expect(latest.error).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(newTrackStop).toHaveBeenCalled();
  });

  it('卸载时 stop 同步抛错仍释放音轨、注销回调且不生成过期录音', async () => {
    const trackStop = vi.fn();
    mockDevices(() => Promise.resolve({
      getTracks: () => [{ stop: trackStop }],
    } as unknown as MediaStream));
    const view = render(<Harness />);
    await act(async () => { await latest.start(); });
    const active = MockMediaRecorder.instances[0];
    if (!active) throw new Error('expected recorder instance');
    const staleData = active.ondataavailable;
    const staleStop = active.onstop;
    vi.spyOn(active, 'stop').mockImplementationOnce(() => {
      throw new Error('InvalidStateError: hardware disconnected before cleanup');
    });

    expect(() => view.unmount()).not.toThrow();
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(active.ondataavailable).toBeNull();
    expect(active.onstop).toBeNull();
    expect(active.onerror).toBeNull();
    act(() => {
      staleData?.({ data: new Blob(['obsolete audio']) });
      staleStop?.();
    });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('异步 onstop 在切句清理之后到达时不得恢复旧音频', async () => {
    MockMediaRecorder.deferStop = true;
    mockDevices(() => Promise.resolve(fakeStream()));
    render(<Harness />);
    await act(async () => { await latest.start(); });
    const instance = MockMediaRecorder.instances[0];
    if (!instance) throw new Error('expected recorder instance');
    act(() => { latest.stop(); });
    // Switching sentences clears the old recording while browser events are still queued.
    act(() => { latest.clearAudio(); });
    act(() => {
      instance.ondataavailable?.({ data: new Blob(['late voice']) });
      instance.onstop?.();
    });
    expect(latest.status).toBe('idle');
    expect(latest.recordingUrl).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('切句时清除正在进行的录音，立即释放麦克风且不恢复迟到的旧音频', async () => {
    MockMediaRecorder.deferStop = true;
    const stopTrack = vi.fn();
    mockDevices(() => Promise.resolve({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream));
    render(<Harness />);
    await act(async () => { await latest.start(); });
    const first = MockMediaRecorder.instances[0];
    if (!first) throw new Error('expected recorder instance');

    act(() => { latest.clearAudio(); });
    expect(first.state).toBe('inactive');
    expect(stopTrack).toHaveBeenCalled();
    expect(latest.status).toBe('idle');
    act(() => {
      first.ondataavailable?.({ data: new Blob(['late old sentence']) });
      first.onstop?.();
    });
    expect(latest.recordingUrl).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('旧句的迟到回调不会中断新句录音或覆盖其回听地址', async () => {
    MockMediaRecorder.deferStop = true;
    const stopOldTrack = vi.fn(), stopNewTrack = vi.fn();
    let count = 0;
    mockDevices(() => {
      const session = ++count;
      return Promise.resolve({ getTracks: () => [{ stop: session === 1 ? stopOldTrack : stopNewTrack }] } as unknown as MediaStream);
    });
    render(<Harness />);
    await act(async () => { await latest.start(); });
    const first = MockMediaRecorder.instances[0];
    if (!first) throw new Error('expected first recorder');
    act(() => { latest.stop(); latest.clearAudio(); });
    await act(async () => { await latest.start(); });
    const second = MockMediaRecorder.instances[1];
    if (!second) throw new Error('expected second recorder');

    act(() => {
      first.ondataavailable?.({ data: new Blob(['old']) });
      first.onstop?.();
    });
    expect(latest.status).toBe('recording');
    expect(latest.recordingUrl).toBeNull();
    expect(stopNewTrack).not.toHaveBeenCalled();

    act(() => {
      second.ondataavailable?.({ data: new Blob(['current']) });
      latest.stop();
      second.onstop?.();
    });
    expect(latest.status).toBe('ready');
    expect(latest.recordingUrl).toBe('blob:mock');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(stopOldTrack).toHaveBeenCalled();
    expect(stopNewTrack).toHaveBeenCalled();
  });

  it('正在请求权限时切句，迟到的授权必须立即释放且不能启动录音', async () => {
    let grant: ((stream: MediaStream) => void) | undefined;
    const stopTrack = vi.fn();
    mockDevices(() => new Promise<MediaStream>(resolve => { grant = resolve; }));
    render(<Harness />);
    let pending!: Promise<void>;
    act(() => { pending = latest.start(); });
    act(() => { latest.clearAudio(); });
    await act(async () => {
      grant?.({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream);
      await pending;
    });
    expect(stopTrack).toHaveBeenCalled();
    expect(latest.status).toBe('idle');
    expect(latest.recordingUrl).toBeNull();
    expect(MockMediaRecorder.instances).toHaveLength(0);
  });

  it('卸载已经完成录音的组件时释放临时 Blob URL', async () => {
    mockDevices(() => Promise.resolve(fakeStream()));
    const view = render(<Harness />);
    await act(async () => { await latest.start(); });
    const instance = MockMediaRecorder.instances[0];
    if (!instance) throw new Error('expected recorder instance');
    act(() => {
      instance.ondataavailable?.({ data: new Blob(['voice']) });
      latest.stop();
    });
    expect(latest.recordingUrl).toBe('blob:mock');
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('外置麦克风在录制中断开：立即复位、停止媒体流、清除晚到音频且不误记为录音成功', async () => {
    MockMediaRecorder.deferStop = true;
    const mic = eventfulTrack();
    mockDevices(() => Promise.resolve({ getTracks: () => [mic.track] } as unknown as MediaStream));
    render(<Harness />);
    await act(async () => { await latest.start(); });
    const active = MockMediaRecorder.instances[0]!;
    expect(mic.listenerCount()).toBe(1);
    const staleEnded = mic.takeEndedCallback();
    expect(staleEnded).toBeTypeOf('function');

    act(() => {
      active.ondataavailable?.({ data: new Blob(['partial']) });
      mic.emitEnded();
    });
    expect(active.state).toBe('inactive');
    expect(mic.stop).toHaveBeenCalled();
    expect(mic.listenerCount()).toBe(0);
    expect(latest.status).toBe('idle');
    expect(latest.error).toBe('暂未检测到可用麦克风，可以先畅听示范或收藏喜欢的句子。');
    expect(latest.recordingUrl).toBeNull();
    act(() => {
      active.ondataavailable?.({ data: new Blob(['late']) });
      active.onstop?.();
      staleEnded?.(); // OS may have already queued the old event.
    });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(latest.status).toBe('idle');
    expect(mic.removeEventListener).toHaveBeenCalledWith('ended', staleEnded);
  });

  it('上一句延迟 ended 不能关闭新一句的录音或污染回听', async () => {
    MockMediaRecorder.deferStop = true;
    const oldMic = eventfulTrack(), newMic = eventfulTrack();
    let grants = 0;
    mockDevices(() => {
      const currentTrack = ++grants === 1 ? oldMic.track : newMic.track;
      return Promise.resolve({ getTracks: () => [currentTrack] } as unknown as MediaStream);
    });
    render(<Harness />);
    await act(async () => { await latest.start(); });
    const old = MockMediaRecorder.instances[0]!;
    const delayedEnded = oldMic.takeEndedCallback();
    act(() => { latest.stop(); latest.clearAudio(); });
    expect(oldMic.listenerCount()).toBe(0);
    await act(async () => { await latest.start(); });
    const now = MockMediaRecorder.instances[1]!;
    expect(now.state).toBe('recording');
    act(() => {
      delayedEnded?.();
      old.ondataavailable?.({ data: new Blob(['stale']) });
      old.onstop?.();
    });
    expect(newMic.stop).not.toHaveBeenCalled();
    expect(latest.status).toBe('recording');
    expect(latest.error).toBeNull();
    act(() => {
      now.ondataavailable?.({ data: new Blob(['new voice']) });
      latest.stop();
      now.onstop?.();
    });
    expect(latest.status).toBe('ready');
    expect(latest.recordingUrl).toBe('blob:mock');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('正常按停止（即使音轨实现发出 ended）也不会误报设备断开', async () => {
    const mic = eventfulTrack();
    mic.stop.mockImplementation(() => mic.emitEnded());
    mockDevices(() => Promise.resolve({ getTracks: () => [mic.track] } as unknown as MediaStream));
    render(<Harness />);
    await act(async () => { await latest.start(); });
    const active = MockMediaRecorder.instances[0]!;
    act(() => {
      active.ondataavailable?.({ data: new Blob(['voice']) });
      latest.stop();
    });
    expect(mic.listenerCount()).toBe(0);
    expect(latest.status).toBe('ready');
    expect(latest.error).toBeNull();
    expect(latest.recordingUrl).toBe('blob:mock');
  });

  it('录音引擎启动失败后清除音轨监听，并允许用户正常重试', async () => {
    const firstMic = eventfulTrack(), secondMic = eventfulTrack();
    let count = 0;
    mockDevices(() => {
      const currentTrack = ++count === 1 ? firstMic.track : secondMic.track;
      return Promise.resolve({ getTracks: () => [currentTrack] } as unknown as MediaStream);
    });
    vi.spyOn(MockMediaRecorder.prototype, 'start').mockImplementationOnce(() => {
      throw new Error('device startup failed');
    });
    render(<Harness />);
    await act(async () => { await latest.start(); });
    expect(latest.status).toBe('idle');
    expect(latest.error).toBe('无法启动录音。');
    expect(firstMic.stop).toHaveBeenCalled();
    expect(firstMic.listenerCount()).toBe(0);
    await act(async () => { await latest.start(); });
    expect(latest.status).toBe('recording');
    expect(secondMic.listenerCount()).toBe(1);
    act(() => latest.clearAudio());
    expect(secondMic.listenerCount()).toBe(0);
  });

  it('没有录到声音时报错', async () => {
    mockDevices(() => Promise.resolve(fakeStream()));
    render(<Harness />);
    await act(async () => {
      await latest.start();
    });
    act(() => {
      latest.stop();
    });
    expect(latest.status).toBe('idle');
    expect(latest.error).toBe('没有录到声音，请检查麦克风并重试。');
  });
});
