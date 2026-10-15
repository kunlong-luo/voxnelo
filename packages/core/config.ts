/**
 * 全仓共享的应用常量：版本号、协议源、主题色、窗口尺寸、推荐权重。
 *（TTS 速率属音频域，见 packages/audio/speech.ts。）
 *
 * 注意 dev 端口 3000 仍有三处需手动同步（构建配置无法引用 TS 常量）：
 * - rsbuild.config.ts 的 server.port
 * - package.json 的 dev:renderer / dev:web / dev:desktop 脚本
 * - apps/web/index.html 的 CSP connect-src
 * 改端口时请同步以上三处，并确认 DEV_ORIGIN 一致。
 */
export const APP_VERSION = '0.1.0';

export const APP_SCHEME = 'voxnelo';
export const APP_ORIGIN = 'voxnelo://app';
export const DEV_ORIGIN = 'http://127.0.0.1:3000';

export const THEME_BACKGROUND = '#eff6ff';

export const WINDOW_SIZE = {
  width: 1160,
  height: 760,
  minWidth: 800,
  minHeight: 610,
} as const;

export const RECOMMEND_WEIGHTS = {
  unseen: 8,
  review: 4,
  unpracticed: 3,
  practiced: 1,
} as const;
export const RECENT_WINDOW = 5;
export const RANDOM_CEIL = 0.999999999;
