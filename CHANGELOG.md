# Changelog

格式遵循 Keep a Changelog。`Unreleased` 为已落库但未打版本标签的变更；
本仓库尚未产生 git 提交，下列条目以工作区现状为准。

## [Unreleased]

### Fixed

- 修正 `apps/web/src/App.tsx` 跨包引用层级（`../../../../` → `../../../`），
  恢复 `typecheck` / 渲染构建 / 打包全链。
- 收紧 `apps/desktop/main.ts` 权限 handler 类型（`mediaTypes` 联合类型收窄、
  `webContents` 空安全），消除 `devServer!` 非空断言。
- 统一主题背景色（`styles.css` `#0c1019` → `#0d121d`）。
- Linux NVIDIA + X11 下 MESA-LOADER 日志噪声：`dev:desktop` 默认追加
  `--disable-gpu-sandbox`（仅 dev，见 README.DEVELOPMENT.md）。
- 修复 zip 解出目录 1970 时间戳导致的 rspack 构建 panic（已刷新）。

### Added

- ESLint（TS 推荐 + react-hooks，`no-explicit-any` 为 error）与 Prettier，
  `lint` / `format` / `format:check` 脚本，`check` 串入 lint。
- GitHub Actions CI（install / typecheck / lint / test / build）。
- `vitest.config.ts`（node 环境 + v8 coverage）与持久层单测，
  测试从 4 用例增至 19 用例。
- 主进程安全守卫抽取为 `apps/desktop/security.ts` 纯函数并补单测
  （信任 URL / 仅音频 / 路径穿越）。
- `ErrorBoundary` 包裹渲染根节点；`App` 拆为壳 + `PracticeView` +
  `LibraryView` + `useLearningData`。
- `packages/core/config.ts` 收口版本/协议源/主题色/窗口/TTS 速率/推荐权重；
  preload 全局名 `speakSeedDesktop` 更名为 `voxneloDesktop`。
- `build/icon.png`（Linux）并接线 electron-builder；`author` 字段。
- 文档：`docs/12` 安装构建现状、`README` pnpm 版本、
  `docs/07` 对齐 40 句实装与实际 schema；
  新增 `docs/ADR/ADR-0001-reference-audio.md`、
  `docs/ADR/ADR-0002-release-signing-update.md`、
  `SECURITY.md`。

### Removed

- 无用依赖 `zod`、`zustand`（全仓零引用）；`App.tsx` 3 个无用图标导入。

## [0.1.0] - 2026-10-15

V0.1 Early Access 基线：单句英语学习、系统 TTS 示范与慢速、录音回听、
换句、收藏、复习标记、最近记录、规则推荐，数据本地保存。
实时语音识别、卡拉 OK 高亮、短句流、音素级纠错不在本版本。
