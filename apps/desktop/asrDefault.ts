/**
 * The user-facing Linux default is Moonshine Medium Streaming. An absent or
 * broken model is a setup error, never permission to silently run Zipformer.
 *
 * Windows/macOS still use their existing packaged recognizer pending a native
 * Moonshine distribution; this policy deliberately does not claim otherwise.
 */
export type DesktopAsrEngine = 'moonshine-medium' | 'zipformer';

export function defaultDesktopAsrEngine(platform: string): DesktopAsrEngine {
  return platform === 'linux' ? 'moonshine-medium' : 'zipformer';
}

export function resolveDesktopAsrEngine(
  platform: string,
  requested: unknown,
): DesktopAsrEngine | null {
  if (requested === undefined) return defaultDesktopAsrEngine(platform);
  if (requested === 'moonshine-medium' || requested === 'zipformer') return requested;
  return null;
}

export function defaultEngineAvailable(
  platform: string,
  availability: { moonshineMedium: boolean; zipformer: boolean },
): boolean {
  return defaultDesktopAsrEngine(platform) === 'moonshine-medium'
    ? availability.moonshineMedium
    : availability.zipformer;
}
