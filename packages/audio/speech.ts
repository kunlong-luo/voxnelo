const TTS_RATE = { normal: 0.96, slow: 0.75 } as const;
const TTS_PITCH = 1;
const WAIT_FOR_VOICES_MS = 650;

export interface SpeechResult {
  ok: boolean;
  message?: string;
  cancelled?: boolean;
}

type SpeechSpeed = 'normal' | 'slow';
type NativeSpeechBridge = {
  synthesizeEnglish(text: string, speed: SpeechSpeed): Promise<
    { ok: true; wavBase64: string } | { ok: false; reason: 'not-installed' | 'failed' | 'cancelled' | 'invalid' }
  >;
  cancel(): void;
};

let generation = 0;
let playingNative: HTMLAudioElement | null = null;
let nativeAudioUrl: string | null = null;

function nativeBridge(): NativeSpeechBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  const desktop = (window as Window & { voxneloDesktop?: { platform?: string; speech?: NativeSpeechBridge } }).voxneloDesktop;
  return desktop?.platform === 'linux' ? desktop.speech : undefined;
}

function englishVoice(synthesis: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synthesis.getVoices();
  return voices.find((voice) => voice.lang.toLowerCase() === 'en-us') ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
}

function waitForEnglishVoice(synthesis: SpeechSynthesis): Promise<SpeechSynthesisVoice | undefined> {
  const initial = englishVoice(synthesis);
  if (initial || synthesis.getVoices().length > 0) return Promise.resolve(initial);
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: SpeechSynthesisVoice | undefined) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      synthesis.removeEventListener?.('voiceschanged', onChanged);
      resolve(value);
    };
    const onChanged = () => {
      const value = englishVoice(synthesis);
      if (value || synthesis.getVoices().length > 0) finish(value);
    };
    const timeout = setTimeout(() => finish(englishVoice(synthesis)), WAIT_FOR_VOICES_MS);
    synthesis.addEventListener('voiceschanged', onChanged);
    onChanged();
  });
}

function clearNativeAudio(): void {
  if (playingNative) {
    playingNative.pause();
    playingNative.removeAttribute('src');
    playingNative.load();
    playingNative = null;
  }
  if (nativeAudioUrl) {
    URL.revokeObjectURL(nativeAudioUrl);
    nativeAudioUrl = null;
  }
}

/** Cancel pending native generation, current WAV replay and browser TTS. */
export function stopSpeech(): void {
  generation += 1;
  if (typeof window === 'undefined') return;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  nativeBridge()?.cancel();
  clearNativeAudio();
}

/**
 * Browser voice when available; Linux Electron synthesizes an offline WAV
 * through a tiny, strictly allowlisted main-process bridge if Chromium has
 * no English voices. Both engines use the same stopSpeech cancellation.
 */
export async function speakEnglish(text: string, speed: SpeechSpeed = 'normal'): Promise<SpeechResult> {
  if (typeof window === 'undefined') return { ok: false, message: '当前环境不支持语音朗读。' };
  stopSpeech();
  const request = generation;
  const native = nativeBridge();
  const synthesis = 'speechSynthesis' in window ? window.speechSynthesis : undefined;
  let voice = synthesis ? englishVoice(synthesis) : undefined;

  // An initially empty Chromium voice list can populate asynchronously.
  // On Linux with no English voices, the desktop fallback avoids waiting.
  if (!voice && synthesis && !native) voice = await waitForEnglishVoice(synthesis);
  if (request !== generation) return { ok: false, cancelled: true };

  if (synthesis && voice) {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = speed === 'slow' ? TTS_RATE.slow : TTS_RATE.normal;
      utterance.pitch = TTS_PITCH;
      synthesis.speak(utterance);
      return { ok: true };
    } catch {
      // Fall through to local Linux if the renderer's speech engine throws.
    }
  }

  if (!native) return {
    ok: false,
    message: synthesis
      ? '未找到可用的英语语音。请检查系统的英语语音引擎，或使用安装了英语语音的浏览器。'
      : '当前环境不支持语音朗读。',
  };

  let result: Awaited<ReturnType<NativeSpeechBridge['synthesizeEnglish']>>;
  try {
    result = await native.synthesizeEnglish(text, speed);
  } catch {
    if (request !== generation) return { ok: false, cancelled: true };
    return { ok: false, message: 'Linux 本地英语语音服务暂时无法运行，请检查应用或系统音频设置。' };
  }
  if (request !== generation) return { ok: false, cancelled: true };
  if (!result.ok) {
    if (result.reason === 'cancelled') return { ok: false, cancelled: true };
    return { ok: false, message: result.reason === 'not-installed'
      ? '未找到本地英语合成引擎。Pop!_OS 可运行 sudo apt install espeak-ng，安装后重试。'
      : 'Linux 英语语音生成失败，请检查 eSpeak 引擎及系统音频。' };
  }

  try {
    const raw = atob(result.wavBase64);
    const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'audio/wav' });
    nativeAudioUrl = URL.createObjectURL(blob);
    const audio = new Audio(nativeAudioUrl);
    playingNative = audio;
    audio.addEventListener('ended', () => {
      if (playingNative === audio) clearNativeAudio();
    }, { once: true });
    await audio.play();
    if (request !== generation) return { ok: false, cancelled: true };
    return { ok: true };
  } catch {
    // A sentence switch can abort a pending Audio.play() promise. That is a
    // deliberate cancellation, not a broken output device.
    const cancelled = request !== generation;
    clearNativeAudio();
    if (cancelled) return { ok: false, cancelled: true };
    return { ok: false, message: '已生成英语语音，但无法播放。请检查 Pop!_OS 的默认输出设备与音量。' };
  }
}

let primed = false;

/** Warm the Chromium Web Speech voice cache; empty voices are not fatal. */
export function primeSpeechVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || primed) return;
  primed = true;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices(), { once: true });
}
