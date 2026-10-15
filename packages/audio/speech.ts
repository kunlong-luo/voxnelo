import { TTS_PITCH, TTS_RATE } from '../core/config';

export interface SpeechResult {
  ok: boolean;
  message?: string;
}

/** V0.1 暂用系统提供的英语 TTS，不能作为专业音标发音准确性认证。。 */
export function speakEnglish(text: string, speed: 'normal' | 'slow' = 'normal'): SpeechResult {
  if (!('speechSynthesis' in window)) {
    return { ok: false, message: '当前系统没有可用的语音朗读功能。' };
  }
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((candidate) => candidate.lang.toLowerCase() === 'en-us') ??
    voices.find((candidate) => candidate.lang.toLowerCase().startsWith('en'));
  if (!voice) return { ok: false, message: '未检测到英语语音包，请先在系统中安装英语语音。' };
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = speed === 'slow' ? TTS_RATE.slow : TTS_RATE.normal;
  utterance.pitch = TTS_PITCH;
  window.speechSynthesis.speak(utterance);
  return { ok: true };
}

export function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
