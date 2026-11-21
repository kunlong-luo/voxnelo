/** Local output playback preference only. Never changes microphone gain or ASR audio. */
export const PLAYBACK_VOLUME_KEY = 'voxnelo.audio.playback-volume';
export const VOLUME_LEVELS = [0, 0.25, 0.5, 0.75, 1] as const;
export type PlaybackVolume = (typeof VOLUME_LEVELS)[number];

export function parsePlaybackVolume(value: unknown): PlaybackVolume {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return VOLUME_LEVELS.includes(parsed as PlaybackVolume) ? parsed as PlaybackVolume : 1;
}

export function readPlaybackVolume(): PlaybackVolume {
  try {
    return typeof window === 'undefined' ? 1 : parsePlaybackVolume(window.localStorage.getItem(PLAYBACK_VOLUME_KEY));
  } catch { return 1; }
}

export function savePlaybackVolume(volume: PlaybackVolume): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(PLAYBACK_VOLUME_KEY, String(parsePlaybackVolume(volume)));
  } catch { /* Playback continues at this session's selected level. */ }
}
