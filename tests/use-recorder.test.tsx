// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useRecorder } from '../apps/web/src/useRecorder';

afterEach(cleanup);

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];
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
    this.onstop?.();
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

let latest: ReturnType<typeof useRecorder>;

function Harness(): null {
  latest = useRecorder();
  return null;
}

beforeEach(() => {
  MockMediaRecorder.instances = [];
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
    expect(latest.error).toBe('未找到可用麦克风或设备被占用，请检查连接后重试。');
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

  it('完整录音流程：请求中→录音中→就绪并产出回听地址', async () => {
    mockDevices(() => Promise.resolve(fakeStream()));
    render(<Harness />);
    await act(async () => {
      await latest.start();
    });
    expect(latest.status).toBe('recording');
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
