/**
 * Local-only appearance preference. Never interacts with the learning DB or audio.
 * U3's Sunset Glow is the new-install default; explicit Nordic choices persist.
 */
export type AppearanceTheme = 'nordic' | 'sunset';
export const APPEARANCE_KEY = 'voxnelo.appearance.theme';

export function parseAppearance(value: unknown): AppearanceTheme {
  return value === 'nordic' ? 'nordic' : 'sunset';
}

export function readAppearance(): AppearanceTheme {
  try {
    if (typeof window === 'undefined') return 'sunset';
    return parseAppearance(window.localStorage.getItem(APPEARANCE_KEY));
  } catch {
    // Sandboxed/storage-disabled windows still render the U3 Sunset baseline.
    return 'sunset';
  }
}

export function applyAppearance(theme: AppearanceTheme): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme;
}

export function saveAppearance(theme: AppearanceTheme): void {
  applyAppearance(theme);
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(APPEARANCE_KEY, theme);
  } catch {
    // Visual preview works for this session even if storage is unavailable.
  }
}

/** Users can disable motion directly in Voxnelo; visual previews default on.
 * This does not modify operating-system accessibility settings. */
export const MOTION_STORAGE_KEY='voxnelo.appearance.motion';
export function readMotionEnabled():boolean {
  try {return typeof window==='undefined'||window.localStorage.getItem(MOTION_STORAGE_KEY)!=='off';}
  catch {return true;}
}
export function applyMotion(enabled:boolean):void {
  if(typeof document!=='undefined') document.documentElement.dataset.motion=enabled?'on':'off';
}
export function saveMotionEnabled(enabled:boolean):void {
  applyMotion(enabled);
  try {window.localStorage.setItem(MOTION_STORAGE_KEY,enabled?'on':'off');}catch {/* preview only */}
}
