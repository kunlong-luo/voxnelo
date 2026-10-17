import path from 'node:path';
import { APP_ORIGIN, APP_SCHEME, DEV_ORIGIN, SUPPORT_LINKS } from '@voxnelo/core';

const APP_PROTOCOL = `${APP_SCHEME}:`;
export const APP_HOST = new URL(APP_ORIGIN).hostname;

export interface TrustOptions {
  isDev: boolean;
  devOrigin?: string;
}

/** 导航/权限目标 URL 是否可信：dev 仅放行本地调试源，生产仅放行 voxnelo://app。 */
export function isTrustedUrl(rawUrl: string, options: TrustOptions = { isDev: false }): boolean {
  const devOrigin = options.devOrigin ?? DEV_ORIGIN;
  try {
    const parsed = new URL(rawUrl);
    if (options.isDev) return parsed.origin === devOrigin;
    return (
      parsed.protocol === APP_PROTOCOL &&
      parsed.hostname === APP_HOST &&
      !parsed.port &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

/** Only these exact public help/project URLs may leave Electron for the system browser. */
export function isAllowedSupportUrl(url: unknown): url is string {
  return typeof url === 'string' && Object.values(SUPPORT_LINKS).some((known) => known === url);
}

/** 媒体权限是否“仅音频”：非数组、空数组或含视频一律拒绝。 */
export function isAudioOnlyRequest(mediaTypes: unknown): boolean {
  return Array.isArray(mediaTypes) && mediaTypes.length > 0 && mediaTypes.every((type) => type === 'audio');
}

/** Deny permission requests from subframes with an untrusted origin.
 * Electron exposes the top-level WebContents URL even for subframe requests.
 */
export function allowsAudioPermissionRequest(
  webContentsUrl: string,
  permission: string,
  details: { mediaTypes?: unknown; requestingUrl?: unknown },
  options: TrustOptions,
): boolean {
  return permission === 'media' &&
    isAudioOnlyRequest(details.mediaTypes) &&
    typeof details.requestingUrl === 'string' &&
    isTrustedUrl(webContentsUrl, options) &&
    isTrustedUrl(details.requestingUrl, options);
}

/** Permission checks are separate from permission requests in Electron.
 * Only the trusted main frame may check audio capture; never grant camera
 * or screen capture through this callback.
 */
export function allowsAudioPermissionCheck(
  webContentsUrl: string | null,
  permission: string,
  requestingOrigin: string,
  details: {
    isMainFrame?: boolean;
    mediaType?: string;
    requestingUrl?: string;
    securityOrigin?: string;
  },
  options: TrustOptions,
): boolean {
  return permission === 'media' &&
    details.isMainFrame === true &&
    details.mediaType !== 'video' &&
    details.mediaType !== 'unknown' &&
    webContentsUrl !== null &&
    isTrustedUrl(webContentsUrl, options) &&
    isTrustedUrl(requestingOrigin, options) &&
    (details.requestingUrl === undefined || isTrustedUrl(details.requestingUrl, options)) &&
    (details.securityOrigin === undefined || isTrustedUrl(details.securityOrigin, options));
}

/**
 * 本地协议路径解析：返回 rendererDir 内的绝对路径，目录穿越返回 null。
 * decodeURIComponent 抛错时由调用方按 400 处理（行为与原内联实现一致）。
 */
export function resolveLocalFile(rendererDir: string, pathname: string): string | null {
  const relativeFile = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(rendererDir, relativeFile);
  const relative = path.relative(rendererDir, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return file;
}
