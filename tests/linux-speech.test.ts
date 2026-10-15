import { describe, expect, it } from 'vitest';
import { SENTENCES } from '@voxnelo/content';
import { validSpeechRequest, validWave } from '../apps/desktop/linuxSpeech';

describe('Linux native English speech IPC input guard', () => {
  it('only accepts shipped lesson texts and supported speeds', () => {
    expect(validSpeechRequest(SENTENCES[0]?.english, 'normal')).toBe(true);
    expect(validSpeechRequest(SENTENCES[0]?.english, 'slow')).toBe(true);
    expect(validSpeechRequest('--help', 'normal')).toBe(false);
    expect(validSpeechRequest('Hello!; rm -rf', 'normal')).toBe(false);
    expect(validSpeechRequest(SENTENCES[0]?.english, 'fast')).toBe(false);
    expect(validSpeechRequest(null, 'slow')).toBe(false);
  });
  it('rejects empty or unrelated output instead of treating it as PCM', () => {
    expect(validWave(Buffer.alloc(0))).toBe(false);
    expect(validWave(Buffer.from('not-a-wav'.repeat(8)))).toBe(false);
    const ok = Buffer.alloc(44);
    ok.write('RIFF', 0); ok.write('WAVE', 8);
    expect(validWave(ok)).toBe(true);
  });
});
