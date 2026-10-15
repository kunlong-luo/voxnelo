import { SENTENCES } from '@voxnelo/content';

const englishLessonTexts = new Set(SENTENCES.map(({ english }) => english));

/** Shared trusted curriculum guard for desktop TTS; no arbitrary text/commands. */
export function isLessonSpeechRequest(text: unknown, speed: unknown): text is string {
  return typeof text === 'string' &&
    englishLessonTexts.has(text) &&
    (speed === 'normal' || speed === 'slow');
}
