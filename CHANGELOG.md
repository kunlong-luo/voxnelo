# Changelog

格式遵循 Keep a Changelog。`Unreleased` 为已落库但未打版本标签的变更。

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
- 主进程安全守卫逻辑抽取为纯函数（`security.ts`），原内联实现删除，
  `devServer!` 断言消除，行为逐项等价。

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
- `packages/core/config.ts` 收口版本/协议源/主题色/窗口/推荐权重
  （TTS 速率属音频域，已迁回 `audio` 包）；
  preload 全局名 `speakSeedDesktop` 更名为 `voxneloDesktop`。
- 真单仓：`packages/*` 补包声明与 barrel，`@voxnelo/*` 别名贯通
  tsc/rsbuild/vitest/esbuild，深路径引用清零并被 lint 禁止。
- 学习应用服务门面 `@voxnelo/learning`：UI 不再直连 storage/audio/core；
  dependency-cruiser 架构门禁（无环 + 分层边规则）并接入 CI。
- 启动时预热语音列表，缓解冷启动首次点击取空语音。
- `build/icon.png`（Linux）并接线 electron-builder；`author` 字段；`pack:dir` 打通。
- 文档：`docs/12` 安装构建现状、`README` pnpm 版本、
  `docs/07` 对齐 40 句实装与实际 schema；
  新增 `docs/ADR/ADR-0001-reference-audio.md`、
  `docs/ADR/ADR-0002-release-signing-update.md`、
  `docs/ADR/ADR-0003-learning-service.md`、
  `SECURITY.md`；`docs/06` 按新分层修订。

### Removed

- 无用依赖 `zod`、`zustand`（全仓零引用）；`App.tsx` 3 个无用图标导入。

## [0.1.0] - 2026-10-15

V0.1 Early Access 基线：单句英语学习、系统 TTS 示范与慢速、录音回听、
换句、收藏、复习标记、最近记录、规则推荐，数据本地保存。
实时语音识别、卡拉 OK 高亮、短句流、音素级纠错不在本版本。
