// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { primeSpeechVoices, speakEnglish, stopSpeech } from '@voxnelo/audio';

interface MockVoice { lang: string }
class MockUtterance {
  static instances: MockUtterance[] = [];
  voice: MockVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  constructor(public text: string) { MockUtterance.instances.push(this); }
}
class MockAudio {
  static instances: MockAudio[] = [];
  static playImpl: () => Promise<void> = () => Promise.resolve();
  play = vi.fn(() => MockAudio.playImpl());
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  addEventListener = vi.fn();
  constructor(public src: string) { MockAudio.instances.push(this); }
}
function mockSynthesis(langs: string[]) {
  const synthesis = {
    getVoices: vi.fn(() => langs.map((lang) => ({ lang }))),
    cancel: vi.fn(), speak: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synthesis, configurable: true });
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  return synthesis;
}
function nativeSpeech() {
  const synthesizeEnglish = vi.fn().mockResolvedValue({
    ok: true, wavBase64: btoa('RIFF----WAVEtest-data'),
  });
  const cancel = vi.fn();
  vi.stubGlobal('voxneloDesktop', { platform: 'linux', speech: { synthesizeEnglish, cancel } });
  vi.stubGlobal('Audio', MockAudio);
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:linux-tts'),
    revokeObjectURL: vi.fn(),
  }));
  return { synthesizeEnglish, cancel };
}
afterEach(() => {
  stopSpeech();
  Reflect.deleteProperty(window, 'speechSynthesis');
  Reflect.deleteProperty(window, 'voxneloDesktop');
  MockUtterance.instances = [];
  MockAudio.instances = [];
  MockAudio.playImpl = () => Promise.resolve();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('speech', () => {
  it('unsupported browser reports a recoverable error', async () => {
    expect(() => primeSpeechVoices()).not.toThrow();
    expect(await speakEnglish('Hello')).toEqual({
      ok: false, message: '当前环境不支持语音朗读。',
    });
    expect(() => stopSpeech()).not.toThrow();
  });
  it('prefers en-US voice and adjusts rate', async () => {
    const synthesis = mockSynthesis(['fr-FR','en-US','en-GB']);
    expect(await speakEnglish('Hello')).toEqual({ ok: true });
    expect(synthesis.speak).toHaveBeenCalledOnce();
    expect(MockUtterance.instances[0]?.rate).toBe(0.96);
    expect((await speakEnglish('Hello','slow')).ok).toBe(true);
    expect(MockUtterance.instances[1]?.rate).toBe(0.75);
    expect(MockUtterance.instances[1]?.voice).toEqual({lang:'en-US'});
  });
  it('Linux with empty voices uses offline WAV playback and cancels cleanly', async () => {
    mockSynthesis([]);
    const bridge = nativeSpeech();
    expect(await speakEnglish('Hello!','slow')).toEqual({ ok:true });
    expect(bridge.synthesizeEnglish).toHaveBeenCalledWith('Hello!','slow');
    expect(MockAudio.instances[0]?.play).toHaveBeenCalledOnce();
    stopSpeech();
    expect(bridge.cancel).toHaveBeenCalled();
    expect(MockAudio.instances[0]?.pause).toHaveBeenCalled();
  });
  it('Linux without eSpeak gets precise instructions instead of generic missing voice', async () => {
    mockSynthesis(['zh-CN']);
    const bridge = nativeSpeech();
    bridge.synthesizeEnglish.mockResolvedValueOnce({ok:false,reason:'not-installed'});
    const result = await speakEnglish('Hello!');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('sudo apt install espeak-ng');
  });
  it('non-English browser voices without desktop fallback get clear message', async () => {
    mockSynthesis(['fr-FR','zh-CN']);
    const result = await speakEnglish('Hello!');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('未找到可用的英语语音');
  });
  it('切句中止 Linux TTS 播放时不误报设备播放失败', async () => {
    mockSynthesis([]);
    nativeSpeech();
    let failPlayback: ((error: Error) => void) | undefined;
    MockAudio.playImpl = () => new Promise<void>((_resolve, reject) => { failPlayback = reject; });
    const pending = speakEnglish('Hello!');
    await vi.waitFor(() => expect(failPlayback).toBeTypeOf('function'));
    stopSpeech();
    failPlayback?.(new Error('AbortError: play() interrupted by pause'));
    expect(await pending).toEqual({ok:false,cancelled:true});
  });

  it('cancelled native request cannot play stale audio', async () => {
    mockSynthesis([]);
    let resolveRequest: (result: {ok: true;wavBase64:string}) => void = () => undefined;
    const synthesizeEnglish = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    const cancel = vi.fn();
    vi.stubGlobal('voxneloDesktop', { platform:'linux', speech: {synthesizeEnglish,cancel} });
    const pending = speakEnglish('Hello!');
    stopSpeech();
    resolveRequest({ok:true,wavBase64:btoa('RIFF----WAVEtest')});
    expect(await pending).toEqual({ok:false,cancelled:true});
  });
});
