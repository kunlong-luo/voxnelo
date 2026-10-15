// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { primeSpeechVoices, speakEnglish, stopSpeech } from '@voxnelo/audio';

interface MockVoice {
  lang: string;
}

class MockUtterance {
  static instances: MockUtterance[] = [];
  voice: MockVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  text: string;

  constructor(text: string) {
    this.text = text;
    MockUtterance.instances.push(this);
  }
}

function mockSynthesis(langs: string[]) {
  const synthesis = {
    getVoices: vi.fn(() => langs.map((lang) => ({ lang }))),
    cancel: vi.fn(),
    speak: vi.fn(),
    addEventListener: vi.fn(),
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synthesis, configurable: true });
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  return synthesis;
}

function clearSynthesis(): void {
  delete (window as unknown as Record<string, unknown>).speechSynthesis;
}

afterEach(() => {
  clearSynthesis();
  MockUtterance.instances = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('speech', () => {
  it('无语音环境时降级且不抛错', () => {
    expect(() => primeSpeechVoices()).not.toThrow();
    expect(speakEnglish('Hello')).toEqual({
      ok: false,
      message: '当前系统没有可用的语音朗读功能。',
    });
    expect(() => stopSpeech()).not.toThrow();
  });

  it('优先选用 en-US 并按语速设置 rate', () => {
    const synthesis = mockSynthesis(['fr-FR', 'en-US', 'en-GB']);
    const result = speakEnglish('Hello', 'normal');
    expect(result).toEqual({ ok: true });
    expect(synthesis.speak).toHaveBeenCalledTimes(1);
    expect(MockUtterance.instances[0]?.rate).toBe(0.96);
    const slow = speakEnglish('Hello', 'slow');
    expect(slow.ok).toBe(true);
    expect(MockUtterance.instances[1]?.rate).toBe(0.75);
    expect(MockUtterance.instances[1]?.voice).toEqual({ lang: 'en-US' });
  });

  it('无英文语音时提示安装', () => {
    mockSynthesis(['fr-FR', 'zh-CN']);
    const result = speakEnglish('Hello');
    expect(result.ok).toBe(false);
    expect(result.message).toBe('未检测到英语语音包，请先在系统中安装英语语音。');
  });
});
