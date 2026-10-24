# Changelog

格式遵循 Keep a Changelog。`Unreleased` 为已落库但未打版本标签的变更。

## [Unreleased]

## [1.0.2] - 2026-10-24

### Maintenance (official unsigned desktop patch)
- 修复桌面原生离线引擎状态判断（PR #163）：按实际所选引擎验证能力，Linux 仍默认 Moonshine Medium，显式旧模型选择和缺失/损坏的诊断互不混淆。
- 增强本地识别质量取证工具（PR #164）：已安装 Moonshine 可单独运行私人 WAV 批量 WER，不必同时安装 Zipformer；`external-playback`（另设备外放）与安静近讲和噪声分别统计词数加权 WER/RTF。**并未因此声称实际 WER 提升。**
- 清理所有听写会话的 Electron 窗口生命周期监听器（PR #165），避免连续多轮使用时遗留闭包、Worker 引用；新增 25 轮资源清理回归测试。
- Moonshine Python SDK 回调与 PCM 确认现在原子化输出完整 JSONL 事件（PR #166），并测试 240 条并发协议消息。
- 子进程 stdin 出错（EPIPE/提前关闭）会受控失败，不再因未处理写入错误崩溃（PR #167）；增加真实 Python 断管/退出的 PCM 与 finish 回归测试。
- 保留个人 Moonshine 配置/安装目录及本地学习记录，不强制卸载旧版本，不捆绑模型，不进行音频云上传。Linux 首次下载仍需用户明确点击。

### Known limitations
- 免签名正式维护版，**Windows/macOS 未签名且 macOS 未公证**。系统 SmartScreen / Gatekeeper 可能拦截；SHA-256 仅校验文件完整性。
- Windows/macOS 尚不提供和 Linux 完全一致的原生 Moonshine 实时听写。Linux 模型需单独下载安装。
- 真实麦克风 20+ 已知参考句的口音、噪声、外放 WER/CPU/延迟；F001–F012、内容许可与五位初学者外部测试仍须独立取证，不能从绿色 CI 推断全部合格。


## [1.0.1] - 2026-10-24

### Maintenance (official unsigned patch)
- 将 v1.0.0 发布后已合并的录音资源清理修复（PR #159、#160）纳入正式安装包：`MediaRecorder.stop()` 同步异常、卸载晚到回调、麦克风 track 和 Blob URL 清理。
- 应用版本、五个 workspace 模块版本、Linux AppStream 和版本一致性测试同步提升为 1.0.1；基础学习数据及个人离线模型路径保持不变。
- 迁移无效的历史 `package.json.pnpm.overrides` 至 pnpm 12 支持的 `pnpm-workspace.yaml`，通过可信锁文件再生成与完整审计，将构建工具依赖链里的 `undici` 6.29.0/7.30.0 升级为 6.29.1/7.30.1（GHSA-xjj6-f33q-929c），不使用审计豁免。
- 沿用 v1.0.0 的安全与发行边界：免签名/未公证，Linux Moonshine 需主动安装，Windows/macOS 不承诺相同离线实时听写；外部真机/内容验收仍未完整。


## [1.0.0] - 2026-10-23

### Official desktop distribution (unsigned; limitations disclosed)
- 首个正式公开桌面发行（不是 Beta），但明确告知所有安装包未签名、macOS 未公证；不宣称硬件或第三方权利得到认证。
- 使用最新 `main` 源码重建 Linux DEB/AppImage、Windows NSIS、macOS ARM64 DMG 及 SHA-256 清单，保留所有已有 Release。
- 包含 #153 离线模型选择与旧请求刷新竞态修复、#154 一次性旧发行工作流退役，以及依赖安全更新。
- Windows/macOS 原生 Moonshine 尚不承诺支持，Linux Moonshine 仍需要主动下载安装未打包的 SDK 与模型；F001–F012 等外部验收状态以仓库独立台账为准。


### Fixed

- 修复录音权限等待期间取消后无法立即重新请求、旧授权晚到影响新请求锁的问题；权限取消可在主录音按钮完成，并清除上一句遗留的麦克风错误（F004/F005，#38）。
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

## [0.1.7] - 待发布（Early Access 补丁候选）

### Fixed
- Moonshine Linux 离线模型支持用户主动启动的安全安装／修复、隔离校验、回滚与个人文件保护（#136）。
- 模型管理页显示真实 Python 环境、SDK、模型下载、校验与启用阶段，不伪造百分比或输出敏感日志（#137）。
- Vitest 及 coverage-v8 升级至 4.1.12，移除旧 tinypool 与高危 glob@10.4.5；完整 pnpm High/Critical 审计恢复为硬门禁（#139 / #138）。

### Release status
- 尚未公开 v0.1.7 安装包；现有 v0.1.6 标签及附件不修改。
- 当前仍为未签名、macOS 未公证的 Early Access。签名、许可证与全平台人工验收未完成。

## [0.1.6] - 2026-10-22

### Early Access downloads
- 在公开 GitHub Release 中提供 **Linux x64 DEB/AppImage、Windows x64 NSIS EXE、macOS DMG** 及三平台 SHA-256 校验清单；所有安装包均未签名，macOS 未公证。
- 发行流水线跨操作系统运行类型检查、测试、实际打包与安装包文件校验，Linux 增加实际 apt 安装；合并时仅发布一次且不覆盖已有 Release 或标签。
- 中英文 README、用户指南、发布说明与验收文档同步说明各平台可用能力和风险。Linux Moonshine 默认模型仍需用户主动下载；Windows/macOS 不声称已支持同等 Moonshine 离线推理。
- 保留 v0.1.5 Linux-only Early Access 历史附件，不修改旧版下载或标签。

## [0.1.5] - 2026-10-22

### Linux Early Access 发布说明

- 仅向 Linux x64 提供未签名的公开 Early Access DEB/AppImage，附 SHA-256 文件校验；Windows/macOS 仅留在内部 CI 候选包。
- Linux 实时英语识别默认使用 Moonshine Voice Medium Streaming。用户在独立模型管理页主动下载安装个人模型与 Python 环境，逐文件 SHA-256 与 SDK 版本检查通过后才能使用；不会静默退回 Zipformer。
- Electron → 独立工作线程 → 本地 Python 推理进程的 16 kHz PCM 与 interim/final 字幕通道已接入。增加积压保护、终止清理、事件净化及字幕历史限长。
- CI 已验证真实 Moonshine 模型、个人安装器与打包后的 Linux Electron 音频识别链路；这些测试使用合成参考音频，不代表所有实机麦克风、环境噪声或口音的精度验收。
- 初次安装 Moonshine 需要网络、Linux x64、Python 3/venv；模型并未随 DEB/AppImage 捆绑。本版本是公开预览版，未取得签名/公证与完整教学内容审核结论。

### Improved

- 向 Linux DEB 的系统目录增加 AppStream 应用元数据（开发者 Leo Luo）和 Voxnelo 品牌图标，改善 KDE Discover 软件中心的开发者信息与通用图标。
- 将品牌文件的实际安装纳入 pnpm pack:linux、CI、Release Candidate 以及 dpkg-deb/apt 校验。
- 安装包递增为 **0.1.5**，可从 0.1.4 直接升级，保留本地课程记录和个人离线识别模型。

### Limits

- Discover 可能缓存旧应用信息；软件中心最终显示仍需在 Pop!_OS 实机复核。原 10 月 18 日打包改进本身不改 ASR；后续 10 月 22 日 Early Access 合并了上述 Moonshine 默认引擎与模型管理改动。

## [0.1.4] - 2026-10-18

### Improved

- 把 Electron 实时听写的麦克风权限、PCM AudioWorklet、原生 ASR 会话与资源清理集中到独立的 `dictation/desktopSession.ts`，降低 React Hook 的职责和耦合。
- 增加权限拒绝、等待中取消、迟到识别结果、工作线程初始化异常、物理设备断开和异常停止的测试，防止麦克风或原生 ASR 会话在切换时泄漏。
- 版本递增到 **0.1.4**，保持可从 0.1.3 直接升级，继续保留 Leo Luo 开发者署名和用户本地学习、个人 ASR 模型数据。

### Limits

- 本次主要改善会话生命周期的可靠性；本地第三方原生引擎的可信发布者认证、实际噪声识别准确率和跨设备实测仍需后续审核验收。

## [0.1.3] - 2026-10-17

### Changed

- 将应用开发者署名更新为 **Leo Luo**，同时更新项目作者与 Linux DEB Maintainer 元数据。
- 安装包和应用内展示版本提升到 **0.1.3**，支持从 0.1.2 直接升级，不需要卸载旧版或重装个人离线模型。
- 加强 DEB 元数据检查，确保安装包 Maintainer 使用 Leo Luo；软件中心实际显示还需在 KDE 环境复核。

## [0.1.2] - 2026-10-17

### Fixed

- 向已经安装了 `0.1.1` 的用户提供真正递增的 DEB/AppImage 版本号：使用软件包管理器直接升级，不必先卸载，也不需要重复运行 `apt --reinstall`。
- 实时英语听写界面移除面向开发者的 `pnpm` 安装命令，只呈现自然语言说明和有效的产品帮助入口。
- 个人 ASR 内测模型已存在且校验通过时，重复运行安装工具会明确报告“已安装”，不会重新下载或覆盖；损坏/不一致仍不自动覆盖。
- Linux 图形软件中心所读取的根包简介改为不依赖字符编码环境的英文元数据，减少非 UTF-8 环境出现问号的风险。中文课程和界面文案不受影响。

### Notes

- 个人离线 ASR 资源保留在用户配置目录中；更新桌面应用不会删除或重新下载已有模型。
- 公开安装包仍不捆绑第三方离线 ASR 模型/原生库；是否可用取决于本机模型完整性和运行环境。实际设备识别质量仍需验收。

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
