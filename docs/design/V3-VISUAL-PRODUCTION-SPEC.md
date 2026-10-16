# Voxnelo V3 · Warm Sunset Glassmorphic / Nordic Minimalist

状态：V3 第一批实现规范与验收基线（2026-10-16）。继承 `VOXNELO-DESIGN-SYSTEM-V2.md` 与 `ADAPTIVE-LAYOUT-SPEC.md`；不改冻结产品需求。

## 设计工程约束

- 采用 Tailwind CSS 4 `@theme inline` + `design-system.css` 语义变量，React 19 共用组件；`data-theme="sunset|nordic"` 切换材质而不是维护两份 JSX。原有主题设置及本地持久化继续有效。
- Sunset：背景仅绘制线性柔光和装饰色块；`.practiceCard` 为**唯一**重度背板磨砂层（`--glass-surface:rgba(255,255,255,.62)`、`--glass-blur:20px`、内缘高光、暖色弥散阴影）；辅助进度卡、按钮、Tooltip 不嵌套 `backdrop-filter`。
- Nordic：`--background:#F7F8F5`、`--sidebar:#E8F0EA`、`--card:#FFFFFF`、`--primary:#477F83`；同一练习卡采用实心白底和 `blur(0px)`。不为了玻璃效果牺牲低端设备流畅度。
- 英文主句按 lesson 容器字号 `clamp(1.875rem,5.4cqi,2.625rem)`，桌面上限 42px，长句自动换行；内容色 `#1A202C`。翻译 `#4A5568`，IPA `#526576`；音标避免依赖字体缺失易出现豆腐块的固定等宽字体。
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
