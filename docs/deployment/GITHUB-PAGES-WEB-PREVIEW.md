# GitHub Pages 公开体验版部署与验收指南

> 2026-10-15 · 仓库拥有者已确认**网页版可公开访问**。Voxnelo 主产品是 Electron 桌面端，GitHub Pages 仅托管编译后的 React/Rsbuild 静态体验版。部署工作流在 `main` 提交后自动尝试发布，也允许手动重跑。**仓库仍保留 Private，不会自动转换为 Public**。

## 现状与隐私前提

- 仓库 `kunlong-luo/voxnelo` 当前为 **Private**。GitHub Free 只能为公开仓库提供 Pages；从私有仓库使用 Pages 需要符合 GitHub Pro / Team / Enterprise 等计划和组织政策。请先在 GitHub **Settings → Pages** 检查是否支持 GitHub Actions 发布。
- 即使仓库是私有，普通 Pages 站点仍**默认公开可访问**；源码库 Private 不等于网站私密。不要把用户个人学习历史、密钥或未准备公开的原始产品文档放进静态 `dist`。
- 该工作流会通过官方 `configure-pages` / `upload-pages-artifact` / `deploy-pages` 尝试启用并发布 Pages；如当前 GitHub 账户计划或仓库设置阻止私有仓库 Pages，任务可能失败，必须从 Settings → Pages 完成资格/源设置。不能将工作流成功构建等同于网站已经可访问。

## 部署 URL 与构建

拟发布 URL：`https://kunlong-luo.github.io/voxnelo/`

应用使用 Rsbuild 构建 `dist`，无网页路由服务端；部署的应是 `pnpm build:renderer` 生成的文件，**不包括 Electron 主进程、预加载脚本或安装包**。

网页目前使用 `output.assetPrefix: './'`，故打包的 JS/CSS 是相对引用。Voxnelo 侧栏 Logo 已从 `/brand/voxnelo-mark.svg` 调整为 `brand/voxnelo-mark.svg`，并提供项目路径下的 favicon。两者兼容本地 Web、Electron 自定义协议 `voxnelo://app/index.html` 与 Pages 的 `/voxnelo/` 子目录。 `scripts/check-pages-artifact.mjs` 在 CI 中检查 HTML 静态引用和品牌图标。

## 用户已同意公开体验后的发布步骤

1. 合并准备 PR 后会自动运行公开体验版部署任务。仓库保持 **Private**，不会自动公开源代码（前提是 GitHub 计划支持从私有仓库发布 Pages）。
2. 打开 **GitHub → 仓库 Settings → Pages → Build and deployment → Source → GitHub Actions**。若账户计划不支持私有仓库 Pages，请先决定是否启用符合条件的计划或另选平台；不要为了测试网站而仓促公开整库。
3. 在 **Actions → GitHub Pages public web demo** 中检查自动运行结果。需要重试时点击 **Run workflow** 选择 **main**。任务安装锁定依赖、仅构建 Renderer、校验输出，再通过官方 Pages Actions 上传和发布。
4. 在 Pages 设置或部署任务中确认实际访问 URL；检查 `/voxnelo/` 上的品牌 Logo、favicon、JS/CSS 和所有页面视图。
5. 如需取消公开，请在仓库 Settings → Pages 中取消 Pages 发布。只删除某次 Actions 运行不会自动确保站点下线。

本地仅验证构建，不发布：

```bash
pnpm install --frozen-lockfile
pnpm build:renderer
node scripts/check-pages-artifact.mjs
```

## 桌面与 Web 行为边界

| 功能 | Pages Web 预览 | Electron 桌面版 |
| --- | --- | --- |
| 三栏布局、Nordic / Sunset、切换中英文 | 支持 | 支持 |
| 40 句课程、浏览历史、收藏、复习与设置 | 浏览器本地 IndexedDB / localStorage | 桌面内置 origin 的独立本地数据 |
| 示范英语语音 | 依赖浏览器 SpeechSynthesis / 设备已安装英语声音；某些 Linux 浏览器不可用 | Linux 没有 Chromium 英语 voice 时有 eSpeak 本地离线回退 |
| 录音和回听 | 依赖浏览器 `getUserMedia` / `MediaRecorder`、HTTPS、麦克风授权、系统权限和编解码支持 | Electron 的受控音频权限与同一录音流程 |
| 顶部系统窗口控制按钮、窗口拖动 | 不显示，因为浏览器有自己的窗口 | Electron 可拖拽自定义栏与三个控制按钮 |
| 录音上传 / 在线同步 | 无服务端；不自动上传 | 同样不自动上传 |
| 离线能力 | 首次访问需要网络；**尚未实现 PWA/Service Worker 离线缓存** | 应用安装后可本地运行，英语语音引擎视系统而定 |

**风险点**：Web 浏览器内的本地记录与 Electron 本地记录不会自动互通；浏览器清理网站数据或使用隐身模式可能删除学习记录。不要向用户保证跨设备同步或网页离线可用。网页是公开体验渠道，不是 Linux 桌面 TTS 的完整替代。

## 上线前人工验收

- [ ] 站点实际可从预期 URL 访问，URL 不会重定向到仓库页面。
- [ ] CSS/JS、Voxnelo Logo 与标签 favicon 正常加载（没有 404）。
- [ ] 1440×900、1160×760、800×610 及窄屏均无关键控件重叠；右侧卡片与中间卡片高度正确。
- [ ] 运行截图与 `docs/u3.jpeg` 配色、对齐、复习/收藏图标、Tooltip 和微动效比对；支持减少动画。
- [ ] 首次跟随系统语言；中英文手动切换后重新载入仍生效。
- [ ] 收藏、复习、历史数据在刷新页面后保留；清理浏览器数据的影响说明准确。
- [ ] 在 HTTPS Pages 上的真实 Chrome / Firefox / Pop!_OS 浏览器测试：允许麦克风、开始/结束录音、回听、系统英语 voice 可用/不可用两种状态。
- [ ] 打开站点的浏览器开发工具，不出现与 CSP、IndexedDB、音频或资源路径相关的异常。
- [ ] 确认上线内容无账号密钥、私有文件、开发者调试信息。

## 已知待合并工程事项

审查时存在两条独立开放 PR：#23（修复课程顶部收藏/复习图标重叠及 Tooltip 被裁剪）与 #22（补变更日志和语音验收文档）。这两条在旧提交上开发，CI 曾通过，但在基于最新 `main` 复核、解决冲突之前，**不能把它们视为已上线修复**。优先修复 #23 再做公开视觉验收。
