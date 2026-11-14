// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playValidatedLocalWav, stopSpeech } from '@voxnelo/audio';
import { SENTENCES, speakLessonReference } from '@voxnelo/learning';

// Synthetic PCM tones used ONLY in tests; not recordings of real speech.
function testWav(sample: number): Uint8Array {
  const rate = 16000;
  const count = 4000; // 250 ms
  const bytes = new Uint8Array(44 + count * 2);
  const view = new DataView(bytes.buffer);
  const put = (offset: number, text: string) =>
    Array.from(text).forEach((letter, i) => { bytes[offset + i] = letter.charCodeAt(0); });
  put(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  put(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  put(36, 'data');
  view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) view.setInt16(44 + i * 2, sample, true);
  return bytes;
}

const checksum = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

class FakeAudio {
  static players: FakeAudio[] = [];
  static playImpl: () => Promise<void> = () => Promise.resolve();
  playbackRate = 1;
  play = vi.fn(() => FakeAudio.playImpl());
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  addEventListener = vi.fn();
  constructor(public src: string) { FakeAudio.players.push(this); }
}

function stubMedia() {
  const createObjectURL = vi.fn(() => 'blob:local-reference-audio');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  vi.stubGlobal('Audio', FakeAudio);
  return { createObjectURL, revokeObjectURL };
}
function stubHash() {
  const digest = vi.fn(async (_algorithm: string, input: ArrayBuffer) =>
    Uint8Array.from(createHash('sha256').update(new Uint8Array(input)).digest()).buffer);
  vi.stubGlobal('crypto', { subtle: { digest } });
  return digest;
}

afterEach(() => {
  stopSpeech();
  Reflect.deleteProperty(window, 'speechSynthesis');
  FakeAudio.players = [];
  FakeAudio.playImpl = () => Promise.resolve();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('offline local WAV playback foundation, inaccessible to unreviewed UI', () => {
  it('verifies actual bytes and plays the supplied local WAV at normal speed', async () => {
    const url = stubMedia();
    const digest = stubHash();
    const wav = testWav(100);
    expect(await playValidatedLocalWav(wav, checksum(wav), 'normal')).toEqual({ ok: true });
    expect(digest).toHaveBeenCalledOnce();
    expect(url.createObjectURL).toHaveBeenCalledOnce();
    expect(FakeAudio.players[0]?.playbackRate).toBe(1);
    expect(FakeAudio.players[0]?.play).toHaveBeenCalledOnce();
    stopSpeech();
    expect(FakeAudio.players[0]?.pause).toHaveBeenCalled();
    expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:local-reference-audio');
  });

  it('slow playback adjusts one take, does not claim/create a second recording', async () => {
    stubMedia();
    stubHash();
    const wav = testWav(250);
    expect((await playValidatedLocalWav(wav, checksum(wav), 'slow')).ok).toBe(true);
    expect(FakeAudio.players).toHaveLength(1);
    expect(FakeAudio.players[0]?.playbackRate).toBe(0.75);
  });

  it('rejects missing Web Crypto, wrong digest and tampered WAV before any playback', async () => {
    const media = stubMedia();
    const wav = testWav(20);
    vi.stubGlobal('crypto', { subtle: undefined });
    expect((await playValidatedLocalWav(wav, checksum(wav))).ok).toBe(false);
    expect(media.createObjectURL).not.toHaveBeenCalled();
    stubHash();
    const changed = testWav(21);
    const mismatch = await playValidatedLocalWav(changed, checksum(wav));
    expect(mismatch.ok).toBe(false);
    expect(mismatch.message).toContain('SHA-256');
    expect(media.createObjectURL).not.toHaveBeenCalled();
    const wrongFormat = new Uint8Array(wav);
    wrongFormat[0] = 1;
    expect((await playValidatedLocalWav(wrongFormat, checksum(wrongFormat))).ok).toBe(false);
    expect(media.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects RIFF truncation, unsupported channels and impossible duration', async () => {
    const media = stubMedia();
    stubHash();
    const short = new Uint8Array(12);
    const stereo = testWav(10);
    new DataView(stereo.buffer).setUint16(22, 2, true);
    const long = testWav(11);
    new DataView(long.buffer).setUint32(40, 32_000, true);
    for (const wav of [short, stereo, long]) {
      expect((await playValidatedLocalWav(wav, checksum(wav))).ok).toBe(false);
    }
    expect(media.createObjectURL).not.toHaveBeenCalled();
  });

  it('cancels pending hash before Audio is constructed on a sentence switch', async () => {
    const media = stubMedia();
    let resolveHash: ((hash: ArrayBuffer) => void) | undefined;
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(() => new Promise<ArrayBuffer>(resolve => {
      resolveHash = resolve;
    })) } });
    const wav = testWav(10);
    const pending = playValidatedLocalWav(wav, checksum(wav), 'normal');
    await vi.waitFor(() => expect(resolveHash).toBeTypeOf('function'));
    stopSpeech();
    resolveHash?.(Uint8Array.from(createHash('sha256').update(wav).digest()).buffer);
    expect(await pending).toEqual({ ok: false, cancelled: true });
    expect(media.createObjectURL).not.toHaveBeenCalled();
  });

  it('cancels a pending audio.play() when recording begins instead of showing a playback error', async () => {
    const media = stubMedia();
    stubHash();
    let failPlay: ((error: Error) => void) | undefined;
    FakeAudio.playImpl = () => new Promise<void>((_resolve, reject) => { failPlay = reject; });
    const wav = testWav(3);
    const pending = playValidatedLocalWav(wav, checksum(wav));
    await vi.waitFor(() => expect(failPlay).toBeTypeOf('function'));
    stopSpeech();
    failPlay?.(new Error('AbortError'));
    expect(await pending).toEqual({ ok: false, cancelled: true });
    expect(FakeAudio.players[0]?.pause).toHaveBeenCalled();
    expect(media.revokeObjectURL).toHaveBeenCalledOnce();
  });

  it('playing a different reference cancels and revokes the previous blob', async () => {
    const media = stubMedia();
    stubHash();
    const one = testWav(7);
    const two = testWav(8);
    await playValidatedLocalWav(one, checksum(one));
    await playValidatedLocalWav(two, checksum(two));
    expect(FakeAudio.players[0]?.pause).toHaveBeenCalled();
    expect(media.revokeObjectURL).toHaveBeenCalled();
    expect(FakeAudio.players[1]?.play).toHaveBeenCalledOnce();
  });

  it('never claims successful playback when the audio output device rejects play()', async () => {
    const media = stubMedia();
    stubHash();
    FakeAudio.playImpl = () => Promise.reject(new Error('no device'));
    const wav = testWav(5);
    const result = await playValidatedLocalWav(wav, checksum(wav));
    expect(result.ok).toBe(false);
    expect(result.message).toContain('无法播放');
    expect(media.revokeObjectURL).toHaveBeenCalledOnce();
  });
});

describe('learning provenance guard (no human-reviewed references available)', () => {
  it('uses system TTS for carefully/naturally requested but unreviewed sentences', async () => {
    const speak = vi.fn();
    const synthesis = {
      getVoices: vi.fn(() => [{ lang: 'en-US' }]),
      cancel: vi.fn(),
      speak,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synthesis, configurable: true });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = '';
      rate = 1;
      pitch = 1;
      voice = null;
      constructor(public text: string) {}
    });
    const sentence = SENTENCES.find(s => s.id === 's008');
    if (!sentence) throw Error('Expected starter sentence');
    const result = await speakLessonReference(sentence, 'natural');
    expect(result).toMatchObject({
      ok: true, requestedSource: 'natural',
      playedSource: 'system-tts',
      unavailableReason: 'review-pending',
    });
    expect(speak).toHaveBeenCalledOnce();
    expect((await speakLessonReference(sentence, 'careful')).playedSource).toBe('system-tts');
    const normal = await speakLessonReference(sentence, 'system-tts');
    expect(normal).toMatchObject({ ok: true, playedSource: 'system-tts' });
    expect(normal).not.toHaveProperty('unavailableReason');
  });

  it('rejects mismatched course content instead of feeding arbitrary manifest text to TTS', async () => {
    const original = SENTENCES.find(s => s.id === 's008');
    if (!original) throw Error('Expected starter sentence');
    const tampered = { ...original, english: 'Injected text' };
    const result = await speakLessonReference(tampered, 'natural');
    expect(result.ok).toBe(false);
    expect(result.playedSource).toBe('system-tts');
    expect(result.message).toContain('课程内容已更改');
  });
});
