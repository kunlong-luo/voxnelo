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
- TypeScript 收紧 `noUncheckedIndexedAccess` / `noUnusedLocals` /
  `noUnusedParameters` / `exactOptionalPropertyTypes`；课程首句以
  `FIRST_SENTENCE` fail-fast 导出，索引访问全部显式收窄。
- 键盘处理器对无 `closest` 的事件目标加固（单测暴露的真实 bug）。

### Added

- ESLint（TS 推荐 + react-hooks，`no-explicit-any` 为 error）与 Prettier，
  `lint` / `format` / `format:check` 脚本，`check` 串入 lint。
- GitHub Actions CI（install / typecheck / lint / test / build）。
- `vitest.config.ts`（node 环境 + v8 coverage）与持久层单测，
  测试从 4 用例增至 19 用例；后补组件单测（ErrorBoundary/视图/冒烟，
  jsdom + Testing Library），现共 42 用例（含录音 hook、语音合成、
  键盘导航）；`@vitest/coverage-v8` 钉住 v3 与 vitest 对齐；
  覆盖率阈值锁定（lines 85 / branches 70 / functions 65）并配
  `test:coverage` 脚本，主进程与渲染入口除外。
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
  `SECURITY.md`；`docs/06` 按新分层修订；新增 `docs/PRIVACY.md` 草案
  （公开发布前须法务复核）。
- 界面重塑（PR #10 #12 #13 #14 #17 #18 #21）：练习台布局规范、glass 工作区、
  Nordic Clean、Sunset Glow 主题、左中右三栏 + 自定义无框标题栏、
  居中练习台与对称导航、U3 微交互和应用自绘 Tooltip、UI 参考图（#11 #19）。
- 双语国际化（#21）：跟随系统语言、中英文运行时切换、语音和权限错误提示本地化。
- Linux 英语语音兜底（#15）：Chromium 英语声音不可用时，受控主进程
  使用 eSpeak 合成 WAV；仍需 Pop!_OS 24 上的真实听音验收。
- 工程协作：Resume Craft 工程模式（#3）、品牌与主题升级（#2）、
  Dependabot 与 TypeScript 6 兼容升级（#4 #9 #16）、已合并分支清理（#20）。
- GitHub Pages Web 体验版部署准备（#25）：静态资源路径修复、
  品牌 favicon、构建验收和手动发布工作流；桌面端保留完整 Electron 能力。
- 收藏/复习图标的旧绝对定位和 Tooltip 视口裁剪修复（#23 变更并入 #25）。

### Removed

- 无用依赖 `zod`、`zustand`（全仓零引用）；`App.tsx` 3 个无用图标导入；
  删除从未被调用的 `exportLearningData`（备份/恢复待 V0.3 完整设计后再做）。

## [0.1.1] - 2026-10-17

### Changed

- 同步桌面安装包、所有 workspace 包及应用内展示的版本号至 **0.1.1**。
  Linux DEB 可通过 apt 从 0.1.0 升级，无需先卸载（同一软件包 ID：
  `voxnelo`）。已有本机学习记录和个人离线 ASR 内测资源不受本次版本调整影响。
- 新增版本一致性校验以及安装包版本校验，防止安装包、About 页面和共享常量不一致。

### Included from the Early Access preview

- 日落玻璃与北欧双主题、交互动画和窗口响应式修复；隐藏原生侧栏滚动条。
- Linux 用户可选择自行安装个人本地 ASR 内测引擎；**公开安装包仍不内置
  未审核的离线模型/原生库，真实麦克风识别及准确率尚未完成正式验收**。

## [0.1.0] - 2026-10-15

V0.1 Early Access 基线：单句英语学习、系统 TTS 示范与慢速、录音回听、
换句、收藏、复习标记、最近记录、规则推荐，数据本地保存。
实时语音识别、卡拉 OK 高亮、短句流、音素级纠错不在本版本。
