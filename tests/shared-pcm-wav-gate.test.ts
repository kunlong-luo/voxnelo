import { describe, expect, it } from 'vitest';
import { validatePcm16MonoWav } from '@voxnelo/audio';
import { inspectReviewPcmWav } from '../scripts/reviewed-audio-validator.mts';

// Synthetic PCM silence is a format fixture only, not a speech recording.
function fmt(rate = 16000): Buffer {
  const format = Buffer.alloc(16);
  format.writeUInt16LE(1, 0); // PCM
  format.writeUInt16LE(1, 2); // mono
  format.writeUInt32LE(rate, 4);
  format.writeUInt32LE(rate * 2, 8);
  format.writeUInt16LE(2, 12);
  format.writeUInt16LE(16, 14);
  return format;
}
function chunk(id: string, payload: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.write(id, 0, 'ascii');
  head.writeUInt32LE(payload.length, 4);
  return Buffer.concat([head, payload, Buffer.alloc(payload.length & 1)]);
}
function wav(chunks: Buffer[] = [chunk('fmt ', fmt()), chunk('data', Buffer.alloc(8000))]): Buffer {
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WAVE', 8, 'ascii');
  return Buffer.concat([header, body]);
}
const inspect = (bytes: Uint8Array) => validatePcm16MonoWav(bytes);
const audit = (bytes: Buffer) => inspectReviewPcmWav(bytes, 16000, 250);

describe('shared WAV format policy between offline intake and renderer', () => {
  it('accepts an exact clean mono PCM16 WAV in both runtimes', () => {
    const bytes = wav();
    expect(inspect(bytes)).toEqual([]);
    expect(audit(bytes)).toEqual([]);
  });

  it('accepts padded metadata chunks, extra PCM extension of zero, and sliced buffers', () => {
    const format = Buffer.concat([fmt(), Buffer.alloc(2)]);
    const bytes = wav([
      chunk('JUNK', Buffer.from([1, 2, 3])),
      chunk('fmt ', format),
      chunk('data', Buffer.alloc(8000)),
      chunk('LIST', Buffer.from([9])),
    ]);
    const padded = Buffer.concat([Buffer.alloc(17), bytes, Buffer.alloc(19)]);
    const slice = padded.subarray(17, 17 + bytes.length);
    expect(inspect(slice)).toEqual([]);
    expect(audit(slice)).toEqual([]);
    expect(inspect(slice)).toEqual(validatePcm16MonoWav(slice, { sampleRateHz: 16000, durationMs: 250 }));
  });

  it('rejects incorrect RIFF header and length in both validators', () => {
    const badMagic = wav();
    badMagic.write('RIFX', 0, 'ascii');
    const badSize = wav();
    badSize.writeUInt32LE(111, 4);
    for (const bytes of [badMagic, badSize, Buffer.alloc(16)]) {
      expect(inspect(bytes).join(' ')).toMatch(/RIFF header\/length/);
      expect(audit(bytes).join(' ')).toMatch(/RIFF header\/length/);
    }
  });

  it('rejects compressed audio disguised as WAV, stereo and invalid block alignment', () => {
    const compression = fmt();
    compression.writeUInt16LE(3, 0);
    const stereo = fmt();
    stereo.writeUInt16LE(2, 2);
    const misaligned = fmt();
    misaligned.writeUInt16LE(4, 12);
    for (const format of [compression, stereo, misaligned]) {
      const bytes = wav([chunk('fmt ', format), chunk('data', Buffer.alloc(8000))]);
      expect(inspect(bytes).join(' ')).toContain('mono PCM16');
      expect(audit(bytes).join(' ')).toContain('mono PCM16');
    }
  });

  it('rejects a nonzero fmt extension and too-short fmt chunk', () => {
    const extension = Buffer.concat([fmt(), Buffer.from([1, 0])]);
    const tooShort = Buffer.alloc(15);
    for (const format of [extension, tooShort]) {
      const bytes = wav([chunk('fmt ', format), chunk('data', Buffer.alloc(8000))]);
      expect(inspect(bytes).join(' ')).toContain('fmt chunk');
      expect(audit(bytes).join(' ')).toContain('fmt chunk');
    }
  });

  it('rejects duplicate fmt/data chunks and data-before-format', () => {
    const conditions = [
      wav([chunk('fmt ', fmt()), chunk('fmt ', fmt()), chunk('data', Buffer.alloc(8000))]),
      wav([chunk('fmt ', fmt()), chunk('data', Buffer.alloc(8000)), chunk('data', Buffer.alloc(8000))]),
      wav([chunk('data', Buffer.alloc(8000)), chunk('fmt ', fmt())]),
    ];
    for (const bytes of conditions) {
      expect(inspect(bytes).length).toBeGreaterThan(0);
      expect(audit(bytes).length).toBeGreaterThan(0);
    }
  });

  it('rejects missing data bytes, truncated chunks and illegal odd PCM length', () => {
    const files = [
      wav([chunk('fmt ', fmt()), chunk('data', Buffer.alloc(0))]),
      wav([chunk('fmt ', fmt()), chunk('data', Buffer.alloc(8001))]),
      wav([chunk('fmt ', fmt()), chunk('data', Buffer.alloc(10))]).subarray(0, 51),
    ];
    for (const bytes of files) {
      expect(inspect(bytes).length).toBeGreaterThan(0);
      expect(audit(bytes).length).toBeGreaterThan(0);
    }
  });

  it('keeps playback and manifest aligned on 150–15000 ms and 16–48 kHz', () => {
    const tooBrief = wav([chunk('fmt ', fmt()), chunk('data', Buffer.alloc(400))]);
    const tooLong = wav([chunk('fmt ', fmt()), chunk('data', Buffer.alloc(500000))]);
    const wrongRate = wav([chunk('fmt ', fmt(96000)), chunk('data', Buffer.alloc(8000))]);
    for (const bytes of [tooBrief, tooLong, wrongRate]) {
      expect(inspect(bytes).length).toBeGreaterThan(0);
      expect(audit(bytes).length).toBeGreaterThan(0);
    }
    const rightFormatWrongDuration = validatePcm16MonoWav(wav(), { sampleRateHz: 16000, durationMs: 1400 });
    expect(rightFormatWrongDuration.join(' ')).toContain('duration');
    const wrongDeclaredRate = validatePcm16MonoWav(wav(), { sampleRateHz: 44100, durationMs: 250 });
    expect(wrongDeclaredRate.join(' ')).toContain('sample rate');
    // Neither path is able to assert IPA alignment, speaker identity, or rights.
  });
});
