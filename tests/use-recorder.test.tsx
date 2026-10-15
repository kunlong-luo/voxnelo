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
    expect(latest.error).toBe('麦克风未获授权。你仍然可以听示范和查看短句。');
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
