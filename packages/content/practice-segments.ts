import { getConnectedSpeechGuide } from './connected-speech';
import type { Sentence } from './sentences';

/**
 * Small, deterministic reading chunks from the exact course text.
 * These are text-only practice prompts, NOT phonetic alignment or reviewed audio.
 * Editorial connected-speech spans may be offered as additional options only
 * when their complete sentence/IPA identity still matches.
 */
export function practiceSegments(
  sentence: Pick<Sentence, 'id' | 'english' | 'ipa' | 'reviewStatus'>,
): string[] {
  const english = sentence.english;
  const words = [...english.matchAll(/\S+/gu)].map(match => ({
    text: match[0],
    start: match.index ?? 0,
  }));
  const result: string[] = [];
  if (words.length >= 4) {
    let cursor = 0;
    while (cursor < words.length) {
      const remaining = words.length - cursor;
      const size = remaining === 4 || remaining === 5 ? 2 : Math.min(3, remaining);
      const first = words[cursor];
      const last = words[cursor + size - 1];
      if (!first || !last) break;
      const portion = english.slice(first.start, last.start + last.text.length).trim();
      if (portion) result.push(portion);
      cursor += size;
    }
  }
  const guide = getConnectedSpeechGuide(sentence);
  for (const rule of guide?.rules ?? []) {
    // The guide already checks that the span is unique, complete and bounded.
    if (!result.some(chunk => chunk.toLowerCase() === rule.span.toLowerCase())) {
      result.push(rule.span);
    }
  }
  return result.filter(text => text.toLowerCase() !== english.trim().toLowerCase());
}
