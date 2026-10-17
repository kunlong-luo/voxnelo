# Voxnelo · 架构与代码质量审查（2026-10-17）

目标：在不改变冻结的 V0.1 F001–F012 学习闭环、不破坏 Electron 沙箱和个人数据的前提下，提高可维护性、组件化和版本交付可靠性。当前版本 **0.1.1**。

## 已有的健康架构（保持）

- **monorepo / 分层**：`apps/web` 只通过 `@voxnelo/learning` 门面使用业务能力；底层 `core`、`audio`、`content`、`storage` 拆分，并通过 `.dependency-cruiser.json` 阻止跨层依赖及依赖环。
- **UI**：React 19 + TypeScript 6 strict + Tailwind v4 + Base UI 组件；练习卡、听写、录音、素材库、设置页已独立。
- **桌面端**：Electron main/preload/renderer 分离、`contextIsolation`、受控 IPC 与 URL 来源验证。
- **测试**：Vitest 组件/核心单测、覆盖率门槛、Chromium 响应式/动效检查、Linux Electron 小窗口和 DPI 测试，以及 Linux DEB 实际安装、Windows/macOS 打包。
- **版本一致性**：0.1.1 起 `tests/version-consistency.test.ts` 和 `scripts/check-desktop-package.mts` 校验共享版本与 Linux 包元数据。

## 核查出的实际改进项

| 优先级 | 部位 | 问题 / 证据 | 具体动作 / 完成条件 |
|---|---|---|---|
| P1 | `apps/web/src/App.tsx` | 原 339 行包含 2 套重复导航、中文/英文标签映射、业务操作及页面组合。 | **本 PR 已处理导航部分**：抽成 `AppNavigation.tsx`，统一 typed menu、aria label、收藏计数、版本及 compact/desktop 样式；保留 `App` 状态处理。 |
| P1 | `apps/web/src/SettingsView.tsx` | 三处重复 `aria-pressed` 开关结构和状态样式，易出现交互不一致。 | **本 PR 已处理**：抽成使用统一 Button 样式的受控 `SettingToggle`；单测覆盖 click、pressed、更新状态。 |
| P1 | `apps/desktop/asrAssets.ts` | 当前个人 ASR 候选仅校验 `sha256` 字符串的格式及部分文件存在；启动时**没有校验文件实际摘要**，清单也不是有签名的可信根。 | 在独立的 ASR 安全 PR 中明确用户自装原生代码的信任边界，核验文件实际内容并绑定可信发布来源；不能把此清单判断视为数字签名。避免引入同步读取全部大模型的启动卡顿。 |
| P1 | `apps/web/src/useLiveDictation.ts`（原 311 行） | 浏览器 SpeechRecognition、Electron 麦克风采集与 AudioWorklet、会话取消、卸载清理和错误文案放在同一个 Hook。 | 在独立 PR 拆为 `browserRecognizer`、`desktopRecognizer` 适配器与共享 session controller；先补权限拒绝、路由切换、停止期间迟到结果、设备断开和引擎崩溃测试，不改模型授权/默认联网策略。 |
| P2 | `apps/web/src/i18n.tsx`（原 535 行） | 双语字典与 Provider/翻译函数混在一处，翻译增长影响审阅。 | 将语言资源拆为 `locales/zh-CN.ts`、`locales/en-US.ts`；对翻译 key 做编译期完整性检查。 |
| P2 | `apps/web/src/App.tsx` | 课程历史、录音、播放、主题、语言和导航状态集中在 AppScreen。 | 导航分离后视测试结果再提取 `usePracticeSession`；只封装业务协调，不在 0.1.x 一次更换全部状态管理框架。 |
| P2 | `scripts/check-ui-style-architecture.mts` | 部分守卫依赖 `source.includes(...)` 字符串，无法确认真实组件行为。 | 保留轻量静态守卫，但把核心导航、设置开关、键盘可达性、动态效果状态写成实际 DOM/Chromium 测试。 |
| P2 | 已安装版本升级 | CI 在全新 Linux runner 上安装 DEB，不能证明用户本机的 0.1.0 到 0.1.1 真实升级路径。 | 用户本地 `apt install ./voxnelo_0.1.1_amd64.deb` 前后验证 dpkg 版本、用户学习记录和音频/设置；不得要求无故删除旧版数据。 |

## 本轮改造验收要求

- 应用与菜单行为一致：原来桌面和紧凑导航的 6 个栏目、aria-label、选中状态、收藏计数不变。
- 设置项状态语义一致：`aria-pressed`、键盘点击、预览主题/慢速/IPA 的回调不变；无新原生样式并行实现。
- 不修改数据库 schema、学习记录、音频采集、ASR 工作流程、协议或 Electron IPC 白名单。
- `pnpm typecheck` / `pnpm lint` / `pnpm arch` / `pnpm test:coverage` / Chromium/原生窗口/DPI / 三平台安装包 CI 必须全部通过。
- 若 CI 回归，修复或回滚，不绕过检查来合并。

## 当前版本定位

这是 **0.1.1 的安全小步架构改造**，不等于 ASR 正式产品验收；个人离线 ASR 的模型许可、实际麦克风和准确率仍另行验收。
