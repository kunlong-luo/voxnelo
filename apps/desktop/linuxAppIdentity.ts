import path from 'node:path';

/**
 * The Linux desktop file has the form <app-id>.desktop; the ID matches
 * Electron's Wayland app_id / X11 WM_CLASS and electron-builder's launcher.
 */
export const LINUX_DESKTOP_FILENAME = 'app.voxnelo.desktop.desktop';
export const LINUX_ICON_RESOURCE = path.join('icons', 'voxnelo.png');

/** Resolve one existing Voxnelo PNG for both unpackaged and installed Electron. */
export function resolveLinuxIconPath(options: {
  isPackaged: boolean;
  bundleDir: string;
  resourcesPath: string;
}): string {
  return options.isPackaged
    ? path.join(options.resourcesPath, LINUX_ICON_RESOURCE)
    : path.resolve(options.bundleDir, '..', 'build', 'icon.png');
}
