/**
 * Shared browser/Node WAV inspection for future rights-cleared reference audio.
 *
 * Byte inspection is NOT human acoustic review, performer authentication,
 * licensing clearance or approval to enable natural-speech playback.
 * Keep this file free of node:* imports so CI and the renderer use one policy.
 */
export interface PcmWavExpectations {
  sampleRateHz?: number;
  durationMs?: number;
}

export function validatePcm16MonoWav(
  bytes: Uint8Array, expected: PcmWavExpectations = {},
): string[] {
  if (bytes.byteLength < 44 || bytes.byteLength > 20_000_000) {
    return ['WAV RIFF header/length is invalid or exceeds 20 MB'];
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fourCc = (position: number): string =>
    String.fromCharCode(...bytes.subarray(position, position + 4));
  if (fourCc(0) !== 'RIFF' || fourCc(8) !== 'WAVE' ||
      view.getUint32(4, true) !== bytes.byteLength - 8) {
    return ['WAV RIFF header/length is invalid'];
  }

  const errors: string[] = [];
  let offset = 12;
  let formatCount = 0;
  let pcmCount = 0;
  let sampleRate = 0;
  let pcmBytes = 0;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) {
      errors.push('WAV chunk header is truncated');
      break;
    }
    const kind = fourCc(offset);
    const length = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + length;
    const next = end + (length & 1);
    if (next > bytes.byteLength) {
      errors.push('WAV chunk exceeds file length or lacks padding');
      break;
    }

    if (kind === 'fmt ') {
      formatCount++;
      // Strict first pilot: canonical PCM, or PCM with a zero-length
      // WAVEFORMATEX extension. WAVEFORMATEXTENSIBLE is not accepted.
      if (!(length === 16 || (length === 18 && view.getUint16(start + 16, true) === 0))) {
        errors.push('WAV fmt chunk must be uncompressed PCM16');
      } else {
        sampleRate = view.getUint32(start + 4, true);
        if (view.getUint16(start, true) !== 1 ||
            view.getUint16(start + 2, true) !== 1 ||
            sampleRate < 16000 || sampleRate > 48000 ||
            view.getUint32(start + 8, true) !== sampleRate * 2 ||
            view.getUint16(start + 12, true) !== 2 ||
            view.getUint16(start + 14, true) !== 16 ||
            (expected.sampleRateHz !== undefined && sampleRate !== expected.sampleRateHz)) {
          errors.push('WAV must be mono PCM16 with matching sample rate and byte alignment');
        }
      }
    } else if (kind === 'data') {
      pcmCount++;
      if (formatCount !== 1) {
        errors.push('WAV PCM data must follow exactly one fmt chunk');
      }
      pcmBytes = length;
    }

    offset = next;
  }

  if (offset !== bytes.byteLength) errors.push('WAV contains invalid trailing bytes');
  if (formatCount !== 1 || pcmCount !== 1 || pcmBytes === 0 || pcmBytes % 2 !== 0) {
    errors.push('WAV requires exactly one fmt chunk and one nonempty PCM data chunk');
  } else if (sampleRate > 0) {
    const durationMs = pcmBytes / (sampleRate * 2) * 1000;
    if (durationMs < 150 || durationMs > 15000 ||
        (expected.durationMs !== undefined && Math.abs(durationMs - expected.durationMs) > 10)) {
      errors.push('WAV duration differs from metadata or falls outside 150–15000 ms');
    }
  }
  return errors;
}
