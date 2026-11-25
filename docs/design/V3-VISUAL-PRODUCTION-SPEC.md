# Voxnelo V3 · Warm Sunset Glassmorphic / Nordic Minimalist

状态：V3 第一批实现规范与验收基线（2026-10-16）。继承 `VOXNELO-DESIGN-SYSTEM-V2.md` 与 `ADAPTIVE-LAYOUT-SPEC.md`；不改冻结产品需求。

> **2026-11-23 实施增补（当前权威版本）**：实时听写作为主操作的视觉、状态、无障碍与发布边界已在 [V3 Dictation-first 工作台规范](V3-DICTATION-FIRST-UX-2026-11-23.md) 单独记录。原文中的“核心麦克风”“录音”描述属于 10 月历史设计阶段；现在必须区分**实时听写主按钮**和**录制回听次级按钮**，两者共享真正的权限与会话互斥机制而非虚构录音状态。**新增 UI 不在源提交 `7793c383` 的已核验 v1.0.4 评审安装包中。**

## 设计工程约束

- 采用 Tailwind CSS 4 `@theme inline` + `design-system.css` 语义变量，React 19 共用组件；`data-theme="sunset|nordic"` 切换材质而不是维护两份 JSX。原有主题设置及本地持久化继续有效。
- Sunset：背景仅绘制线性柔光和装饰色块；`.practiceCard` 为**唯一**重度背板磨砂层（`--glass-surface:rgba(255,255,255,.62)`、`--glass-blur:20px`、内缘高光、暖色弥散阴影）；辅助进度卡、按钮、Tooltip 不嵌套 `backdrop-filter`。
- Nordic：`--background:#F7F8F5`、`--sidebar:#E8F0EA`、`--card:#FFFFFF`、`--primary:#477F83`；同一练习卡采用实心白底和 `blur(0px)`。不为了玻璃效果牺牲低端设备流畅度。
- 英文主句按 lesson 容器字号 `clamp(1.875rem,5.4cqi,2.625rem)`，桌面上限 42px，长句自动换行；内容色 `#1A202C`。翻译 `#4A5568`，IPA `#526576`；音标避免依赖字体缺失易出现豆腐块的固定等宽字体。
- 辅助文案 token 必须具有可验证的小字号对比度：Sunset `--muted-foreground:#71645B` 对 `#FFFAF6` 约 **5.5:1**；Nordic `#5E6C62` 对纯白约 **5.5:1**。不可为了减弱视觉存在感而采用低于 4.5:1 的淡灰小字。
- 麦克风：Sunset 为橙色品牌渐变、深色高对比图标；Nordic 为深青纯色、白色图标。两者共享同一实际录音流程。
- 活动动效：只有 `recorder.status === 'recording'` 时出现 2s `scale(1→1.05)` 薄荷绿外环；权限请求为独立提示；`prefers-reduced-motion` 要禁用持续扩散。**VAD 自动监听和语音口令不在本期范围**，不得冒充已经接入。
- 麦克风缺失、被占用、权限被拒都采用卡片下方 `role=status` 柔和提示；示范朗读、收藏、翻句继续可操作，不能替换/抑制浏览器或系统实际授权窗口。

## 禁止回退的结构

- Electron 左侧 `sidebar` 永远从窗口 `top=0` 铺至底部；44px 自定义拖动/窗口控制区严格限制在右侧 `mainArea`，不得在侧边栏顶部恢复横条。
- 继续使用 `@container/workspace` 弹性布局；超窄与 800×610 最小窗口五个音频入口仍首屏可见，辅助信息可以在卡片后方重排。
- 只用 Base UI Portal Tooltip，不使用浏览器原生 `title`；核心按钮键盘可达。
- 数据层不引入虚构发音评分，波形 `WaveformArt` 明确为装饰，不代表音量/VAD。

## 验收清单

1. `pnpm typecheck`、`pnpm lint`、`pnpm ui:check`、`pnpm test:coverage`、`pnpm build`、`pnpm perf:budget`。
2. Chromium 6 档响应式矩阵无水平溢出、麦克风仍在首屏；额外检查 Sunset `blur(20px)`、Nordic 零模糊、两种录音按钮背景，输出 Nordic 桌面截图。
3. Linux 原生 Electron 800×610、1160×760、1440×900 以及 DPR 1.25 / 1.5，窗口拖动/最大化/还原、SideBar 全高、五按钮可用；macOS/Windows 无签名打包完整性 CI。
4. 检查设备缺失后的非阻断提示，确保 `NotFoundError`、`NotReadableError`、`NotAllowedError` 各自有正确用户文案。
5. 仍须人工验收 Windows/macOS 图形实机的任务栏图标、真实系统字体放大、录音设备、安装签名。网页公开体验需要仓库 Pages 权限/启用配置。

本规范属于迭代实现，冻结的 `docs/Voxnelo-Product-Docs-v1.0` 不修改。

## 第二阶段：按视觉与行为边界拆分组件（2026-10-16）

- `PracticeView.tsx` 只负责工作台组合和示范播放提示；不再承载完整主卡、五按钮控制面板、右侧卡片等 18 KB 混合 JSX。
- `PracticeTypes.ts` 定义独立于主题与 DOM 的练习交互契约；`PracticeCard.tsx` 保持唯一玻璃材质卡片、课程排版及上一句/下一句；`PracticeControlPanel.tsx` 只渲染真实录音状态、五个音频入口和温和的设备失败提示；`PracticeSidebarWidgets.tsx` 只使用真实学习状态和课程内容渲染四张辅助卡。
- **本阶段先等价重构，再视觉精修**：保留现有 CSS class、组件顺序、无障碍角色、已存学习记录、真实 TTS/录音回调及翻页行为；测试断言主练习卡不嵌套学习小组件、五个操作保留及侧栏仍为四张卡。Linux Electron 原生尺寸与 125%/150% DPI 截图继续为验收依据。
- 新增主题效果时优先使用已有 `@theme inline` 语义变量，不创建旧式 Tailwind 配置或新的页面级全局 CSS；如需更完整的 VAD 状态机，必须先实现真实底层能力，不能用动效冒充监听。

## 右侧信息栏密度优化（2026-10-16）

- 真实 Electron 1160×760 截图发现右侧进度卡由于 `grid-rows-[1.3fr_1fr_.95fr_1.1fr]` 被分配超出自身内容所需的高度，产生大块空白，并把同主题推荐挤到下方。
- 删除分数行高分配，保留 `grid auto-rows-min content-start` 使学习进度、推荐短句、学习提示与场景卡按自身内容自然堆叠；工作台主卡高度和右栏顶部对齐策略保持不变。
- Chromium 视口回归增加 `progressHeight` 与下一张卡 `feedTop` 的真实 DOM 几何断言，1160px/1440px 桌面宽度下进度卡不得超过合理内容尺寸、两卡之间只能留规范间距；不使用 JSDOM 模拟盒模型结果。

## 第三阶段：学习信息与录音反馈精修（2026-10-16）

- 右侧进度、相关表达、学习提示和场景仍保持四张实色卡；Sunset 与 Nordic 共用语义化 Token，不叠加毛玻璃。进度卡用轻量图标、局部边框和结构化数据分区提升层级，不引入虚构百分数或评分；圆环只使用真实 `stats.viewed / SENTENCES.length`，绘制百分比限制在 0–100，文字继续显示真实计数。
- 右侧相关表达的中英文从 `truncate` 单行截断改为最多两行的可读文字，英文至少 12px、中文至少 11px；各项增加实际列表序号和明确悬停/键盘聚焦状态，完整英文继续通过无障碍标签可读。录音或麦克风权限申请中禁用切换，避免误跳转。
- 录音按钮的辅助文案应区分**待命 / 请求权限 / 正在录音 / 已完成可回听**；只有 `recorder.status === 'ready' && recordingUrl` 才展示成功状态。已录音可再次录制，不能假称自动 VAD 或以装饰波形替代真实录音；播放失败仍展示错误，绝不假装播放成功。
- 状态及辅助文字中英文都要可用、易读；仍尊重 `prefers-reduced-motion`，新增状态提示不引入持续装饰动画。
- 回归继续保障 800×610、1160×760、1440×900 原生 Electron 截图与 125%/150% DPR、五个录音入口首屏可达性，学习数据全部来源于本地真实记录。本阶段不改冻结的 `Voxnelo-Product-Docs-v1.0`，不改数据库/权限架构。

## V3.1 任务优先布局精修（2026-11-25，待 CI）

延续 [实时听写优先规范](V3-DICTATION-FIRST-UX-2026-11-23.md)，以 PR #317 深度截图 run 45617984162 的大屏辅助栏过重及 800×610 小窗口翻页区首屏以下为依据。此 PR 提交实际 JSX/Tailwind 局部精修，不更换 Sunset/Nordic、组件库或原始 PRD。右栏默认只展开真实学习进度，相关短句、学习提示与相关场景使用现有 Button 的独立展开/收起（aria-expanded、aria-controls、hidden，键盘可操作）；保留四张卡及全部真实内容/跳转行为，不新增虚构数据。主区采用自然高度，不再根据辅助栏底部强制拉伸；右栏比例 28%→25%、最大听写区宽 40rem→48rem；压缩低高度卡片空白、录音状态间距、底部翻页及大屏装饰波形。暂不引入悬浮/粘性遮挡层，长句/高 DPI 可正常滚动，**小窗首屏翻页目标尚需实际截图确认**。模型恢复按钮更清晰，保留现有启动/停止、帮助、录音及所有权限/模型逻辑。更新深度浏览器断言验证三个独立折叠面板默认关闭、相关短句可展开/收起以及主卡不拉伸，保留现有首屏录音、正常桌面翻页、长句/缩放可达性等检查。CI、双语双主题新截图和实体设备验证未完成；不声称实际布局已验收。生产 UI 变更与 #318 权限修复须在合并后共同进入下一份 review-only 候选，旧安装包不能代表新布局，发布 HOLD。

补充：保留 1440×900 原有装饰波形动画断言，缩小其宽度而非在该视口隐藏；学习进度鼓励文案保留。所有折叠区初始关闭，内容仍存在且关闭时不进入正常键盘顺序。#318 独立 CI 的 TypeScript 测试缺失字段写法已修正，不放宽权限；本布局 PR 不包含该权限修复。

### V3.1 CI follow-up (2026-11-26)

#318 merged at `1b41b0ea9747daf92457409fd0bbf75c4a49fc45`; PR core 45619697452 and deep UI 45619697419 passed; main CI 45620325874 and Pages 45620321939 passed. #319 initial deep UI [45619766955](https://github.com/kunlong-luo/voxnelo/actions/runs/45619766955) passed (browser artifact 15023493649, Linux Electron artifact 15023613378); all three platform packages in core run 45619766682 passed, but two Nordic workspace tests failed (641/643). The stale test expected an initially visible related phrase and the old 8px compact header top padding. Update the test to require collapsed accessible controls, explicit expand/collapse and preserved related phrase/scene navigation, and the new 4px compact padding. No geometry gate disabled. Branch synchronized to merged security guard. New integrated checks pending. No public release; prior installer bytes do not contain both changes.
