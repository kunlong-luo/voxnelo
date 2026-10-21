/**
 * Pure, deterministic local ASR scoring. No audio/network IO and no stored
 * transcriptions; align words with Levenshtein substitutions/deletions/insertions.
 */
export interface WordCounts {
  referenceWords: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  wordErrorRate: number;
}
export type AsrDecoderId = 'greedy_search' | 'modified_beam_search' | 'moonshine-small-streaming' | 'moonshine-medium-streaming';
export interface MeasuredAsrAttempt extends WordCounts {
  id: string;
  scenario: 'quiet' | 'noise';
  decoder: AsrDecoderId;
  durationSeconds: number;
  elapsedSeconds: number;
  realTimeFactor: number;
}
export function tokenizeAsr(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)*/g) ?? [];
}
type Cell = { cost: number; substitutions: number; deletions: number; insertions: number };
export function scoreTranscript(reference: string, transcript: string): WordCounts {
  const expected = tokenizeAsr(reference), actual = tokenizeAsr(transcript);
  if (!expected.length) throw Error('ASR reference must contain English words');
  let previous: Cell[] = Array.from({ length: actual.length + 1 }, (_, i) =>
    ({ cost: i, substitutions: 0, deletions: 0, insertions: i }));
  for (let i = 1; i <= expected.length; i++) {
    const row: Cell[] = [{ cost: i, substitutions: 0, deletions: i, insertions: 0 }];
    for (let j = 1; j <= actual.length; j++) {
      const diagonal = previous[j - 1]!;
      const equal = expected[i - 1] === actual[j - 1];
      const sub: Cell = equal ? diagonal :
        { ...diagonal, cost: diagonal.cost + 1, substitutions: diagonal.substitutions + 1 };
      const above = previous[j]!;
      const del: Cell = { ...above, cost: above.cost + 1, deletions: above.deletions + 1 };
      const left = row[j - 1]!;
      const ins: Cell = { ...left, cost: left.cost + 1, insertions: left.insertions + 1 };
      // Deterministic priority on ties: diagonal, deletion, insertion.
      row.push([sub, del, ins].reduce((best, item) => item.cost < best.cost ? item : best));
    }
    previous = row;
  }
  const result = previous[actual.length]!;
  return {
    referenceWords: expected.length,
    substitutions: result.substitutions,
    deletions: result.deletions,
    insertions: result.insertions,
    wordErrorRate: Number((result.cost / expected.length).toFixed(4)),
  };
}
export interface AsrGroupSummary extends WordCounts {
  scenario: 'quiet' | 'noise';
  decoder: AsrDecoderId;
  sampleCount: number;
  realTimeFactor: number;
}
export function summarizeAsrAttempts(attempts: readonly MeasuredAsrAttempt[]): AsrGroupSummary[] {
  const scenarios = ['quiet', 'noise'] as const;
  const decoders: readonly AsrDecoderId[] = ['greedy_search', 'modified_beam_search', 'moonshine-small-streaming', 'moonshine-medium-streaming'];
  const output: AsrGroupSummary[] = [];
  for (const scenario of scenarios) for (const decoder of decoders) {
    const items = attempts.filter(a => a.scenario === scenario && a.decoder === decoder);
    if (!items.length) continue;
    const sum = <K extends 'referenceWords' | 'substitutions' | 'deletions' | 'insertions' | 'durationSeconds' | 'elapsedSeconds'>(key: K) =>
      items.reduce((total, item) => total + item[key], 0);
    const referenceWords = sum('referenceWords');
    const duration = sum('durationSeconds');
    const errors = sum('substitutions') + sum('deletions') + sum('insertions');
    if (!referenceWords || duration <= 0) throw Error('Invalid ASR batch totals');
    output.push({
      scenario, decoder, sampleCount: items.length, referenceWords,
      substitutions: sum('substitutions'),
      deletions: sum('deletions'),
      insertions: sum('insertions'),
      wordErrorRate: Number((errors / referenceWords).toFixed(4)),
      realTimeFactor: Number((sum('elapsedSeconds') / duration).toFixed(4)),
    });
  }
  return output;
}
