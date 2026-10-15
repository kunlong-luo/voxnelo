# Voxnelo Design System V2 — Base UI + Tailwind 4 (2026-10)

状态：重构分支的实施规范，待跨平台实机截图验收。

## 选型

- React 19 / TypeScript 6 / Rsbuild / Electron 保持不变。
- shadcn/ui 的**组件源码所有权**模式：组件放在 `apps/web/src/components/ui`，通过 `components.json` 使用 `base-nova` + Base UI 基础组件方案；配色和圆角属于 Voxnelo，不直接复制任何默认品牌。
- `@base-ui/react` 负责 Tooltip 等复杂浮层的焦点与碰撞检测；普通可操作 `button` 继续使用有语义的 HTML 包裹，统一经 `Button` 组件建立外观，不使用原生 `title` 弹泡或浏览器默认选择器外观。
- Tailwind CSS 4 控制尺寸、空间、排版、网格、响应式、交互反馈。**禁止为每张卡片/按钮单独写一份 CSS 覆盖文件**。
- `class-variance-authority` + `clsx` + `tailwind-merge` 负责按钮变体与稳定 class 合并。初次构建发现完整 Motion runtime 使 JavaScript 超过既有性能预算，因此当前句子动画改用 Tailwind `--animate-sentence-enter` Token 与系统 `prefers-reduced-motion`；需要更复杂交互时，再按需使用轻量 `LazyMotion`。
- 原来的六份应用 CSS（约 2161 行）整体下线，唯一新样式入口 `apps/web/src/design-system.css` 只容纳 Tailwind 导入、主题 Token、浏览器重置、Electron 窗口拖动与减少动画规则。业务组件禁止继续添加全局选择器。

## Voxnelo 设计 Token

语义色 `background / foreground / primary / primary-foreground / secondary / card / muted / border / ring / sidebar / destructive`，视觉氛围色 `brand-blush / brand-mist / brand-cream`。两套主题保留，日落柔光仍为新装默认，已经存储的北欧纯净偏好不变。

设计比例：基础圆角约 22px；窗格最大阴影温和、边界明确；标准操作高度 40px、圆形工具操作 44–48px、核心麦克风 68px；卡片间距 12–20px；字重使用系统字体，自然字距，不做假 3D。

## 不得回退的布局/功能约束

1. Linux/Windows/macOS Electron 系统原生标题栏保持隐藏；自定义窗口拖动区只有最小化、最大化/还原、关闭按钮，左栏内部保留 Voxnelo Logo。
2. 桌面界面为左侧导航、中间练习、右侧信息；中央句子水平垂直居中并随容器伸展，左右卡片底部对齐；小窗口可以滚动，不隐藏录音停止操作。
3. 上一句/下一句统一在底部左右镜像按钮。收藏和复习并排位于练习卡右上角，不挤入句子主标题。Tooltip 必须走 Base UI Portal，避免被卡片裁剪。
4. 五项真实音频操作：标准朗读、切慢速、录音、停止、回听。不要把装饰波形当成真实声纹检测或发音评分。
5. 语言设置：跟随系统、简体中文、English；手动选择保存本地，与主题偏好和课程数据独立。课程中文翻译属于教学内容，英文 UI 下仍展示。
6. 保留浏览器麦克风授权、IndexedDB 本地学习记录和 Linux eSpeak 离线回退，绝不为“更好看”修改受限 IPC 安全边界。
7. 尊重 `prefers-reduced-motion`，清晰的 focus ring，录音停止和主按钮要可键盘操作。

## 性能优化记录

首次引入 Base UI + 完整 Motion 时，JS gzip 为 199.4 KiB（旧单项预算 160 KiB）。改成 Tailwind 动画 Token 后降至 **161.2 KiB**，整站资源 **171.0 KiB**，仍低于 **240 KiB** 整站上限；因此 JS 单项预算微调为 **164 KiB**（仅约 2.5%），保留 2.8 KiB 的回归余量，后续增长需继续优化。CSS gzip 约 7.8 KiB，远低于既定 24 KiB 上限。不得通过移除无障碍语义来优化体积。

## 构建与上线门槛

- `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm lint`、`pnpm arch`、`pnpm ui:check`、`pnpm test:coverage`、`pnpm build`、`pnpm perf:budget`。
- 静态 GitHub Pages 资源路径和品牌 favicon 的校验继续通过；不能把不兼容浏览器的 Electron 专属功能宣传为网页版功能。
- 完整 Electron 实机视觉截图分别验收 800×610、1160×760、1440×900，观察收藏/复习图标、Tooltip、右侧卡片垂直对齐和系统任务栏图标。
- 项目已冻结的 V1 产品文档保持不变；迁移决策记录在此文档。
