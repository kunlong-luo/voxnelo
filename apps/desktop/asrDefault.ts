/** Moonshine is the user-facing default on the three supported desktop
 * platform families. Unsupported machines fail closed; no Zipformer fallback.
 * The native runtime must be installed and verified separately by the owner.
 */
export type DesktopAsrEngine = 'moonshine-medium' | 'zipformer';

export function defaultDesktopAsrEngine(platform: string): DesktopAsrEngine {
  return platform === 'linux' || platform === 'win32' || platform === 'darwin'
    ? 'moonshine-medium' : 'zipformer';
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
