/**
 * Low-level playback for already-approved, locally supplied WAV bytes.
 *
 * Does not fetch URLs, select a reference source, authenticate licensing,
 * review phonetics, or make an editorial-draft phrase eligible for playback.
 * A separate trusted curriculum/media gate must approve every asset first.
 */
export interface OfflineWavResult {
  ok: boolean;
  cancelled?: boolean;
  message?: string;
}

let generation = 0;
let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;

function releaseAudio(): void {
  const player = activeAudio;
  activeAudio = null;
  if (player) {
    player.pause();
    player.removeAttribute('src');
    player.load();
  }
  const url = activeUrl;
  activeUrl = null;
  if (url) URL.revokeObjectURL(url);
}

/** Cancels playback AND any pending integrity check before the audio starts. */
export function stopOfflineWav(): void {
  generation++;
  releaseAudio();
}

function hasValidPcmHeader(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 44 || bytes.byteLength > 20_000_000) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 12) !== 'WAVE' ||
      view.getUint32(4, true) !== bytes.byteLength - 8) return false;

  let offset = 12;
  let formatChunks = 0;
  let dataChunks = 0;
  let rate = 0;
  let audioBytes = 0;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) return false;
    const type = ascii(offset, offset + 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + size;
    if (end > bytes.byteLength || end < start) return false;
    if (type === 'fmt ') {
      if (size < 16) return false;
      formatChunks++;
      rate = view.getUint32(start + 4, true);
      if (view.getUint16(start, true) !== 1 ||
          view.getUint16(start + 2, true) !== 1 ||
          !Number.isInteger(rate) || rate < 16000 || rate > 48000 ||
          view.getUint32(start + 8, true) !== rate * 2 ||
          view.getUint16(start + 12, true) !== 2 ||
          view.getUint16(start + 14, true) !== 16) return false;
    }
    if (type === 'data') {
      dataChunks++;
      audioBytes = size;
    }
    offset = end + size % 2;
  }
  if (offset !== bytes.byteLength || formatChunks !== 1 || dataChunks !== 1 ||
      audioBytes === 0 || audioBytes % 2 !== 0) return false;
  const durationMs = audioBytes / (rate * 2) * 1000;
  return durationMs >= 150 && durationMs <= 15000;
}

/**
 * Hashes the actual bytes *before* creating the audio element. Caller must
 * supply a separately-reviewed asset; a valid digest does not prove rights.
 * Slower playback is time-stretch of the same take, never a second recording.
 */
export async function playOfflineWavBytes(
  suppliedBytes: Uint8Array, expectedSha256: string, speed: 'normal' | 'slow',
): Promise<OfflineWavResult> {
  stopOfflineWav();
  const request = generation;
  if (typeof window === 'undefined' || typeof crypto === 'undefined' || !crypto.subtle ||
      !/^[a-f0-9]{64}$/iu.test(expectedSha256)) {
    return { ok: false, message: '离线音频校验不可用，已拒绝播放。' };
  }
  // Defensive clone: an async digest must never validate different bytes
  // from the ones eventually passed to Blob/Audio.
  const bytes = Uint8Array.from(suppliedBytes);
  if (!hasValidPcmHeader(bytes)) {
    return { ok: false, message: '参考音频格式不正确，已拒绝播放。' };
  }
  let actualSha256: string;
  try {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer));
    actualSha256 = Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    if (request !== generation) return { ok: false, cancelled: true };
    return { ok: false, message: '离线音频完整性校验失败，已拒绝播放。' };
  }
  if (request !== generation) return { ok: false, cancelled: true };
  if (actualSha256 !== expectedSha256.toLowerCase()) {
    return { ok: false, message: '离线音频 SHA-256 不匹配，已拒绝播放。' };
  }

  try {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    activeUrl = url;
    const player = new Audio(url);
    activeAudio = player;
    player.playbackRate = speed === 'slow' ? 0.75 : 1;
    player.addEventListener('ended', () => {
      if (activeAudio === player) releaseAudio();
    }, { once: true });
    await player.play();
    if (request !== generation) return { ok: false, cancelled: true };
    return { ok: true };
  } catch {
    const cancelled = request !== generation;
    if (!cancelled) releaseAudio();
    return cancelled
      ? { ok: false, cancelled: true }
      : { ok: false, message: '离线音频无法播放，请检查输出设备。' };
  }
}
