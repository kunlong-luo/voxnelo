/**
 * Local-only appearance preference. Never interacts with the learning DB or audio.
 * Nordic stays the default until a product decision changes it.
 */
export type AppearanceTheme = 'nordic' | 'sunset';
export const APPEARANCE_KEY = 'voxnelo.appearance.theme';

export function parseAppearance(value: unknown): AppearanceTheme {
  return value === 'sunset' ? 'sunset' : 'nordic';
}

export function readAppearance(): AppearanceTheme {
  try {
    if (typeof window === 'undefined') return 'nordic';
    return parseAppearance(window.localStorage.getItem(APPEARANCE_KEY));
  } catch {
    // Sandboxed/storage-disabled windows still render the Nordic baseline.
    return 'nordic';
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
