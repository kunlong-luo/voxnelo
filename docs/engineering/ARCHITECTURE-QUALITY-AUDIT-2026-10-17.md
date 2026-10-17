# Voxnelo · 架构与代码质量审查（2026-10-17）

目标：在不改变冻结的 V0.1 F001–F012 学习闭环、不破坏 Electron 沙箱和个人数据的前提下，提高可维护性、组件化和版本交付可靠性。当前版本 **0.1.3**。

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
| P1 | `apps/desktop/asrAssets.ts` | 过去仅校验清单哈希格式与文件存在，未验证实际字节，也没有可信发布者签名。 | **本 PR**：在 app ready 后流式核验所有模型和原生模块文件、并与应用内固定的三个 ONNX 哈希对照，失败时关闭个人 ASR；仍需后续为原生 npm 依赖建立独立可信来源/签名与真实设备验收。 |
| P1 | `apps/web/src/useLiveDictation.ts`（原 311 行） | 浏览器 SpeechRecognition、Electron 麦克风采集与 AudioWorklet、会话取消、卸载清理和错误文案放在同一个 Hook。 | **本 PR** 已提取 `dictation/browserRecognizer.ts`，隔离浏览器识别模式、结果累积、错误分类及会话停止；Electron 音频会话适配器和统一 session controller 仍未完成，需要继续覆盖权限拒绝、设备断开、进程崩溃、停止期间迟到结果。不改模型授权与默认联网策略。 |
| P2 | `apps/web/src/i18n.tsx`（原 535 行） | 双语字典与 Provider/翻译函数混在一处，翻译增长影响审阅。 | **本 PR 完成**：240 个中英文翻译键分别置于 `locales/zh-CN.ts`、`locales/en-US.ts`；TypeScript 编译期检查 key 覆盖，Vitest 校验键集和插值占位符一致。 |
| P2 | `apps/web/src/App.tsx` | 课程历史、录音、播放、主题、语言和导航状态集中在 AppScreen。 | 导航分离后视测试结果再提取 `usePracticeSession`；只封装业务协调，不在 0.1.x 一次更换全部状态管理框架。 |
| P2 | `scripts/check-ui-style-architecture.mts` | 部分守卫依赖 `source.includes(...)` 字符串，无法确认真实组件行为。 | 保留轻量静态守卫，但把核心导航、设置开关、键盘可达性、动态效果状态写成实际 DOM/Chromium 测试。 |
| P2 | 已安装版本升级 | CI 在全新 Linux runner 上安装 DEB，不能证明用户本机的 0.1.2 到 0.1.3 真实升级路径。 | 用户本地 `apt install ./voxnelo_0.1.3_amd64.deb` 前后验证 dpkg 版本、用户学习记录和音频/设置；不得要求无故删除旧版数据。 |

## ASR 内测安全补充

个人候选安装流程会把第三方原生 .node 模块放到用户配置目录。清单中的 SHA-256 来自同一目录，因此本轮字节核验只抵御意外损坏、文件被单独改写等问题，**不能证明清单和原生模块的发布者真实可信**。Electron 启动前以流式读法验证完整文件清单，发现缺失、添加、符号链接、版本不匹配或哈希错误就不启用候选模块；用户可重新执行经审核的安装流程。最终签名及供应链来源验收另开任务。

## 本轮改造验收要求

- 应用与菜单行为一致：原来桌面和紧凑导航的 6 个栏目、aria-label、选中状态、收藏计数不变。
- 设置项状态语义一致：`aria-pressed`、键盘点击、预览主题/慢速/IPA 的回调不变；无新原生样式并行实现。
- 不修改数据库 schema、学习记录、音频采集、ASR 工作流程、协议或 Electron IPC 白名单。
- `pnpm typecheck` / `pnpm lint` / `pnpm arch` / `pnpm test:coverage` / Chromium/原生窗口/DPI / 三平台安装包 CI 必须全部通过。
- 若 CI 回归，修复或回滚，不绕过检查来合并。

## 当前版本定位

这是 **0.1.3 的持续小步架构改造**，不等于 ASR 正式产品验收；个人离线 ASR 的模型许可、实际麦克风和准确率仍另行验收。
